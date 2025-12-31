/**
 * @file route.ts
 * @description List backups and trigger manual platform/organization backups
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/log';
import { encryptBackup, redactBackupData } from '@/lib/security/backup-encryption';

const BACKUP_BUCKET = 'database-backups';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET - List all backups
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = getSupabaseClient();

    // Ensure bucket exists
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.some(b => b.name === BACKUP_BUCKET)) {
      return NextResponse.json({ backups: [], organizations: [] });
    }

    // List all folders (full + orgs)
    const { data: topLevel, error: topError } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list('', { limit: 100 });

    if (topError) throw topError;

    const backups: {
      type: 'full' | 'organization';
      organization?: string;
      filename: string;
      path: string;
      size: number;
      createdAt: string;
    }[] = [];

    // Get full backups
    const { data: fullBackups } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list('full', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

    if (fullBackups) {
      for (const file of fullBackups) {
        if (file.name.endsWith('.json') || file.name.endsWith('.enc')) {
          backups.push({
            type: 'full',
            filename: file.name,
            path: `full/${file.name}`,
            size: file.metadata?.size || 0,
            createdAt: file.created_at,
          });
        }
      }
    }

    // Get organization folders
    const orgFolders = topLevel?.filter(item => item.name !== 'full' && !item.name.endsWith('.json')) || [];

    for (const folder of orgFolders) {
      const { data: orgBackups } = await supabase.storage
        .from(BACKUP_BUCKET)
        .list(`orgs/${folder.name}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

      if (orgBackups) {
        for (const file of orgBackups) {
          if (file.name.endsWith('.json') || file.name.endsWith('.enc')) {
            backups.push({
              type: 'organization',
              organization: folder.name,
              filename: file.name,
              path: `orgs/${folder.name}/${file.name}`,
              size: file.metadata?.size || 0,
              createdAt: file.created_at,
            });
          }
        }
      }
    }

    // Also check orgs folder directly
    const { data: orgsFolder } = await supabase.storage
      .from(BACKUP_BUCKET)
      .list('orgs', { limit: 100 });

    if (orgsFolder) {
      for (const orgFolder of orgsFolder) {
        if (!orgFolder.name.endsWith('.json')) {
          const { data: orgBackups } = await supabase.storage
            .from(BACKUP_BUCKET)
            .list(`orgs/${orgFolder.name}`, { limit: 100, sortBy: { column: 'created_at', order: 'desc' } });

          if (orgBackups) {
            for (const file of orgBackups) {
              if ((file.name.endsWith('.json') || file.name.endsWith('.enc')) && !backups.some(b => b.path === `orgs/${orgFolder.name}/${file.name}`)) {
                backups.push({
                  type: 'organization',
                  organization: orgFolder.name,
                  filename: file.name,
                  path: `orgs/${orgFolder.name}/${file.name}`,
                  size: file.metadata?.size || 0,
                  createdAt: file.created_at,
                });
              }
            }
          }
        }
      }
    }

    // Get list of organizations for UI
    const organizations = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });

    // Sort backups by date descending
    backups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({ backups, organizations });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to list backups');
    return NextResponse.json(
      { error: 'Failed to list backups', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST - Trigger manual backup
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { type, organizationId } = body as { type: 'full' | 'organization' | 'all'; organizationId?: string };

    const results: { type: string; organization?: string; filename: string; success: boolean; error?: string }[] = [];

    if (type === 'full' || type === 'all') {
      // Full platform backup
      const result = await createFullBackup();
      results.push({ type: 'full', ...result });
    }

    if (type === 'organization' && organizationId) {
      // Single organization backup
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { slug: true },
      });
      if (org) {
        const result = await createOrganizationBackup(organizationId, org.slug);
        results.push({ type: 'organization', organization: org.slug, ...result });
      }
    }

    if (type === 'all') {
      // All organizations backup
      const organizations = await prisma.organization.findMany({
        select: { id: true, slug: true },
      });

      for (const org of organizations) {
        const result = await createOrganizationBackup(org.id, org.slug);
        results.push({ type: 'organization', organization: org.slug, ...result });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Manual backup failed');
    return NextResponse.json(
      { error: 'Backup failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function createFullBackup(): Promise<{ filename: string; success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `full-backup-${timestamp}.json`;

    // Helper to safely query tables
    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    // Export all platform data
    const [
      organizations,
      organizationUsers,
      organizationInvitations,
      users,
      assets,
      assetHistories,
      assetRequests,
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
      purchaseRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      projects,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    ] = await Promise.all([
      prisma.organization.findMany(),
      prisma.organizationUser.findMany(),
      safeQuery(prisma.organizationInvitation.findMany(), []),
      prisma.user.findMany(),
      prisma.asset.findMany(),
      prisma.assetHistory.findMany(),
      safeQuery(prisma.assetRequest.findMany(), []),
      prisma.subscription.findMany(),
      safeQuery(prisma.subscriptionHistory.findMany(), []),
      prisma.supplier.findMany(),
      prisma.supplierEngagement.findMany(),
      safeQuery(prisma.hRProfile.findMany(), []),
      safeQuery(prisma.profileChangeRequest.findMany(), []),
      prisma.activityLog.findMany(),
      safeQuery(prisma.systemSettings.findMany(), []),
      safeQuery(prisma.maintenanceRecord.findMany(), []),
      safeQuery(prisma.purchaseRequest.findMany(), []),
      safeQuery(prisma.purchaseRequestItem.findMany(), []),
      safeQuery(prisma.leaveType.findMany(), []),
      safeQuery(prisma.leaveBalance.findMany(), []),
      safeQuery(prisma.leaveRequest.findMany(), []),
      safeQuery(prisma.salaryStructure.findMany(), []),
      safeQuery(prisma.payrollRun.findMany(), []),
      safeQuery(prisma.payslip.findMany(), []),
      safeQuery(prisma.employeeLoan.findMany(), []),
      safeQuery(prisma.project.findMany(), []),
      safeQuery(prisma.approvalPolicy.findMany(), []),
      safeQuery(prisma.companyDocumentType.findMany(), []),
      safeQuery(prisma.companyDocument.findMany(), []),
      safeQuery(prisma.notification.findMany(), []),
    ]);

    const backupData = {
      _metadata: {
        version: '3.0',
        application: 'Durj',
        type: 'full',
        createdAt: new Date().toISOString(),
        description: 'Full platform backup - All organizations',
      },
      _counts: {
        organizations: organizations.length,
        users: users.length,
        assets: assets.length,
        subscriptions: subscriptions.length,
        suppliers: suppliers.length,
      },
      organizations,
      organizationUsers,
      organizationInvitations,
      users,
      assets,
      assetHistories,
      assetRequests,
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
      purchaseRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      projects,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    };

    // SECURITY: Redact sensitive fields and encrypt before storage
    const redactedData = redactBackupData(backupData);
    const backupJson = JSON.stringify(redactedData, null, 2);
    const encryptedBackup = encryptBackup(backupJson);
    const encryptedFilename = filename.replace('.json', '.enc');
    await saveToSupabase(encryptedBackup, `full/${encryptedFilename}`);

    logger.info(`Full backup created (encrypted): ${encryptedFilename}`);
    return { filename: encryptedFilename, success: true };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Full backup failed');
    return { filename: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function createOrganizationBackup(tenantId: string, orgSlug: string): Promise<{ filename: string; success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${orgSlug}-${timestamp}.json`;

    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    const tenantFilter = { tenantId };
    const userFilter = { organizationMemberships: { some: { organizationId: tenantId } } };

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: tenantId },
    });

    const [
      organizationUsers,
      users,
      assets,
      assetHistories,
      assetRequests,
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
      purchaseRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      projects,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    ] = await Promise.all([
      prisma.organizationUser.findMany({ where: { organizationId: tenantId } }),
      prisma.user.findMany({ where: userFilter }),
      prisma.asset.findMany({ where: tenantFilter }),
      prisma.assetHistory.findMany({ where: { asset: { tenantId } } }),
      safeQuery(prisma.assetRequest.findMany({ where: tenantFilter }), []),
      prisma.subscription.findMany({ where: tenantFilter }),
      safeQuery(prisma.subscriptionHistory.findMany({ where: { subscription: { tenantId } } }), []),
      prisma.supplier.findMany({ where: tenantFilter }),
      prisma.supplierEngagement.findMany({ where: tenantFilter }),
      safeQuery(prisma.hRProfile.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.profileChangeRequest.findMany({ where: tenantFilter }), []),
      prisma.activityLog.findMany({ where: tenantFilter }),
      safeQuery(prisma.systemSettings.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.maintenanceRecord.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.purchaseRequest.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.purchaseRequestItem.findMany({ where: { purchaseRequest: { tenantId } } }), []),
      safeQuery(prisma.leaveType.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.leaveBalance.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.leaveRequest.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.salaryStructure.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.payrollRun.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.payslip.findMany({ where: { payrollRun: { tenantId } } }), []),
      safeQuery(prisma.employeeLoan.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.project.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.approvalPolicy.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.companyDocumentType.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.companyDocument.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.notification.findMany({ where: tenantFilter }), []),
    ]);

    const backupData = {
      _metadata: {
        version: '3.0',
        application: 'Durj',
        type: 'organization',
        organizationId: tenantId,
        organizationSlug: orgSlug,
        organizationName: organization?.name,
        createdAt: new Date().toISOString(),
        description: `Organization backup - ${organization?.name || orgSlug}`,
      },
      _counts: {
        users: users.length,
        assets: assets.length,
        subscriptions: subscriptions.length,
        suppliers: suppliers.length,
      },
      organization,
      organizationUsers,
      users,
      assets,
      assetHistories,
      assetRequests,
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
      purchaseRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      projects,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    };

    // SECURITY: Redact sensitive fields and encrypt before storage
    const redactedData = redactBackupData(backupData);
    const backupJson = JSON.stringify(redactedData, null, 2);
    const encryptedBackup = encryptBackup(backupJson);
    const encryptedFilename = filename.replace('.json', '.enc');
    await saveToSupabase(encryptedBackup, `orgs/${orgSlug}/${encryptedFilename}`);

    // Clean up old backups for this org (keep last 30)
    await cleanupOldBackups(`orgs/${orgSlug}`);

    logger.info(`Organization backup created (encrypted): ${orgSlug}/${encryptedFilename}`);
    return { filename: encryptedFilename, success: true };
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error', orgSlug }, 'Organization backup failed');
    return { filename: '', success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

async function saveToSupabase(backupData: Buffer, path: string) {
  const supabase = getSupabaseClient();

  // Ensure bucket exists
  const { data: buckets } = await supabase.storage.listBuckets();
  if (!buckets?.some(b => b.name === BACKUP_BUCKET)) {
    await supabase.storage.createBucket(BACKUP_BUCKET, { public: false });
  }

  // Upload encrypted backup
  const { error } = await supabase.storage
    .from(BACKUP_BUCKET)
    .upload(path, backupData, {
      contentType: 'application/octet-stream', // Encrypted binary data
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);
}

async function cleanupOldBackups(folder: string) {
  try {
    const supabase = getSupabaseClient();
    const { data: files } = await supabase.storage.from(BACKUP_BUCKET).list(folder);

    if (files && files.length > 30) {
      const oldFiles = files
        .filter(f => f.name.endsWith('.json') || f.name.endsWith('.enc'))
        .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        .slice(0, files.length - 30)
        .map(f => `${folder}/${f.name}`);

      if (oldFiles.length > 0) {
        await supabase.storage.from(BACKUP_BUCKET).remove(oldFiles);
        logger.info(`Cleaned up ${oldFiles.length} old backups from ${folder}`);
      }
    }
  } catch (error) {
    logger.warn({ error: error instanceof Error ? error.message : 'Unknown error', folder }, 'Failed to cleanup old backups');
  }
}

// Export for cron job
export { createFullBackup, createOrganizationBackup };
