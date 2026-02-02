/**
 * @module api/company-documents/[id]
 * @description API endpoints for managing individual company documents.
 * Supports retrieval, update, and deletion of document records with proper
 * tenant isolation and activity logging.
 *
 * @endpoints
 * - GET    /api/company-documents/[id] - Get a single document with asset and creator info
 * - PUT    /api/company-documents/[id] - Update a document (admin only)
 * - DELETE /api/company-documents/[id] - Delete a document and its storage file (admin only)
 *
 * @features
 * - IDOR protection via tenant-scoped queries
 * - Storage file cleanup on deletion
 * - Activity logging for updates and deletions
 * - Expiry status calculation included in responses
 *
 * @requires Authentication
 * @requires Module: documents
 */
import { NextRequest, NextResponse } from 'next/server';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { companyDocumentSchema } from '@/features/company-documents';
import { getDocumentExpiryInfo } from '@/features/company-documents';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { cleanupStorageFile } from '@/lib/storage/cleanup';

// GET /api/company-documents/[id] - Get a single document
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

  // Use findFirst with tenantId to prevent IDOR attacks
  const document = await db.companyDocument.findFirst({
    where: { id, tenantId },
    include: {
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
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId || !tenant?.userId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }
  const body = await request.json();
  const validatedData = companyDocumentSchema.partial().parse(body);

  // Check if document exists within tenant
  const existing = await db.companyDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  // If asset is being changed, validate it exists within tenant
  if (validatedData.assetId && validatedData.assetId !== existing.assetId) {
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

  // Build update data with proper type conversion
  const updateData: Record<string, unknown> = {};
  if (validatedData.documentTypeName !== undefined) updateData.documentTypeName = validatedData.documentTypeName;
  if (validatedData.referenceNumber !== undefined) updateData.referenceNumber = validatedData.referenceNumber || null;
  if (validatedData.expiryDate !== undefined) updateData.expiryDate = new Date(validatedData.expiryDate);
  if (validatedData.documentUrl !== undefined) updateData.documentUrl = validatedData.documentUrl || null;
  if (validatedData.assetId !== undefined) updateData.assetId = validatedData.assetId || null;
  if (validatedData.renewalCost !== undefined) updateData.renewalCost = validatedData.renewalCost || null;
  if (validatedData.notes !== undefined) updateData.notes = validatedData.notes || null;

  const document = await db.companyDocument.update({
    where: { id },
    data: updateData,
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
    ActivityActions.COMPANY_DOCUMENT_UPDATED,
    'CompanyDocument',
    document.id,
    {
      documentType: document.documentTypeName,
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
  _request: NextRequest,
  context: APIContext
) => {
  const { tenant, prisma: tenantPrisma } = context;
  if (!tenant?.tenantId || !tenant?.userId) {
    return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
  }
  const db = tenantPrisma as TenantPrismaClient;

  const tenantId = tenant.tenantId;
  const id = context.params?.id;
  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  // Check if document exists within tenant
  const existing = await db.companyDocument.findFirst({
    where: { id, tenantId },
  });

  if (!existing) {
    return NextResponse.json(
      { error: 'Document not found' },
      { status: 404 }
    );
  }

  await db.companyDocument.delete({
    where: { id },
  });

  // STORAGE-003: Clean up associated file from storage
  if (existing.documentUrl) {
    await cleanupStorageFile(existing.documentUrl, tenantId);
  }

  // Log activity
  await logAction(
    tenantId,
    tenant.userId,
    ActivityActions.COMPANY_DOCUMENT_DELETED,
    'CompanyDocument',
    id,
    {
      documentType: existing.documentTypeName,
      referenceNumber: existing.referenceNumber,
    }
  );

  return NextResponse.json({ success: true });
}, { requireAdmin: true, requireModule: 'documents' });

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Implements single document management (GET/PUT/DELETE) with proper tenant
 * isolation, activity logging, and storage cleanup on deletion.
 *
 * SECURITY:
 * [+] IDOR protection via findFirst with tenantId filter
 * [+] Asset reassignment validates new asset belongs to tenant
 * [+] PUT/DELETE require admin role
 * [+] Activity logging for updates and deletions
 * [+] Storage file cleanup on deletion (STORAGE-003)
 *
 * PATTERNS:
 * [+] Includes related entity info (asset, creator) in GET response
 * [+] Partial schema validation for PUT (only validate provided fields)
 * [+] Expiry info attached to responses
 * [+] Cleanup of orphaned storage files
 *
 * POTENTIAL IMPROVEMENTS:
 * [-] Consider soft delete for audit trail / recovery
 * [-] PUT updateData building is verbose - could simplify with Object.entries
 * [-] Missing transaction wrapper for DELETE (db delete + storage cleanup)
 * [-] Consider adding document history/version tracking
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
