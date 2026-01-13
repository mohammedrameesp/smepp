/**
 * @file route.ts
 * @description Single asset CRUD API endpoints (GET, PUT, DELETE)
 * @module api/assets/[id]
 *
 * FEATURES:
 * - Get single asset with assignment details
 * - Update asset with change tracking and history
 * - Delete asset with audit logging
 * - Assignment change notifications (email + in-app)
 * - Auto-unassign when status changes from IN_USE
 * - Location change tracking
 *
 * SECURITY:
 * - GET: Auth required, user can only view assigned assets (admins can view all)
 * - PUT: Admin role required
 * - DELETE: Admin role required
 * - All operations verify tenantId to prevent IDOR attacks
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server';
import { AssetStatus, AssetRequestStatus, AssetRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { updateAssetSchema } from '@/features/assets';
import { logAction, ActivityActions } from '@/lib/core/activity';
import { recordAssetUpdate } from '@/features/assets';
import { sendEmail } from '@/lib/core/email';
import { assetAssignmentEmail } from '@/lib/core/email-templates';
import { assetAssignmentPendingEmail } from '@/lib/core/asset-request-emails';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import {
  calculateAssetPriceQAR,
  detectAssetChanges,
  getFormattedChanges,
  transformAssetUpdateData,
} from '@/features/assets';
import { generateRequestNumber } from '@/features/asset-requests';
import { createNotification, NotificationTemplates } from '@/features/notifications/lib';
import { TenantPrismaClient } from '@/lib/core/prisma-tenant';

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/assets/[id] - Get Single Asset (Most Used)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a single asset by ID with assignment details.
 * Most frequently called when viewing asset detail page.
 *
 * @route GET /api/assets/[id]
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @returns {Asset} Asset with assigned member info and assignment date
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 * @throws {404} Asset not found
 * @throws {403} Forbidden (non-admin trying to view unassigned asset)
 *
 * @example Response:
 * {
 *   "id": "clx...",
 *   "assetTag": "ORG-CP-25001",
 *   "model": "MacBook Pro",
 *   "assignedMember": { "id": "...", "name": "John", "email": "john@..." },
 *   "assignmentDate": "2025-01-15T00:00:00.000Z"
 * }
 */
