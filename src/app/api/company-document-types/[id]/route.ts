/**
 * @module api/company-document-types/[id]
 * @description API endpoints for managing individual company document types.
 * Supports retrieval, update, and deletion of document type records.
 * All operations verify tenant ownership to prevent cross-tenant access (IDOR protection).
 *
 * @endpoints
 * - GET    /api/company-document-types/[id] - Get a single document type
 * - PUT    /api/company-document-types/[id] - Update a document type (admin only)
 * - DELETE /api/company-document-types/[id] - Delete a document type (admin only)
 *
 * @requires Authentication
 * @requires Module: documents
 */
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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * Implements single document type management endpoints (GET/PUT/DELETE) with
 * proper tenant isolation and IDOR protection.
 *
 * SECURITY:
 * [+] IDOR protection via findFirst with tenantId filter before any operation
 * [+] PUT/DELETE require admin role
 * [+] Code uniqueness validation on update (tenant-scoped)
 * [+] Module access control via requireModule: 'documents'
 * [+] Consistent 404 for both not found and wrong tenant (prevents enumeration)
 *
 * PATTERNS:
 * [+] Uses partial schema for PUT to allow partial updates
 * [+] Existence check before update/delete operations
 * [+] Consistent error messages across endpoints
 *
 * POTENTIAL IMPROVEMENTS:
 * [-] DELETE does not check if document type is in use by documents
 * [-] Consider cascade behavior or prevent deletion if documents exist
 * [-] Missing activity logging for updates and deletions
 * [-] Consider returning updated/deleted entity in response
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
