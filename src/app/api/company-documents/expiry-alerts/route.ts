/**
 * @module api/company-documents/expiry-alerts
 * @description API endpoint for retrieving company documents that are expired or expiring soon.
 * Returns documents within the warning period (defined by DOCUMENT_EXPIRY_WARNING_DAYS)
 * along with a summary of expired vs expiring counts.
 *
 * @endpoints
 * - GET /api/company-documents/expiry-alerts - Get documents expiring soon or already expired
 *
 * @returns
 * - alerts: Array of documents with expiry info (status, daysRemaining)
 * - summary: { total, expired, expiring }
 *
 * @requires Authentication
 * @requires Module: documents
 */
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/features/company-documents';
import { getQatarStartOfDay } from '@/lib/core/datetime';

// GET /api/company-documents/expiry-alerts - Get documents expiring soon or expired
export const GET = withErrorHandler(async (_request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const today = getQatarStartOfDay();
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  // Get documents expiring within warning period or already expired (within tenant)
  const documents = await db.companyDocument.findMany({
    where: {
      tenantId,
      expiryDate: { lte: warningDate },
    },
    orderBy: { expiryDate: 'asc' },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
        },
      },
    },
  });

  // Add expiry info to each document
  const alerts = documents.map(doc => {
    const expiryInfo = getDocumentExpiryInfo(doc.expiryDate);
    return {
      id: doc.id,
      documentType: doc.documentTypeName,
      referenceNumber: doc.referenceNumber,
      expiryDate: doc.expiryDate.toISOString(),
      status: expiryInfo.status,
      daysRemaining: expiryInfo.daysRemaining,
      asset: doc.asset,
      issuedBy: doc.issuedBy,
    };
  });

  // Separate expired and expiring
  const expired = alerts.filter(a => a.status === 'expired');
  const expiring = alerts.filter(a => a.status === 'expiring');

  return NextResponse.json({
    alerts,
    summary: {
      total: alerts.length,
      expired: expired.length,
      expiring: expiring.length,
    },
  });
}, { requireAuth: true, requireModule: 'documents' });

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Provides a read-only endpoint for retrieving documents that are expired or
 * approaching expiry. Used to power dashboard alerts and notification systems.
 *
 * SECURITY:
 * [+] Tenant isolation via tenantId filter
 * [+] Read-only operation (no state modification)
 * [+] Module access control via requireModule: 'documents'
 *
 * PATTERNS:
 * [+] Uses Qatar timezone for date calculations (business requirement)
 * [+] Returns categorized alerts (expired vs expiring) with summary counts
 * [+] Includes related asset info for context
 * [+] Ordered by expiryDate ascending (most urgent first)
 *
 * POTENTIAL IMPROVEMENTS:
 * [-] Consider adding pagination for organizations with many expiring documents
 * [-] Missing caching headers for performance optimization
 * [-] Consider adding filter for specific asset or document type
 * [-] Could benefit from configurable warning period per-tenant
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
