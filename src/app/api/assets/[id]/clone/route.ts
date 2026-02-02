/**
 * @file route.ts
 * @description Asset cloning API endpoint
 * @module api/assets/[id]/clone
 *
 * FEATURES:
 * - Clone existing asset with auto-generated tag
 * - Clears serial number (must be unique per device)
 * - Clears assignment (new asset starts unassigned)
 * - Sets status to SPARE (available for use)
 * - Preserves all other asset properties
 *
 * USE CASES:
 * - Bulk purchasing same model (e.g., 10 identical laptops)
 * - Quick duplication for similar assets
 *
 * SECURITY:
 * - Admin role required
 * - Assets module must be enabled
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { recordAssetCreation } from '@/features/assets';
import { withErrorHandler, APIContext } from '@/lib/http/handler';

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/assets/[id]/clone - Clone Asset
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clone an existing asset to create a new one with similar properties.
 * Useful for bulk purchasing or creating similar assets quickly.
 *
 * @route POST /api/assets/[id]/clone
 *
 * @param {string} id - Source asset ID to clone (path parameter)
 *
 * @returns {Asset} Newly created cloned asset (status 201)
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 * @throws {404} Asset not found
 *
 * @cloned_properties
 * - type, brand, model, configuration
 * - purchaseDate, warrantyExpiry
 * - supplier, invoiceNumber
 * - price, priceCurrency, priceQAR
 * - notes, location
 *
 * @cleared_properties
 * - serial (must be unique per device)
 * - assignedMemberId (starts unassigned)
 * - assetTag (auto-generated)
 * - status (set to SPARE)
 *
 * @example Response:
 * {
 *   "id": "clx456...",
 *   "assetTag": "AST-002",
 *   "model": "MacBook Pro",
 *   "status": "SPARE",
 *   "serial": null,
 *   "assignedMember": null
 * }
 */
async function cloneAssetHandler(request: NextRequest, context: APIContext) {
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

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 1: Get the original asset (with tenant isolation)
    // ─────────────────────────────────────────────────────────────────────────────
    const originalAsset = await db.asset.findFirst({
      where: { id },
    });

    if (!originalAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Generate a new asset tag
    // Strategy: Find latest tag, extract number, increment
    // ─────────────────────────────────────────────────────────────────────────────
    const latestAsset = await db.asset.findFirst({
      where: {
        assetTag: {
          not: null,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        assetTag: true,
      },
    });

    let newAssetTag: string | null = null;
    if (latestAsset?.assetTag) {
      // Extract trailing number from tag (e.g., "AST-001" -> "001")
      const match = latestAsset.assetTag.match(/(\d+)$/);
      if (match) {
        const nextNumber = parseInt(match[1], 10) + 1;
        const paddedNumber = nextNumber.toString().padStart(match[1].length, '0');
        newAssetTag = latestAsset.assetTag.replace(/\d+$/, paddedNumber);
      } else {
        // If no number found, append -001
        newAssetTag = `${latestAsset.assetTag}-001`;
      }
    } else {
      // First asset in tenant, create default tag
      newAssetTag = 'AST-001';
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Create cloned asset
    // Note: Serial and assignment are cleared, status is SPARE
    // ─────────────────────────────────────────────────────────────────────────────
    const clonedAsset = await db.asset.create({
      data: {
        tenantId,
        assetTag: newAssetTag,
        type: originalAsset.type,
        brand: originalAsset.brand,
        model: originalAsset.model,
        serial: null,                    // Clear serial (must be unique)
        configuration: originalAsset.configuration,
        purchaseDate: originalAsset.purchaseDate,
        warrantyExpiry: originalAsset.warrantyExpiry,
        supplier: originalAsset.supplier,
        invoiceNumber: originalAsset.invoiceNumber,
        price: originalAsset.price,
        priceCurrency: originalAsset.priceCurrency,
        priceQAR: originalAsset.priceQAR,
        status: 'SPARE',                 // New cloned assets default to SPARE
        assignedMemberId: null,          // Clear assignment
        notes: originalAsset.notes,
        locationId: originalAsset.locationId,
      },
      include: {
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Log activity with reference to original asset
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenantId,
      tenant.userId,
      ActivityActions.ASSET_CREATED,
      'Asset',
      clonedAsset.id,
      {
        assetModel: clonedAsset.model,
        assetType: clonedAsset.type,
        assetTag: clonedAsset.assetTag,
        clonedFrom: originalAsset.id,
      }
    );

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Record asset creation in history
    // ─────────────────────────────────────────────────────────────────────────────
    await recordAssetCreation(clonedAsset.id, tenant.userId);

    return NextResponse.json(clonedAsset, { status: 201 });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandler(cloneAssetHandler, { requireAdmin: true, requireModule: 'assets' });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None required - well-documented cloning logic
 * Issues: None - proper tenant isolation, auto-tag generation, activity logging
 */
