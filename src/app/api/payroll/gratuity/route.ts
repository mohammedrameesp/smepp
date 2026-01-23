/**
 * @file route.ts
 * @description Gratuity calculation API for all employees
 * @module hr/payroll
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse, notFoundResponse, validationErrorResponse } from '@/lib/http/errors';
import { calculateGratuity, projectGratuity } from '@/features/payroll/lib/gratuity';
import { parseDecimal } from '@/features/payroll/lib/utils';
import { gratuityQuerySchema } from '@/features/payroll/validations/payroll';

export const GET = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;
  const isAdmin = tenant!.isAdmin;

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = gratuityQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return validationErrorResponse(validation);
  }

  const { memberId, terminationDate } = validation.data;

  // Non-admin users can only view their own gratuity
  // userId is the TeamMember ID when isTeamMember=true
  const targetMemberId = isAdmin && memberId ? memberId : userId;

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
    return notFoundResponse('Member not found');
  }

  if (!member.dateOfJoining) {
    return badRequestResponse('Date of joining not set for this employee');
  }

  if (!member.salaryStructure) {
    return badRequestResponse('Salary structure not set for this employee');
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
}, { requireAuth: true, requireModule: 'payroll' });
