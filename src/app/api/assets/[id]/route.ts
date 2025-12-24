import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { updateAssetSchema } from '@/lib/validations/assets';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAssetUpdate } from '@/lib/asset-history';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { sendEmail } from '@/lib/email';
import { assetAssignmentEmail } from '@/lib/email-templates';

// Helper to convert field names to human-readable labels
const fieldLabels: Record<string, string> = {
  assetTag: 'Asset Tag',
  brand: 'Brand',
  model: 'Model',
  type: 'Type',
  serial: 'Serial Number',
  configuration: 'Configuration',
  purchaseDate: 'Purchase Date',
  supplier: 'Supplier',
  invoiceNumber: 'Invoice Number',
  price: 'Price',
  priceCurrency: 'Currency',
  priceQAR: 'Price (QAR)',
  warrantyExpiry: 'Warranty Expiry',
  status: 'Status',
  acquisitionType: 'Acquisition Type',
  transferNotes: 'Transfer Notes',
  assignedUserId: 'Assigned User',
  assignmentDate: 'Assignment Date',
  notes: 'Notes',
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Use findFirst with tenantId to prevent IDOR attacks
    const asset = await prisma.asset.findFirst({
      where: { id, tenantId },
      include: {
        assignedUser: {
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

    // Authorization check: Only admins or the assigned user can view the asset
    if (session.user.role !== Role.ADMIN && asset.assignedUserId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the most recent assignment date from history if asset is assigned
    let assignmentDate = null;
    if (asset.assignedUserId) {
      const mostRecentAssignment = await prisma.assetHistory.findFirst({
        where: {
          assetId: id,
          action: 'ASSIGNED',
          toUserId: asset.assignedUserId,
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

  } catch (error) {
    console.error('Asset GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

    // Parse and validate request body
    const body = await request.json();
    const validation = updateAssetSchema.safeParse(body);

    if (!validation.success) {
      console.error('Asset validation error:', validation.error.issues);
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
        assignedUser: {
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

    // SAFEGUARD: Always calculate priceQAR to prevent data loss
    let priceQAR = data.priceQAR;

    // If price is being updated, ensure priceQAR is calculated
    if (data.price !== undefined) {
      const price = data.price;
      const currency = data.priceCurrency !== undefined ? data.priceCurrency : currentAsset.priceCurrency;

      if (price && !priceQAR) {
        if (currency === 'QAR') {
          // QAR is base currency, no conversion needed
          priceQAR = price;
        } else if (currency === 'USD') {
          // Convert USD to QAR
          priceQAR = price * USD_TO_QAR_RATE;
        }
      }
    }

    // If only currency is changing, recalculate priceQAR
    if (data.priceCurrency !== undefined && data.price === undefined) {
      const currentPrice = currentAsset.price ? Number(currentAsset.price) : 0;
      if (currentPrice > 0) {
        if (data.priceCurrency === 'QAR') {
          // QAR is base currency, no conversion needed
          priceQAR = currentPrice;
        } else if (data.priceCurrency === 'USD') {
          // Convert USD to QAR
          priceQAR = currentPrice * USD_TO_QAR_RATE;
        }
      }
    }

    // Convert date strings to Date objects and remove non-model fields
    const updateData: any = { ...data };

    // Ensure priceQAR is set if calculated
    if (priceQAR !== undefined) {
      updateData.priceQAR = priceQAR;
    }

    // Remove assignmentDate as it's only used for history tracking, not stored on the asset
    delete updateData.assignmentDate;

    // Convert empty string to null for assignedUserId (database expects null, not empty string)
    if (data.assignedUserId !== undefined) {
      updateData.assignedUserId = data.assignedUserId === '' ? null : data.assignedUserId;
    }

    if (data.purchaseDate !== undefined) {
      updateData.purchaseDate = data.purchaseDate ? new Date(data.purchaseDate) : null;
    }
    if (data.warrantyExpiry !== undefined) {
      updateData.warrantyExpiry = data.warrantyExpiry ? new Date(data.warrantyExpiry) : null;
    }

    // Auto-unassign if status is changing to anything other than IN_USE
    if (data.status && data.status !== 'IN_USE' && currentAsset.assignedUserId) {
      updateData.assignedUserId = null;

      // Record unassignment in history
      const { recordAssetAssignment } = await import('@/lib/asset-history');
      await recordAssetAssignment(
        id,
        currentAsset.assignedUserId,
        null,
        session.user.id,
        `Asset automatically unassigned due to status change to ${data.status}`
      );
    }

    // Track location changes
    if (data.location !== undefined && data.location !== currentAsset.location) {
      const { recordAssetLocationChange } = await import('@/lib/asset-history');
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
        assignedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Track assignment changes with custom date
    const userChanged = data.assignedUserId !== undefined && data.assignedUserId !== currentAsset.assignedUserId;

    if (userChanged) {
      // User assignment changed - create new history record
      const { recordAssetAssignment } = await import('@/lib/asset-history');
      const assignmentDate = data.assignmentDate ? new Date(data.assignmentDate) : new Date();

      await recordAssetAssignment(
        id,
        currentAsset.assignedUserId,
        data.assignedUserId ?? null,
        session.user.id,
        undefined,
        assignmentDate
      );

      // Send assignment email to the new user (if assigned, not unassigned)
      if (asset.assignedUser?.email) {
        try {
          const emailContent = assetAssignmentEmail({
            userName: asset.assignedUser.name || asset.assignedUser.email,
            assetTag: asset.assetTag || 'N/A',
            assetType: asset.type,
            brand: asset.brand || 'N/A',
            model: asset.model,
            serialNumber: asset.serial || null,
            assignmentDate: assignmentDate,
          });
          await sendEmail({
            to: asset.assignedUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
        } catch {
          // Don't fail the request if email fails
        }
      }
    } else if (data.assignmentDate && currentAsset.assignedUserId && !userChanged) {
      // User didn't change but assignment date might have changed
      // Find the most recent assignment history for the current user
      const mostRecentAssignment = await prisma.assetHistory.findFirst({
        where: {
          assetId: id,
          action: 'ASSIGNED',
          toUserId: currentAsset.assignedUserId,
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
        const { recordAssetAssignment } = await import('@/lib/asset-history');
        await recordAssetAssignment(
          id,
          null,  // No previous user
          currentAsset.assignedUserId,
          session.user.id,
          'Historical assignment record created during date update',
          newDate
        );
      }
    }

    // Detect which fields actually changed and track before/after values
    const changedFields: string[] = [];
    const changeDetails: string[] = [];

    // Helper function to format values for display
    const formatValue = async (value: any, fieldKey?: string): Promise<string> => {
      if (value === null || value === undefined || value === '') {
        // For user field, show "Unassigned" instead of "(empty)"
        if (fieldKey === 'assignedUserId') return 'Unassigned';
        return '(empty)';
      }
      if (typeof value === 'boolean') return value ? 'Yes' : 'No';
      if (typeof value === 'number') return value.toString();
      if (value instanceof Date) return value.toISOString().split('T')[0];

      // For user ID fields, fetch and return user name
      if (fieldKey === 'assignedUserId' && typeof value === 'string') {
        try {
          const user = await prisma.user.findUnique({
            where: { id: value },
            select: { name: true, email: true },
          });
          return user?.name || user?.email || value;
        } catch (error) {
          console.error('Error fetching user for display:', error);
          return value.toString();
        }
      }

      return value.toString();
    };

    for (const key in data) {
      // Skip fields that are not stored on the asset model
      if (key === 'assignmentDate') continue;

      const newValue = data[key as keyof typeof data];
      let oldValue = currentAsset[key as keyof typeof currentAsset];

      // Store original values for display
      const displayOldValue = oldValue;
      const displayNewValue = newValue;

      // Convert dates to strings for comparison
      if (oldValue instanceof Date) {
        oldValue = oldValue.toISOString().split('T')[0] as any;
      }

      // Convert Decimal to number for comparison
      if (oldValue && typeof oldValue === 'object' && 'toNumber' in oldValue) {
        oldValue = (oldValue as any).toNumber();
      }

      // Convert numeric strings to numbers for comparison
      let normalizedNew = newValue;
      if (typeof newValue === 'string' && !isNaN(parseFloat(newValue)) && isFinite(Number(newValue))) {
        if (typeof oldValue === 'number') {
          normalizedNew = parseFloat(newValue);
        }
      }

      // Normalize empty values (null, undefined, empty string) for comparison
      const normalizedOld = oldValue === null || oldValue === undefined || oldValue === '' ? null : oldValue;
      normalizedNew = normalizedNew === null || normalizedNew === undefined || normalizedNew === '' ? null : normalizedNew;

      // Check if value actually changed
      if (normalizedOld !== normalizedNew) {
        // Use human-readable label if available
        const fieldLabel = fieldLabels[key] || key;
        changedFields.push(fieldLabel);

        // Create before/after message
        const beforeText = await formatValue(displayOldValue, key);
        const afterText = await formatValue(displayNewValue, key);
        changeDetails.push(`${fieldLabel}: ${beforeText} → ${afterText}`);
      }
    }

    // Log activity
    await logAction(
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

  } catch (error) {
    console.error('Asset PUT error:', error);
    if (error instanceof Error && error.message.includes('Record to update not found')) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication and authorization
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;
    const { id } = await params;

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
      session.user.id,
      ActivityActions.ASSET_DELETED,
      'Asset',
      asset.id,
      { assetModel: asset.model, assetType: asset.type, assetTag: asset.assetTag }
    );

    return NextResponse.json({ message: 'Asset deleted successfully' });

  } catch (error) {
    console.error('Asset DELETE error:', error);
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    );
  }
}