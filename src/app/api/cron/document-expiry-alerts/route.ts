/**
 * @file route.ts
 * @description Cron job to send document expiry alert emails
 * @module api/cron/document-expiry-alerts
 *
 * Runs daily at 6 AM UTC and sends:
 * 1. Employee document expiry alerts to individual employees
 * 2. Admin summary of all employee expiring documents
 * 3. Company document expiry alerts to admins
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { verifyCronAuth } from '@/lib/security/cron-auth';
import { getAdminMembers } from '@/features/notifications/lib/notification-service';
import { sendBulkEmailsWithFailureHandling } from '@/lib/core/email-sender';
import {
  documentExpiryAlertEmail,
  adminDocumentExpiryAlertEmail,
  companyDocumentExpiryAlertEmail,
} from '@/lib/core/email-templates';

// Document expiry window: 30 days ahead, 7 days behind (recently expired)
const DAYS_AHEAD = 30;
const DAYS_BEHIND = 7;

interface ExpiringDocument {
  name: string;
  expiryDate: Date;
  daysRemaining: number;
  status: 'expired' | 'expiring';
}

interface EmployeeWithExpiringDocs {
  id: string;
  name: string;
  email: string;
  documents: ExpiringDocument[];
}

/**
 * Calculate days remaining until expiry (negative if already expired)
 */
function getDaysRemaining(expiryDate: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);
  return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Check if a date is within the expiry alert window
 */
function isInExpiryWindow(date: Date | null): boolean {
  if (!date) return false;
  const days = getDaysRemaining(date);
  return days <= DAYS_AHEAD && days >= -DAYS_BEHIND;
}

/**
 * Get employee document expiry info for a TeamMember
 */
function getEmployeeExpiringDocs(member: {
  qidExpiry: Date | null;
  passportExpiry: Date | null;
  healthCardExpiry: Date | null;
  visaExpiry: Date | null;
  workPermitExpiry: Date | null;
  licenseExpiry: Date | null;
  contractExpiry: Date | null;
}): ExpiringDocument[] {
  const documents: ExpiringDocument[] = [];

  const docFields = [
    { name: 'QID (Qatar ID)', date: member.qidExpiry },
    { name: 'Passport', date: member.passportExpiry },
    { name: 'Health Card', date: member.healthCardExpiry },
    { name: 'Visa', date: member.visaExpiry },
    { name: 'Work Permit', date: member.workPermitExpiry },
    { name: 'Driving License', date: member.licenseExpiry },
    { name: 'Employment Contract', date: member.contractExpiry },
  ];

  for (const { name, date } of docFields) {
    if (isInExpiryWindow(date)) {
      const daysRemaining = getDaysRemaining(date!);
      documents.push({
        name,
        expiryDate: date!,
        daysRemaining,
        status: daysRemaining < 0 ? 'expired' : 'expiring',
      });
    }
  }

  return documents;
}

/**
 * Process document expiry alerts for a single organization
 */
