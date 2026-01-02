import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { companyDocumentSchema, companyDocumentQuerySchema } from '@/lib/validations/system/company-documents';
import { getDocumentExpiryInfo, DOCUMENT_EXPIRY_WARNING_DAYS } from '@/lib/domains/system/company-documents/document-utils';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { Prisma } from '@prisma/client';

// GET /api/company-documents - List documents with filtering
export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const { searchParams } = new URL(request.url);

  const query = companyDocumentQuerySchema.parse({
    documentTypeName: searchParams.get('documentTypeName') || undefined,
    assetId: searchParams.get('assetId') || undefined,
    expiryStatus: searchParams.get('expiryStatus') || 'all',
    search: searchParams.get('search') || undefined,
    page: searchParams.get('page') || 1,
    limit: searchParams.get('limit') || 20,
    sortBy: searchParams.get('sortBy') || 'expiryDate',
    sortOrder: searchParams.get('sortOrder') || 'asc',
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
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

  const skip = (query.page - 1) * query.limit;

  const [documents, total] = await Promise.all([
    prisma.companyDocument.findMany({
      where,
      orderBy,
      skip,
      take: query.limit,
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
    prisma.companyDocument.count({ where }),
  ]);

  // Add expiry info to each document
  const documentsWithExpiry = documents.map(doc => ({
    ...doc,
    expiryInfo: getDocumentExpiryInfo(doc.expiryDate),
  }));

  return NextResponse.json({
    documents: documentsWithExpiry,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  });
}, { requireAuth: true, requireModule: 'documents' });

// POST /api/company-documents - Create a new document
export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const body = await request.json();
  const validatedData = companyDocumentSchema.parse(body);

  // If asset is specified, validate it exists within tenant
  if (validatedData.assetId) {
    const asset = await prisma.asset.findFirst({
      where: { id: validatedData.assetId, tenantId },
    });

    if (!asset) {
      return NextResponse.json(
        { error: 'Invalid asset' },
        { status: 400 }
      );
    }
  }

  const document = await prisma.companyDocument.create({
    data: {
      documentTypeName: validatedData.documentTypeName,
      referenceNumber: validatedData.referenceNumber || null,
      expiryDate: new Date(validatedData.expiryDate),
      documentUrl: validatedData.documentUrl || null,
      assetId: validatedData.assetId || null,
      renewalCost: validatedData.renewalCost || null,
      notes: validatedData.notes || null,
      createdById: session.user.id,
      tenantId: session.user.organizationId,
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
    session.user.id,
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
