import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/core/log';

const BACKUP_BUCKET = 'database-backups';

// GET - Download full backup as JSON file (TENANT-SCOPED)
export async function GET(request: NextRequest) {
  // Check if it's a cron job or admin user
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

  let tenantId: string | undefined;

  if (!isCronJob) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }
  }

  try {
    logger.info(`🚀 Starting database backup for organization: ${tenantId || 'ALL (cron)'}`);

    // Helper to safely query tables that might not exist
    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    // For cron jobs (system backup), export all data
    // For user requests, export only their organization's data
    const tenantFilter = tenantId ? { tenantId } : {};
    const userFilter = tenantId ? {
      organizationMemberships: { some: { organizationId: tenantId } }
    } : {};

    // Export data (tenant-scoped for user requests)
    const [
      users,
      assets,
      assetHistories,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      hrProfiles,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      purchaseRequests,
    ] = await Promise.all([
      prisma.user.findMany({ where: userFilter }),
      prisma.asset.findMany({ where: tenantFilter }),
      tenantId
        ? prisma.assetHistory.findMany({ where: { asset: { tenantId } } })
        : prisma.assetHistory.findMany(),
      prisma.subscription.findMany({ where: tenantFilter }),
      tenantId
        ? safeQuery(prisma.subscriptionHistory.findMany({ where: { subscription: { tenantId } } }), [])
        : safeQuery(prisma.subscriptionHistory.findMany(), []),
      prisma.supplier.findMany({ where: tenantFilter }),
      prisma.supplierEngagement.findMany({ where: tenantFilter }),
      safeQuery(prisma.hRProfile.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.profileChangeRequest.findMany({ where: tenantFilter }), []),
      prisma.activityLog.findMany({ where: tenantFilter }),
      safeQuery(prisma.systemSettings.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.maintenanceRecord.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.purchaseRequest.findMany({ where: tenantFilter }), []),
    ]);

    const timestamp = new Date().toISOString();
    const backupData = {
      _metadata: {
        version: '2.1',
        application: 'Durj',
        createdAt: timestamp,
        organizationId: tenantId || 'ALL',
        description: tenantId ? 'Organization backup' : 'Full platform backup (cron)',
      },
      _counts: {
        users: users.length,
        assets: assets.length,
        assetHistories: assetHistories.length,
        subscriptions: subscriptions.length,
        subscriptionHistories: subscriptionHistories.length,
        suppliers: suppliers.length,
        supplierEngagements: supplierEngagements.length,
        hrProfiles: hrProfiles.length,
        profileChangeRequests: profileChangeRequests.length,
        activityLogs: activityLogs.length,
        systemSettings: systemSettings.length,
        maintenanceRecords: maintenanceRecords.length,
        purchaseRequests: purchaseRequests.length,
      },
      users,
      assets,
      assetHistories,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      hrProfiles,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      purchaseRequests,
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const orgSlug = tenantId ? `-org-${tenantId.substring(0, 8)}` : '';
    const filename = `durj-backup${orgSlug}-${timestamp.replace(/[:.]/g, '-')}.json`;

    // If cron job, save to Supabase Storage
    if (isCronJob) {
      await saveToSupabase(backupJson, filename);
      return NextResponse.json({ success: true, filename, saved: 'supabase' });
    }

    // For manual download, return as file
    return new NextResponse(backupJson, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error: errorMessage }, '❌ Database backup failed');
    return NextResponse.json(
      { error: 'Backup failed', details: errorMessage },
      { status: 500 }
    );
  }
}

async function saveToSupabase(backupJson: string, filename: string) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === BACKUP_BUCKET)) {
    await supabase.storage.createBucket(BACKUP_BUCKET, { public: false });
  }

  // Upload backup
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(filename, Buffer.from(backupJson, 'utf-8'), {
      contentType: 'application/json',
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Clean up old backups (keep last 30)
  const { data: files } = await supabase.storage.from(BACKUP_BUCKET).list();
  if (files && files.length > 30) {
    const oldFiles = files
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .slice(0, files.length - 30)
      .map(f => f.name);
    await supabase.storage.from(BACKUP_BUCKET).remove(oldFiles);
  }

  logger.info(`✅ Backup saved to Supabase: ${filename}`);
}
