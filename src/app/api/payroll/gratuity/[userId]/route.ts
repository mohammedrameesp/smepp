import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { calculateGratuity, projectGratuity, getServiceDurationText } from '@/lib/payroll/gratuity';
import { parseDecimal } from '@/lib/payroll/utils';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await params;
    const isAdmin = session.user.role === Role.ADMIN;

    // Non-admin users can only view their own gratuity
    if (!isAdmin && userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get user's salary structure and HR profile
    const user = await prisma.user.findUnique({
      where: { id: userId },
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
  } catch (error) {
    console.error('Gratuity GET error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate gratuity' },
      { status: 500 }
    );
  }
}
