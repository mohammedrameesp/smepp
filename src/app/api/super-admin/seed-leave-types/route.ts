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
const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Annual Leave',
    description: 'Paid annual vacation leave (Qatar Law: 21 days for <5 years, 28 days for 5+ years of service). Accrues monthly from day one.',
    color: '#3B82F6',
    defaultDays: 21,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 7,
    allowCarryForward: true,
    maxCarryForwardDays: 5,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    serviceBasedEntitlement: { '12': 21, '60': 28 },
    category: LeaveCategory.STANDARD,
    accrualBased: true,
  },
  {
    name: 'Sick Leave',
    description: 'Leave for medical reasons (Qatar Law: 2 weeks full pay). Requires medical certificate.',
    color: '#EF4444',
    defaultDays: 14,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 3,
    isOnceInEmployment: false,
    category: LeaveCategory.MEDICAL,
    accrualBased: false,
  },
  {
    name: 'Maternity Leave',
    description: 'Leave for new mothers (Qatar Law: 50 days - up to 15 days before delivery, fully paid if 1+ year of service)',
    color: '#EC4899',
    defaultDays: 50,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 14,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'FEMALE',
    accrualBased: false,
  },
  {
    name: 'Paternity Leave',
    description: 'Leave for new fathers (3 days paid)',
    color: '#8B5CF6',
    defaultDays: 3,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'MALE',
    accrualBased: false,
  },
  {
    name: 'Hajj Leave',
    description: 'Leave for Hajj pilgrimage (Qatar Law: Up to 20 days unpaid, once during employment, requires 1 year of service)',
    color: '#059669',
    defaultDays: 20,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 20,
    minNoticeDays: 30,
    allowCarryForward: false,
    minimumServiceMonths: 12,
    isOnceInEmployment: true,
    category: LeaveCategory.RELIGIOUS,
    accrualBased: false,
  },
  {
    name: 'Unpaid Leave',
    description: 'Unpaid leave of absence (max 30 days per request)',
    color: '#6B7280',
    defaultDays: 30,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 30,
    minNoticeDays: 14,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
  {
    name: 'Compassionate Leave',
    description: 'Leave for bereavement or family emergencies (5 days paid)',
    color: '#3B82F6',
    defaultDays: 5,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
];

function getServiceMonths(joinDate: Date, referenceDate: Date = new Date()): number {
  const months = (referenceDate.getFullYear() - joinDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - joinDate.getMonth());
  return Math.max(0, months);
}

function getAnnualLeaveEntitlement(serviceMonths: number): number {
  if (serviceMonths >= 60) return 28;
  return 21;
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
    console.error('Seed leave types error:', error);
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
    console.error('Get organizations error:', error);
    return NextResponse.json(
      { error: 'Failed to get organizations' },
      { status: 500 }
    );
  }
}
