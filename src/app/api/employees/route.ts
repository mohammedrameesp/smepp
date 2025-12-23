import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';
import {
  getExpiryStatus,
  getOverallExpiryStatus,
  calculateProfileCompletion,
  EXPIRY_WARNING_DAYS,
} from '@/lib/hr-utils';

// GET /api/employees - Get all employees with HR profile data
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can view employee list
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('p') || '1');
    const pageSize = parseInt(searchParams.get('ps') || '50');
    const search = searchParams.get('q') || '';
    const profileStatus = searchParams.get('profileStatus') || 'all';
    const expiryStatus = searchParams.get('expiryStatus') || 'all';
    const sponsorshipType = searchParams.get('sponsorshipType') || 'all';
    const sortBy = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';

    // Build where clause for employees (exclude system accounts)
    const userWhere: Record<string, unknown> = {
      isSystemAccount: false,
      role: {
        in: [Role.EMPLOYEE, Role.TEMP_STAFF, Role.ADMIN],
      },
    };

    // Search by name, email, employee ID, or QID
    if (search) {
      userWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { hrProfile: { employeeId: { contains: search, mode: 'insensitive' } } },
        { hrProfile: { qidNumber: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Filter by sponsorship type
    if (sponsorshipType !== 'all') {
      userWhere.hrProfile = {
        ...((userWhere.hrProfile as object) || {}),
        sponsorshipType,
      };
    }

    // Get total count
    const total = await prisma.user.count({ where: userWhere });

    // Fetch employees with HR profiles
    const employees = await prisma.user.findMany({
      where: userWhere,
      include: {
        hrProfile: true,
        _count: {
          select: {
            assets: true,
            subscriptions: true,
          },
        },
      },
      orderBy: sortBy === 'createdAt'
        ? { createdAt: sortOrder as 'asc' | 'desc' }
        : sortBy === 'name'
        ? { name: sortOrder as 'asc' | 'desc' }
        : { createdAt: sortOrder as 'asc' | 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Calculate profile completion and expiry status for each employee using shared utilities
    const processedEmployees = employees.map((emp) => {
      const hr = emp.hrProfile;

      // Calculate profile completion using shared utility
      const completion = calculateProfileCompletion(hr);

      // Check expiry dates using shared utility
      const qidExpiryStatus = getExpiryStatus(hr?.qidExpiry);
      const passportExpiryStatus = getExpiryStatus(hr?.passportExpiry);
      const healthCardExpiryStatus = getExpiryStatus(hr?.healthCardExpiry);

      // Determine overall expiry status using shared utility
      const overallExpiryStatus = getOverallExpiryStatus([
        qidExpiryStatus,
        passportExpiryStatus,
        healthCardExpiryStatus,
      ]);

      return {
        id: emp.id,
        name: emp.name,
        email: emp.email,
        image: emp.image,
        role: emp.role,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
        _count: emp._count,
        hrProfile: hr ? {
          employeeId: hr.employeeId,
          designation: hr.designation,
          qidNumber: hr.qidNumber,
          qidExpiry: hr.qidExpiry,
          passportExpiry: hr.passportExpiry,
          healthCardExpiry: hr.healthCardExpiry,
          sponsorshipType: hr.sponsorshipType,
          photoUrl: hr.photoUrl,
          dateOfJoining: hr.dateOfJoining,
          onboardingComplete: hr.onboardingComplete,
          onboardingStep: hr.onboardingStep,
        } : null,
        profileStatus: {
          isComplete: completion.isComplete,
          completionPercentage: completion.percentage,
        },
        expiryStatus: {
          qid: qidExpiryStatus,
          passport: passportExpiryStatus,
          healthCard: healthCardExpiryStatus,
          overall: overallExpiryStatus,
        },
      };
    });

    // Filter by profile status if needed
    let filteredEmployees = processedEmployees;
    if (profileStatus === 'complete') {
      filteredEmployees = processedEmployees.filter((e) => e.profileStatus.isComplete);
    } else if (profileStatus === 'incomplete') {
      filteredEmployees = processedEmployees.filter((e) => !e.profileStatus.isComplete);
    }

    // Filter by expiry status if needed
    if (expiryStatus === 'expired') {
      filteredEmployees = filteredEmployees.filter((e) => e.expiryStatus.overall === 'expired');
    } else if (expiryStatus === 'expiring') {
      filteredEmployees = filteredEmployees.filter((e) => e.expiryStatus.overall === 'expiring');
    }

    // Calculate stats
    const stats = {
      total: total,
      incomplete: processedEmployees.filter((e) => !e.profileStatus.isComplete).length,
      expiringSoon: processedEmployees.filter((e) => e.expiryStatus.overall === 'expiring').length,
      expired: processedEmployees.filter((e) => e.expiryStatus.overall === 'expired').length,
    };

    return NextResponse.json({
      employees: filteredEmployees,
      stats,
      pagination: {
        page,
        pageSize,
        total: filteredEmployees.length,
        totalPages: Math.ceil(filteredEmployees.length / pageSize),
        hasMore: page * pageSize < filteredEmployees.length,
      },
    });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employees' },
      { status: 500 }
    );
  }
}
