/**
 * @file route.ts
 * @description Seed default leave types and balances for organizations
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { LeaveCategory } from '@prisma/client';
import logger from '@/lib/core/log';
import { DEFAULT_LEAVE_TYPES, calculateServiceMonths } from '@/features/leave/lib/leave-utils';
import { getAnnualLeaveEntitlement } from '@/features/leave/lib/leave-balance-init';

// Helper to get service months (wraps the utility for null-safety)
function getServiceMonths(joinDate: Date, referenceDate: Date = new Date()): number {
  return calculateServiceMonths(joinDate, referenceDate);
}

/**
 * POST /api/super-admin/seed-leave-types
 * Seeds leave types for an organization and optionally initializes balances
 *
 * Body: { organizationId: string, withBalances?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { organizationId, withBalances = false } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    // Find organization
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const results = {
      organization: { id: org.id, name: org.name, slug: org.slug },
      leaveTypes: { created: 0, skipped: 0, details: [] as string[] },
      balances: { created: 0, skipped: 0, ineligible: 0, users: [] as string[] },
    };

    // Seed leave types
    for (const leaveType of DEFAULT_LEAVE_TYPES) {
      const existing = await prisma.leaveType.findFirst({
        where: { name: leaveType.name, tenantId: org.id },
      });

      if (existing) {
        results.leaveTypes.skipped++;
        results.leaveTypes.details.push(`Skipped: ${leaveType.name} (exists)`);
        continue;
      }

      await prisma.leaveType.create({
        data: {
          ...leaveType,
          tenantId: org.id,
        },
      });
      results.leaveTypes.created++;
      results.leaveTypes.details.push(`Created: ${leaveType.name}`);
    }

    // Initialize balances if requested
    if (withBalances) {
      // Use TeamMember instead of User
      const members = await prisma.teamMember.findMany({
        where: {
          tenantId: org.id,
          isDeleted: false,
          isEmployee: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          dateOfJoining: true,
        },
      });

      const leaveTypes = await prisma.leaveType.findMany({
        where: {
          tenantId: org.id,
          isActive: true,
          category: { in: [LeaveCategory.STANDARD, LeaveCategory.MEDICAL] },
        },
      });

      const currentYear = new Date().getFullYear();
      const now = new Date();

      for (const member of members) {
        const dateOfJoining = member.dateOfJoining;
        const serviceMonths = dateOfJoining ? getServiceMonths(dateOfJoining, now) : 0;
        const userName = member.name || member.email;
        const joinDateStr = dateOfJoining ? dateOfJoining.toISOString().split('T')[0] : 'NOT SET';

        let userCreated = 0;

        for (const leaveType of leaveTypes) {
          // Check service requirement
          if (leaveType.minimumServiceMonths > 0) {
            if (!dateOfJoining || serviceMonths < leaveType.minimumServiceMonths) {
              results.balances.ineligible++;
              continue;
            }
          }

          // Check if balance already exists
          const existing = await prisma.leaveBalance.findFirst({
            where: {
              memberId: member.id,
              leaveTypeId: leaveType.id,
              year: currentYear,
              tenantId: org.id,
            },
          });

          if (existing) {
            results.balances.skipped++;
            continue;
          }

          // Calculate entitlement
          let entitlement = leaveType.defaultDays;
          if (leaveType.name === 'Annual Leave') {
            entitlement = getAnnualLeaveEntitlement(serviceMonths);
          }

          await prisma.leaveBalance.create({
            data: {
              memberId: member.id,
              leaveTypeId: leaveType.id,
              year: currentYear,
              entitlement,
              tenantId: org.id,
            },
          });
          results.balances.created++;
          userCreated++;
        }

        results.balances.users.push(`${userName} (joined: ${joinDateStr}, service: ${serviceMonths} mo, created: ${userCreated})`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Seeded leave types for ${org.name}`,
      results,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Seed leave types error');
    return NextResponse.json(
      { error: 'Failed to seed leave types', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/super-admin/seed-leave-types
 * List organizations that need leave types seeded
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // Get all organizations with their leave type counts
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { leaveTypes: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const orgsWithStatus = organizations.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      leaveTypeCount: org._count.leaveTypes,
      needsSeeding: org._count.leaveTypes === 0,
    }));

    return NextResponse.json({
      organizations: orgsWithStatus,
      needsSeeding: orgsWithStatus.filter(o => o.needsSeeding),
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Get organizations error');
    return NextResponse.json(
      { error: 'Failed to get organizations' },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
