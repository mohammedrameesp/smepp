import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/super-admin/whatsapp/stats
// Get platform-wide WhatsApp usage statistics
// ═══════════════════════════════════════════════════════════════════════════════

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get message stats for current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [
      totalMessagesSent,
      totalDelivered,
      totalFailed,
      platformMessages,
      customMessages,
      tenantsWithWhatsApp,
    ] = await Promise.all([
      // Total messages sent this month
      prisma.whatsAppMessageLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'sent',
        },
      }),
      // Total delivered
      prisma.whatsAppMessageLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'delivered',
        },
      }),
      // Total failed
      prisma.whatsAppMessageLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          status: 'failed',
        },
      }),
      // Messages sent via platform config
      prisma.whatsAppMessageLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          configSource: 'PLATFORM',
        },
      }),
      // Messages sent via custom config
      prisma.whatsAppMessageLog.count({
        where: {
          createdAt: { gte: startOfMonth },
          configSource: 'CUSTOM',
        },
      }),
      // Count tenants by WhatsApp source
      prisma.organization.groupBy({
        by: ['whatsAppSource'],
        _count: { id: true },
      }),
    ]);

    // Parse tenant counts
    const tenantCounts = tenantsWithWhatsApp.reduce(
      (acc, item) => {
        acc[item.whatsAppSource] = item._count.id;
        return acc;
      },
      { NONE: 0, PLATFORM: 0, CUSTOM: 0 } as Record<string, number>
    );

    // Get top tenants by message count
    const topTenants = await prisma.whatsAppMessageLog.groupBy({
      by: ['tenantId', 'configSource'],
      where: {
        createdAt: { gte: startOfMonth },
      },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    });

    // Fetch organization names for top tenants
    const tenantIds = [...new Set(topTenants.map((t) => t.tenantId))];
    const organizations = await prisma.organization.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, name: true },
    });
    const orgMap = new Map(organizations.map((o) => [o.id, o.name]));

    return NextResponse.json({
      platform: {
        totalMessagesSent,
        totalDelivered,
        totalFailed,
        platformMessages,
        customMessages,
        tenantsUsingNone: tenantCounts.NONE,
        tenantsUsingPlatform: tenantCounts.PLATFORM,
        tenantsUsingCustom: tenantCounts.CUSTOM,
      },
      topTenants: topTenants.map((t) => ({
        organizationId: t.tenantId,
        organizationName: orgMap.get(t.tenantId) || 'Unknown',
        messageCount: t._count.id,
        source: t.configSource || 'UNKNOWN',
      })),
      period: {
        startDate: startOfMonth.toISOString(),
        endDate: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Get WhatsApp stats error:', error);
    return NextResponse.json(
      { error: 'Failed to get WhatsApp statistics' },
      { status: 500 }
    );
  }
}
