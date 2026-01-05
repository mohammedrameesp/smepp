/**
 * @file route.ts
 * @description Import users from CSV/Excel
 * @module system/users
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import { csvToArray } from '@/lib/core/csv-utils';
import { logAction, ActivityActions } from '@/lib/core/activity';

interface ImportRow {
  [key: string]: string | undefined;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session || session.user.teamMemberRole !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

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

        // Validate role
        let role: Role = Role.EMPLOYEE;
        if (roleStr) {
          const roleUpper = roleStr.toUpperCase();
          if (Object.values(Role).includes(roleUpper as Role)) {
            role = roleUpper as Role;
          } else {
            results.errors.push({
              row: rowNumber,
              error: `Invalid role: ${roleStr}. Must be one of: ADMIN, EMPLOYEE, EMPLOYEE`,
              data: row,
            });
            results.failed++;
            continue;
          }
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
          const user = await prisma.user.upsert({
            where: { id },
            create: {
              id,
              email,
              name,
              role,
              emailVerified: null,
            },
            update: {
              name: name || undefined,
              role,
              email,
            },
          });

          // Ensure TeamMember exists for organization membership
          if (!existingUserById) {
            // Newly created user - create TeamMember
            await prisma.teamMember.create({
              data: {
                tenantId,
                email: user.email,
                name: user.name,
                canLogin: true,
                role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
              },
            });
          } else if (existingUserById) {
            const existingMember = await prisma.teamMember.findFirst({
              where: { tenantId, email: user.email },
            });
            if (!existingMember) {
              await prisma.teamMember.create({
                data: {
                  tenantId,
                  email: user.email,
                  name: user.name,
                  canLogin: true,
                  role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
                },
              });
            }
          }

          // Log activity
          await logAction(
            tenantId,
            session.user.id,
            existingUserById ? ActivityActions.USER_UPDATED : ActivityActions.USER_CREATED,
            'User',
            user.id,
            { email: user.email, name: user.name, role: user.role, source: 'CSV Import' }
          );

          if (existingUserById) {
            results.updated++;
          } else {
            results.created.push({
              email: user.email,
              name: user.name,
              role: user.role,
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
            // Update existing user
            await prisma.user.update({
              where: { email },
              data: {
                name: name || existingUser.name,
                role,
              },
            });

            // Ensure TeamMember exists for organization membership
            const existingMember = await prisma.teamMember.findFirst({
              where: { tenantId, email },
            });
            if (!existingMember) {
              await prisma.teamMember.create({
                data: {
                  tenantId,
                  email,
                  name: name || existingUser.name,
                  canLogin: true,
                  role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
                },
              });
            }

            // Log activity
            await logAction(
              tenantId,
              session.user.id,
              ActivityActions.USER_UPDATED,
              'User',
              existingUser.id,
              { email, name, role, source: 'CSV Import' }
            );

            results.updated++;
            continue;
          }
        }

        // Create new user (no ID provided, doesn't exist)
        const user = await prisma.user.create({
          data: {
            email,
            name,
            role,
            emailVerified: null,
          },
        });

        // Create TeamMember for organization membership
        await prisma.teamMember.create({
          data: {
            tenantId,
            email: user.email,
            name: user.name,
            canLogin: true,
            role: role === 'ADMIN' ? 'ADMIN' : 'MEMBER',
          },
        });

        // Log activity
        await logAction(
          tenantId,
          session.user.id,
          ActivityActions.USER_CREATED,
          'User',
          user.id,
          { email: user.email, name: user.name, role: user.role, source: 'CSV Import' }
        );

        results.created.push({
          email: user.email,
          name: user.name,
          role: user.role,
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
  } catch (error) {
    console.error('User import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to import users',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
