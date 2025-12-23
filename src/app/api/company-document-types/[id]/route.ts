import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler } from '@/lib/http/handler';
import { companyDocumentTypeSchema } from '@/lib/validations/system/company-documents';

// GET /api/company-document-types/[id] - Get a single document type
export const GET = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  const documentType = await prisma.companyDocumentType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  if (!documentType) {
    return NextResponse.json(
      { error: 'Document type not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    documentType: {
      ...documentType,
      documentCount: documentType._count.documents,
      _count: undefined,
    },
  });
}, { requireAuth: true });

// PUT /api/company-document-types/[id] - Update a document type
export const PUT = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;
  const body = await request.json();
  const validatedData = companyDocumentTypeSchema.partial().parse(body);

  // Check if document type exists
  const existing = await prisma.companyDocumentType.findUnique({
    where: { id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document type not found' },
      { status: 404 }
    );
  }

  // If code is being changed, check it doesn't conflict
  if (validatedData.code && validatedData.code !== existing.code) {
    const codeExists = await prisma.companyDocumentType.findUnique({
      where: { code: validatedData.code },
    });

    if (codeExists) {
      return NextResponse.json(
        { error: 'A document type with this code already exists' },
        { status: 400 }
      );
    }
  }

  const documentType = await prisma.companyDocumentType.update({
    where: { id },
    data: validatedData,
  });

  return NextResponse.json({ documentType });
}, { requireAdmin: true });

// DELETE /api/company-document-types/[id] - Delete a document type
export const DELETE = withErrorHandler(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  const { id } = await params;

  // Check if document type exists
  const existing = await prisma.companyDocumentType.findUnique({
    where: { id },
    include: {
      _count: {
        select: { documents: true },
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document type not found' },
      { status: 404 }
    );
  }

  // Prevent deletion if documents are using this type
  if (existing._count.documents > 0) {
    return NextResponse.json(
      {
        error: 'Cannot delete document type',
        message: `This document type has ${existing._count.documents} document(s) associated with it. Please delete or reassign them first.`,
      },
      { status: 400 }
    );
  }

  await prisma.companyDocumentType.delete({
    where: { id },
  });

  return NextResponse.json({ success: true });
}, { requireAdmin: true });
