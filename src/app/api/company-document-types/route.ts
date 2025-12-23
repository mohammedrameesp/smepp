import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { companyDocumentTypeSchema } from '@/lib/validations/system/company-documents';

// GET /api/company-document-types - List all document types
export const GET = withErrorHandler(async (_request: NextRequest) => {
  const documentTypes = await prisma.companyDocumentType.findMany({
    orderBy: [
      { sortOrder: 'asc' },
      { name: 'asc' },
    ],
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  return NextResponse.json({
    documentTypes: documentTypes.map(type => ({
      ...type,
      documentCount: type._count.documents,
      _count: undefined,
    })),
  });
}, { requireAuth: true });

// POST /api/company-document-types - Create a new document type
export const POST = withErrorHandler(async (request: NextRequest) => {
  const body = await request.json();
  const validatedData = companyDocumentTypeSchema.parse(body);

  // Check if code already exists
  const existing = await prisma.companyDocumentType.findUnique({
    where: { code: validatedData.code },
  });

  if (existing) {
    return NextResponse.json(
      { error: 'A document type with this code already exists' },
      { status: 400 }
    );
  }

  const documentType = await prisma.companyDocumentType.create({
    data: validatedData,
  });

  return NextResponse.json({ documentType }, { status: 201 });
}, { requireAdmin: true });
