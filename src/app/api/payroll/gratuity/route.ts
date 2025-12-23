import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { calculateGratuity, projectGratuity } from '@/lib/payroll/gratuity';
import { parseDecimal } from '@/lib/payroll/utils';
import { gratuityQuerySchema } from '@/lib/validations/payroll';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = gratuityQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, terminationDate } = validation.data;
    const isAdmin = session.user.role === Role.ADMIN;

    // Non-admin users can only view their own gratuity
    const targetUserId = isAdmin && userId ? userId : session.user.id;

    // Get user's salary structure and HR profile
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
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
      }, { status: 400 });
    }

    if (!user.salaryStructure) {
      return NextResponse.json({
        error: 'Salary structure not set for this employee',
      }, { status: 400 });
    }

    const basicSalary = parseDecimal(user.salaryStructure.basicSalary);
    const dateOfJoining = new Date(user.hrProfile.dateOfJoining);
    const termDate = terminationDate ? new Date(terminationDate) : new Date();

    // Calculate current gratuity
    const gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining, termDate);

    // Calculate projections
    const projections = projectGratuity(basicSalary, dateOfJoining, [1, 2, 3, 5, 10]);

    return NextResponse.json({
      userId: targetUserId,
      userName: user.name,
      employeeId: user.hrProfile.employeeId,
      designation: user.hrProfile.designation,
      dateOfJoining: user.hrProfile.dateOfJoining,
      basicSalary,
      terminationDate: termDate.toISOString(),
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
