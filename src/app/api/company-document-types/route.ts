/**
 * @module api/company-document-types
 * @description API endpoints for managing company document types within a tenant.
 * Document types define categories for company documents (e.g., Trade License, CR Certificate).
 * All operations are tenant-scoped and require the 'documents' module to be enabled.
 *
 * @endpoints
 * - GET  /api/company-document-types - List all document types for the tenant
 * - POST /api/company-document-types - Create a new document type (admin only)
 *
 * @requires Authentication
 * @requires Module: documents
 */
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

/*
 * ═══════════════════════════════════════════════════════════════════════════════
 * CODE REVIEW SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * OVERVIEW:
 * This file implements CRUD operations for company document types within a
 * multi-tenant SaaS platform. Document types serve as categories for company
 * documents (e.g., Trade License, CR Certificate, Insurance Policy).
 *
 * SECURITY:
 * [+] Tenant isolation enforced via tenantId filtering on all queries
 * [+] Uses withErrorHandler wrapper for consistent error handling
 * [+] POST requires admin role for write operations
 * [+] Module access control via requireModule: 'documents'
 * [+] Code uniqueness check scoped to tenant (prevents cross-tenant conflicts)
 *
 * PATTERNS:
 * [+] Follows project API patterns with withErrorHandler wrapper
 * [+] Proper Zod validation via companyDocumentTypeSchema
 * [+] Consistent response structure { documentType(s) }
 *
 * POTENTIAL IMPROVEMENTS:
 * [-] Consider adding pagination to GET for large document type lists
 * [-] Missing activity logging for document type creation
 * [-] Consider soft delete instead of hard delete in [id] route
 *
 * LAST REVIEWED: 2026-02-01
 * ═══════════════════════════════════════════════════════════════════════════════
 */
