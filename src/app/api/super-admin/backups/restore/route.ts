/**
 * @file route.ts
 * @description Restore organization data from backup files
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { requireRecent2FA } from '@/lib/two-factor';

const BACKUP_BUCKET = 'database-backups';

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// POST - Restore from a backup file
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { path, mode = 'preview' } = body as { path: string; mode: 'preview' | 'restore' };

    if (!path) {
      return NextResponse.json({ error: 'Backup path is required' }, { status: 400 });
    }

    // SECURITY: Require recent 2FA verification for actual restore (not preview)
    // Restore operations can overwrite production data
    if (mode === 'restore') {
      const require2FAResult = await requireRecent2FA(session.user.id);
      if (require2FAResult) return require2FAResult;
    }

    const supabase = getSupabaseClient();

    // Download the backup file
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(path);

    if (error) {
      logger.error({ error: error.message, path }, 'Failed to download backup for restore');
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    const backupContent = await data.text();
    const backupData = JSON.parse(backupContent);

    // Validate backup structure
    if (!backupData._metadata || !backupData._metadata.version) {
      return NextResponse.json({ error: 'Invalid backup format' }, { status: 400 });
    }

    const isOrgBackup = backupData._metadata.type === 'organization';
    const isFullBackup = backupData._metadata.type === 'full';

    // Preview mode - just return counts
    if (mode === 'preview') {
      return NextResponse.json({
        success: true,
        mode: 'preview',
        metadata: backupData._metadata,
        counts: backupData._counts,
        type: isOrgBackup ? 'organization' : 'full',
        warning: isFullBackup
          ? 'WARNING: Full restore will replace ALL data in the database. This is a destructive operation.'
          : `This will restore data for organization: ${backupData._metadata.organizationName || backupData._metadata.organizationSlug}`,
      });
    }

    // Restore mode - actually restore the data
    logger.info({ path, type: backupData._metadata.type }, 'Starting backup restore');

    const results: { table: string; count: number; success: boolean; error?: string }[] = [];

    if (isOrgBackup) {
      // Organization restore
      const tenantId = backupData._metadata.organizationId;

      // Restore in a transaction
      await prisma.$transaction(async (tx) => {
        // Clear existing data for this organization (in reverse dependency order)
        await tx.notification.deleteMany({ where: { tenantId } });
        await tx.companyDocument.deleteMany({ where: { tenantId } });
        await tx.companyDocumentType.deleteMany({ where: { tenantId } });
        await tx.approvalPolicy.deleteMany({ where: { tenantId } });
        await tx.employeeLoan.deleteMany({ where: { tenantId } });
        await tx.payslip.deleteMany({ where: { payrollRun: { tenantId } } });
        await tx.payrollRun.deleteMany({ where: { tenantId } });
        await tx.salaryStructure.deleteMany({ where: { tenantId } });
        await tx.leaveRequest.deleteMany({ where: { tenantId } });
        await tx.leaveBalance.deleteMany({ where: { tenantId } });
        await tx.leaveType.deleteMany({ where: { tenantId } });
        await tx.purchaseRequestItem.deleteMany({ where: { purchaseRequest: { tenantId } } });
        await tx.purchaseRequest.deleteMany({ where: { tenantId } });
        await tx.maintenanceRecord.deleteMany({ where: { tenantId } });
        await tx.systemSettings.deleteMany({ where: { tenantId } });
        await tx.activityLog.deleteMany({ where: { tenantId } });
        await tx.profileChangeRequest.deleteMany({ where: { tenantId } });
        // HRProfile model removed - data now in TeamMember
        await tx.supplierEngagement.deleteMany({ where: { tenantId } });
        await tx.supplier.deleteMany({ where: { tenantId } });
        await tx.subscriptionHistory.deleteMany({ where: { subscription: { tenantId } } });
        await tx.subscription.deleteMany({ where: { tenantId } });
        await tx.assetRequest.deleteMany({ where: { tenantId } });
        await tx.assetHistory.deleteMany({ where: { asset: { tenantId } } });
        await tx.asset.deleteMany({ where: { tenantId } });

        // Restore data
        if (backupData.assets?.length) {
          await tx.asset.createMany({ data: backupData.assets, skipDuplicates: true });
          results.push({ table: 'assets', count: backupData.assets.length, success: true });
        }

        if (backupData.assetHistories?.length) {
          await tx.assetHistory.createMany({ data: backupData.assetHistories, skipDuplicates: true });
          results.push({ table: 'assetHistories', count: backupData.assetHistories.length, success: true });
        }

        if (backupData.assetRequests?.length) {
          await tx.assetRequest.createMany({ data: backupData.assetRequests, skipDuplicates: true });
          results.push({ table: 'assetRequests', count: backupData.assetRequests.length, success: true });
        }

        if (backupData.subscriptions?.length) {
          await tx.subscription.createMany({ data: backupData.subscriptions, skipDuplicates: true });
          results.push({ table: 'subscriptions', count: backupData.subscriptions.length, success: true });
        }

        if (backupData.subscriptionHistories?.length) {
          await tx.subscriptionHistory.createMany({ data: backupData.subscriptionHistories, skipDuplicates: true });
          results.push({ table: 'subscriptionHistories', count: backupData.subscriptionHistories.length, success: true });
        }

        if (backupData.suppliers?.length) {
          await tx.supplier.createMany({ data: backupData.suppliers, skipDuplicates: true });
          results.push({ table: 'suppliers', count: backupData.suppliers.length, success: true });
        }

        if (backupData.supplierEngagements?.length) {
          await tx.supplierEngagement.createMany({ data: backupData.supplierEngagements, skipDuplicates: true });
          results.push({ table: 'supplierEngagements', count: backupData.supplierEngagements.length, success: true });
        }

        // HRProfile model removed - data now in TeamMember
        // Old hrProfiles data in backup files will be skipped

        if (backupData.profileChangeRequests?.length) {
          await tx.profileChangeRequest.createMany({ data: backupData.profileChangeRequests, skipDuplicates: true });
          results.push({ table: 'profileChangeRequests', count: backupData.profileChangeRequests.length, success: true });
        }

        if (backupData.activityLogs?.length) {
          await tx.activityLog.createMany({ data: backupData.activityLogs, skipDuplicates: true });
          results.push({ table: 'activityLogs', count: backupData.activityLogs.length, success: true });
        }

        if (backupData.systemSettings?.length) {
          await tx.systemSettings.createMany({ data: backupData.systemSettings, skipDuplicates: true });
          results.push({ table: 'systemSettings', count: backupData.systemSettings.length, success: true });
        }

        if (backupData.maintenanceRecords?.length) {
          await tx.maintenanceRecord.createMany({ data: backupData.maintenanceRecords, skipDuplicates: true });
          results.push({ table: 'maintenanceRecords', count: backupData.maintenanceRecords.length, success: true });
        }

        if (backupData.purchaseRequests?.length) {
          await tx.purchaseRequest.createMany({ data: backupData.purchaseRequests, skipDuplicates: true });
          results.push({ table: 'purchaseRequests', count: backupData.purchaseRequests.length, success: true });
        }

        if (backupData.purchaseRequestItems?.length) {
          await tx.purchaseRequestItem.createMany({ data: backupData.purchaseRequestItems, skipDuplicates: true });
          results.push({ table: 'purchaseRequestItems', count: backupData.purchaseRequestItems.length, success: true });
        }

        if (backupData.leaveTypes?.length) {
          await tx.leaveType.createMany({ data: backupData.leaveTypes, skipDuplicates: true });
          results.push({ table: 'leaveTypes', count: backupData.leaveTypes.length, success: true });
        }

        if (backupData.leaveBalances?.length) {
          await tx.leaveBalance.createMany({ data: backupData.leaveBalances, skipDuplicates: true });
          results.push({ table: 'leaveBalances', count: backupData.leaveBalances.length, success: true });
        }

        if (backupData.leaveRequests?.length) {
          await tx.leaveRequest.createMany({ data: backupData.leaveRequests, skipDuplicates: true });
          results.push({ table: 'leaveRequests', count: backupData.leaveRequests.length, success: true });
        }

        if (backupData.salaryStructures?.length) {
          await tx.salaryStructure.createMany({ data: backupData.salaryStructures, skipDuplicates: true });
          results.push({ table: 'salaryStructures', count: backupData.salaryStructures.length, success: true });
        }

        if (backupData.payrollRuns?.length) {
          await tx.payrollRun.createMany({ data: backupData.payrollRuns, skipDuplicates: true });
          results.push({ table: 'payrollRuns', count: backupData.payrollRuns.length, success: true });
        }

        if (backupData.payslips?.length) {
          await tx.payslip.createMany({ data: backupData.payslips, skipDuplicates: true });
          results.push({ table: 'payslips', count: backupData.payslips.length, success: true });
        }

        if (backupData.employeeLoans?.length) {
          await tx.employeeLoan.createMany({ data: backupData.employeeLoans, skipDuplicates: true });
          results.push({ table: 'employeeLoans', count: backupData.employeeLoans.length, success: true });
        }

        if (backupData.approvalPolicies?.length) {
          await tx.approvalPolicy.createMany({ data: backupData.approvalPolicies, skipDuplicates: true });
          results.push({ table: 'approvalPolicies', count: backupData.approvalPolicies.length, success: true });
        }

        if (backupData.companyDocumentTypes?.length) {
          await tx.companyDocumentType.createMany({ data: backupData.companyDocumentTypes, skipDuplicates: true });
          results.push({ table: 'companyDocumentTypes', count: backupData.companyDocumentTypes.length, success: true });
        }

        if (backupData.companyDocuments?.length) {
          await tx.companyDocument.createMany({ data: backupData.companyDocuments, skipDuplicates: true });
          results.push({ table: 'companyDocuments', count: backupData.companyDocuments.length, success: true });
        }
      });

      logger.info({ path, results }, 'Organization restore completed');
    } else {
      // Full platform restore - this is dangerous!
      return NextResponse.json({
        error: 'Full platform restore is not supported via API. Please contact support for disaster recovery.',
        suggestion: 'For organization-level restore, select an organization backup instead.',
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      mode: 'restore',
      metadata: backupData._metadata,
      results,
      message: `Successfully restored ${results.length} tables`,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Backup restore failed');
    return NextResponse.json(
      { error: 'Restore failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
