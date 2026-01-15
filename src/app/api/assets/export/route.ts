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
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { arrayToCSV } from '@/lib/core/csv-utils';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import {
  ASSET_EXPORT_COLUMNS,
  transformAssetsForExport,
  getExportFilename,
} from '@/features/assets';

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
 * @throws {403} Tenant context required
 *
 * @example Usage:
 * // In browser, this will trigger a download:
 * window.location.href = '/api/assets/export';
 */
async function exportAssetsHandler(_request: NextRequest, context: APIContext) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Get tenant context from context (provided by withErrorHandler)
  // ─────────────────────────────────────────────────────────────────────────────
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Fetch all assets for this tenant
  // ─────────────────────────────────────────────────────────────────────────────
  const assets = await db.asset.findMany({
    include: {
      assignedMember: {
        select: { name: true, email: true },
      },
      location: {
        select: { name: true },
      },
      assetCategory: {
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

  return new NextResponse(new Uint8Array(csvBuffer), {
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
