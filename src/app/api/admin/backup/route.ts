import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/log';

const BACKUP_BUCKET = 'database-backups';

// GET - Download full backup as JSON file
export async function GET(request: NextRequest) {
  // Check if it's a cron job or admin user
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isCronJob) {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    logger.info('🚀 Starting full database backup');

    // Helper to safely query tables that might not exist
    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    // Export ALL data from ALL tables
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
      // Purchase Requests
      purchaseRequests,
      purchaseRequestItems,
      purchaseRequestHistory,
    ] = await Promise.all([
      prisma.user.findMany(),
      prisma.asset.findMany(),
      prisma.assetHistory.findMany(),
      prisma.subscription.findMany(),
      safeQuery(prisma.subscriptionHistory.findMany(), []),
      prisma.supplier.findMany(),
      prisma.supplierEngagement.findMany(),
      safeQuery(prisma.hRProfile.findMany(), []),
      safeQuery(prisma.profileChangeRequest.findMany(), []),
      prisma.activityLog.findMany(),
      safeQuery(prisma.systemSettings.findMany(), []),
      safeQuery(prisma.maintenanceRecord.findMany(), []),
      // Purchase Requests
      safeQuery(prisma.purchaseRequest.findMany(), []),
      safeQuery(prisma.purchaseRequestItem.findMany(), []),
      safeQuery(prisma.purchaseRequestHistory.findMany(), []),
    ]);

    const timestamp = new Date().toISOString();
    const backupData = {
      _metadata: {
        version: '2.0',
        application: 'DAMP',
        createdAt: timestamp,
        description: 'Full database backup - use this to restore all data',
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
        // Purchase Requests
        purchaseRequests: purchaseRequests.length,
        purchaseRequestItems: purchaseRequestItems.length,
        purchaseRequestHistory: purchaseRequestHistory.length,
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
      // Purchase Requests
      purchaseRequests,
      purchaseRequestItems,
      purchaseRequestHistory,
    };

    const backupJson = JSON.stringify(backupData, null, 2);
    const filename = `damp-full-backup-${timestamp.replace(/[:.]/g, '-')}.json`;

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
    logger.error({ error }, '❌ Database backup failed');
    return NextResponse.json(
      { error: 'Backup failed', details: error instanceof Error ? error.message : 'Unknown error' },
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
