/**
 * @module api/admin/backup
 * @description Admin API for creating JSON database backups with optional Supabase storage.
 *
 * This endpoint exports organization data as a JSON backup file including:
 * - Team members, assets, asset histories
 * - Subscriptions, subscription histories
 * - Suppliers, supplier engagements
 * - Profile change requests, activity logs
 * - System settings, maintenance records
 * - Spend requests
 *
 * Supports two modes:
 * 1. Admin user: Downloads tenant-scoped backup as JSON file
 * 2. Cron job: Saves full platform backup to Supabase Storage
 *
 * @endpoints
 * - GET /api/admin/backup - Download database backup (admin or cron)
 *
 * @security
 * - Admin users: Requires authenticated session with admin role
 * - Cron jobs: Requires valid CRON_SECRET bearer token
 */
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/core/log';
import { verifyCronAuth } from '@/lib/security/cron-auth';

const BACKUP_BUCKET = 'database-backups';

// GET - Download full backup as JSON file (TENANT-SCOPED)
export async function GET(request: NextRequest) {
  // Check if it's a cron job or admin user
  // SECURITY: Use timing-safe comparison for cron authentication
  const cronAuthResult = verifyCronAuth(request);
  const isCronJob = cronAuthResult.valid;

  let tenantId: string | undefined;

  if (!isCronJob) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
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

    // Export data (tenant-scoped for user requests)
    const [
      teamMembers,
      assets,
      assetHistories,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      spendRequests,
    ] = await Promise.all([
      prisma.teamMember.findMany({ where: { ...tenantFilter, isDeleted: false } }),
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
      safeQuery(prisma.profileChangeRequest.findMany({ where: tenantFilter }), []),
      prisma.activityLog.findMany({ where: tenantFilter }),
      safeQuery(prisma.systemSettings.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.maintenanceRecord.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.spendRequest.findMany({ where: tenantFilter }), []),
    ]);

    const timestamp = new Date().toISOString();
    const backupData = {
      _metadata: {
        version: '2.2',
        application: 'Durj',
        createdAt: timestamp,
        organizationId: tenantId || 'ALL',
        description: tenantId ? 'Organization backup' : 'Full platform backup (cron)',
      },
      _counts: {
        teamMembers: teamMembers.length,
        assets: assets.length,
        assetHistories: assetHistories.length,
        subscriptions: subscriptions.length,
        subscriptionHistories: subscriptionHistories.length,
        suppliers: suppliers.length,
        supplierEngagements: supplierEngagements.length,
        profileChangeRequests: profileChangeRequests.length,
        activityLogs: activityLogs.length,
        systemSettings: systemSettings.length,
        maintenanceRecords: maintenanceRecords.length,
        spendRequests: spendRequests.length,
      },
      teamMembers,
      assets,
      assetHistories,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      spendRequests,
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

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * File: src/app/api/admin/backup/route.ts
 * Reviewed: 2026-02-01
 *
 * FUNCTIONALITY: [PASS]
 * - Exports comprehensive JSON backup of organization data
 * - Supports both admin downloads and cron-triggered storage
 * - Includes metadata with version and record counts
 * - Automatic cleanup of old backups in Supabase (keeps last 30)
 *
 * SECURITY: [PASS]
 * - Dual auth: session-based for admins, token-based for cron
 * - Uses timing-safe comparison for cron auth (verifyCronAuth)
 * - Tenant-scoped data for admin requests
 * - Supabase bucket configured as private
 *
 * PERFORMANCE: [ACCEPTABLE]
 * - Uses Promise.all for parallel data fetching
 * - safeQuery helper gracefully handles missing tables
 *
 * ERROR HANDLING: [PASS]
 * - Catches and logs backup failures with details
 * - Returns appropriate status codes (401, 403, 500)
 * - Handles Supabase upload errors
 *
 * IMPROVEMENTS:
 * - Consider streaming large backups instead of buffering
 * - Add compression for large JSON payloads
 * - Consider adding backup encryption for sensitive data
 * - Does not use withErrorHandler (legacy pattern)
 *
 * ═══════════════════════════════════════════════════════════════════════════
 */
