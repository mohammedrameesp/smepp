import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { createSalaryStructureSchema, salaryStructureQuerySchema } from '@/lib/validations/payroll';
import { logAction, ActivityActions } from '@/lib/activity';
import { calculateGrossSalary, parseDecimal } from '@/lib/payroll/utils';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only admins can view all salary structures
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = salaryStructureQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, isActive, search, p, ps } = validation.data;
    const page = p;
    const pageSize = ps;

    // Build where clause
    const where: Record<string, unknown> = {};

    if (userId) {
      where.userId = userId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.user = {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [salaryStructures, total] = await Promise.all([
      prisma.salaryStructure.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              hrProfile: {
                select: {
                  employeeId: true,
                  designation: true,
                  dateOfJoining: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.salaryStructure.count({ where }),
    ]);

    // Transform decimals
    const transformed = salaryStructures.map(s => ({
      ...s,
      basicSalary: parseDecimal(s.basicSalary),
      housingAllowance: parseDecimal(s.housingAllowance),
      transportAllowance: parseDecimal(s.transportAllowance),
      foodAllowance: parseDecimal(s.foodAllowance),
      phoneAllowance: parseDecimal(s.phoneAllowance),
      otherAllowances: parseDecimal(s.otherAllowances),
      grossSalary: parseDecimal(s.grossSalary),
    }));

    return NextResponse.json({
      salaryStructures: transformed,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
  } catch (error) {
    console.error('Salary structures GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary structures' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validation = createSalaryStructureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: data.userId },
      select: { id: true, name: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if user already has an active salary structure
    const existingSalary = await prisma.salaryStructure.findUnique({
      where: { userId: data.userId },
    });

    if (existingSalary) {
      return NextResponse.json({
        error: 'User already has a salary structure. Update the existing one instead.',
      }, { status: 400 });
    }

    // Calculate gross salary
    const grossSalary = calculateGrossSalary({
      basicSalary: data.basicSalary,
      housingAllowance: data.housingAllowance,
      transportAllowance: data.transportAllowance,
      foodAllowance: data.foodAllowance,
      phoneAllowance: data.phoneAllowance,
      otherAllowances: data.otherAllowances,
    });

    // Create salary structure with history
    const salaryStructure = await prisma.$transaction(async (tx) => {
      const salary = await tx.salaryStructure.create({
        data: {
          userId: data.userId,
          basicSalary: data.basicSalary,
          housingAllowance: data.housingAllowance || 0,
          transportAllowance: data.transportAllowance || 0,
          foodAllowance: data.foodAllowance || 0,
          phoneAllowance: data.phoneAllowance || 0,
          otherAllowances: data.otherAllowances || 0,
          otherAllowancesDetails: data.otherAllowancesDetails
            ? JSON.stringify(data.otherAllowancesDetails)
            : null,
          grossSalary,
          effectiveFrom: new Date(data.effectiveFrom),
          isActive: true,
          tenantId: session.user.organizationId!,
        },
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Create history record
      await tx.salaryStructureHistory.create({
        data: {
          salaryStructureId: salary.id,
          action: 'CREATED',
          notes: data.notes,
          performedById: session.user.id,
        },
      });

      return salary;
    });

    await logAction(
      session.user.id,
      ActivityActions.SALARY_STRUCTURE_CREATED,
      'SalaryStructure',
      salaryStructure.id,
      {
        userId: data.userId,
        userName: user.name,
        grossSalary,
      }
    );

    // Transform decimals for response
    const response = {
      ...salaryStructure,
      basicSalary: parseDecimal(salaryStructure.basicSalary),
      housingAllowance: parseDecimal(salaryStructure.housingAllowance),
      transportAllowance: parseDecimal(salaryStructure.transportAllowance),
      foodAllowance: parseDecimal(salaryStructure.foodAllowance),
      phoneAllowance: parseDecimal(salaryStructure.phoneAllowance),
      otherAllowances: parseDecimal(salaryStructure.otherAllowances),
      grossSalary: parseDecimal(salaryStructure.grossSalary),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('Salary structure POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create salary structure' },
      { status: 500 }
    );
  }
}
