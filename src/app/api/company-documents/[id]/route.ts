import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { companyDocumentSchema } from '@/lib/validations/system/company-documents';
import { getDocumentExpiryInfo } from '@/lib/domains/system/company-documents/document-utils';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { cleanupStorageFile } from '@/lib/storage/cleanup';

// GET /api/company-documents/[id] - Get a single document
export const GET = withErrorHandler(async (
  _request: NextRequest,
  context: APIContext
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Use findFirst with tenantId to prevent IDOR attacks
  const document = await prisma.companyDocument.findFirst({
    where: { id, tenantId },
    include: {
      documentType: true,
      asset: {
        select: {
          id: true,
          assetTag: true,
          model: true,
          brand: true,
          type: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!document) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    document: {
      ...document,
      expiryInfo: getDocumentExpiryInfo(document.expiryDate),
    },
  });
}, { requireAuth: true, requireModule: 'documents' });

// PUT /api/company-documents/[id] - Update a document
export const PUT = withErrorHandler(async (
  request: NextRequest,
  context: APIContext
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  const body = await request.json();
  const validatedData = companyDocumentSchema.partial().parse(body);

  // Check if document exists within tenant
  const existing = await prisma.companyDocument.findFirst({
    where: { id, tenantId },
    include: { documentType: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  // If document type is being changed, validate it exists within tenant
  if (validatedData.documentTypeId && validatedData.documentTypeId !== existing.documentTypeId) {
    const documentType = await prisma.companyDocumentType.findFirst({
      where: { id: validatedData.documentTypeId, tenantId },
    });

    if (!documentType) {
      return NextResponse.json(
        { error: 'Invalid document type' },
        { status: 400 }
      );
    }
  }

  // If asset is being changed, validate it exists within tenant
  if (validatedData.assetId && validatedData.assetId !== existing.assetId) {
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

  // Build update data with proper type conversion
  const updateData: Record<string, unknown> = {};
  if (validatedData.documentTypeId !== undefined) updateData.documentTypeId = validatedData.documentTypeId;
  if (validatedData.referenceNumber !== undefined) updateData.referenceNumber = validatedData.referenceNumber || null;
  if (validatedData.expiryDate !== undefined) updateData.expiryDate = new Date(validatedData.expiryDate);
  if (validatedData.documentUrl !== undefined) updateData.documentUrl = validatedData.documentUrl || null;
  if (validatedData.assetId !== undefined) updateData.assetId = validatedData.assetId || null;
  if (validatedData.renewalCost !== undefined) updateData.renewalCost = validatedData.renewalCost || null;
  if (validatedData.notes !== undefined) updateData.notes = validatedData.notes || null;

  const document = await prisma.companyDocument.update({
    where: { id },
    data: updateData,
    include: {
      documentType: true,
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
    session.user.id,
    ActivityActions.COMPANY_DOCUMENT_UPDATED,
    'CompanyDocument',
    document.id,
    {
      documentType: document.documentType.name,
      changes: Object.keys(validatedData),
    }
  );

  return NextResponse.json({
    document: {
      ...document,
      expiryInfo: getDocumentExpiryInfo(document.expiryDate),
    },
  });
}, { requireAdmin: true, requireModule: 'documents' });

// DELETE /api/company-documents/[id] - Delete a document
export const DELETE = withErrorHandler(async (
  request: NextRequest,
  context: APIContext
) => {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!session.user.organizationId) {
    return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
  }

  const tenantId = session.user.organizationId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if document exists within tenant
  const existing = await prisma.companyDocument.findFirst({
    where: { id, tenantId },
    include: { documentType: true },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  await prisma.companyDocument.delete({
    where: { id },
  });

  // STORAGE-003: Clean up associated file from storage
  if (existing.documentUrl) {
    await cleanupStorageFile(existing.documentUrl, tenantId);
  }

  // Log activity
  await logAction(
    session.user.id,
    ActivityActions.COMPANY_DOCUMENT_DELETED,
    'CompanyDocument',
    id,
    {
      documentType: existing.documentType.name,
      referenceNumber: existing.referenceNumber,
    }
  );

  return NextResponse.json({ success: true });
}, { requireAdmin: true, requireModule: 'documents' });
