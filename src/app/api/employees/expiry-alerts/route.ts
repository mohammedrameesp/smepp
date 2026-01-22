/**
 * @file route.ts
 * @description Employee document expiry alerts for admin dashboard
 * @module hr/employees
 */

import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// GET /api/employees/expiry-alerts - Get document expiry alerts for admin dashboard
async function getExpiryAlertsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  // Find all team members with expiring or expired documents (tenant-scoped via extension)
  const hrProfiles = await db.teamMember.findMany({
    where: {
      isEmployee: true,
      isDeleted: false,
      OR: [
        { qidExpiry: { lte: thirtyDaysFromNow } },
        { passportExpiry: { lte: thirtyDaysFromNow } },
        { healthCardExpiry: { lte: thirtyDaysFromNow } },
        {
          AND: [
            { hasDrivingLicense: true },
            { licenseExpiry: { lte: thirtyDaysFromNow } },
          ],
        },
        { contractExpiry: { lte: thirtyDaysFromNow } },
      ],
    },
  });

  // TeamMember has name and email directly - no need to filter by isSystemAccount
  const filteredProfiles = hrProfiles;

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

  const getDaysRemaining = (date: Date | null): number | null => {
    if (!date) return null;
    const diffTime = date.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const addAlert = (
    profile: typeof filteredProfiles[0],
    documentType: string,
    expiryDate: Date | null
  ) => {
    if (!expiryDate) return;

    const daysRemaining = getDaysRemaining(expiryDate);
    if (daysRemaining === null || daysRemaining > 30) return;

    alerts.push({
      employeeId: profile.id,
      employeeName: profile.name || '',
      employeeEmail: profile.email,
      documentType,
      expiryDate: expiryDate.toISOString(),
      status: daysRemaining < 0 ? 'expired' : 'expiring',
      daysRemaining,
    });
  };

  filteredProfiles.forEach((profile) => {
    addAlert(profile, 'QID', profile.qidExpiry);
    addAlert(profile, 'Passport', profile.passportExpiry);
    addAlert(profile, 'Health Card', profile.healthCardExpiry);
    if (profile.hasDrivingLicense) {
      addAlert(profile, 'Driving License', profile.licenseExpiry);
    }
    addAlert(profile, 'Contract / Work Permit', profile.contractExpiry);
  });

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

export const GET = withErrorHandler(getExpiryAlertsHandler, { requireAdmin: true, requireModule: 'employees' });
