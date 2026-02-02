/**
 * @module api/company-documents
 * @description API endpoints for managing company documents within a tenant.
 * Company documents represent important business records (e.g., licenses, certificates)
 * that may be associated with assets and have expiry dates.
 *
 * @endpoints
 * - GET  /api/company-documents - List documents with filtering, pagination, and search
 * - POST /api/company-documents - Create a new document (admin only)
 *
 * @features
 * - Filtering by document type, asset, and expiry status (expired/expiring/valid)
 * - Full-text search across document fields
 * - Automatic expiry status calculation
 * - Activity logging for document creation
 *
 * @requires Authentication
 * @requires Module: documents
 */
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { companyDocumentSchema, companyDocumentQuerySchema } from '@/features/company-documents';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/features/company-documents';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { buildFilterWithSearch } from '@/lib/core/search-filter';
import { Prisma } from '@prisma/client';
import { getQatarStartOfDay } from '@/lib/core/datetime';

// GET /api/company-documents - List documents with filtering
export const GET = withErrorHandler(async (request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const { searchParams } = new URL(request.url);

  const query = companyDocumentQuerySchema.parse({
    documentTypeName: searchParams.get('documentTypeName') || undefined,
    assetId: searchParams.get('assetId') || undefined,
    expiryStatus: searchParams.get('expiryStatus') || 'all',
    search: searchParams.get('search') || undefined,
    p: searchParams.get('p') || 1,
    ps: searchParams.get('ps') || 20,
    sortBy: searchParams.get('sortBy') || 'expiryDate',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  const today = getQatarStartOfDay();
  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + DOCUMENT_EXPIRY_WARNING_DAYS);

  // Build filters for where clause
  const filters: Record<string, unknown> = { tenantId };

  if (query.documentTypeName) {
    filters.documentTypeName = query.documentTypeName;
  }

  if (query.assetId) {
    filters.assetId = query.assetId;
  }

  if (query.expiryStatus && query.expiryStatus !== 'all') {
    switch (query.expiryStatus) {
      case 'expired':
        filters.expiryDate = { lt: today };
        break;
      case 'expiring':
        filters.expiryDate = { gte: today, lte: warningDate };
        break;
      case 'valid':
        filters.expiryDate = { gt: warningDate };
        break;
    }
  }

  // Build where clause with search filter
  const where = buildFilterWithSearch({
    searchTerm: query.search,
    searchFields: ['documentTypeName', 'referenceNumber', 'issuedBy', 'notes'],
    filters,
  }) as Prisma.CompanyDocumentWhereInput;

  // Build order by
  const orderBy: Prisma.CompanyDocumentOrderByWithRelationInput = {};
  orderBy[query.sortBy as keyof Prisma.CompanyDocumentOrderByWithRelationInput] = query.sortOrder;

  const skip = (query.p - 1) * query.ps;

  const [documents, total] = await Promise.all([
    db.companyDocument.findMany({
      where,
      orderBy,
      skip,
      take: query.ps,
      include: {
        asset: {
          select: {
            id: true,
            assetTag: true,
            model: true,
            brand: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    }),
    db.companyDocument.count({ where }),
  ]);

  // Add expiry info to each document
  const documentsWithExpiry = documents.map(doc => ({
    ...doc,
    expiryInfo: getDocumentExpiryInfo(doc.expiryDate),
  }));

  return NextResponse.json({
    documents: documentsWithExpiry,
    pagination: {
      p: query.p,
      ps: query.ps,
      total,
      totalPages: Math.ceil(total / query.ps),
    },
  });
}, { requireAuth: true, requireModule: 'documents' });

// POST /api/company-documents - Create a new document
export const POST = withErrorHandler(async (request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId || !tenant?.userId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const body = await request.json();
  const validatedData = companyDocumentSchema.parse(body);

  // If asset is specified, validate it exists within tenant
  if (validatedData.assetId) {
    const asset = await db.asset.findFirst({
      where: { id: validatedData.assetId, tenantId },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Invalid asset' },
        { status: 400 }
      );
    }
  }

  const document = await db.companyDocument.create({
    data: {
      documentTypeName: validatedData.documentTypeName,
      referenceNumber: validatedData.referenceNumber || null,
      expiryDate: new Date(validatedData.expiryDate),
      documentUrl: validatedData.documentUrl || null,
      assetId: validatedData.assetId || null,
      renewalCost: validatedData.renewalCost || null,
      notes: validatedData.notes || null,
      createdById: tenant.userId,
      tenantId: tenant.tenantId,
    },
    include: {
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
        },
      },
    },
  });

  // Log activity
  await logAction(
    tenantId,
    tenant.userId,
    ActivityActions.COMPANY_DOCUMENT_CREATED,
    'CompanyDocument',
    document.id,
    {
      documentType: validatedData.documentTypeName,
      referenceNumber: validatedData.referenceNumber,
      expiryDate: validatedData.expiryDate,
    }
  );

  return NextResponse.json({
    document: {
      ...document,
      expiryInfo: getDocumentExpiryInfo(document.expiryDate),
    },
  }, { status: 201 });
}, { requireAdmin: true, requireModule: 'documents' });

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Implements document listing with advanced filtering and document creation.
 * Documents can be standalone or linked to assets, with expiry tracking.
 *
 * SECURITY:
 * [+] Tenant isolation enforced on all queries
 * [+] Asset validation scoped to tenant (prevents cross-tenant linking)
 * [+] POST requires admin role
 * [+] Activity logging for document creation
 *
 * PATTERNS:
 * [+] Uses buildFilterWithSearch for consistent search across fields
 * [+] Supports multiple filter dimensions (type, asset, expiry status)
 * [+] Pagination with p/ps parameters and total count
 * [+] Expiry info calculated and attached to responses
 * [+] Uses Qatar timezone for date calculations
 *
 * POTENTIAL IMPROVEMENTS:
 * [-] Consider adding bulk import/export capability
 * [-] Missing rate limiting for list endpoint
 * [-] sortBy field is cast without validation - could add whitelist
 * [-] Consider adding document versioning for compliance
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
