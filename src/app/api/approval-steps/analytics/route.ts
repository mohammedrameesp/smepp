/**
 * @file route.ts
 * @description Approval analytics and reports API
 * @module domains/system/approvals
 *
 * Provides compliance reporting for approval workflows including:
 * - Approval counts by status, module, and role
 * - Average approval time
 * - Approver activity metrics
 * - Pending approval aging
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { ApprovalModule, ApprovalStepStatus } from '@prisma/client';

// Query schema for analytics
const analyticsQuerySchema = z.object({
  // Date range filters
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  // Module filter
  module: z.enum(['LEAVE_REQUEST', 'SPEND_REQUEST', 'ASSET_REQUEST']).optional(),
  // Include detailed breakdowns
  includeByModule: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  includeByRole: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  includeByApprover: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  includePendingAging: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
});

async function getApprovalAnalyticsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;

  // Parse query params
  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
  const validation = analyticsQuerySchema.safeParse(searchParams);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: validation.error.issues,
    }, { status: 400 });
  }

  const { startDate, endDate, module, includeByModule, includeByRole, includeByApprover, includePendingAging } = validation.data;

  // Build date filters
  const dateFilter: { createdAt?: { gte?: Date; lte?: Date } } = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.lte = new Date(endDate);
  }

  // Build base where clause
  const baseWhere = {
    tenantId,
    ...(module && { entityType: module as ApprovalModule }),
    ...dateFilter,
  };

  // Get summary counts
  const [totalCount, pendingCount, approvedCount, rejectedCount, skippedCount] = await Promise.all([
    db.approvalStep.count({ where: baseWhere }),
    db.approvalStep.count({ where: { ...baseWhere, status: 'PENDING' } }),
    db.approvalStep.count({ where: { ...baseWhere, status: 'APPROVED' } }),
    db.approvalStep.count({ where: { ...baseWhere, status: 'REJECTED' } }),
    db.approvalStep.count({ where: { ...baseWhere, status: 'SKIPPED' } }),
  ]);

  // Calculate average approval time (for completed steps)
  const completedSteps = await db.approvalStep.findMany({
    where: {
      ...baseWhere,
      status: { in: ['APPROVED', 'REJECTED'] },
      actionAt: { not: null },
    },
    select: {
      createdAt: true,
      actionAt: true,
    },
  });

  let averageApprovalTimeHours: number | null = null;
  if (completedSteps.length > 0) {
    const totalHours = completedSteps.reduce((sum, step) => {
      if (step.actionAt) {
        const diffMs = step.actionAt.getTime() - step.createdAt.getTime();
        return sum + (diffMs / (1000 * 60 * 60)); // Convert to hours
      }
      return sum;
    }, 0);
    averageApprovalTimeHours = Math.round((totalHours / completedSteps.length) * 10) / 10;
  }

  const result: {
    summary: {
      total: number;
      pending: number;
      approved: number;
      rejected: number;
      skipped: number;
      averageApprovalTimeHours: number | null;
    };
    byModule?: Record<string, { total: number; pending: number; approved: number; rejected: number }>;
    byRole?: Record<string, { total: number; pending: number; approved: number; rejected: number }>;
    byApprover?: Array<{ approverId: string; name: string | null; email: string; approvalCount: number }>;
    pendingAging?: {
      lessThan24h: number;
      oneToThreeDays: number;
      threeToSevenDays: number;
      moreThanSevenDays: number;
    };
  } = {
    summary: {
      total: totalCount,
      pending: pendingCount,
      approved: approvedCount,
      rejected: rejectedCount,
      skipped: skippedCount,
      averageApprovalTimeHours,
    },
  };

  // Breakdown by module
  if (includeByModule) {
    const moduleStats = await Promise.all(
      (['LEAVE_REQUEST', 'SPEND_REQUEST', 'ASSET_REQUEST'] as ApprovalModule[]).map(async (mod) => {
        const [total, pending, approved, rejected] = await Promise.all([
          db.approvalStep.count({ where: { ...baseWhere, entityType: mod } }),
          db.approvalStep.count({ where: { ...baseWhere, entityType: mod, status: 'PENDING' } }),
          db.approvalStep.count({ where: { ...baseWhere, entityType: mod, status: 'APPROVED' } }),
          db.approvalStep.count({ where: { ...baseWhere, entityType: mod, status: 'REJECTED' } }),
        ]);
        return { module: mod, total, pending, approved, rejected };
      })
    );

    result.byModule = moduleStats.reduce((acc, stat) => {
      acc[stat.module] = { total: stat.total, pending: stat.pending, approved: stat.approved, rejected: stat.rejected };
      return acc;
    }, {} as Record<string, { total: number; pending: number; approved: number; rejected: number }>);
  }

  // Breakdown by role
  if (includeByRole) {
    const roleStats = await Promise.all(
      (['MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR'] as const).map(async (role) => {
        const [total, pending, approved, rejected] = await Promise.all([
          db.approvalStep.count({ where: { ...baseWhere, requiredRole: role } }),
          db.approvalStep.count({ where: { ...baseWhere, requiredRole: role, status: 'PENDING' } }),
          db.approvalStep.count({ where: { ...baseWhere, requiredRole: role, status: 'APPROVED' } }),
          db.approvalStep.count({ where: { ...baseWhere, requiredRole: role, status: 'REJECTED' } }),
        ]);
        return { role, total, pending, approved, rejected };
      })
    );

    result.byRole = roleStats.reduce((acc, stat) => {
      acc[stat.role] = { total: stat.total, pending: stat.pending, approved: stat.approved, rejected: stat.rejected };
      return acc;
    }, {} as Record<string, { total: number; pending: number; approved: number; rejected: number }>);
  }

  // Top approvers
  if (includeByApprover) {
    const approverStats = await db.approvalStep.groupBy({
      by: ['approverId'],
      where: {
        ...baseWhere,
        approverId: { not: null },
        status: { in: ['APPROVED', 'REJECTED'] },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Get approver details
    const approverIds = approverStats.map(s => s.approverId).filter((id): id is string => id !== null);
    const approvers = await db.teamMember.findMany({
      where: { id: { in: approverIds } },
      select: { id: true, name: true, email: true },
    });

    const approverMap = new Map(approvers.map(a => [a.id, a]));

    result.byApprover = approverStats.map(stat => {
      const approver = approverMap.get(stat.approverId!);
      return {
        approverId: stat.approverId!,
        name: approver?.name || null,
        email: approver?.email || 'Unknown',
        approvalCount: stat._count.id,
      };
    });
  }

  // Pending approval aging
  if (includePendingAging) {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [lessThan24h, oneToThreeDays, threeToSevenDays, moreThanSevenDays] = await Promise.all([
      db.approvalStep.count({
        where: { ...baseWhere, status: 'PENDING', createdAt: { gte: oneDayAgo } },
      }),
      db.approvalStep.count({
        where: { ...baseWhere, status: 'PENDING', createdAt: { gte: threeDaysAgo, lt: oneDayAgo } },
      }),
      db.approvalStep.count({
        where: { ...baseWhere, status: 'PENDING', createdAt: { gte: sevenDaysAgo, lt: threeDaysAgo } },
      }),
      db.approvalStep.count({
        where: { ...baseWhere, status: 'PENDING', createdAt: { lt: sevenDaysAgo } },
      }),
    ]);

    result.pendingAging = {
      lessThan24h,
      oneToThreeDays,
      threeToSevenDays,
      moreThanSevenDays,
    };
  }

  return NextResponse.json(result);
}

export const GET = withErrorHandler(getApprovalAnalyticsHandler, { requireAdmin: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
