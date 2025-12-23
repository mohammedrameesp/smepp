import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Role } from '@prisma/client';

// GET /api/employees/expiry-alerts - Get document expiry alerts for admin dashboard
export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can view all employees' expiry alerts
    if (session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const thirtyDaysFromNow = new Date(today);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    // Find all HR profiles with expiring or expired documents
    const hrProfiles = await prisma.hRProfile.findMany({
      where: {
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
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isSystemAccount: true,
          },
        },
      },
    });

    // Filter out system accounts
    const filteredProfiles = hrProfiles.filter((p) => !p.user.isSystemAccount);

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
        employeeId: profile.user.id,
        employeeName: profile.user.name || '',
        employeeEmail: profile.user.email,
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
  } catch (error) {
    console.error('Get expiry alerts error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch expiry alerts' },
      { status: 500 }
    );
  }
}
