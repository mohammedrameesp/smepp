import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import { assignAssetSchema } from '@/lib/validations/assets';
import { logAction, ActivityActions } from '@/lib/activity';
import { recordAssetAssignment } from '@/lib/asset-history';
import { sendEmail } from '@/lib/email';
import { assetAssignmentEmail } from '@/lib/email-templates';
import { createNotification, NotificationTemplates } from '@/lib/domains/system/notifications';

export async function POST(
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

    // Parse and validate request body
    const body = await request.json();
    const validation = assignAssetSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request body',
        details: validation.error.issues
      }, { status: 400 });
    }

    const { assignedUserId } = validation.data;

    const { id } = await params;

    // Use findFirst with tenantId to prevent cross-tenant access
    const currentAsset = await prisma.asset.findFirst({
      where: { id, tenantId },
      include: { assignedUser: true },
    });

    if (!currentAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Verify assigned user exists and belongs to same organization
    if (assignedUserId) {
      const user = await prisma.user.findFirst({
        where: {
          id: assignedUserId,
          organizationMemberships: { some: { organizationId: tenantId } },
        },
      });
      if (!user) {
        return NextResponse.json({ error: 'User not found in this organization' }, { status: 404 });
      }
    }

    // Update asset assignment
    const asset = await prisma.asset.update({
      where: { id: id },
      data: { assignedUserId },
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

    // Log activity
    const previousUser = currentAsset.assignedUser;
    const newUser = asset.assignedUser;
    
    await logAction(
      session.user.id,
      ActivityActions.ASSET_ASSIGNED,
      'Asset',
      asset.id,
      {
        assetModel: asset.model,
        assetType: asset.type,
        assetTag: asset.assetTag,
        previousUser: previousUser ? { id: previousUser.id, name: previousUser.name } : null,
        newUser: newUser ? { id: newUser.id, name: newUser.name } : null,
      }
    );

    // Record asset assignment history
    await recordAssetAssignment(
      asset.id,
      previousUser?.id || null,
      newUser?.id || null,
      session.user.id
    );

    // Send assignment email and in-app notification to the new user (non-blocking)
    if (newUser) {
      try {
        // Email notification
        if (newUser.email) {
          const emailContent = assetAssignmentEmail({
            userName: newUser.name || newUser.email,
            assetTag: asset.assetTag || 'N/A',
            assetType: asset.type,
            brand: asset.brand || 'N/A',
            model: asset.model,
            serialNumber: asset.serial || null,
            assignmentDate: new Date(),
          });
          await sendEmail({
            to: newUser.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text,
          });
        }

        // In-app notification
        await createNotification(
          NotificationTemplates.assetAssigned(
            newUser.id,
            asset.assetTag || '',
            asset.model,
            asset.id
          )
        );
      } catch {
        // Don't fail the request if notifications fail
      }
    }

    // Notify previous user if asset was unassigned from them
    if (previousUser) {
      try {
        await createNotification(
          NotificationTemplates.assetUnassigned(
            previousUser.id,
            asset.assetTag || '',
            asset.model,
            asset.id
          )
        );
      } catch {
        // Don't fail the request if notification fails
      }
    }

    return NextResponse.json(asset);

  } catch (error) {
    console.error('Asset assign error:', error);
    return NextResponse.json(
      { error: 'Failed to assign asset' },
      { status: 500 }
    );
  }
}