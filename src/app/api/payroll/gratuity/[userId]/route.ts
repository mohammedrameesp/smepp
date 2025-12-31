/**
 * @file route.ts
 * @description Gratuity calculation API for a specific user
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { calculateGratuity, projectGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';
import { parseDecimal } from '@/lib/payroll/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getGratuityHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const userId = params?.userId;
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const isAdmin = tenant!.userRole === 'ADMIN';

    // Non-admin users can only view their own gratuity
    if (!isAdmin && userId !== tenant!.userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user's salary structure and HR profile - verify user belongs to same org
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        organizationMemberships: { some: { organizationId: tenantId } },
      },
      include: {
        salaryStructure: true,
        hrProfile: {
          select: {
            dateOfJoining: true,
            designation: true,
            employeeId: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (!user.hrProfile?.dateOfJoining) {
      return NextResponse.json({
        error: 'Date of joining not set for this employee',
        canCalculate: false,
      }, { status: 200 });
    }

    if (!user.salaryStructure) {
      return NextResponse.json({
        error: 'Salary structure not set for this employee',
        canCalculate: false,
      }, { status: 200 });
    }

    const basicSalary = parseDecimal(user.salaryStructure.basicSalary);
    const dateOfJoining = new Date(user.hrProfile.dateOfJoining);

    // Calculate current gratuity
    const gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining);

    // Calculate projections for different future dates
    const projections = projectGratuity(basicSalary, dateOfJoining, [1, 2, 3, 5, 10]);

    return NextResponse.json({
      canCalculate: true,
      userId,
      userName: user.name,
      email: user.email,
      employeeId: user.hrProfile.employeeId,
      designation: user.hrProfile.designation,
      dateOfJoining: user.hrProfile.dateOfJoining,
      basicSalary,
      serviceDuration: getServiceDurationText(gratuityCalculation.monthsOfService),
      calculation: gratuityCalculation,
      projections,
    });
}

export const GET = withErrorHandler(getGratuityHandler, { requireAuth: true, requireModule: 'payroll' });
