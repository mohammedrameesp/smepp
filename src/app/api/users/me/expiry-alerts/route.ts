/**
 * @file route.ts
 * @description Current user's document expiry alerts
 * @module system/users
 *
 * NOTE: This endpoint now reads from TeamMember instead of the deprecated HRProfile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// GET /api/users/me/expiry-alerts - Get current user's document expiry alerts
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get TeamMember (which now contains all HR/document data)
    const member = await prisma.teamMember.findUnique({
      where: { id: session.user.id },
      select: {
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
        employeeId: session.user.id,
        employeeName: session.user.name || '',
        employeeEmail: session.user.email || '',
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
  } catch (error) {
    console.error('Get expiry alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiry alerts' },
      { status: 500 }
    );
  }
}
