/**
 * @file route.ts
 * @description Asset list and creation API endpoints
 * @module api/assets
 *
 * FEATURES:
 * - Paginated asset listing with search and filters
 * - Asset creation with auto-tag generation
 * - Multi-currency support (QAR/USD) with automatic conversion
 * - Auto-learning type-to-category mappings
 * - Setup progress tracking for onboarding
 *
 * SECURITY:
 * - GET: Requires authentication + assets module enabled
 * - POST: Requires admin role + assets module enabled
 *
 * RATE LIMITING: Enabled for both endpoints
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { AssetStatus, AssetRequestStatus, Prisma } from '@prisma/client';
import { createAssetSchema, assetQuerySchema } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { generateAssetTagByCategory } from '@/features/assets';
import { convertToQAR } from '@/lib/core/currency';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { updateSetupProgress } from '@/features/onboarding/lib';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { prisma as globalPrisma } from '@/lib/core/prisma';
import { ASSET_TYPE_SUGGESTIONS } from '@/features/assets';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Filter parameters for asset list queries
 */
interface _AssetFilters {
  /** Filter by asset status (AVAILABLE, IN_USE, MAINTENANCE, etc.) */
  status?: AssetStatus;
  /** Exclude assets with this status (e.g., DISPOSED for active-only view) */
  statusNot?: AssetStatus;
  /** Filter by asset type (e.g., "Laptop", "Monitor") */
  type?: string;
  /** Filter by asset category ID */
  categoryId?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Auto-learn: Save a new type-to-category mapping if it doesn't exist in defaults.
 * This allows the system to learn from user entries automatically and provide
 * better suggestions for future asset creation.
 *
 * @param tenantId - Organization ID
 * @param typeName - Asset type name (e.g., "Gaming Laptop")
 * @param categoryId - Category ID to map to
 *
 * @example
 * // When user creates asset with type "Gaming Laptop" under "Computing" category,
 * // future "Gaming Laptop" entries will auto-suggest "Computing" category
 * await autoLearnTypeMapping(tenantId, "Gaming Laptop", "category-id-123");
 */
async function autoLearnTypeMapping(tenantId: string, typeName: string, categoryId: string) {
  const normalizedType = typeName.trim();

  // Skip empty or too-short type names
  if (!normalizedType || normalizedType.length < 2) return;

  // Check if this type already exists in default suggestions (case-insensitive)
  const isDefaultType = ASSET_TYPE_SUGGESTIONS.some(
    (s) => s.type.toLowerCase() === normalizedType.toLowerCase()
  );

  // Skip if it's already a default type - no need to learn
  if (isDefaultType) return;

  // Check if mapping already exists for this tenant (case-insensitive)
  const existingMapping = await globalPrisma.assetTypeMapping.findFirst({
    where: {
      tenantId,
      typeName: { equals: normalizedType, mode: 'insensitive' },
    },
  });

  // Skip if mapping already exists
  if (existingMapping) return;

  // Create new mapping (auto-learned from user behavior)
  await globalPrisma.assetTypeMapping.create({
    data: {
      tenantId,
      typeName: normalizedType,
      categoryId,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets - List Assets (Most Used)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * List assets with pagination, search, and filters.
 * This is the most frequently called endpoint - used on every asset list page load.
 *
 * @route GET /api/assets
 *
 * @query {string} [q] - Search term (searches: assetTag, model, brand, serial, type, supplier, configuration)
 * @query {AssetStatus} [status] - Filter by status
 * @query {string} [type] - Filter by asset type
 * @query {string} [categoryId] - Filter by category ID
 * @query {number} [p=1] - Page number
 * @query {number} [ps=10] - Page size
 * @query {string} [sort=createdAt] - Sort field
 * @query {string} [order=desc] - Sort order (asc/desc)
 *
 * @returns {Object} Paginated asset list with assigned member and category info
 * @returns {Asset[]} assets - Array of assets
 * @returns {Object} pagination - Pagination metadata
 *
 * @example Response:
 * {
 *   "assets": [
 *     {
 *       "id": "clx...",
 *       "assetTag": "ORG-CP-25001",
 *       "model": "MacBook Pro 14",
 *       "assignedMember": { "id": "...", "name": "John", "email": "john@..." },
 *       "assetCategory": { "id": "...", "code": "CP", "name": "Computing" }
 *     }
 *   ],
 *   "pagination": {
 *     "page": 1,
 *     "pageSize": 10,
 *     "total": 45,
 *     "totalPages": 5,
 *     "hasMore": true
 *   }
 * }
 */
async function getAssetsHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Parse and validate query parameters
  // ─────────────────────────────────────────────────────────────────────────────
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = assetQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: validation.error.issues
    }, { status: 400 });
  }

  const { q, status, excludeStatus, type, categoryId, assignedMemberId, assignmentFilter, p, ps, sort, order } = validation.data;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Build filter object (Prisma-compatible format)
  // ─────────────────────────────────────────────────────────────────────────────
  const filters: Record<string, unknown> = {};
  if (status) filters.status = status;
  if (excludeStatus) filters.status = { not: excludeStatus };
  if (type) filters.type = type;
  if (categoryId) filters.categoryId = categoryId;

  // Assignment filtering (for employee view)
  if (assignedMemberId) {
    // Direct filter by specific member ID (e.g., "My Assets")
    filters.assignedMemberId = assignedMemberId;
  } else if (assignmentFilter) {
    // Filter by assignment status patterns
    switch (assignmentFilter) {
      case 'unassigned':
        // Show only unassigned assets
        filters.assignedMemberId = null;
        break;
      case 'others':
        // Show assets assigned to others (exclude current user)
        // Note: This requires userId from tenant context
        const userId = tenant.userId;
        if (userId) {
          filters.AND = [
            { assignedMemberId: { not: null } },
            { assignedMemberId: { not: userId } }
          ];
        }
        break;
      case 'mine':
        // Show only current user's assets
        if (tenant.userId) {
          filters.assignedMemberId = tenant.userId;
        }
        break;
      case 'all':
      default:
        // No assignment filter - show all assets
        break;
    }
  }

  // Build where clause using reusable search filter utility
  // Searches across multiple fields with OR logic
  const where = buildFilterWithSearch({
    searchTerm: q,
    searchFields: ['assetTag', 'model', 'brand', 'serial', 'type', 'supplier', 'configuration'],
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Execute query with pagination
  // Note: Tenant filtering is handled automatically by context.prisma
  // ─────────────────────────────────────────────────────────────────────────────
  const skip = (p - 1) * ps;

  const [assets, total] = await Promise.all([
    db.asset.findMany({
      where,
      orderBy: { [sort]: order },
      take: ps,
      skip,
      include: {
        // Include assigned team member info for display
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        // Include category info for grouping/filtering
        assetCategory: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        // Include location name for display
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        // NOTE: assetRequests removed from main query for performance
        // Pending requests are fetched separately below (batch query)
      },
    }),
    db.asset.count({ where }),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Batch fetch pending requests for unassigned assets (PERFORMANCE FIX)
  // Instead of N correlated subqueries, we do 1 batch query
  // ─────────────────────────────────────────────────────────────────────────────
  const unassignedAssetIds = assets
    .filter(a => !a.assignedMemberId && !a.isShared)
    .map(a => a.id);

  let pendingRequestsMap: Record<string, {
    id: string;
    requestNumber: string;
    member: { id: string; name: string | null; email: string } | null;
  }> = {};

  if (unassignedAssetIds.length > 0) {
    const pendingRequests = await db.assetRequest.findMany({
      where: {
        assetId: { in: unassignedAssetIds },
        status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
        type: 'ADMIN_ASSIGNMENT',
      },
      select: {
        id: true,
        requestNumber: true,
        assetId: true,
        member: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Build lookup map by assetId
    pendingRequestsMap = pendingRequests.reduce((acc, req) => {
      if (!acc[req.assetId]) {
        acc[req.assetId] = {
          id: req.id,
          requestNumber: req.requestNumber,
          member: req.member,
        };
      }
      return acc;
    }, {} as typeof pendingRequestsMap);
  }

  // Merge pending requests into assets
  const assetsWithRequests = assets.map(asset => ({
    ...asset,
    assetRequests: pendingRequestsMap[asset.id]
      ? [pendingRequestsMap[asset.id]]
      : [],
  }));

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 5: Return paginated response
  // ─────────────────────────────────────────────────────────────────────────────
  return NextResponse.json({
    assets: assetsWithRequests,
    pagination: {
      page: p,
      pageSize: ps,
      total,
      totalPages: Math.ceil(total / ps),
      hasMore: skip + ps < total,
    },
  });
}

export const GET = withErrorHandler(getAssetsHandler, { requireAuth: true, rateLimit: true, requireModule: 'assets' });

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/assets - Create Asset
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Create a new asset with automatic tag generation and currency conversion.
 *
 * @route POST /api/assets
 *
 * @body {string} type - Asset type (e.g., "Laptop", "Monitor")
 * @body {string} model - Model name/number (required)
 * @body {string} [categoryId] - Category ID (required for auto-tag generation)
 * @body {string} [assetTag] - Custom asset tag (auto-generated if not provided)
 * @body {string} [brand] - Brand name
 * @body {string} [serial] - Serial number
 * @body {string} [configuration] - Configuration details
 * @body {string} [purchaseDate] - Purchase date (ISO string)
 * @body {string} [warrantyExpiry] - Warranty expiry date (ISO string)
 * @body {string} [supplier] - Supplier name
 * @body {string} [invoiceNumber] - Invoice/PO number
 * @body {number} [price] - Purchase price
 * @body {string} [priceCurrency=QAR] - Price currency (QAR or USD)
 * @body {number} [priceQAR] - Price in QAR (auto-calculated if not provided)
 * @body {AssetStatus} [status=AVAILABLE] - Initial status
 * @body {string} [notes] - Additional notes
 * @body {string} [location] - Physical location
 * @body {boolean} [isShared=false] - Whether asset is shared resource
 * @body {string} [depreciationCategoryId] - Depreciation category for IFRS
 * @body {string} [assignedMemberId] - Initially assigned team member
 *
 * @returns {Asset} Created asset with relations
 *
 * @throws {400} Invalid request body
 * @throws {400} Asset tag already exists (P2002)
 *
 * @example Request:
 * {
 *   "type": "Laptop",
 *   "model": "MacBook Pro 14",
 *   "categoryId": "clx...",
 *   "price": 1500,
 *   "priceCurrency": "USD"
 * }
 */
async function createAssetHandler(request: NextRequest, context: APIContext) {
  const { tenant, prisma: tenantPrisma } = context;

  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }

  const db = tenantPrisma as TenantPrismaClient;
  const tenantId = tenant.tenantId;
  const userId = tenant.userId;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Parse and validate request body
  // ─────────────────────────────────────────────────────────────────────────────
  const body = await request.json();
  const validation = createAssetSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues
    }, { status: 400 });
  }

  const data = validation.data;

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Generate asset tag if not provided
  // Format: ORG-CAT-YYSEQ (e.g., ORG-CP-25001)
  // Requires categoryId to generate tag
  // ─────────────────────────────────────────────────────────────────────────────
  let assetTag = data.assetTag;
  if (!assetTag && data.categoryId) {
    const category = await globalPrisma.assetCategory.findFirst({
      where: { id: data.categoryId, tenantId },
      select: { code: true },
    });
    if (category) {
      const orgPrefix = await getOrganizationCodePrefix(tenantId);
      assetTag = await generateAssetTagByCategory(category.code, tenantId, orgPrefix);
    }
  }

  // Ensure tag is always uppercase for consistency
  if (assetTag) {
    assetTag = assetTag.toUpperCase();
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Handle multi-currency pricing
  // Always calculate priceQAR to prevent data loss
  // QAR is the base currency for all financial calculations
  // Supports ALL currencies with tenant-specific exchange rates
  // ─────────────────────────────────────────────────────────────────────────────
  let priceQAR = data.priceQAR;
  const currency = data.priceCurrency || 'QAR';

  if (data.price && !priceQAR) {
    // Convert any currency to QAR using tenant-specific rate
    priceQAR = await convertToQAR(data.price, currency, tenantId);
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Create asset in database
  // Note: tenantId is explicitly set (not auto-injected) for clarity
  // ─────────────────────────────────────────────────────────────────────────────
  try {
    const asset = await db.asset.create({
      data: {
        tenantId,
        assetTag,
        type: data.type,
        categoryId: data.categoryId || null,
        brand: data.brand || null,
        model: data.model,
        serial: data.serial || null,
        configuration: data.configuration || null,
        purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
        warrantyExpiry: data.warrantyExpiry ? new Date(data.warrantyExpiry) : null,
        supplier: data.supplier || null,
        invoiceNumber: data.invoiceNumber || null,
        price: data.price || null,
        priceCurrency: currency,
        priceQAR: priceQAR || null,
        status: data.status,
        notes: data.notes || null,
        locationId: data.locationId || null,
        isShared: data.isShared || false,
        depreciationCategoryId: data.depreciationCategoryId || null,
        assignedMemberId: data.assignedMemberId || null,
      },
      include: {
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assetCategory: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    // ───────────────────────────────────────────────────────────────────────────
    // STEP 5: Post-creation tasks (non-blocking)
    // These are fire-and-forget operations that shouldn't fail the request
    // ───────────────────────────────────────────────────────────────────────────

    // Log activity for audit trail
    try {
      await logAction(
        tenantId,
        userId,
        ActivityActions.ASSET_CREATED,
        'Asset',
        asset.id,
        { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag }
      );
    } catch {
      // Ignore activity log errors - non-critical
    }

    // Update onboarding checklist progress
    updateSetupProgress(tenantId, 'firstAssetAdded', true).catch(() => {});

    // Auto-learn type-to-category mapping for better future suggestions
    if (data.type && data.categoryId) {
      autoLearnTypeMapping(tenantId, data.type, data.categoryId).catch(() => {});
    }

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    // ───────────────────────────────────────────────────────────────────────────
    // Handle unique constraint violation (duplicate asset tag)
    // ───────────────────────────────────────────────────────────────────────────
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({
        error: 'Asset tag already exists',
        details: [{ message: `Asset tag "${assetTag}" is already in use. Please use a unique asset tag.` }]
      }, { status: 400 });
    }

    // Re-throw other errors to be handled by withErrorHandler
    throw error;
  }
}

export const POST = withErrorHandler(createAssetHandler, { requireAdmin: true, rateLimit: true, requireModule: 'assets' });
