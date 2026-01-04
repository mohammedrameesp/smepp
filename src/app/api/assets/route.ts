/**
 * @file route.ts
 * @description Asset list and creation API endpoints
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { AssetStatus, Prisma } from '@prisma/client';
import { createAssetSchema, assetQuerySchema } from '@/lib/validations/assets';
import { logAction, ActivityActions } from '@/lib/activity';
import { generateAssetTag, generateAssetTagByCategory } from '@/lib/asset-utils';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { buildFilterWithSearch } from '@/lib/db/search-filter';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { updateSetupProgress } from '@/lib/domains/system/setup';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
import { prisma as globalPrisma } from '@/lib/core/prisma';

// Type for asset list filters
interface AssetFilters {
  status?: AssetStatus;
  type?: string;
  categoryId?: string;
  category?: string;
}

async function getAssetsHandler(request: NextRequest, context: APIContext) {
  const { prisma } = context;

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const validation = assetQuerySchema.safeParse(queryParams);
  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid query parameters',
      details: validation.error.issues
    }, { status: 400 });
  }

  const { q, status, type, categoryId, category, p, ps, sort, order } = validation.data;

  // Build filters object with proper typing
  const filters: AssetFilters = {};
  if (status) filters.status = status;
  if (type) filters.type = type;
  if (categoryId) filters.categoryId = categoryId;
  if (category) filters.category = category;

  // Build where clause using reusable search filter
  const where = buildFilterWithSearch({
    searchTerm: q,
    searchFields: ['assetTag', 'model', 'brand', 'serial', 'type', 'supplier', 'configuration'],
    filters: Object.keys(filters).length > 0 ? filters : undefined,
  });

  // Calculate pagination
  const skip = (p - 1) * ps;

  // Fetch assets (tenant filtering handled by context.prisma)
  const [assets, total] = await Promise.all([
    prisma.asset.findMany({
      where,
      orderBy: { [sort]: order },
      take: ps,
      skip,
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
    }),
    prisma.asset.count({ where }),
  ]);

  return NextResponse.json({
    assets,
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

async function createAssetHandler(request: NextRequest, context: APIContext) {
  const { prisma, tenant } = context;
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  // Parse and validate request body
  const body = await request.json();
  const validation = createAssetSchema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json({
      error: 'Invalid request body',
      details: validation.error.issues
    }, { status: 400 });
  }

  const data = validation.data;

  // Generate asset tag if not provided
  let assetTag = data.assetTag;
  if (!assetTag) {
    // If categoryId is provided, use new format (ORG-CAT-YYSEQ)
    if (data.categoryId) {
      const category = await globalPrisma.assetCategory.findFirst({
        where: { id: data.categoryId, tenantId },
        select: { code: true },
      });
      if (category) {
        const orgPrefix = await getOrganizationCodePrefix(tenantId);
        assetTag = await generateAssetTagByCategory(category.code, tenantId, orgPrefix);
      }
    }
    // Fallback to legacy format (ORG-TYPE-YEAR-SEQ) if no category or category not found
    if (!assetTag) {
      assetTag = await generateAssetTag(data.type, tenantId);
    }
  }
  // Ensure tag is always uppercase
  if (assetTag) {
    assetTag = assetTag.toUpperCase();
  }

  // SAFEGUARD: Always calculate priceQAR to prevent data loss
  let priceQAR = data.priceQAR;

  // Default currency to QAR if not specified
  const currency = data.priceCurrency || 'QAR';

  if (data.price && !priceQAR) {
    // If priceQAR is missing, calculate it based on currency
    if (currency === 'QAR') {
      // QAR is base currency, store as-is
      priceQAR = data.price;
    } else {
      // USD - convert to QAR
      priceQAR = data.price * USD_TO_QAR_RATE;
    }
  }

  // Create asset (tenantId auto-injected by context.prisma)
  try {
    const asset = await prisma.asset.create({
      data: {
        assetTag,
        type: data.type,
        categoryId: data.categoryId || null,
        category: data.category || null, // DEPRECATED: for backward compat
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
        location: data.location || null,
        isShared: data.isShared || false,
        tenantId,
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

    // Log activity (non-critical, don't fail if this errors)
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
      // Ignore activity log errors
    }

    // Update setup progress (non-blocking)
    updateSetupProgress(tenantId, 'firstAssetAdded', true).catch(() => {});

    return NextResponse.json(asset, { status: 201 });
  } catch (error) {
    // Handle unique constraint violation (P2002)
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