/**
 * @file route.ts
 * @description Single salary structure details, update, and deletion API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { updateSalaryStructureSchema } from '@/lib/validations/payroll';
import { logAction, ActivityActions } from '@/lib/activity';
import { calculateGrossSalary, parseDecimal } from '@/lib/payroll/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getSalaryStructureHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const salaryStructure = await prisma.salaryStructure.findFirst({
      where: { id, tenantId },
      include: {
        member: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            designation: true,
            dateOfJoining: true,
            bankName: true,
            iban: true,
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
    if (tenant!.orgRole !== 'ADMIN' && salaryStructure.memberId !== tenant!.userId) {
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
}

export const GET = withErrorHandler(getSalaryStructureHandler, { requireAuth: true, requireModule: 'payroll' });

async function updateSalaryStructureHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const validation = updateSalaryStructureSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Use findFirst with tenantId to prevent cross-tenant access
    const existing = await prisma.salaryStructure.findFirst({
      where: { id, tenantId },
      include: {
        member: { select: { id: true, name: true } },
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
          member: { select: { id: true, name: true, email: true } },
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
            performedById: currentUserId,
          },
        });
      }

      return updated;
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.SALARY_STRUCTURE_UPDATED,
      'SalaryStructure',
      salaryStructure.id,
      {
        memberId: existing.memberId,
        memberName: existing.member.name,
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
}

export const PUT = withErrorHandler(updateSalaryStructureHandler, { requireAdmin: true, requireModule: 'payroll' });

async function deleteSalaryStructureHandler(request: NextRequest, context: APIContext) {
    const { tenant, params } = context;
    const tenantId = tenant!.tenantId;
    const currentUserId = tenant!.userId;
    const id = params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Use findFirst with tenantId to prevent cross-tenant access
    const existing = await prisma.salaryStructure.findFirst({
      where: { id, tenantId },
      include: {
        member: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Salary structure not found' }, { status: 404 });
    }

    // Check if there are any payslips associated with this member
    const payslipCount = await prisma.payslip.count({
      where: { memberId: existing.memberId },
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
      tenantId,
      currentUserId,
      ActivityActions.SALARY_STRUCTURE_DEACTIVATED,
      'SalaryStructure',
      id,
      {
        memberId: existing.memberId,
        memberName: existing.member.name,
        action: 'DELETED',
      }
    );

    return NextResponse.json({ success: true });
}

export const DELETE = withErrorHandler(deleteSalaryStructureHandler, { requireAdmin: true, requireModule: 'payroll' });
