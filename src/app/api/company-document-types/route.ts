import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { companyDocumentTypeSchema } from '@/features/company-documents';

// GET /api/company-document-types - List all document types
export const GET = withErrorHandler(async (_request: NextRequest, context: APIContext) => {
  if (!context.tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const documentTypes = await prisma.companyDocumentType.findMany({
    where: {
      tenantId: context.tenant.tenantId,
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
  if (!context.tenant?.tenantId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const body = await request.json();
  const validatedData = companyDocumentTypeSchema.parse(body);

  // Check if code already exists
  const existing = await prisma.companyDocumentType.findFirst({
    where: { code: validatedData.code },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A document type with this code already exists' },
      { status: 400 }
    );
  }

  const documentType = await prisma.companyDocumentType.create({
    data: {
      ...validatedData,
      tenantId: context.tenant.tenantId,
    },
  });

  return NextResponse.json({ documentType }, { status: 201 });
}, { requireAdmin: true, requireModule: 'documents' });
