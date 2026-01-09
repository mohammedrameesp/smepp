import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { companyDocumentTypeSchema } from '@/features/company-documents';

// GET /api/company-document-types - List all document types
export const GET = withErrorHandler(async (_request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const documentTypes = await db.companyDocumentType.findMany({
    where: {
      tenantId: tenant.tenantId,
    },
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
  });

  return NextResponse.json({
    documentTypes,
  });
}, { requireAuth: true, requireModule: 'documents' });

// POST /api/company-document-types - Create a new document type
export const POST = withErrorHandler(async (request: NextRequest, context: APIContext) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const body = await request.json();
  const validatedData = companyDocumentTypeSchema.parse(body);

  // Check if code already exists within tenant
  const existing = await db.companyDocumentType.findFirst({
    where: { code: validatedData.code, tenantId: tenant.tenantId },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A document type with this code already exists' },
      { status: 400 }
    );
  }

  const documentType = await db.companyDocumentType.create({
    data: {
      ...validatedData,
      tenantId: tenant.tenantId,
    },
  });

  return NextResponse.json({ documentType }, { status: 201 });
}, { requireAdmin: true, requireModule: 'documents' });
