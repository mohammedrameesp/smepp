/**
 * @file route.ts
 * @description Automated cron job for scheduled platform and organization backups
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/core/log';
import { encryptBackup, redactBackupData } from '@/lib/security/backup-encryption';
import { verifyCronAuth } from '@/lib/security/cron-auth';

const BACKUP_BUCKET = 'database-backups';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET - Cron endpoint for automated backups (4 AM Qatar time = 1 AM UTC)
export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authResult = verifyCronAuth(request);
  if (!authResult.valid) {
    logger.warn({ error: authResult.error }, 'Cron auth failed');
    return NextResponse.json({ error: 'Authentication required', details: authResult.error }, { status: 401 });
  }

  logger.info('Starting scheduled backup job (4 AM Qatar time)');

  const results: { type: string; organization?: string; filename: string; success: boolean; error?: string }[] = [];

  try {
    // 1. Create full platform backup
    const fullBackupResult = await createFullBackup();
    results.push({ type: 'full', ...fullBackupResult });

    // 2. Create individual organization backups
    const organizations = await prisma.organization.findMany({
      select: { id: true, slug: true, name: true },
    });

    for (const org of organizations) {
      const orgResult = await createOrganizationBackup(org.id, org.slug);
      results.push({ type: 'organization', organization: org.slug, ...orgResult });
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    logger.info(`Scheduled backup completed: ${successCount} successful, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Backup completed: ${successCount} successful, ${failCount} failed`,
      results,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Scheduled backup job failed');
    return NextResponse.json(
      { error: 'Backup job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

async function createFullBackup(): Promise<{ filename: string; success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `full-backup-${timestamp}.json`;

    const safeQuery = async <T>(query: Promise<T>, fallback: T): Promise<T> => {
      try {
        return await query;
      } catch {
        return fallback;
      }
    };

    const [
      organizations,
      teamMembers,
      organizationInvitations,
      users,
      assets,
      assetHistories,
      assetRequests,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      spendRequests,
      spendRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    ] = await Promise.all([
      prisma.organization.findMany(),
      prisma.teamMember.findMany(),
      safeQuery(prisma.organizationInvitation.findMany(), []),
      prisma.user.findMany(),
      prisma.asset.findMany(),
      prisma.assetHistory.findMany(),
      safeQuery(prisma.assetRequest.findMany(), []),
      prisma.subscription.findMany(),
      safeQuery(prisma.subscriptionHistory.findMany(), []),
      prisma.supplier.findMany(),
      prisma.supplierEngagement.findMany(),
      // HRProfile removed - data now in TeamMember
      safeQuery(prisma.profileChangeRequest.findMany(), []),
      prisma.activityLog.findMany(),
      safeQuery(prisma.systemSettings.findMany(), []),
      safeQuery(prisma.maintenanceRecord.findMany(), []),
      safeQuery(prisma.spendRequest.findMany(), []),
      safeQuery(prisma.spendRequestItem.findMany(), []),
      safeQuery(prisma.leaveType.findMany(), []),
      safeQuery(prisma.leaveBalance.findMany(), []),
      safeQuery(prisma.leaveRequest.findMany(), []),
      safeQuery(prisma.salaryStructure.findMany(), []),
      safeQuery(prisma.payrollRun.findMany(), []),
      safeQuery(prisma.payslip.findMany(), []),
      safeQuery(prisma.employeeLoan.findMany(), []),
      safeQuery(prisma.approvalPolicy.findMany(), []),
      safeQuery(prisma.companyDocumentType.findMany(), []),
      safeQuery(prisma.companyDocument.findMany(), []),
      safeQuery(prisma.notification.findMany(), []),
    ]);

    const backupData = {
      _metadata: {
        version: '4.0', // Updated version for TeamMember-based backup
        application: 'Durj',
        type: 'full',
        createdAt: new Date().toISOString(),
        trigger: 'cron',
        description: 'Full platform backup - Scheduled (4 AM Qatar time)',
      },
      _counts: {
        organizations: organizations.length,
        teamMembers: teamMembers.length,
        users: users.length,
        assets: assets.length,
        subscriptions: subscriptions.length,
        suppliers: suppliers.length,
      },
      organizations,
      teamMembers,
      organizationInvitations,
      users,
      assets,
      assetHistories,
      assetRequests,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      spendRequests,
      spendRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    };

    // SECURITY: Redact sensitive fields and encrypt before storage
    const redactedData = redactBackupData(backupData);
    const backupJson = JSON.stringify(redactedData, null, 2);
    const encryptedBackup = encryptBackup(backupJson);
    await saveToSupabase(encryptedBackup, `full/${filename.replace('.json', '.enc')}`);

    // Clean up old full backups (keep last 30)
    await cleanupOldBackups('full');

    logger.info(`Full backup created: ${filename}`);
    return { filename, success: true };
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

    const organization = await prisma.organization.findUnique({
      where: { id: tenantId },
    });

    const [
      teamMembers,
      assets,
      assetHistories,
      assetRequests,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      spendRequests,
      spendRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    ] = await Promise.all([
      prisma.teamMember.findMany({ where: tenantFilter }),
      prisma.asset.findMany({ where: tenantFilter }),
      prisma.assetHistory.findMany({ where: { asset: { tenantId } } }),
      safeQuery(prisma.assetRequest.findMany({ where: tenantFilter }), []),
      prisma.subscription.findMany({ where: tenantFilter }),
      safeQuery(prisma.subscriptionHistory.findMany({ where: { subscription: { tenantId } } }), []),
      prisma.supplier.findMany({ where: tenantFilter }),
      prisma.supplierEngagement.findMany({ where: tenantFilter }),
      // HRProfile removed - data now in TeamMember
      safeQuery(prisma.profileChangeRequest.findMany({ where: tenantFilter }), []),
      prisma.activityLog.findMany({ where: tenantFilter }),
      safeQuery(prisma.systemSettings.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.maintenanceRecord.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.spendRequest.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.spendRequestItem.findMany({ where: { spendRequest: { tenantId } } }), []),
      safeQuery(prisma.leaveType.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.leaveBalance.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.leaveRequest.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.salaryStructure.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.payrollRun.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.payslip.findMany({ where: { payrollRun: { tenantId } } }), []),
      safeQuery(prisma.employeeLoan.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.approvalPolicy.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.companyDocumentType.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.companyDocument.findMany({ where: tenantFilter }), []),
      safeQuery(prisma.notification.findMany({ where: tenantFilter }), []),
    ]);

    const backupData = {
      _metadata: {
        version: '4.0', // Updated version for TeamMember-based backup
        application: 'Durj',
        type: 'organization',
        organizationId: tenantId,
        organizationSlug: orgSlug,
        organizationName: organization?.name,
        createdAt: new Date().toISOString(),
        trigger: 'cron',
        description: `Organization backup - ${organization?.name || orgSlug} (Scheduled)`,
      },
      _counts: {
        teamMembers: teamMembers.length,
        assets: assets.length,
        subscriptions: subscriptions.length,
        suppliers: suppliers.length,
      },
      organization,
      teamMembers,
      assets,
      assetHistories,
      assetRequests,
      subscriptions,
      subscriptionHistories,
      suppliers,
      supplierEngagements,
      profileChangeRequests,
      activityLogs,
      systemSettings,
      maintenanceRecords,
      spendRequests,
      spendRequestItems,
      leaveTypes,
      leaveBalances,
      leaveRequests,
      salaryStructures,
      payrollRuns,
      payslips,
      employeeLoans,
      approvalPolicies,
      companyDocumentTypes,
      companyDocuments,
      notifications,
    };

    // SECURITY: Redact sensitive fields and encrypt before storage
    const redactedData = redactBackupData(backupData);
    const backupJson = JSON.stringify(redactedData, null, 2);
    const encryptedBackup = encryptBackup(backupJson);
    await saveToSupabase(encryptedBackup, `orgs/${orgSlug}/${filename.replace('.json', '.enc')}`);

    // Clean up old backups for this org (keep last 30)
    await cleanupOldBackups(`orgs/${orgSlug}`);

    logger.info(`Organization backup created: ${orgSlug}/${filename}`);
    return { filename, success: true };
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

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
