/**
 * @file route.ts
 * @description Import users from CSV/Excel
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import { csvToArray } from '@/lib/core/csv-utils';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

interface ImportRow {
  [key: string]: string | undefined;
}

async function importUsersHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const { tenantId } = tenant;
  const db = tenantPrisma as TenantPrismaClient;

  // Get file from request
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const duplicateStrategy = (formData.get('duplicateStrategy') as string) || 'skip';

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  // Convert file to buffer
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  // Parse CSV
  const rows = await csvToArray<ImportRow>(buffer);

  if (rows.length === 0) {
    return NextResponse.json({ error: 'No data found in file' }, { status: 400 });
  }

  const results: {
    success: number;
    updated: number;
    skipped: number;
    failed: number;
    errors: { row: number; error: string; data: unknown }[];
    created: { email: string; name: string | null; role: string }[];
  } = {
    success: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
    created: [],
  };

  // Process each row
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNumber = i + 2; // +2 because Excel starts at 1 and we have headers

    try {
      // Helper function to get value from row with flexible column names
      const getRowValue = (possibleNames: string[]): string | undefined => {
        for (const name of possibleNames) {
          const value = row[name];
          if (value && value.trim()) return value.trim();
        }
        return undefined;
      };

      // Extract values
      const id = getRowValue(['ID', 'id', 'User ID']);
      const email = getRowValue(['Email', 'email', 'Email Address']);
      const name = getRowValue(['Name', 'name', 'Full Name']);
      const roleStr = getRowValue(['Role', 'role']);
      const isAdminStr = getRowValue(['Is Admin', 'isAdmin', 'Admin']);

      // Validate required fields
      if (!email) {
        results.errors.push({
          row: rowNumber,
          error: 'Missing required field: Email',
          data: row,
        });
        results.failed++;
        continue;
      }

      // Determine admin status from either isAdmin column or role column
      // 'ADMIN' in role column or 'true/yes/1' in isAdmin column means admin
      let isAdmin = false;
      if (isAdminStr) {
        const lowerStr = isAdminStr.toLowerCase();
        isAdmin = lowerStr === 'true' || lowerStr === 'yes' || lowerStr === '1';
      } else if (roleStr) {
        isAdmin = roleStr.toUpperCase() === 'ADMIN';
      }

      // If ID is provided, use upsert to preserve relationships
      if (id) {
        // Check if user with this ID exists
        const existingUserById = await prisma.user.findUnique({
          where: { id },
        });

        // Check if user with this email exists (but different ID)
        const existingUserByEmail = await prisma.user.findUnique({
          where: { email },
        });

        // If email exists but with different ID, handle based on strategy
        if (existingUserByEmail && existingUserByEmail.id !== id) {
          if (duplicateStrategy === 'skip') {
            results.skipped++;
            continue;
          }
          // If update strategy, we'll update the existing email user and ignore the ID from CSV
        }

        // Use upsert with ID to preserve relationships
        // Note: User.role is for the global user model (EMPLOYEE, MANAGER, etc.)
        // TeamMember.isAdmin is for per-tenant admin access
        const user = await prisma.user.upsert({
          where: { id },
          create: {
            id,
            email,
            name,
            role: Role.EMPLOYEE, // Default role for global User model
            emailVerified: null,
          },
          update: {
            name: name || undefined,
            email,
          },
        });

        // Ensure TeamMember exists for organization membership
        if (!existingUserById) {
          // Newly created user - create TeamMember (tenant-scoped via extension)
          await db.teamMember.create({
            data: {
              tenantId,
              email: user.email,
              name: user.name,
              canLogin: true,
              isAdmin,
            },
          });
        } else if (existingUserById) {
          const existingMember = await db.teamMember.findFirst({
            where: { email: user.email },
          });
          if (!existingMember) {
            await db.teamMember.create({
              data: {
                tenantId,
                email: user.email,
                name: user.name,
                canLogin: true,
                isAdmin,
              },
            });
          }
        }

        // Log activity
        await logAction(
          tenantId,
          tenant.userId,
          existingUserById ? ActivityActions.USER_UPDATED : ActivityActions.USER_CREATED,
          'User',
          user.id,
          { email: user.email, name: user.name, isAdmin, source: 'CSV Import' }
        );

        if (existingUserById) {
          results.updated++;
        } else {
          results.created.push({
            email: user.email,
            name: user.name,
            role: isAdmin ? 'ADMIN' : 'MEMBER', // For backwards compatibility in response
          });
          results.success++;
        }
        continue;
      }

      // No ID provided - use email-based logic (original behavior)
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        if (duplicateStrategy === 'skip') {
          results.skipped++;
          continue;
        } else if (duplicateStrategy === 'update') {
          // Update existing user (global User model)
          await prisma.user.update({
            where: { email },
            data: {
              name: name || existingUser.name,
            },
          });

          // Ensure TeamMember exists for organization membership (tenant-scoped via extension)
          const existingMember = await db.teamMember.findFirst({
            where: { email },
          });
          if (!existingMember) {
            await db.teamMember.create({
              data: {
                tenantId,
                email,
                name: name || existingUser.name,
                canLogin: true,
                isAdmin,
              },
            });
          }

          // Log activity
          await logAction(
            tenantId,
            tenant.userId,
            ActivityActions.USER_UPDATED,
            'User',
            existingUser.id,
            { email, name, isAdmin, source: 'CSV Import' }
          );

          results.updated++;
          continue;
        }
      }

      // Create new user (no ID provided, doesn't exist) - User is global model
      const user = await prisma.user.create({
        data: {
          email,
          name,
          role: Role.EMPLOYEE, // Default role for global User model
          emailVerified: null,
        },
      });

      // Create TeamMember for organization membership (tenant-scoped via extension)
      await db.teamMember.create({
        data: {
          tenantId,
          email: user.email,
          name: user.name,
          canLogin: true,
          isAdmin,
        },
      });

      // Log activity
      await logAction(
        tenantId,
        tenant.userId,
        ActivityActions.USER_CREATED,
        'User',
        user.id,
        { email: user.email, name: user.name, isAdmin, source: 'CSV Import' }
      );

      results.created.push({
        email: user.email,
        name: user.name,
        role: isAdmin ? 'ADMIN' : 'MEMBER', // For backwards compatibility in response
      });
      results.success++;
    } catch (error) {
      results.errors.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: row,
      });
      results.failed++;
    }
  }

  return NextResponse.json(
    {
      message: `Import completed: ${results.success} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`,
      results,
    },
    { status: 200 }
  );
}

export const POST = withErrorHandler(importUsersHandler, { requireAdmin: true });