async function processOrganization(org: {
  id: string;
  name: string;
  slug: string;
}): Promise<{ employeeEmailsSent: number; adminEmailsSent: number; errors: number }> {
  const stats = { employeeEmailsSent: 0, adminEmailsSent: 0, errors: 0 };

  try {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setDate(windowStart.getDate() - DAYS_BEHIND);
    const windowEnd = new Date(now);
    windowEnd.setDate(windowEnd.getDate() + DAYS_AHEAD);

    // =========================================================================
    // 1. Employee Document Expiry Alerts
    // =========================================================================

    // Query employees with potentially expiring documents
    const employees = await prisma.teamMember.findMany({
      where: {
        tenantId: org.id,
        isDeleted: false,
        isEmployee: true,
        OR: [
          { qidExpiry: { gte: windowStart, lte: windowEnd } },
          { passportExpiry: { gte: windowStart, lte: windowEnd } },
          { healthCardExpiry: { gte: windowStart, lte: windowEnd } },
          { visaExpiry: { gte: windowStart, lte: windowEnd } },
          { workPermitExpiry: { gte: windowStart, lte: windowEnd } },
          { licenseExpiry: { gte: windowStart, lte: windowEnd } },
          { contractExpiry: { gte: windowStart, lte: windowEnd } },
        ],
      },
      select: {
        id: true,
        name: true,
        email: true,
        qidExpiry: true,
        passportExpiry: true,
        healthCardExpiry: true,
        visaExpiry: true,
        workPermitExpiry: true,
        licenseExpiry: true,
        contractExpiry: true,
      },
    });

    // Process each employee's expiring documents
    const employeesWithDocs: EmployeeWithExpiringDocs[] = [];
    const employeeEmails: Parameters<typeof sendBulkEmailsWithFailureHandling>[0] = [];

    for (const emp of employees) {
      const docs = getEmployeeExpiringDocs(emp);
      if (docs.length > 0) {
        employeesWithDocs.push({
          id: emp.id,
          name: emp.name || emp.email,
          email: emp.email,
          documents: docs,
        });

        // Prepare email for employee
        const emailData = documentExpiryAlertEmail({
          userName: emp.name || emp.email,
          documents: docs,
          orgSlug: org.slug,
          orgName: org.name,
        });

        employeeEmails.push({
          to: emp.email,
          subject: emailData.subject,
          html: emailData.html,
          text: emailData.text,
          module: 'hr',
          action: 'document-expiry-alert',
          tenantId: org.id,
          orgName: org.name,
          orgSlug: org.slug,
          recipientName: emp.name || emp.email,
        });
      }
    }

    // Send employee emails
    if (employeeEmails.length > 0) {
      const results = await sendBulkEmailsWithFailureHandling(employeeEmails);
      stats.employeeEmailsSent = results.filter((r) => r.success).length;
      stats.errors += results.filter((r) => !r.success).length;
    }

    // =========================================================================
    // 2. Admin Summary Email for Employee Documents
    // =========================================================================

    if (employeesWithDocs.length > 0) {
      const admins = await getAdminMembers(prisma, org.id);

      if (admins.length > 0) {
        // Flatten all documents for admin summary
        const allEmployeeDocs = employeesWithDocs.flatMap((emp) =>
          emp.documents.map((doc) => ({
            employeeName: emp.name,
            employeeEmail: emp.email,
            documentName: doc.name,
            expiryDate: doc.expiryDate,
            daysRemaining: doc.daysRemaining,
            status: doc.status,
          }))
        );

        const expiredCount = allEmployeeDocs.filter((d) => d.status === 'expired').length;
        const expiringCount = allEmployeeDocs.filter((d) => d.status === 'expiring').length;

        const adminEmailData = adminDocumentExpiryAlertEmail({
          documents: allEmployeeDocs,
          totalEmployees: employeesWithDocs.length,
          expiredCount,
          expiringCount,
          orgSlug: org.slug,
          orgName: org.name,
        });

        const adminEmails = admins.map((admin) => ({
          to: admin.email,
          subject: adminEmailData.subject,
          html: adminEmailData.html,
          text: adminEmailData.text,
          module: 'hr' as const,
          action: 'admin-document-expiry-summary',
          tenantId: org.id,
          orgName: org.name,
          orgSlug: org.slug,
          recipientName: admin.email,
        }));

        const adminResults = await sendBulkEmailsWithFailureHandling(adminEmails);
        stats.adminEmailsSent += adminResults.filter((r) => r.success).length;
        stats.errors += adminResults.filter((r) => !r.success).length;
      }
    }

    // =========================================================================
    // 3. Company Document Expiry Alerts
    // =========================================================================

    const companyDocs = await prisma.companyDocument.findMany({
      where: {
        tenantId: org.id,
        expiryDate: {
          gte: windowStart,
          lte: windowEnd,
        },
      },
      include: {
        asset: {
          select: {
            assetTag: true,
            type: true,
            brand: true,
            model: true,
          },
        },
      },
    });

    if (companyDocs.length > 0) {
      const admins = await getAdminMembers(prisma, org.id);

      if (admins.length > 0) {
        const companyDocsData = companyDocs.map((doc) => {
          const daysRemaining = getDaysRemaining(doc.expiryDate);
          // Build asset info string for vehicles/equipment
          let assetInfo: string | null = null;
          if (doc.asset) {
            const parts = [doc.asset.type, doc.asset.brand, doc.asset.model].filter(Boolean);
            assetInfo = parts.length > 0 ? parts.join(' ') : null;
            if (doc.asset.assetTag) {
              assetInfo = assetInfo ? `${assetInfo} (${doc.asset.assetTag})` : doc.asset.assetTag;
            }
          }
          return {
            documentType: doc.documentTypeName,
            referenceNumber: doc.referenceNumber,
            expiryDate: doc.expiryDate,
            daysRemaining,
            status: (daysRemaining < 0 ? 'expired' : 'expiring') as 'expired' | 'expiring',
            assetInfo,
          };
        });

        const expiredCount = companyDocsData.filter((d) => d.status === 'expired').length;
        const expiringCount = companyDocsData.filter((d) => d.status === 'expiring').length;

        const companyEmailData = companyDocumentExpiryAlertEmail({
          documents: companyDocsData,
          expiredCount,
          expiringCount,
          orgSlug: org.slug,
          orgName: org.name,
        });

        const companyEmails = admins.map((admin) => ({
          to: admin.email,
          subject: companyEmailData.subject,
          html: companyEmailData.html,
          text: companyEmailData.text,
          module: 'other' as const,
          action: 'company-document-expiry-alert',
          tenantId: org.id,
          orgName: org.name,
          orgSlug: org.slug,
          recipientName: admin.email,
        }));

        const companyResults = await sendBulkEmailsWithFailureHandling(companyEmails);
        stats.adminEmailsSent += companyResults.filter((r) => r.success).length;
        stats.errors += companyResults.filter((r) => !r.success).length;
      }
    }
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        orgId: org.id,
        orgName: org.name,
      },
      'Failed to process document expiry alerts for organization'
    );
    stats.errors++;
  }

  return stats;
}