async function getAssetHandler(request: NextRequest, context: APIContext) {
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
    // STEP 1: Fetch asset with tenant isolation (prevents IDOR attacks)
    // ─────────────────────────────────────────────────────────────────────────────
    const asset = await db.asset.findFirst({
      where: { id },
      include: {
        assignedMember: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Authorization check
    // Admins can view any asset, members can only view their assigned assets
    // ─────────────────────────────────────────────────────────────────────────────
    const isAdmin = tenant.orgRole === 'OWNER' || tenant.orgRole === 'ADMIN';
    if (!isAdmin && asset.assignedMemberId !== tenant.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Fetch assignment date from history (if asset is assigned)
    // This provides the "assigned since" date for display
    // ─────────────────────────────────────────────────────────────────────────────
    let assignmentDate = null;
    if (asset.assignedMemberId) {
      const mostRecentAssignment = await db.assetHistory.findFirst({
        where: {
          assetId: id,
          action: 'ASSIGNED',
          toMemberId: asset.assignedMemberId,
        },
        orderBy: { createdAt: 'desc' },
        select: { assignmentDate: true },
      });
      assignmentDate = mostRecentAssignment?.assignmentDate || null;
    }

    return NextResponse.json({
      ...asset,
      assignmentDate,
    });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT /api/assets/[id] - Update Asset
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Update an asset with full change tracking and history recording.
 * Handles assignment changes, location tracking, and email notifications.
 *
 * @route PUT /api/assets/[id]
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @body {string} [assetTag] - Updated asset tag (must be unique)
 * @body {string} [type] - Asset type
 * @body {string} [model] - Model name
 * @body {string} [brand] - Brand name
 * @body {string} [serial] - Serial number
 * @body {AssetStatus} [status] - Status (auto-unassigns if not IN_USE)
 * @body {string} [assignedMemberId] - New assigned member ID
 * @body {string} [assignmentDate] - Custom assignment date (ISO string)
 * @body {string} [location] - Physical location
 * @body {number} [price] - Purchase price
 * @body {string} [priceCurrency] - Currency (QAR/USD)
 * @body ... (see updateAssetSchema for full list)
 *
 * @returns {Asset} Updated asset with relations
 *
 * @throws {400} Invalid request body
 * @throws {400} Asset tag already exists
 * @throws {400} Assigned member not found in organization
 * @throws {404} Asset not found
 *
 * @sideEffects
 * - Records changes in AssetHistory
 * - Sends assignment email to new member
 * - Auto-unassigns if status changes from IN_USE
 * - Records location changes in history
 */
async function updateAssetHandler(request: NextRequest, context: APIContext) {
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
    // STEP 1: Parse and validate request body
    // ─────────────────────────────────────────────────────────────────────────────
    const body = await request.json();
    const validation = updateAssetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Ensure asset tag is always uppercase for consistency
    if (data.assetTag) {
      data.assetTag = data.assetTag.toUpperCase();
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Get current asset state for change detection
    // ─────────────────────────────────────────────────────────────────────────────
    const currentAsset = await db.asset.findFirst({
      where: { id },
      include: {
        assignedMember: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Validate asset tag uniqueness (if changing)
    // ─────────────────────────────────────────────────────────────────────────────
    if (data.assetTag && data.assetTag !== currentAsset.assetTag) {
      const existingAsset = await db.asset.findFirst({
        where: {
          assetTag: data.assetTag,
          id: { not: id }, // Exclude current asset
        },
      });

      if (existingAsset) {
        return NextResponse.json({
          error: 'Asset tag already exists',
          details: [{ message: `Asset tag "${data.assetTag}" is already in use by another asset. Please use a unique asset tag.` }]
        }, { status: 400 });
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 4: Calculate priceQAR for multi-currency support
    // Supports ALL currencies with tenant-specific exchange rates
    // ─────────────────────────────────────────────────────────────────────────────
    const calculatedPriceQAR = await calculateAssetPriceQAR(data, currentAsset, tenantId, data.priceQAR);

    // Transform data for Prisma (converts dates, handles empty strings)
    const updateData = transformAssetUpdateData(data) as Record<string, unknown>;

    if (calculatedPriceQAR !== undefined) {
      updateData.priceQAR = calculatedPriceQAR;
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 5: Validate assigned member and check approval requirements
    // Note: We check data.assignedMemberId before transform since transform converts it to relation syntax
    // ─────────────────────────────────────────────────────────────────────────────
    let newMemberRequiresApproval = false;
    let newMemberData: { id: string; name: string | null; email: string; canLogin: boolean } | null = null;

    if (data.assignedMemberId) {
      // SECURITY: Use tenant-scoped prisma to prevent IDOR attacks
      // An attacker could try to assign an asset to a member from another tenant
      const assignedMember = await db.teamMember.findFirst({
        where: {
          id: data.assignedMemberId,
        },
        select: { id: true, name: true, email: true, canLogin: true },
      });

      if (!assignedMember) {
        return NextResponse.json({ error: 'Assigned member not found in this organization' }, { status: 400 });
      }

      newMemberData = assignedMember;
      // Check if this assignment change requires approval
      const memberChanging = data.assignedMemberId !== currentAsset.assignedMemberId;
      if (memberChanging && assignedMember.canLogin) {
        newMemberRequiresApproval = true;

        // Check for existing pending requests
        const pendingRequest = await db.assetRequest.findFirst({
          where: {
            assetId: id,
            status: {
              in: [AssetRequestStatus.PENDING_ADMIN_APPROVAL, AssetRequestStatus.PENDING_USER_ACCEPTANCE],
            },
          },
        });

        if (pendingRequest) {
          return NextResponse.json({
            error: 'Asset has a pending assignment request. Please resolve it first.',
            pendingRequestId: pendingRequest.id
          }, { status: 400 });
        }
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 6: Handle status changes (SPARE, REPAIR, etc.) with custom date
    // Business rule: Asset cannot be assigned if it's in MAINTENANCE, SPARE, etc.
    // ─────────────────────────────────────────────────────────────────────────────
    const statusChanged = data.status && data.status !== currentAsset.status;

    if (statusChanged && data.status !== 'IN_USE') {
      // Auto-unassign if currently assigned
      if (currentAsset.assignedMemberId) {
        // Override the assignedMember relation to disconnect
        updateData.assignedMember = { disconnect: true };

        // Record unassignment in history
        const { recordAssetAssignment } = await import('@/features/assets');
        await recordAssetAssignment(
          id,
          currentAsset.assignedMemberId,
          null,
          tenant.userId,
          `Asset automatically unassigned due to status change to ${data.status}`
        );
      }

      // Record status change in history with custom date
      const { recordAssetStatusChange } = await import('@/features/assets');
      const statusChangeDate = data.statusChangeDate ? new Date(data.statusChangeDate) : new Date();
      await recordAssetStatusChange(
        id,
        currentAsset.status,
        data.status as AssetStatus,
        tenant.userId,
        statusChangeDate
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7: Track location changes for audit trail
    // ─────────────────────────────────────────────────────────────────────────────
    if (data.locationId !== undefined && data.locationId !== currentAsset.locationId) {
      const { recordAssetLocationChange } = await import('@/features/assets');

      // Fetch location names for history recording
      let fromLocationName: string | null = null;
      let toLocationName: string | null = null;

      if (currentAsset.locationId) {
        const fromLocation = await prisma.location.findUnique({
          where: { id: currentAsset.locationId },
          select: { name: true },
        });
        fromLocationName = fromLocation?.name || null;
      }

      if (data.locationId) {
        const toLocation = await prisma.location.findUnique({
          where: { id: data.locationId },
          select: { name: true },
        });
        toLocationName = toLocation?.name || null;
      }

      await recordAssetLocationChange(
        id,
        fromLocationName,
        toLocationName,
        tenant.userId
      );
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 7.5: If approval is required, don't update assignment in this request
    // Instead, we'll create an AssetRequest after updating other fields
    // ─────────────────────────────────────────────────────────────────────────────
    if (newMemberRequiresApproval) {
      // Remove assignment from update data - it will be handled via AssetRequest
      delete updateData.assignedMember;
      // Also don't change status to IN_USE if we're creating a pending assignment
      if (data.status === AssetStatus.IN_USE && currentAsset.status !== AssetStatus.IN_USE) {
        delete updateData.status;
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 8: Update asset in database
    // ─────────────────────────────────────────────────────────────────────────────
    const asset = await db.asset.update({
      where: { id },
      data: updateData,
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
    // STEP 8.5: If approval is required, create AssetRequest and return early
    // ─────────────────────────────────────────────────────────────────────────────
    if (newMemberRequiresApproval && newMemberData) {
      // If currently assigned to someone else, unassign first
      if (currentAsset.assignedMemberId && currentAsset.assignedMemberId !== data.assignedMemberId) {
        const { recordAssetAssignment } = await import('@/features/assets');

        // Unassign from previous member
        await db.asset.update({
          where: { id },
          data: {
            assignedMemberId: null,
            assignmentDate: null,
            status: AssetStatus.SPARE,
          },
        });

        await recordAssetAssignment(
          id,
          currentAsset.assignedMemberId,
          null,
          tenant.userId,
          `Reassigned to ${newMemberData.name || newMemberData.email} (pending acceptance)`
        );
      }

      // Create pending assignment request
      const requestNumber = await generateRequestNumber(tenantId);
      const assetRequest = await db.assetRequest.create({
        data: {
          tenantId,
          requestNumber,
          assetId: id,
          memberId: newMemberData.id,
          type: AssetRequestType.ADMIN_ASSIGNMENT,
          status: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
          reason: data.notes || 'Assigned via asset edit',
          assignedById: tenant.userId,
        },
        include: {
          asset: { select: { id: true, assetTag: true, model: true, brand: true, type: true } },
          member: { select: { id: true, name: true, email: true } },
        },
      });

      // Create history entry for the request
      await prisma.assetRequestHistory.create({
        data: {
          assetRequestId: assetRequest.id,
          action: 'CREATED',
          oldStatus: null,
          newStatus: AssetRequestStatus.PENDING_USER_ACCEPTANCE,
          notes: data.notes || 'Admin assignment created via asset edit',
          performedById: tenant.userId,
        },
      });

      // Log activity
      await logAction(tenantId, tenant.userId, ActivityActions.ASSET_ASSIGNMENT_CREATED, 'AssetRequest', assetRequest.id, {
        requestNumber: assetRequest.requestNumber,
        assetTag: asset.assetTag,
        assetModel: asset.model,
        memberName: newMemberData.name || newMemberData.email,
      });

      // Send notification to user (non-blocking)
      try {
        const org = await prisma.organization.findUnique({
          where: { id: tenantId },
          select: { name: true, slug: true, primaryColor: true },
        });

        // Get admin name for notification
        const admin = await prisma.teamMember.findUnique({
          where: { id: tenant.userId },
          select: { name: true, email: true },
        });

        // In-app notification
        await createNotification(
          NotificationTemplates.assetAssignmentPending(
            newMemberData.id,
            asset.assetTag || asset.model,
            asset.model,
            admin?.name || admin?.email || 'Admin',
            assetRequest.requestNumber,
            assetRequest.id
          ),
          tenantId
        );

        // Email notification
        const emailContent = assetAssignmentPendingEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: asset.assetTag || '',
          assetModel: asset.model,
          assetBrand: asset.brand || '',
          assetType: asset.type,
          userName: newMemberData.name || newMemberData.email,
          assignerName: admin?.name || admin?.email || 'Admin',
          orgSlug: org?.slug || '',
          orgName: org?.name || 'Organization',
          primaryColor: org?.primaryColor || undefined,
        });
        await sendEmail({
          to: newMemberData.email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text,
        });
      } catch {
        // Don't fail if notification fails
      }

      // Return with pending assignment info
      return NextResponse.json({
        ...asset,
        _pendingAssignment: true,
        pendingRequest: {
          id: assetRequest.id,
          requestNumber: assetRequest.requestNumber,
          memberId: newMemberData.id,
          memberName: newMemberData.name || newMemberData.email,
        },
        message: `Assignment pending acceptance by ${newMemberData.name || newMemberData.email}`,
      });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 9: Handle assignment changes (with custom date support)
    // Only for direct assignments (canLogin=false members)
    // ─────────────────────────────────────────────────────────────────────────────
    const memberChanged = data.assignedMemberId !== undefined && data.assignedMemberId !== currentAsset.assignedMemberId;

    if (memberChanged) {
      // Member assignment changed - create new history record
      const { recordAssetAssignment } = await import('@/features/assets');
      const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : new Date();

      await recordAssetAssignment(
        id,
        currentAsset.assignedMemberId,
        data.assignedMemberId ?? null,
        tenant.userId,
        undefined,
        assignmentDate
      );

      // Send assignment email to the new member (non-blocking)
      if (asset.assignedMember?.email) {
        try {
          const org = await prisma.organization.findUnique({
            where: { id: tenantId },
            select: { name: true, primaryColor: true },
          });

          const emailContent = assetAssignmentEmail({
            userName: asset.assignedMember.name || asset.assignedMember.email,
            assetTag: asset.assetTag || 'N/A',
            assetType: asset.type,
            brand: asset.brand || 'N/A',
            model: asset.model,
            serialNumber: asset.serial || null,
            assignmentDate: assignmentDate,
            orgName: org?.name || 'Organization',
            primaryColor: org?.primaryColor || undefined,
          });
          await sendEmail({
            to: asset.assignedMember.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
        } catch {
          // Don't fail the request if email fails
        }
      }
    } else if (data.assignmentDate && currentAsset.assignedMemberId && !memberChanged) {
      // Assignment date changed but member stayed the same - update existing history
      const mostRecentAssignment = await db.assetHistory.findFirst({
        where: {
          assetId: id,
          action: 'ASSIGNED',
          toMemberId: currentAsset.assignedMemberId,
        },
        orderBy: { createdAt: 'desc' }
      });

      const newDate = new Date(data.assignmentDate);

      if (mostRecentAssignment) {
        const currentDate = mostRecentAssignment.assignmentDate;
        const datesDiffer = !currentDate ||
          newDate.toISOString().split('T')[0] !== currentDate.toISOString().split('T')[0];

        if (datesDiffer) {
          await db.assetHistory.update({
            where: { id: mostRecentAssignment.id },
            data: { assignmentDate: newDate }
          });
        }
      } else {
        // No history record exists - create one for the current assignment
        const { recordAssetAssignment } = await import('@/features/assets');
        await recordAssetAssignment(
          id,
          null,
          currentAsset.assignedMemberId,
          tenant.userId,
          'Historical assignment record created during date update',
          newDate
        );
      }
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 10: Detect and log changes for audit trail
    // ─────────────────────────────────────────────────────────────────────────────

    // Pre-fetch member data for change detection display (prevents N+1 queries)
    const memberIdsToFetch = new Set<string>();
    if (currentAsset.assignedMemberId) memberIdsToFetch.add(currentAsset.assignedMemberId);
    if (data.assignedMemberId && typeof data.assignedMemberId === 'string') memberIdsToFetch.add(data.assignedMemberId);

    const memberMap = new Map<string, { name: string | null; email: string }>();
    if (memberIdsToFetch.size > 0) {
      const members = await prisma.teamMember.findMany({
        where: { id: { in: Array.from(memberIdsToFetch) }, tenantId },
        select: { id: true, name: true, email: true },
      });
      members.forEach(m => memberMap.set(m.id, { name: m.name, email: m.email }));
    }

    // Detect changes using helper (handles date/decimal normalization)
    // Skip fields that have dedicated history entries to avoid duplication:
    // - assignmentDate: Not stored on asset model (used for history record only)
    // - assignedMemberId: Has ASSIGNED/UNASSIGNED entries
    // - status: Has STATUS_CHANGED entries
    // - locationId: Has LOCATION_CHANGED entries
    const changes = detectAssetChanges(
      data as Record<string, unknown>,
      currentAsset as unknown as Record<string, unknown>,
      memberMap,
      ['assignmentDate', 'assignedMemberId', 'status', 'locationId']
    );
    const changeDetails = getFormattedChanges(changes);

    // Log activity for audit
    await logAction(
      tenantId,
      tenant.userId,
      ActivityActions.ASSET_UPDATED,
      'Asset',
      asset.id,
      { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag, changes: changeDetails }
    );

    // Record update in asset history (only if there were actual changes)
    if (changeDetails.length > 0) {
      const updatedFieldsMessage = changeDetails.join('\n');
      await recordAssetUpdate(
        asset.id,
        tenant.userId,
        updatedFieldsMessage
      );
    }

    return NextResponse.json(asset);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DELETE /api/assets/[id] - Delete Asset
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Delete an asset permanently.
 * For financial tracking, consider using disposal (dispose route) instead.
 *
 * @route DELETE /api/assets/[id]
 *
 * @param {string} id - Asset ID (path parameter)
 *
 * @returns {{ message: string }} Success message
 *
 * @throws {403} Organization context required
 * @throws {400} ID is required
 * @throws {404} Asset not found
 *
 * @sideEffects
 * - Permanently removes asset from database
 * - Cascades to related records (history, maintenance, etc.)
 * - Logs deletion activity for audit
 */
async function deleteAssetHandler(request: NextRequest, context: APIContext) {
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
    // STEP 1: Get asset details for logging before deletion
    // ─────────────────────────────────────────────────────────────────────────────
    const asset = await db.asset.findFirst({
      where: { id },
      select: { id: true, model: true, brand: true, type: true, assetTag: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 2: Delete asset (cascades to related records)
    // ─────────────────────────────────────────────────────────────────────────────
    await db.asset.delete({
      where: { id },
    });

    // ─────────────────────────────────────────────────────────────────────────────
    // STEP 3: Log deletion for audit trail
    // ─────────────────────────────────────────────────────────────────────────────
    await logAction(
      tenant.tenantId,
      tenant.userId,
      ActivityActions.ASSET_DELETED,
      'Asset',
      asset.id,
      { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag }
    );

    return NextResponse.json({ message: 'Asset deleted successfully' });
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export const GET = withErrorHandler(getAssetHandler, { requireAuth: true, requireModule: 'assets' });
export const PUT = withErrorHandler(updateAssetHandler, { requireAdmin: true, requireModule: 'assets' });
export const DELETE = withErrorHandler(deleteAssetHandler, { requireAdmin: true, requireModule: 'assets' });
