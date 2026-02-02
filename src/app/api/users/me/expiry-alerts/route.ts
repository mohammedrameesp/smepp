/**
 * @file route.ts
 * @description Current user's document expiry alerts
 * @module system/users
 *
 * NOTE: This endpoint now reads from TeamMember instead of the deprecated HRProfile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { getQatarStartOfDay } from '@/lib/core/datetime';

// GET /api/users/me/expiry-alerts - Get current user's document expiry alerts
async function getExpiryAlertsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const today = getQatarStartOfDay();

  // Get TeamMember (which now contains all HR/document data) - tenant-scoped via extension
  const member = await db.teamMember.findFirst({
    where: {
      id: tenant.userId,
    },
    select: {
      name: true,
      email: true,
      qidExpiry: true,
      passportExpiry: true,
      healthCardExpiry: true,
      licenseExpiry: true,
      hasDrivingLicense: true,
    },
  });

  if (!member) {
    return NextResponse.json({ alerts: [] });
  }

  const getDaysRemaining = (date: Date | null): number | null => {
    if (!date) return null;
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Build alerts array
  const alerts: Array<{
    employeeId: string;
    employeeName: string;
    employeeEmail: string;
    documentType: string;
    expiryDate: string;
    status: 'expired' | 'expiring';
    daysRemaining: number;
  }> = [];

  const addAlert = (documentType: string, expiryDate: Date | null) => {
    if (!expiryDate) return;

    const daysRemaining = getDaysRemaining(expiryDate);
    if (daysRemaining === null || daysRemaining > 30) return;

    alerts.push({
      employeeId: tenant.userId,
      employeeName: member.name || '',
      employeeEmail: member.email || '',
      documentType,
      expiryDate: expiryDate.toISOString(),
      status: daysRemaining < 0 ? 'expired' : 'expiring',
      daysRemaining,
    });
  };

  addAlert('QID', member.qidExpiry);
  addAlert('Passport', member.passportExpiry);
  addAlert('Health Card', member.healthCardExpiry);
  if (member.hasDrivingLicense) {
    addAlert('Driving License', member.licenseExpiry);
  }

  // Sort alerts: expired first (most negative), then by days remaining
  alerts.sort((a, b) => a.daysRemaining - b.daysRemaining);

  return NextResponse.json({
    alerts,
    summary: {
      total: alerts.length,
      expired: alerts.filter((a) => a.status === 'expired').length,
      expiring: alerts.filter((a) => a.status === 'expiring').length,
    },
  });
}

export const GET = withErrorHandler(getExpiryAlertsHandler, { requireAuth: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None needed - file has JSDoc, proper tenant isolation, user-scoped alerts,
 *          clean date handling with Qatar timezone support
 * Issues: None - expiry alert logic is correct and well-documented
 */
