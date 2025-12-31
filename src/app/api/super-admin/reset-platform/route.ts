/**
 * @file route.ts
 * @description Reset platform by deleting all data except super admin accounts (testing only)
 * @module system/super-admin
 */

import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { requireRecent2FA } from '@/lib/two-factor';
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY: Require recent 2FA verification for platform reset
    // This is a destructive operation that requires highest level of verification
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

    // Delete in order to respect foreign key constraints
    const results: Record<string, number> = {};

    // 1. Delete all tenant-scoped data first

    // WhatsApp
    results.whatsAppMessageLogs = (await prisma.whatsAppMessageLog.deleteMany()).count;
    results.whatsAppActionTokens = (await prisma.whatsAppActionToken.deleteMany()).count;
    results.whatsAppUserPhones = (await prisma.whatsAppUserPhone.deleteMany()).count;
    results.whatsAppConfigs = (await prisma.whatsAppConfig.deleteMany()).count;

    // AI Chat
    results.aiChatAuditLogs = (await prisma.aIChatAuditLog.deleteMany()).count;
    results.aiChatUsage = (await prisma.aIChatUsage.deleteMany()).count;
    results.chatMessages = (await prisma.chatMessage.deleteMany()).count;
    results.chatConversations = (await prisma.chatConversation.deleteMany()).count;

    // Leave & Payroll
    results.payslipDeductions = (await prisma.payslipDeduction.deleteMany()).count;
    results.payslips = (await prisma.payslip.deleteMany()).count;
    results.payrollHistory = (await prisma.payrollHistory.deleteMany()).count;
    results.payrollRuns = (await prisma.payrollRun.deleteMany()).count;
    results.loanRepayments = (await prisma.loanRepayment.deleteMany()).count;
    results.employeeLoans = (await prisma.employeeLoan.deleteMany()).count;
    results.salaryHistory = (await prisma.salaryStructureHistory.deleteMany()).count;
    results.salaryStructures = (await prisma.salaryStructure.deleteMany()).count;
    results.leaveRequestHistory = (await prisma.leaveRequestHistory.deleteMany()).count;
    results.leaveRequests = (await prisma.leaveRequest.deleteMany()).count;
    results.leaveBalances = (await prisma.leaveBalance.deleteMany()).count;
    results.leaveTypes = (await prisma.leaveType.deleteMany()).count;

    // HR
    results.profileChangeRequests = (await prisma.profileChangeRequest.deleteMany()).count;
    results.hrProfiles = (await prisma.hRProfile.deleteMany()).count;

    // Purchase Requests
    results.purchaseRequestHistory = (await prisma.purchaseRequestHistory.deleteMany()).count;
    results.purchaseRequestItems = (await prisma.purchaseRequestItem.deleteMany()).count;
    results.purchaseRequests = (await prisma.purchaseRequest.deleteMany()).count;

    // Assets
    results.depreciationRecords = (await prisma.depreciationRecord.deleteMany()).count;
    results.depreciationCategories = (await prisma.depreciationCategory.deleteMany()).count;
    results.assetRequestHistory = (await prisma.assetRequestHistory.deleteMany()).count;
    results.assetRequests = (await prisma.assetRequest.deleteMany()).count;
    results.maintenanceRecords = (await prisma.maintenanceRecord.deleteMany()).count;
    results.assetHistory = (await prisma.assetHistory.deleteMany()).count;
    results.assets = (await prisma.asset.deleteMany()).count;

    // Subscriptions
    results.subscriptionHistory = (await prisma.subscriptionHistory.deleteMany()).count;
    results.subscriptions = (await prisma.subscription.deleteMany()).count;

    // Suppliers
    results.supplierEngagements = (await prisma.supplierEngagement.deleteMany()).count;
    results.suppliers = (await prisma.supplier.deleteMany()).count;

    // Company Documents
    results.companyDocuments = (await prisma.companyDocument.deleteMany()).count;
    results.companyDocumentTypes = (await prisma.companyDocumentType.deleteMany()).count;

    // Approvals
    results.approverDelegations = (await prisma.approverDelegation.deleteMany()).count;
    results.approvalSteps = (await prisma.approvalStep.deleteMany()).count;
    results.approvalLevels = (await prisma.approvalLevel.deleteMany()).count;
    results.approvalPolicies = (await prisma.approvalPolicy.deleteMany()).count;

    // System
    results.notifications = (await prisma.notification.deleteMany()).count;
    results.activityLogs = (await prisma.activityLog.deleteMany()).count;
    results.systemSettings = (await prisma.systemSettings.deleteMany()).count;
    results.appSettings = (await prisma.appSetting.deleteMany()).count;

    // 2. Delete organization-related data
    results.rolePermissions = (await prisma.rolePermission.deleteMany()).count;
    results.setupProgress = (await prisma.organizationSetupProgress.deleteMany()).count;
    results.invitations = (await prisma.organizationInvitation.deleteMany()).count;
    results.orgUsers = (await prisma.organizationUser.deleteMany()).count;

    // 3. Delete organizations
    results.organizations = (await prisma.organization.deleteMany()).count;

    // 4. Delete sessions and tokens
    results.revokedTokens = (await prisma.revokedImpersonationToken.deleteMany()).count;
    results.sessions = (await prisma.session.deleteMany()).count;
    results.verificationTokens = (await prisma.verificationToken.deleteMany()).count;

    // 5. Delete accounts for non-super-admins
    results.accounts = (await prisma.account.deleteMany({
      where: {
        user: { isSuperAdmin: false },
      },
    })).count;

    // 6. Delete non-super-admin users
    results.users = (await prisma.user.deleteMany({
      where: { isSuperAdmin: false },
    })).count;

    return NextResponse.json({
      success: true,
      message: 'Platform reset complete. All data deleted except super admin accounts.',
      deleted: results,
    });
  } catch (error) {
    console.error('Platform reset error:', error);
    return NextResponse.json(
      { error: 'Failed to reset platform', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
