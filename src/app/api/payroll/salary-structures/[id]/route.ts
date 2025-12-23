import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { updateSalaryStructureSchema } from '@/lib/validations/payroll';
import { logAction, ActivityActions } from '@/lib/activity';
import { calculateGrossSalary, parseDecimal } from '@/lib/payroll/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const salaryStructure = await prisma.salaryStructure.findUnique({
      where: { id },
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
                bankName: true,
                iban: true,
              },
            },
          },
        },
        history: {
          orderBy: { createdAt: 'desc' },
          include: {
            performedBy: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!salaryStructure) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    // Non-admin users can only view their own salary structure
    if (session.user.role !== Role.ADMIN && salaryStructure.userId !== session.user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Transform decimals
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Salary structure GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch salary structure' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const validation = updateSalaryStructureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Get existing salary structure
    const existing = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    // Calculate new gross salary if any component changed
    const newBasicSalary = data.basicSalary ?? parseDecimal(existing.basicSalary);
    const newHousing = data.housingAllowance ?? parseDecimal(existing.housingAllowance);
    const newTransport = data.transportAllowance ?? parseDecimal(existing.transportAllowance);
    const newFood = data.foodAllowance ?? parseDecimal(existing.foodAllowance);
    const newPhone = data.phoneAllowance ?? parseDecimal(existing.phoneAllowance);
    const newOther = data.otherAllowances ?? parseDecimal(existing.otherAllowances);

    const grossSalary = calculateGrossSalary({
      basicSalary: newBasicSalary,
      housingAllowance: newHousing,
      transportAllowance: newTransport,
      foodAllowance: newFood,
      phoneAllowance: newPhone,
      otherAllowances: newOther,
    });

    // Track changes for history
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const previousValues: Record<string, unknown> = {};

    if (data.basicSalary !== undefined && data.basicSalary !== parseDecimal(existing.basicSalary)) {
      changes.basicSalary = { old: parseDecimal(existing.basicSalary), new: data.basicSalary };
      previousValues.basicSalary = parseDecimal(existing.basicSalary);
    }
    if (data.housingAllowance !== undefined && data.housingAllowance !== parseDecimal(existing.housingAllowance)) {
      changes.housingAllowance = { old: parseDecimal(existing.housingAllowance), new: data.housingAllowance };
      previousValues.housingAllowance = parseDecimal(existing.housingAllowance);
    }
    if (data.transportAllowance !== undefined && data.transportAllowance !== parseDecimal(existing.transportAllowance)) {
      changes.transportAllowance = { old: parseDecimal(existing.transportAllowance), new: data.transportAllowance };
      previousValues.transportAllowance = parseDecimal(existing.transportAllowance);
    }
    if (data.foodAllowance !== undefined && data.foodAllowance !== parseDecimal(existing.foodAllowance)) {
      changes.foodAllowance = { old: parseDecimal(existing.foodAllowance), new: data.foodAllowance };
      previousValues.foodAllowance = parseDecimal(existing.foodAllowance);
    }
    if (data.phoneAllowance !== undefined && data.phoneAllowance !== parseDecimal(existing.phoneAllowance)) {
      changes.phoneAllowance = { old: parseDecimal(existing.phoneAllowance), new: data.phoneAllowance };
      previousValues.phoneAllowance = parseDecimal(existing.phoneAllowance);
    }
    if (data.otherAllowances !== undefined && data.otherAllowances !== parseDecimal(existing.otherAllowances)) {
      changes.otherAllowances = { old: parseDecimal(existing.otherAllowances), new: data.otherAllowances };
      previousValues.otherAllowances = parseDecimal(existing.otherAllowances);
    }

    // Update salary structure with history
    const salaryStructure = await prisma.$transaction(async (tx) => {
      const updated = await tx.salaryStructure.update({
        where: { id },
        data: {
          basicSalary: newBasicSalary,
          housingAllowance: newHousing,
          transportAllowance: newTransport,
          foodAllowance: newFood,
          phoneAllowance: newPhone,
          otherAllowances: newOther,
          otherAllowancesDetails: data.otherAllowancesDetails
            ? JSON.stringify(data.otherAllowancesDetails)
            : existing.otherAllowancesDetails,
          grossSalary,
          effectiveFrom: data.effectiveFrom ? new Date(data.effectiveFrom) : existing.effectiveFrom,
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
      });

      // Create history record if there were changes
      if (Object.keys(changes).length > 0) {
        await tx.salaryStructureHistory.create({
          data: {
            salaryStructureId: id,
            action: 'UPDATED',
            changes: changes as object,
            previousValues: previousValues as object,
            notes: data.notes,
            performedById: session.user.id,
          },
        });
      }

      return updated;
    });

    await logAction(
      session.user.id,
      ActivityActions.SALARY_STRUCTURE_UPDATED,
      'SalaryStructure',
      salaryStructure.id,
      {
        userId: existing.userId,
        userName: existing.user.name,
        changes,
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

    return NextResponse.json(response);
  } catch (error) {
    console.error('Salary structure PUT error:', error);
    return NextResponse.json(
      { error: 'Failed to update salary structure' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get existing salary structure
    const existing = await prisma.salaryStructure.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    // Check if there are any payslips associated with this user
    const payslipCount = await prisma.payslip.count({
      where: { userId: existing.userId },
    });

    if (payslipCount > 0) {
      return NextResponse.json({
        error: 'Cannot delete salary structure with existing payslips. Deactivate it instead.',
      }, { status: 400 });
    }

    // Delete salary structure (cascade will delete history)
    await prisma.salaryStructure.delete({
      where: { id },
    });

    await logAction(
      session.user.id,
      ActivityActions.SALARY_STRUCTURE_DEACTIVATED,
      'SalaryStructure',
      id,
      {
        userId: existing.userId,
        userName: existing.user.name,
        action: 'DELETED',
      }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Salary structure DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to delete salary structure' },
      { status: 500 }
    );
  }
}
