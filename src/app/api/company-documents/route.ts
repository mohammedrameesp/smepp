import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { companyDocumentSchema, companyDocumentQuerySchema } from '@/features/company-documents';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/features/company-documents';
import { logAction, ActivityActions } from '@/lib/core/activity';
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

  // Build where clause with tenant filter
  const where: Prisma.CompanyDocumentWhereInput = { tenantId };

  if (query.documentTypeName) {
    where.documentTypeName = query.documentTypeName;
  }

  if (query.assetId) {
    where.assetId = query.assetId;
  }

  if (query.expiryStatus && query.expiryStatus !== 'all') {
    switch (query.expiryStatus) {
      case 'expired':
        where.expiryDate = { lt: today };
        break;
      case 'expiring':
        where.expiryDate = { gte: today, lte: warningDate };
        break;
      case 'valid':
        where.expiryDate = { gt: warningDate };
        break;
    }
  }

  if (query.search) {
    where.OR = [
      { documentTypeName: { contains: query.search, mode: 'insensitive' } },
      { referenceNumber: { contains: query.search, mode: 'insensitive' } },
      { issuedBy: { contains: query.search, mode: 'insensitive' } },
      { notes: { contains: query.search, mode: 'insensitive' } },
    ];
  }

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
