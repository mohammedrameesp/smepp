/**
 * @file route.ts
 * @description Employee celebrations (birthdays and work anniversaries)
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import { APIContext } from '@/lib/http/handler';

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
async function getCelebrationsHandler(request: NextRequest, _context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all employees with HR profiles (tenant-scoped)
    const employees = await prisma.user.findMany({
      where: {
        isSystemAccount: false,
        role: {
          in: [Role.EMPLOYEE, Role.TEMP_STAFF, Role.ADMIN],
        },
        hrProfile: {
          isNot: null,
        },
        organizationMemberships: {
          some: { organizationId: session.user.organizationId },
        },
      },
      include: {
        hrProfile: {
          select: {
            dateOfBirth: true,
            dateOfJoining: true,
            photoUrl: true,
          },
        },
      },
    });

    const celebrations: CelebrationEvent[] = [];
    const lookAheadDays = 30; // Look 30 days ahead

    for (const emp of employees) {
      const hr = emp.hrProfile;
      if (!hr) continue;

      // Check birthday
      if (hr.dateOfBirth) {
        const dob = new Date(hr.dateOfBirth);
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
            photoUrl: hr.photoUrl,
            type: 'birthday',
            date: thisYearBirthday.toISOString(),
            daysUntil: daysUntilBirthday,
          });
        }
      }

      // Check work anniversary
      if (hr.dateOfJoining) {
        const doj = new Date(hr.dateOfJoining);
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
            photoUrl: hr.photoUrl,
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
