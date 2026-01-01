/**
 * @file route.ts
 * @description Single asset CRUD API endpoints (GET, PUT, DELETE)
 * @module operations/assets
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { TeamMemberRole } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { updateAssetSchema } from '@/lib/validations/assets';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAssetUpdate } from '@/lib/domains/operations/assets/asset-history';
import { sendEmail } from '@/lib/email';
import { assetAssignmentEmail } from '@/lib/email-templates';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import {
  calculateAssetPriceQAR,
  detectAssetChanges,
  getFormattedChanges,
  transformAssetUpdateData,
} from '@/lib/domains/operations/assets/asset-update';

async function getAssetHandler(request: NextRequest, context: APIContext) {
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
    const asset = await prisma.asset.findFirst({
      where: { id, tenantId },
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

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Authorization check: Only admins or the assigned member can view the asset
    if (session.user.teamMemberRole !== TeamMemberRole.ADMIN && asset.assignedMemberId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the most recent assignment date from history if asset is assigned
    let assignmentDate = null;
    if (asset.assignedMemberId) {
      const mostRecentAssignment = await prisma.assetHistory.findFirst({
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

async function updateAssetHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = updateAssetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const data = validation.data;

    // Ensure asset tag is always uppercase if provided
    if (data.assetTag) {
      data.assetTag = data.assetTag.toUpperCase();
    }

    // Get current asset state within tenant
    const currentAsset = await prisma.asset.findFirst({
      where: { id, tenantId },
      include: {
        assignedMember: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Check if asset tag is being changed and if the new tag already exists within tenant
    if (data.assetTag && data.assetTag !== currentAsset.assetTag) {
      const existingAsset = await prisma.asset.findFirst({
        where: {
          assetTag: data.assetTag,
          tenantId,
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

    // Calculate priceQAR using helper (handles price/currency updates and conversions)
    const calculatedPriceQAR = calculateAssetPriceQAR(data, currentAsset, data.priceQAR);

    // Transform data for Prisma (converts dates, handles empty strings, removes non-model fields)
    const updateData = transformAssetUpdateData(data) as Record<string, unknown>;

    // Set calculated priceQAR if available
    if (calculatedPriceQAR !== undefined) {
      updateData.priceQAR = calculatedPriceQAR;
    }

    // Validate that the assigned member belongs to the same organization
    if (updateData.assignedMemberId) {
      const assignedMember = await prisma.teamMember.findFirst({
        where: {
          id: updateData.assignedMemberId as string,
          tenantId,
        },
        select: { id: true },
      });

      if (!assignedMember) {
        return NextResponse.json({ error: 'Assigned member not found in this organization' }, { status: 400 });
      }
    }

    // Auto-unassign if status is changing to anything other than IN_USE
    if (data.status && data.status !== 'IN_USE' && currentAsset.assignedMemberId) {
      updateData.assignedMemberId = null;

      // Record unassignment in history
      const { recordAssetAssignment } = await import('@/lib/domains/operations/assets/asset-history');
      await recordAssetAssignment(
        id,
        currentAsset.assignedMemberId,
        null,
        session.user.id,
        `Asset automatically unassigned due to status change to ${data.status}`
      );
    }

    // Track location changes
    if (data.location !== undefined && data.location !== currentAsset.location) {
      const { recordAssetLocationChange } = await import('@/lib/domains/operations/assets/asset-history');
      await recordAssetLocationChange(
        id,
        currentAsset.location,
        data.location,
        session.user.id
      );
    }

    // Update asset
    const asset = await prisma.asset.update({
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

    // Track assignment changes with custom date
    const memberChanged = data.assignedMemberId !== undefined && data.assignedMemberId !== currentAsset.assignedMemberId;

    if (memberChanged) {
      // Member assignment changed - create new history record
      const { recordAssetAssignment } = await import('@/lib/domains/operations/assets/asset-history');
      const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : new Date();

      await recordAssetAssignment(
        id,
        currentAsset.assignedMemberId,
        data.assignedMemberId ?? null,
        session.user.id,
        undefined,
        assignmentDate
      );

      // Send assignment email to the new member (if assigned, not unassigned)
      if (asset.assignedMember?.email) {
        try {
          // Get org name for email
          const org = await prisma.organization.findUnique({
            where: { id: tenantId },
            select: { name: true },
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
      // Member didn't change but assignment date might have changed
      // Find the most recent assignment history for the current member
      const mostRecentAssignment = await prisma.assetHistory.findFirst({
        where: {
          assetId: id,
          action: 'ASSIGNED',
          toMemberId: currentAsset.assignedMemberId,
        },
        orderBy: { createdAt: 'desc' }
      });

      const newDate = new Date(data.assignmentDate);

      if (mostRecentAssignment) {
        // Compare dates to see if it actually changed
        const currentDate = mostRecentAssignment.assignmentDate;
        const datesDiffer = !currentDate ||
          newDate.toISOString().split('T')[0] !== currentDate.toISOString().split('T')[0];

        // Only update if the date actually changed
        if (datesDiffer) {
          await prisma.assetHistory.update({
            where: { id: mostRecentAssignment.id },
            data: { assignmentDate: newDate }
          });
        }
      } else {
        // No history record exists - create one for the current assignment
        const { recordAssetAssignment } = await import('@/lib/domains/operations/assets/asset-history');
        await recordAssetAssignment(
          id,
          null,  // No previous member
          currentAsset.assignedMemberId,
          session.user.id,
          'Historical assignment record created during date update',
          newDate
        );
      }
    }

    // Pre-fetch member data for change detection display (fixes N+1 query)
    const memberIdsToFetch = new Set<string>();
    if (currentAsset.assignedMemberId) memberIdsToFetch.add(currentAsset.assignedMemberId);
    if (data.assignedMemberId && typeof data.assignedMemberId === 'string') memberIdsToFetch.add(data.assignedMemberId);

    const memberMap = new Map<string, { name: string | null; email: string }>();
    if (memberIdsToFetch.size > 0) {
      const members = await prisma.teamMember.findMany({
        where: { id: { in: Array.from(memberIdsToFetch) } },
        select: { id: true, name: true, email: true },
      });
      members.forEach(m => memberMap.set(m.id, { name: m.name, email: m.email }));
    }

    // Detect changes using helper (handles date/decimal normalization, human-readable labels)
    const changes = detectAssetChanges(
      data as Record<string, unknown>,
      currentAsset as unknown as Record<string, unknown>,
      memberMap
    );
    const changeDetails = getFormattedChanges(changes);

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_UPDATED,
      'Asset',
      asset.id,
      { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag, changes: changeDetails }
    );

    // Record asset update history only if there were changes
    if (changeDetails.length > 0) {
      const updatedFieldsMessage = changeDetails.join('\n');
      await recordAssetUpdate(
        asset.id,
        session.user.id,
        updatedFieldsMessage
      );
    }

    return NextResponse.json(asset);
}

async function deleteAssetHandler(request: NextRequest, context: APIContext) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const id = context.params?.id;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    // Get asset details within tenant before deletion for logging
    const asset = await prisma.asset.findFirst({
      where: { id, tenantId },
      select: { id: true, model: true, brand: true, type: true, assetTag: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Delete asset
    await prisma.asset.delete({
      where: { id },
    });

    // Log activity
    await logAction(
      tenantId,
      session.user.id,
      ActivityActions.ASSET_DELETED,
      'Asset',
      asset.id,
      { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag }
    );

    return NextResponse.json({ message: 'Asset deleted successfully' });
}

export const GET = withErrorHandler(getAssetHandler, { requireAuth: true, requireModule: 'assets' });
export const PUT = withErrorHandler(updateAssetHandler, { requireAdmin: true, requireModule: 'assets' });
export const DELETE = withErrorHandler(deleteAssetHandler, { requireAdmin: true, requireModule: 'assets' });