/**
 * @file route.ts
 * @description Employee celebrations (birthdays and work anniversaries)
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

interface CelebrationEvent {
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  photoUrl: string | null;
  type: 'birthday' | 'work_anniversary';
  date: string;
  daysUntil: number;
  yearsCompleting?: number; // For work anniversaries
}

// GET /api/employees/celebrations - Get upcoming birthdays and work anniversaries
async function getCelebrationsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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

    // Check work anniversary
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
    }
  }

  // Sort by days until (soonest first)
  celebrations.sort((a, b) => a.daysUntil - b.daysUntil);

  // Calculate summary
  const todayBirthdays = celebrations.filter(c => c.type === 'birthday' && c.daysUntil === 0).length;
  const todayAnniversaries = celebrations.filter(c => c.type === 'work_anniversary' && c.daysUntil === 0).length;
  const upcomingBirthdays = celebrations.filter(c => c.type === 'birthday' && c.daysUntil > 0).length;
  const upcomingAnniversaries = celebrations.filter(c => c.type === 'work_anniversary' && c.daysUntil > 0).length;

  return NextResponse.json({
    celebrations,
    summary: {
      total: celebrations.length,
      todayBirthdays,
      todayAnniversaries,
      upcomingBirthdays,
      upcomingAnniversaries,
    },
  });
}

export const GET = withErrorHandler(getCelebrationsHandler, { requireAuth: true });
