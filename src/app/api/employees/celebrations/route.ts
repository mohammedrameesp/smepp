/**
 * @file route.ts
 * @description Employee celebrations (birthdays, work anniversaries, and milestones)
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { getUpcomingMilestones, WorkMilestone } from '@/features/employees/lib/work-milestones';
import { getQatarStartOfDay } from '@/lib/core/datetime';

interface CelebrationEvent {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  photoUrl: string | null;
  type: 'birthday' | 'work_anniversary' | 'work_milestone';
  date: string;
  daysUntil: number;
  yearsCompleting?: number; // For work anniversaries
  milestone?: {
    days: number;
    name: string;
    description: string;
    tier: WorkMilestone['tier'];
  }; // For work milestones
}

// GET /api/employees/celebrations - Get upcoming birthdays and work anniversaries
async function getCelebrationsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const today = getQatarStartOfDay();

  // Get all employees with HR data (tenant-scoped via extension) from TeamMember
  const employees = await db.teamMember.findMany({
    where: {
      isEmployee: true,
      isDeleted: false,
    },
    select: {
      id: true,
      name: true,
      email: true,
      dateOfBirth: true,
      dateOfJoining: true,
      photoUrl: true,
    },
  });

  const celebrations: CelebrationEvent[] = [];
  const lookAheadDays = 30; // Look 30 days ahead

  for (const emp of employees) {

    // Check birthday
    if (emp.dateOfBirth) {
      const dob = new Date(emp.dateOfBirth);
      // Create this year's birthday
      const thisYearBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());

      // If birthday has passed this year, check next year
      if (thisYearBirthday < today) {
        thisYearBirthday.setFullYear(thisYearBirthday.getFullYear() + 1);
      }

      const daysUntilBirthday = Math.ceil(
        (thisYearBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntilBirthday <= lookAheadDays) {
        celebrations.push({
          employeeId: emp.id,
          employeeName: emp.name || emp.email,
          employeeEmail: emp.email,
          photoUrl: emp.photoUrl,
          type: 'birthday',
          date: thisYearBirthday.toISOString(),
          daysUntil: daysUntilBirthday,
        });
      }
    }

    // Check work anniversary (yearly)
    if (emp.dateOfJoining) {
      const doj = new Date(emp.dateOfJoining);
      // Create this year's anniversary
      const thisYearAnniversary = new Date(today.getFullYear(), doj.getMonth(), doj.getDate());

      // If anniversary has passed this year, check next year
      if (thisYearAnniversary < today) {
        thisYearAnniversary.setFullYear(thisYearAnniversary.getFullYear() + 1);
      }

      const daysUntilAnniversary = Math.ceil(
        (thisYearAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Calculate years completing
      const yearsCompleting = thisYearAnniversary.getFullYear() - doj.getFullYear();

      if (daysUntilAnniversary <= lookAheadDays && yearsCompleting > 0) {
        celebrations.push({
          employeeId: emp.id,
          employeeName: emp.name || emp.email,
          employeeEmail: emp.email,
          photoUrl: emp.photoUrl,
          type: 'work_anniversary',
          date: thisYearAnniversary.toISOString(),
          daysUntil: daysUntilAnniversary,
          yearsCompleting,
        });
      }

      // Check work milestones (day-based)
      const upcomingMilestones = getUpcomingMilestones(doj, lookAheadDays, today);
      for (const { milestone, daysUntil, targetDate } of upcomingMilestones) {
        celebrations.push({
          employeeId: emp.id,
          employeeName: emp.name || emp.email,
          employeeEmail: emp.email,
          photoUrl: emp.photoUrl,
          type: 'work_milestone',
          date: targetDate.toISOString(),
          daysUntil,
          milestone: {
            days: milestone.days,
            name: milestone.name,
            description: milestone.description,
            tier: milestone.tier,
          },
        });
      }
    }
  }

  // Sort by days until (soonest first)
  celebrations.sort((a, b) => a.daysUntil - b.daysUntil);

  // Calculate summary
  const todayBirthdays = celebrations.filter(c => c.type === 'birthday' && c.daysUntil === 0).length;
  const todayAnniversaries = celebrations.filter(c => c.type === 'work_anniversary' && c.daysUntil === 0).length;
  const todayMilestones = celebrations.filter(c => c.type === 'work_milestone' && c.daysUntil === 0).length;
  const upcomingBirthdays = celebrations.filter(c => c.type === 'birthday' && c.daysUntil > 0).length;
  const upcomingAnniversaries = celebrations.filter(c => c.type === 'work_anniversary' && c.daysUntil > 0).length;
  const upcomingMilestones = celebrations.filter(c => c.type === 'work_milestone' && c.daysUntil > 0).length;

  return NextResponse.json({
    celebrations,
    summary: {
      total: celebrations.length,
      todayBirthdays,
      todayAnniversaries,
      todayMilestones,
      upcomingBirthdays,
      upcomingAnniversaries,
      upcomingMilestones,
    },
  });
}

export const GET = withErrorHandler(getCelebrationsHandler, { requireAuth: true, requireModule: 'employees' });
