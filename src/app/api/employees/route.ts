/**
 * @file route.ts
 * @description Employees list with HR profile data and filtering
 * @module hr/employees
 */

import { NextResponse } from 'next/server';
import { withErrorHandler } from '@/lib/http/handler';
import {
  getExpiryStatus,
  getOverallExpiryStatus,
  calculateTeamMemberProfileCompletion,
} from '@/features/employees/lib/hr-utils';

// GET /api/employees - Get all employees with HR profile data
export const GET = withErrorHandler(
  async (request, { prisma, tenant }) => {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('p') || '1');
    const pageSize = parseInt(searchParams.get('ps') || '50');
    const search = searchParams.get('q') || '';
    const profileStatus = searchParams.get('profileStatus') || 'all';
    const expiryStatus = searchParams.get('expiryStatus') || 'all';
    const sponsorshipType = searchParams.get('sponsorshipType') || 'all';
    const sortBy = searchParams.get('sort') || 'createdAt';
    const sortOrder = searchParams.get('order') || 'desc';
    const canApproveFilter = searchParams.get('canApprove');

    // Build where clause for employees (filter by organization and isEmployee flag)
    const where: Record<string, unknown> = {
      tenantId: tenant!.tenantId,
      isEmployee: true, // Only show team members marked as employees
      isDeleted: false,
    };

    // Build AND conditions for combining filters
    const andConditions: Record<string, unknown>[] = [];

    // Filter for users who can approve (managers/admins)
    if (canApproveFilter === 'true') {
      andConditions.push({
        OR: [
          { canApprove: true },
          { isAdmin: true },
        ],
      });
    }

    // Search by name, email, employee code, or QID
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { employeeCode: { contains: search, mode: 'insensitive' } },
          { qidNumber: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    // Apply AND conditions if any
    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // Filter by sponsorship type
    if (sponsorshipType !== 'all') {
      where.sponsorshipType = sponsorshipType;
    }

    // Get total count
    const total = await prisma.teamMember.count({ where });

    // Fetch employees
    const employees = await prisma.teamMember.findMany({
      where,
      include: {
        _count: {
          select: {
            assets: true,
          },
        },
        reportingTo: {
          select: {
            id: true,
            name: true,
            email: true,
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

    // Calculate profile completion and expiry status for each employee
    const processedEmployees = employees.map((emp) => {
      // Calculate profile completion using shared utility
      const completion = calculateTeamMemberProfileCompletion(emp);

      // Check expiry dates using shared utility
      const qidExpiryStatus = getExpiryStatus(emp.qidExpiry);
      const passportExpiryStatus = getExpiryStatus(emp.passportExpiry);
      const healthCardExpiryStatus = getExpiryStatus(emp.healthCardExpiry);

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
        role: emp.isAdmin ? 'ADMIN' : 'MEMBER',
        canLogin: emp.canLogin,
        isEmployee: emp.isEmployee,
        isOnWps: emp.isOnWps,
        // Permission flags
        isAdmin: emp.isAdmin,
        isManager: emp.canApprove, // Map canApprove to isManager for role derivation
        hasOperationsAccess: emp.hasOperationsAccess,
        hasHRAccess: emp.hasHRAccess,
        hasFinanceAccess: emp.hasFinanceAccess,
        canApprove: emp.canApprove,
        reportingTo: emp.reportingTo ? {
          id: emp.reportingTo.id,
          name: emp.reportingTo.name || emp.reportingTo.email,
        } : null,
        createdAt: emp.createdAt,
        updatedAt: emp.updatedAt,
        _count: { assets: emp._count.assets, subscriptions: 0 },
        // Flatten hrProfile fields for backwards compatibility
        hrProfile: {
          employeeId: emp.employeeCode,
          designation: emp.designation,
          qidNumber: emp.qidNumber,
          qidExpiry: emp.qidExpiry,
          passportExpiry: emp.passportExpiry,
          healthCardExpiry: emp.healthCardExpiry,
          sponsorshipType: emp.sponsorshipType,
          photoUrl: emp.photoUrl,
          dateOfJoining: emp.dateOfJoining,
          onboardingComplete: emp.onboardingComplete,
          onboardingStep: emp.onboardingStep,
        },
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
  },
  {
    requireAuth: true,
    requireAdmin: true,
    rateLimit: true,
  }
);
