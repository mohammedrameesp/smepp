/**
 * @file route.ts
 * @description Gratuity calculation API for a specific member
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { calculateGratuity, projectGratuity, getServiceDurationText } from '@/features/payroll/lib/gratuity';
import { parseDecimal } from '@/features/payroll/lib/utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { buildManagerAccessFilter, canAccessMember } from '@/lib/access-control/manager-filter';

async function getGratuityHandler(request: NextRequest, context: APIContext) {
    const { tenant, params, prisma: tenantPrisma } = context;
    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }
    const db = tenantPrisma as TenantPrismaClient;
    const tenantId = tenant.tenantId;
    const memberId = params?.memberId;
    if (!memberId) {
      return NextResponse.json({ error: 'Member ID is required' }, { status: 400 });
    }

    // Check access permissions using centralized helper
    const accessFilter = await buildManagerAccessFilter(db, tenant, { domain: 'finance' });
    if (!canAccessMember(accessFilter, memberId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get member's salary structure and HR fields - verify member belongs to same org
    const member = await db.teamMember.findFirst({
      where: {
        id: memberId,
        tenantId: tenantId,
      },
      include: {
        salaryStructure: true,
      },
    });

    if (!member) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    if (!member.dateOfJoining) {
      return NextResponse.json({
        error: 'Date of joining not set for this employee',
        canCalculate: false,
      }, { status: 200 });
    }

    if (!member.salaryStructure) {
      return NextResponse.json({
        error: 'Salary structure not set for this employee',
        canCalculate: false,
      }, { status: 200 });
    }

    const basicSalary = parseDecimal(member.salaryStructure.basicSalary);
    const dateOfJoining = new Date(member.dateOfJoining);

    // Calculate current gratuity
    const gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining);

    // Calculate projections for different future dates
    const projections = projectGratuity(basicSalary, dateOfJoining, [1, 2, 3, 5, 10]);

    return NextResponse.json({
      canCalculate: true,
      memberId,
      memberName: member.name,
      email: member.email,
      employeeCode: member.employeeCode,
      designation: member.designation,
      dateOfJoining: member.dateOfJoining,
      basicSalary,
      serviceDuration: getServiceDurationText(gratuityCalculation.monthsOfService),
      calculation: gratuityCalculation,
      projections,
    });
}

export const GET = withErrorHandler(getGratuityHandler, { requireAuth: true, requireModule: 'payroll' });
