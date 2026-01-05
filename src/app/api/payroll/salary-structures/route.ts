/**
 * @file route.ts
 * @description Salary structures listing and creation API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createSalaryStructureSchema, salaryStructureQuerySchema } from '@/lib/validations/payroll';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { calculateGrossSalary, parseDecimal } from '@/lib/payroll/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getSalaryStructuresHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;

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

    // Build where clause with tenant filter
    const where: Record<string, unknown> = { tenantId };

    if (userId) {
      where.memberId = userId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search) {
      where.member = {
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
          member: {
            select: {
              id: true,
              name: true,
              email: true,
              employeeCode: true,
              designation: true,
              dateOfJoining: true,
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
}

export const GET = withErrorHandler(getSalaryStructuresHandler, { requireAdmin: true, requireModule: 'payroll' });

async function createSalaryStructureHandler(request: NextRequest, context: APIContext) {
    const { tenant } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;

    const body = await request.json();
    const validation = createSalaryStructureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if team member exists and belongs to the same organization
    const member = await prisma.teamMember.findFirst({
      where: {
        id: data.userId,
        tenantId,
      },
      select: { id: true, name: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    // Check if team member already has an active salary structure within the same tenant
    const existingSalary = await prisma.salaryStructure.findFirst({
      where: { memberId: data.userId, tenantId },
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
          memberId: data.userId,
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
          tenantId,
        },
        include: {
          member: {
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
          performedById: currentUserId,
        },
      });

      return salary;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.SALARY_STRUCTURE_CREATED,
      'SalaryStructure',
      salaryStructure.id,
      {
        memberId: data.userId,
        memberName: member.name,
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
}

export const POST = withErrorHandler(createSalaryStructureHandler, { requireAdmin: true, requireModule: 'payroll' });