/**
 * Cron job to send document expiry alert emails.
 * Runs daily at 6 AM UTC (configured in vercel.json).
 *
 * Schedule: Daily at 6 AM UTC
 */
export async function GET(request: NextRequest) {
  try {
    // SECURITY: Verify cron secret
    const authResult = verifyCronAuth(request);
    if (!authResult.valid) {
      return NextResponse.json(
        { error: 'Authentication required', details: authResult.error },
        { status: 401 }
      );
    }

    // Get all active organizations
    const organizations = await prisma.organization.findMany({
      where: {
        // Only process active orgs (not deleted/suspended)
        // Add any additional filters as needed
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    const summary = {
      organizationsProcessed: 0,
      totalEmployeeEmailsSent: 0,
      totalAdminEmailsSent: 0,
      totalErrors: 0,
    };

    // Process each organization
    for (const org of organizations) {
      const stats = await processOrganization(org);
      summary.organizationsProcessed++;
      summary.totalEmployeeEmailsSent += stats.employeeEmailsSent;
      summary.totalAdminEmailsSent += stats.adminEmailsSent;
      summary.totalErrors += stats.errors;
    }

    logger.info(
      {
        organizationsProcessed: summary.organizationsProcessed,
        employeeEmailsSent: summary.totalEmployeeEmailsSent,
        adminEmailsSent: summary.totalAdminEmailsSent,
        errors: summary.totalErrors,
      },
      'Document expiry alert cron job completed'
    );

    return NextResponse.json({
      message: 'Document expiry alerts processed',
      ...summary,
    });
  } catch (error) {
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      'Document expiry alert cron job failed'
    );
    return NextResponse.json(
      {
        error: 'Cron job failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
