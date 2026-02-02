/**
 * @file route.ts
 * @description Per-organization AI usage and settings management for super admin
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { getBudgetStatus } from '@/lib/ai/budget-tracker';
import { z } from 'zod';

const updateSchema = z.object({
  aiChatEnabled: z.boolean().optional(),
  aiTokenBudgetMonthly: z.number().nullable().optional(),
  chatRetentionDays: z.number().nullable().optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orgId } = await params;

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true,
        subscriptionTier: true,
        aiChatEnabled: true,
        aiTokenBudgetMonthly: true,
        chatRetentionDays: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Get budget status
    const budgetStatus = await getBudgetStatus(orgId, organization.subscriptionTier);

    // Get usage breakdown by member
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const memberUsage = await prisma.aIChatUsage.groupBy({
      by: ['memberId'],
      where: {
        tenantId: orgId,
        createdAt: { gte: monthStart },
      },
      _sum: {
        totalTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      },
    });

    // Get member details
    const memberIds = memberUsage.map((m) => m.memberId);
    const members = await prisma.teamMember.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, name: true, email: true, isAdmin: true },
    });

    const memberMap = new Map(members.map((m) => [m.id, m]));

    const memberBreakdown = memberUsage.map((usage) => ({
      memberId: usage.memberId,
      memberName: memberMap.get(usage.memberId)?.name || 'Unknown',
      memberEmail: memberMap.get(usage.memberId)?.email || 'unknown',
      isAdmin: memberMap.get(usage.memberId)?.isAdmin || false,
      totalTokens: usage._sum.totalTokens || 0,
      costUsd: usage._sum.costUsd || 0,
      apiCallCount: usage._count.id,
    })).sort((a, b) => b.totalTokens - a.totalTokens);

    // Get total usage for the period
    const totalUsage = await prisma.aIChatUsage.aggregate({
      where: {
        tenantId: orgId,
        createdAt: { gte: monthStart },
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        costUsd: true,
      },
      _count: {
        id: true,
      },
    });

    // Get audit summary
    const auditStats = await prisma.aIChatAuditLog.aggregate({
      where: {
        tenantId: orgId,
        createdAt: { gte: monthStart },
      },
      _count: {
        id: true,
      },
      _avg: {
        riskScore: true,
      },
    });

    const flaggedCount = await prisma.aIChatAuditLog.count({
      where: {
        tenantId: orgId,
        createdAt: { gte: monthStart },
        flagged: true,
      },
    });

    return NextResponse.json({
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
        subscriptionTier: organization.subscriptionTier,
        aiChatEnabled: organization.aiChatEnabled,
        aiTokenBudgetMonthly: organization.aiTokenBudgetMonthly,
        chatRetentionDays: organization.chatRetentionDays,
      },
      budgetStatus,
      usage: {
        promptTokens: totalUsage._sum.promptTokens || 0,
        completionTokens: totalUsage._sum.completionTokens || 0,
        totalTokens: totalUsage._sum.totalTokens || 0,
        costUsd: totalUsage._sum.costUsd || 0,
        apiCallCount: totalUsage._count.id,
      },
      memberBreakdown,
      auditSummary: {
        totalQueries: auditStats._count.id,
        avgRiskScore: Math.round(auditStats._avg.riskScore || 0),
        flaggedQueries: flaggedCount,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Per-org AI usage error');
    return NextResponse.json(
      { error: 'Failed to get organization AI usage' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orgId } = await params;
    const body = await request.json();
    const result = updateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Verify organization exists
    const existing = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Build update object
    const updateData: {
      aiChatEnabled?: boolean;
      aiTokenBudgetMonthly?: number | null;
      chatRetentionDays?: number | null;
    } = {};

    if (result.data.aiChatEnabled !== undefined) {
      updateData.aiChatEnabled = result.data.aiChatEnabled;
    }
    if (result.data.aiTokenBudgetMonthly !== undefined) {
      updateData.aiTokenBudgetMonthly = result.data.aiTokenBudgetMonthly;
    }
    if (result.data.chatRetentionDays !== undefined) {
      updateData.chatRetentionDays = result.data.chatRetentionDays;
    }

    // Update organization
    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: updateData,
      select: {
        id: true,
        name: true,
        slug: true,
        aiChatEnabled: true,
        aiTokenBudgetMonthly: true,
        chatRetentionDays: true,
      },
    });

    logger.info({ orgId, updates: updateData }, 'Super admin updated org AI settings');

    return NextResponse.json({
      success: true,
      organization: updated,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Per-org AI settings update error');
    return NextResponse.json(
      { error: 'Failed to update organization AI settings' },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
