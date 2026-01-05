/**
 * @file route.ts
 * @description Asset export to Excel/CSV API endpoint
 * @module api/assets/export
 *
 * FEATURES:
 * - Export all tenant assets to Excel (.xlsx) format
 * - Includes all asset fields with formatted dates and currencies
 * - Includes assigned member information
 * - Filename includes export date
 *
 * EXPORT COLUMNS:
 * - Asset identifiers (ID, Tag, Type, Category)
 * - Product info (Brand, Model, Serial, Configuration)
 * - Purchase info (Supplier, Invoice, Date, Price)
 * - Status and assignment info
 * - Timestamps (Created, Updated)
 *
 * USE CASES:
 * - Backup asset data
 * - Financial reporting
 * - Audit documentation
 * - Data migration
 *
 * SECURITY:
 * - Admin role required
 * - Rate limiting enabled
 * - Tenant-isolated data only
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { arrayToCSV } from '@/lib/core/csv-utils';
import { withErrorHandler } from '@/lib/http/handler';
import {
  ASSET_EXPORT_COLUMNS,
  transformAssetsForExport,
  getExportFilename,
} from '@/lib/domains/operations/assets/asset-export';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/export - Export Assets to Excel
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Export all assets for the current tenant to an Excel file.
 * Returns a downloadable .xlsx file with all asset data.
 *
 * @route GET /api/assets/export
 *
 * @returns {Buffer} Excel file download (Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
 *
 * @throws {401} Unauthorized (non-admin)
 * @throws {403} Organization context required
 *
 * @example Usage:
 * // In browser, this will trigger a download:
 * window.location.href = '/api/assets/export';
 */
async function exportAssetsHandler(_request: NextRequest) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Check authentication and authorization
  // ─────────────────────────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);
  if (!session || session.user.teamMemberRole !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Fetch all assets for this tenant
  // ─────────────────────────────────────────────────────────────────────────────
  const assets = await prisma.asset.findMany({
    where: { tenantId },
    include: {
      assignedMember: {
        select: { name: true, email: true },
      },
      location: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Transform data and generate Excel file
  // ─────────────────────────────────────────────────────────────────────────────
  const csvData = transformAssetsForExport(assets);
  const csvBuffer = await arrayToCSV(csvData, ASSET_EXPORT_COLUMNS);
  const filename = getExportFilename();

  return new NextResponse(csvBuffer as any, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(exportAssetsHandler, { requireAdmin: true, rateLimit: true, requireModule: 'assets' });
