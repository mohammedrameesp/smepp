/**
 * @file route.ts
 * @description Asset depreciation API endpoints
 * @module api/assets/[id]/depreciation
 *
 * PURPOSE:
 * Manage asset depreciation settings and view depreciation history.
 * Actual depreciation calculation runs automatically via monthly cron job.
 *
 * ENDPOINTS:
 * - GET: View depreciation status, category, and history records
 * - POST: Assign depreciation category to enable automatic calculation
 *
 * DEPRECIATION METHOD:
 * - Straight-line depreciation (IFRS compliant)
 * - Monthly amount = (Acquisition Cost - Salvage Value) / Useful Life in Months
 * - Net Book Value (NBV) = Acquisition Cost - Accumulated Depreciation
 *
 * AUTOMATIC CALCULATION:
 * - Cron job runs 1st of each month at 00:05 UTC
 * - See: /api/cron/depreciation
 *
 * SECURITY:
 * - GET: Auth required
 * - POST: Admin role required
 * - Both: Assets module must be enabled
 * - All queries are tenant-scoped
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import {
  assignDepreciationCategorySchema,
  depreciationRecordsQuerySchema,
} from '@/features/assets';
import {
  getDepreciationRecords,
  assignDepreciationCategory,
} from '@/features/assets/lib/depreciation';
import { logAction } from '@/lib/core/activity';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/[id]/depreciation - View Depreciation Info
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get depreciation status and history for an asset.
 *
 * Returns:
 * - Current depreciation settings (category, salvage value)
 * - Financial status (accumulated depreciation, net book value)
 * - Paginated list of monthly depreciation records
 *
 * @route GET /api/assets/[id]/depreciation
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @query {number} [limit=50] - Records per page (max 200)
 * @query {number} [offset=0] - Pagination offset
 * @query {string} [order=desc] - Sort order (asc/desc)
 *
 * @returns {Object} Depreciation info with records
 *
 * @example Response:
 * {
 *   "asset": {
 *     "id": "clx...",
 *     "assetTag": "ORG-CP-25001",
 *     "acquisitionCost": 10000,
 *     "salvageValue": 1000,
 *     "accumulatedDepreciation": 3000,
 *     "netBookValue": 7000,
 *     "isFullyDepreciated": false,
 *     "depreciationCategory": { "name": "IT Equipment", "annualRate": 33.33 }
 *   },
 *   "records": [
 *     { "periodEnd": "2025-01-31", "depreciationAmount": 250, "accumulatedAmount": 3000 }
 *   ],
 *   "pagination": { "total": 12, "limit": 50, "offset": 0, "hasMore": false }
 * }
 */
