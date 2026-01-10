/**
 * @file route.ts
 * @description Gratuity calculation API for all employees
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { calculateGratuity, projectGratuity } from '@/features/payroll/lib/gratuity';
import { parseDecimal } from '@/features/payroll/lib/utils';
import { gratuityQuerySchema } from '@/features/payroll/validations/payroll';
import logger from '@/lib/core/log';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = gratuityQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { memberId, terminationDate } = validation.data;
    const isAdmin = session.user.teamMemberRole === 'ADMIN';

    // Non-admin users can only view their own gratuity
    // session.user.id is the TeamMember ID when isTeamMember=true
    const targetMemberId = isAdmin && memberId ? memberId : session.user.id;

    // Get member's salary structure and HR fields - verify member belongs to same org
    const member = await prisma.teamMember.findFirst({
      where: {
        id: targetMemberId,
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
      }, { status: 400 });
    }

    if (!member.salaryStructure) {
      return NextResponse.json({
        error: 'Salary structure not set for this employee',
      }, { status: 400 });
    }

    const basicSalary = parseDecimal(member.salaryStructure.basicSalary);
    const dateOfJoining = new Date(member.dateOfJoining);

    // Use termination date priority: query param > member field > today
    // If employee has left (dateOfLeaving set), use that date to freeze calculations
    const termDate = terminationDate
      ? new Date(terminationDate)
      : member.dateOfLeaving
        ? new Date(member.dateOfLeaving)
        : new Date();

    const isTerminated = !!member.dateOfLeaving;

    // Calculate current gratuity
    const gratuityCalculation = calculateGratuity(basicSalary, dateOfJoining, termDate);

    // Calculate projections
    const projections = projectGratuity(basicSalary, dateOfJoining, [1, 2, 3, 5, 10]);

    return NextResponse.json({
      memberId: targetMemberId,
      memberName: member.name,
      employeeCode: member.employeeCode,
      designation: member.designation,
      dateOfJoining: member.dateOfJoining,
      basicSalary,
      terminationDate: termDate.toISOString(),
      isTerminated, // True if employee is soft-deleted/terminated
      calculation: gratuityCalculation,
      projections: isTerminated ? [] : projections, // No future projections for terminated employees
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Gratuity calculation error');
    return NextResponse.json(
      { error: 'Failed to calculate gratuity' },
      { status: 500 }
    );
  }
}
