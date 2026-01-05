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
import { arrayToCSV, formatDateForCSV, formatCurrencyForCSV } from '@/lib/csv-utils';
import { withErrorHandler } from '@/lib/http/handler';

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
  // STEP 3: Transform data for CSV/Excel export
  // ─────────────────────────────────────────────────────────────────────────────
  const csvData = assets.map(asset => ({
    id: asset.id,
    assetTag: asset.assetTag || '',
    type: asset.type,
    category: asset.category || '',
    brand: asset.brand || '',
    model: asset.model,
    serial: asset.serial || '',
    configuration: asset.configuration || '',
    supplier: asset.supplier || '',
    invoiceNumber: asset.invoiceNumber || '',
    location: asset.location?.name || '',
    purchaseDate: formatDateForCSV(asset.purchaseDate),
    price: formatCurrencyForCSV(asset.price ? Number(asset.price) : null),
    priceCurrency: asset.priceCurrency || '',
    priceQAR: formatCurrencyForCSV(asset.priceQAR ? Number(asset.priceQAR) : null),
    warrantyExpiry: formatDateForCSV(asset.warrantyExpiry),
    status: asset.status,
    assignmentDate: asset.assignmentDate || '',
    notes: asset.notes || '',
    assignedMemberId: asset.assignedMemberId || '',
    assignedMemberName: asset.assignedMember?.name || '',
    assignedMemberEmail: asset.assignedMember?.email || '',
    createdAt: formatDateForCSV(asset.createdAt),
    updatedAt: formatDateForCSV(asset.updatedAt),
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Define column headers for Excel
  // ─────────────────────────────────────────────────────────────────────────────
  const headers = [
    { key: 'id' as const, header: 'ID' },
    { key: 'assetTag' as const, header: 'Asset Tag' },
    { key: 'type' as const, header: 'Type' },
    { key: 'category' as const, header: 'Category' },
    { key: 'brand' as const, header: 'Brand' },
    { key: 'model' as const, header: 'Model' },
    { key: 'serial' as const, header: 'Serial Number' },
    { key: 'configuration' as const, header: 'Configuration/Specs' },
    { key: 'supplier' as const, header: 'Supplier' },
    { key: 'invoiceNumber' as const, header: 'Invoice/PO Number' },
    { key: 'location' as const, header: 'Location' },
    { key: 'purchaseDate' as const, header: 'Purchase Date' },
    { key: 'price' as const, header: 'Price' },
    { key: 'priceCurrency' as const, header: 'Currency' },
    { key: 'priceQAR' as const, header: 'Price (QAR)' },
    { key: 'warrantyExpiry' as const, header: 'Warranty Expiry' },
    { key: 'status' as const, header: 'Status' },
    { key: 'assignmentDate' as const, header: 'Assignment Date' },
    { key: 'notes' as const, header: 'Notes' },
    { key: 'assignedMemberId' as const, header: 'Assigned Member ID' },
    { key: 'assignedMemberName' as const, header: 'Assigned Member Name' },
    { key: 'assignedMemberEmail' as const, header: 'Assigned Member Email' },
    { key: 'createdAt' as const, header: 'Created At' },
    { key: 'updatedAt' as const, header: 'Updated At' },
  ];

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Generate Excel file and return as download
  // ─────────────────────────────────────────────────────────────────────────────
  const csvBuffer = await arrayToCSV(csvData, headers);
  const filename = `assets_export_${new Date().toISOString().split('T')[0]}.xlsx`;

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