async function getDepreciationHandler(request: NextRequest, context: APIContext) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Extract tenant context from context (provided by withErrorHandler)
  // ─────────────────────────────────────────────────────────────────────────────
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const assetId = context.params?.id;
  if (!assetId) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Fetch asset with depreciation info (tenant-scoped)
  // ─────────────────────────────────────────────────────────────────────────────
  const asset = await db.asset.findFirst({
    where: { id: assetId },
    select: {
      id: true,
      assetTag: true,
      model: true,
      priceQAR: true,
      price: true,
      salvageValue: true,
      accumulatedDepreciation: true,
      netBookValue: true,
      lastDepreciationDate: true,
      isFullyDepreciated: true,
      depreciationCategory: {
        select: {
          id: true,
          name: true,
          code: true,
          annualRate: true,
          usefulLifeYears: true,
        },
      },
    },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Parse and validate pagination parameters
  // ─────────────────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());
  const validation = depreciationRecordsQuerySchema.safeParse(queryParams);

  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: validation.error.issues },
      { status: 400 }
    );
  }

  const { limit, offset, order } = validation.data;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Fetch depreciation records (tenant-scoped)
  // ─────────────────────────────────────────────────────────────────────────────
  const { records, total, hasMore } = await getDepreciationRecords(assetId, tenantId, {
    limit,
    offset,
    orderBy: order,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Format and return response
  // Convert Decimal fields to numbers for JSON serialization
  // ─────────────────────────────────────────────────────────────────────────────
  return NextResponse.json({
    asset: {
      id: asset.id,
      assetTag: asset.assetTag,
      model: asset.model,
      acquisitionCost: Number(asset.priceQAR || asset.price || 0),
      salvageValue: Number(asset.salvageValue || 0),
      accumulatedDepreciation: Number(asset.accumulatedDepreciation || 0),
      netBookValue: Number(asset.netBookValue || 0),
      lastDepreciationDate: asset.lastDepreciationDate,
      isFullyDepreciated: asset.isFullyDepreciated,
      depreciationCategory: asset.depreciationCategory
        ? {
            ...asset.depreciationCategory,
            annualRate: Number(asset.depreciationCategory.annualRate),
          }
        : null,
    },
    records,
    pagination: {
      total,
      limit,
      offset,
      hasMore,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/assets/[id]/depreciation - Assign Depreciation Category
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assign a depreciation category to an asset.
 *
 * Once assigned, depreciation is calculated automatically by the monthly
 * cron job (/api/cron/depreciation). No manual calculation needed.
 *
 * @route POST /api/assets/[id]/depreciation
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @body {string} action - Must be "assign_category"
 * @body {string} depreciationCategoryId - IFRS category ID (e.g., IT Equipment, Vehicles)
 * @body {number} [salvageValue=0] - Estimated value at end of useful life
 * @body {number} [customUsefulLifeMonths] - Override category's default useful life
 * @body {string} [depreciationStartDate] - When depreciation begins (default: now)
 *
 * @returns {Object} Updated asset with new depreciation settings
 *
 * @example Request:
 * {
 *   "action": "assign_category",
 *   "depreciationCategoryId": "clx...",
 *   "salvageValue": 1000
 * }
 *
 * @example Response:
 * {
 *   "message": "Depreciation category assigned successfully",
 *   "asset": {
 *     "id": "clx...",
 *     "depreciationCategoryId": "clx...",
 *     "salvageValue": 1000,
 *     "netBookValue": 9000
 *   }
 * }
 */
async function assignDepreciationHandler(request: NextRequest, context: APIContext) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Extract tenant context from context (provided by withErrorHandler)
  // ─────────────────────────────────────────────────────────────────────────────
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const assetId = context.params?.id;
  if (!assetId) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Parse request body and validate action
  // ─────────────────────────────────────────────────────────────────────────────
  const body = await request.json();

  if (body.action !== 'assign_category') {
    return NextResponse.json(
      { error: 'Invalid action. Use action: "assign_category"' },
      { status: 400 }
    );
  }

  const validation = assignDepreciationCategorySchema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { error: 'Invalid request body', details: validation.error.issues },
      { status: 400 }
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Verify asset exists and belongs to tenant (IDOR prevention)
  // ─────────────────────────────────────────────────────────────────────────────
  const asset = await db.asset.findFirst({
    where: { id: assetId },
    select: { id: true, assetTag: true, model: true },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Assign depreciation category
  // Sets up asset for automatic monthly depreciation calculation
  // ─────────────────────────────────────────────────────────────────────────────
  const updatedAsset = await assignDepreciationCategory(assetId, tenantId, {
    depreciationCategoryId: validation.data.depreciationCategoryId,
    salvageValue: validation.data.salvageValue,
    customUsefulLifeMonths: validation.data.customUsefulLifeMonths,
    depreciationStartDate: validation.data.depreciationStartDate
      ? new Date(validation.data.depreciationStartDate)
      : undefined,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Log action for audit trail
  // ─────────────────────────────────────────────────────────────────────────────
  await logAction(tenantId, tenant.userId, 'DEPRECIATION_CATEGORY_ASSIGNED', 'Asset', assetId, {
    assetTag: asset.assetTag,
    model: asset.model,
    categoryId: validation.data.depreciationCategoryId,
    salvageValue: validation.data.salvageValue,
  });

  return NextResponse.json({
    message: 'Depreciation category assigned successfully',
    asset: {
      id: updatedAsset.id,
      depreciationCategoryId: updatedAsset.depreciationCategoryId,
      salvageValue: Number(updatedAsset.salvageValue || 0),
      netBookValue: Number(updatedAsset.netBookValue || 0),
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getDepreciationHandler, { requireAuth: true, requireModule: 'assets' });
export const POST = withErrorHandler(assignDepreciationHandler, { requireAdmin: true, requireModule: 'assets' });
