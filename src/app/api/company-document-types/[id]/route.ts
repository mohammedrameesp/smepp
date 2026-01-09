import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { companyDocumentTypeSchema } from '@/features/company-documents';

// GET /api/company-document-types/[id] - Get a single document type
export const GET = withErrorHandler(async (
  _request: NextRequest,
  context: APIContext
) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Use findFirst with tenantId to prevent cross-tenant access
  const documentType = await db.companyDocumentType.findFirst({
    where: { id, tenantId },
  });

  if (!documentType) {
    return NextResponse.json(
      { error: 'Document type not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ documentType });
}, { requireAuth: true, requireModule: 'documents' });

// PUT /api/company-document-types/[id] - Update a document type
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context: APIContext
) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  const body = await request.json();
  const validatedData = companyDocumentTypeSchema.partial().parse(body);

  // Use findFirst with tenantId to prevent cross-tenant access
  const existing = await db.companyDocumentType.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document type not found' },
      { status: 404 }
    );
  }

  // If code is being changed, check it doesn't conflict within tenant
  if (validatedData.code && validatedData.code !== existing.code) {
    const codeExists = await db.companyDocumentType.findFirst({
      where: { code: validatedData.code, tenantId },
    });

    if (codeExists) {
      return NextResponse.json(
        { error: 'A document type with this code already exists' },
        { status: 400 }
      );
    }
  }

  const documentType = await db.companyDocumentType.update({
    where: { id },
    data: validatedData,
  });

  return NextResponse.json({ documentType });
}, { requireAdmin: true, requireModule: 'documents' });

// DELETE /api/company-document-types/[id] - Delete a document type
export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  context: APIContext
) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Use findFirst with tenantId to prevent cross-tenant access
  const existing = await db.companyDocumentType.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document type not found' },
      { status: 404 }
    );
  }

  await db.companyDocumentType.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}, { requireAdmin: true, requireModule: 'documents' });
