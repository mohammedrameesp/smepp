/**
 * @file route.ts
 * @description Employee loans listing and creation API
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { LoanStatus } from '@prisma/client';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { createLoanSchema, loanQuerySchema } from '@/features/payroll/validations/payroll';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { generateLoanNumberWithPrefix, calculateLoanEndDate, parseDecimal } from '@/features/payroll/lib/utils';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

async function getLoansHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = loanQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { userId, status, type, p, ps } = validation.data;
    const page = p;
    const pageSize = ps;
    const isAdmin = tenant?.isOwner || tenant?.isAdmin;

    // Build where clause with tenant filter
    const where: Record<string, unknown> = { tenantId };

    // Non-admin users can only see their own loans
    if (!isAdmin) {
      where.memberId = tenant.userId;
    } else if (userId) {
      where.memberId = userId;
    }

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    const [loans, total] = await Promise.all([
      db.employeeLoan.findMany({
        where,
        include: {
          member: { select: { id: true, name: true, email: true } },
          approvedBy: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          _count: { select: { repayments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      db.employeeLoan.count({ where }),
    ]);

    // Transform decimals
    const transformed = loans.map(loan => ({
      ...loan,
      principalAmount: parseDecimal(loan.principalAmount),
      totalAmount: parseDecimal(loan.totalAmount),
      monthlyDeduction: parseDecimal(loan.monthlyDeduction),
      totalPaid: parseDecimal(loan.totalPaid),
      remainingAmount: parseDecimal(loan.remainingAmount),
    }));

    return NextResponse.json({
      loans: transformed,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
        hasMore: page * pageSize < total,
      },
    });
}

export const GET = withErrorHandler(getLoansHandler, { requireAuth: true, requireModule: 'payroll' });

async function createLoanHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const currentUserId = tenant.userId;

    const body = await request.json();
    const validation = createLoanSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const data = validation.data;

    // Check if team member exists and belongs to same organization
    const member = await db.teamMember.findFirst({
      where: {
        id: data.userId,
        tenantId,
      },
      select: { id: true, name: true },
    });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found in this organization' }, { status: 404 });
    }

    // Get organization's code prefix
    const codePrefix = await getOrganizationCodePrefix(tenantId);

    // Generate loan number with tenant-scoped sequence
    const lastLoan = await db.employeeLoan.findFirst({
      where: { tenantId },
      orderBy: { loanNumber: 'desc' },
    });

    let sequence = 1;
    if (lastLoan) {
      // Match pattern like "ORG-LOAN-00001" or legacy "LOAN-00001"
      const prefixedMatch = lastLoan.loanNumber.match(new RegExp(`${codePrefix}-LOAN-(\\d{5})`));
      const legacyMatch = lastLoan.loanNumber.match(/LOAN-(\d{5})/);
      const match = prefixedMatch || legacyMatch;
      if (match) {
        sequence = parseInt(match[1], 10) + 1;
      }
    }

    const loanNumber = await generateLoanNumberWithPrefix(tenantId, sequence);
    const startDate = new Date(data.startDate);
    const endDate = calculateLoanEndDate(startDate, data.installments);

    const loan = await db.employeeLoan.create({
      data: {
        loanNumber,
        memberId: data.userId,
        type: data.type,
        description: data.description,
        principalAmount: data.principalAmount,
        totalAmount: data.principalAmount, // No interest for now
        monthlyDeduction: data.monthlyDeduction,
        totalPaid: 0,
        remainingAmount: data.principalAmount,
        startDate,
        endDate,
        installments: data.installments,
        status: LoanStatus.ACTIVE,
        approvedById: currentUserId,
        approvedAt: new Date(),
        notes: data.notes,
        createdById: currentUserId,
        tenantId,
      },
      include: {
        member: { select: { id: true, name: true, email: true } },
      },
    });

    await logAction(
      tenantId,
      currentUserId,
      ActivityActions.LOAN_CREATED,
      'EmployeeLoan',
      loan.id,
      {
        loanNumber,
        memberId: data.userId,
        memberName: member.name,
        type: data.type,
        amount: data.principalAmount,
      }
    );

    // Transform decimals for response
    const response = {
      ...loan,
      principalAmount: parseDecimal(loan.principalAmount),
      totalAmount: parseDecimal(loan.totalAmount),
      monthlyDeduction: parseDecimal(loan.monthlyDeduction),
      totalPaid: parseDecimal(loan.totalPaid),
      remainingAmount: parseDecimal(loan.remainingAmount),
    };

    return NextResponse.json(response, { status: 201 });
}

export const POST = withErrorHandler(createLoanHandler, { requireAdmin: true, requireModule: 'payroll' });
