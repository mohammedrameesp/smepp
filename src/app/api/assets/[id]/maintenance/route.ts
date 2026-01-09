/**
 * @file route.ts
 * @description Asset maintenance records API endpoints
 * @module api/assets/[id]/maintenance
 *
 * FEATURES:
 * - List maintenance records for an asset
 * - Add new maintenance records
 * - Track who performed maintenance
 * - Maintenance notes and dates
 *
 * USE CASES:
 * - Recording scheduled maintenance (e.g., annual laptop servicing)
 * - Tracking repair history
 * - Warranty claim documentation
 * - Asset health monitoring
 *
 * SECURITY:
 * - GET: Auth required (view maintenance history)
 * - POST: Admin role required (create records)
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { z } from 'zod';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a maintenance record
 */
const createMaintenanceSchema = z.object({
  /** Date when maintenance was performed (ISO string or date string) */
  maintenanceDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  /** Optional notes about the maintenance work */
  notes: z.string().optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/[id]/maintenance - List Maintenance Records
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all maintenance records for an asset.
 * Returns records sorted by date (most recent first).
 *
 * @route GET /api/assets/[id]/maintenance
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @returns {MaintenanceRecord[]} Array of maintenance records
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 * @throws {404} Asset not found
 *
 * @example Response:
 * [
 *   {
 *     "id": "clx...",
 *     "maintenanceDate": "2025-01-15T00:00:00.000Z",
 *     "notes": "Replaced keyboard, cleaned fans",
 *     "performedBy": "user-id-123"
 *   }
 * ]
 */
async function getMaintenanceHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Verify asset belongs to this tenant (prevents IDOR)
    // ─────────────────────────────────────────────────────────────────────────────
    const asset = await db.asset.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Fetch maintenance records (sorted by date, newest first)
    // ─────────────────────────────────────────────────────────────────────────────
    const records = await db.maintenanceRecord.findMany({
      where: { assetId: id },
      orderBy: { maintenanceDate: 'desc' },
    });

    return NextResponse.json(records);
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/assets/[id]/maintenance - Add Maintenance Record
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Add a new maintenance record to an asset.
 * Only admins can create maintenance records.
 *
 * @route POST /api/assets/[id]/maintenance
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @body {string} maintenanceDate - Date of maintenance (ISO string)
 * @body {string} [notes] - Optional notes about the work performed
 *
 * @returns {MaintenanceRecord} Created maintenance record (status 201)
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 * @throws {400} Invalid request body
 * @throws {404} Asset not found
 *
 * @example Request:
 * {
 *   "maintenanceDate": "2025-01-15",
 *   "notes": "Replaced keyboard, cleaned fans, updated firmware"
 * }
 */
async function createMaintenanceHandler(request: NextRequest, context: APIContext) {
    const { tenant, prisma: tenantPrisma } = context;

    if (!tenant?.tenantId) {
      return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
    }

    const db = tenantPrisma as TenantPrismaClient;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Verify asset belongs to this tenant
    // ─────────────────────────────────────────────────────────────────────────────
    const asset = await db.asset.findFirst({
      where: { id },
      select: { id: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Parse and validate request body
    // ─────────────────────────────────────────────────────────────────────────────
    const body = await request.json();
    const validation = createMaintenanceSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { maintenanceDate, notes } = validation.data;

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Create maintenance record
    // ─────────────────────────────────────────────────────────────────────────────
    const record = await db.maintenanceRecord.create({
      data: {
        tenantId: tenant.tenantId,
        assetId: id,
        maintenanceDate: new Date(maintenanceDate),
        notes: notes || null,
        performedBy: tenant.userId,
      },
    });

    return NextResponse.json(record, { status: 201 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getMaintenanceHandler, { requireAuth: true, requireModule: 'assets' });
export const POST = withErrorHandler(createMaintenanceHandler, { requireAuth: true, requireAdmin: true, requireModule: 'assets' });
