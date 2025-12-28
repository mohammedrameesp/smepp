import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { Role, AssetRequestStatus, AssetRequestType, AssetStatus } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import {
  createAssetRequestSchema,
  createAssetAssignmentSchema,
  createReturnRequestSchema,
  assetRequestQuerySchema,
} from '@/lib/validations/operations/asset-request';
import { logAction, ActivityActions } from '@/lib/activity';
import {
  generateRequestNumber,
  canRequestAsset,
  canAssignAsset,
  canReturnAsset,
} from '@/lib/domains/operations/asset-requests/asset-request-utils';
import { sendEmail, sendBatchEmails } from '@/lib/email';
import { createNotification, createBulkNotifications, NotificationTemplates } from '@/lib/domains/system/notifications';
import {
  assetRequestSubmittedEmail,
  assetAssignmentPendingEmail,
  assetReturnRequestEmail,
} from '@/lib/email-templates';
import { findApplicablePolicy, initializeApprovalChain } from '@/lib/domains/system/approvals';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require organization context for tenant isolation
    if (!session.user.organizationId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    const tenantId = session.user.organizationId;

    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());

    const validation = assetRequestQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.issues,
      }, { status: 400 });
    }

    const { q, type, status, userId, assetId, p, ps, sort, order } = validation.data;

    // Non-admin users can only see their own requests
    const isAdmin = session.user.role === Role.ADMIN;
    const effectiveUserId = isAdmin ? userId : session.user.id;

    // Build where clause with tenant filtering
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: Record<string, any> = { tenantId };

    if (effectiveUserId) {
      where.userId = effectiveUserId;
    }
    if (type) {
      where.type = type;
    }
    if (status) {
      where.status = status;
    }
    if (assetId) {
      where.assetId = assetId;
    }
    if (q) {
      where.OR = [
        { requestNumber: { contains: q, mode: 'insensitive' } },
        { asset: { model: { contains: q, mode: 'insensitive' } } },
        { asset: { assetTag: { contains: q, mode: 'insensitive' } } },
        { user: { name: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { reason: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (p - 1) * ps;

    const [requests, total] = await Promise.all([
      prisma.assetRequest.findMany({
        where,
        include: {
          asset: {
            select: {
              id: true,
              assetTag: true,
              model: true,
              brand: true,
              type: true,
              status: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignedByUser: {
            select: {
              id: true,
              name: true,
            },
          },
          processedByUser: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { [sort]: order },
        take: ps,
        skip,
      }),
      prisma.assetRequest.count({ where }),
    ]);

    return NextResponse.json({
      requests,
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
        hasMore: skip + ps < total,
      },
    });
  } catch (error) {
    console.error('Asset requests GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch asset requests' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const requestType = body.type as AssetRequestType | undefined;
    const isAdmin = session.user.role === Role.ADMIN;

    // Determine request type and validate accordingly
    let validatedData;
    let assetId: string;
    let userId: string;
    let reason: string | null = null;
    let notes: string | null = null;
    let type: AssetRequestType;
    let status: AssetRequestStatus;
    let activityAction: string;

    if (requestType === AssetRequestType.ADMIN_ASSIGNMENT) {
      // Admin assigning asset to user
      if (!isAdmin) {
        return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
      }

      const validation = createAssetAssignmentSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      userId = validatedData.userId;
      reason = validatedData.reason || null;
      notes = validatedData.notes || null;
      type = AssetRequestType.ADMIN_ASSIGNMENT;
      status = AssetRequestStatus.PENDING_USER_ACCEPTANCE;
      activityAction = ActivityActions.ASSET_ASSIGNMENT_CREATED;

      // Check if can assign
      const canAssign = await canAssignAsset(assetId, userId);
      if (!canAssign.canAssign) {
        return NextResponse.json({ error: canAssign.reason }, { status: 400 });
      }

    } else if (requestType === AssetRequestType.RETURN_REQUEST) {
      // User requesting to return asset
      const validation = createReturnRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      userId = session.user.id;
      reason = validatedData.reason;
      notes = validatedData.notes || null;
      type = AssetRequestType.RETURN_REQUEST;
      status = AssetRequestStatus.PENDING_RETURN_APPROVAL;
      activityAction = ActivityActions.ASSET_RETURN_REQUESTED;

      // Check if can return
      const canReturn = await canReturnAsset(assetId, userId);
      if (!canReturn.canReturn) {
        return NextResponse.json({ error: canReturn.reason }, { status: 400 });
      }

    } else {
      // Employee requesting asset (default)
      const validation = createAssetRequestSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json({
          error: 'Invalid request body',
          details: validation.error.issues,
        }, { status: 400 });
      }

      validatedData = validation.data;
      assetId = validatedData.assetId;
      userId = session.user.id;
      reason = validatedData.reason;
      notes = validatedData.notes || null;
      type = AssetRequestType.EMPLOYEE_REQUEST;
      status = AssetRequestStatus.PENDING_ADMIN_APPROVAL;
      activityAction = ActivityActions.ASSET_REQUEST_CREATED;

      // Check if can request
      const canRequest = await canRequestAsset(assetId, userId);
      if (!canRequest.canRequest) {
        return NextResponse.json({ error: canRequest.reason }, { status: 400 });
      }
    }

    // Get asset info for activity log
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      select: { assetTag: true, model: true, brand: true },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Get tenantId from session
    const tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Organization context required' }, { status: 403 });
    }

    // Create the request in a transaction
    const assetRequest = await prisma.$transaction(async (tx) => {
      const requestNumber = await generateRequestNumber(tenantId, tx);

      const newRequest = await tx.assetRequest.create({
        data: {
          tenantId,
          requestNumber,
          type,
          status,
          assetId,
          userId,
          reason,
          notes,
          assignedById: type === AssetRequestType.ADMIN_ASSIGNMENT ? session.user.id : null,
        },
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
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Create history entry
      await tx.assetRequestHistory.create({
        data: {
          assetRequestId: newRequest.id,
          action: 'CREATED',
          newStatus: status,
          performedById: session.user.id,
        },
      });

      return newRequest;
    });

    await logAction(
      session.user.id,
      activityAction,
      'AssetRequest',
      assetRequest.id,
      {
        requestNumber: assetRequest.requestNumber,
        assetTag: asset.assetTag,
        assetModel: asset.model,
        type,
        status,
      }
    );

    // Send email and in-app notifications
    try {
      if (type === AssetRequestType.EMPLOYEE_REQUEST) {
        // Get asset price for multi-level approval check
        const assetWithPrice = await prisma.asset.findUnique({
          where: { id: assetId },
          select: { priceQAR: true },
        });
        const assetValue = assetWithPrice?.priceQAR ? Number(assetWithPrice.priceQAR) : 0;

        // Check for multi-level approval policy
        const approvalPolicy = await findApplicablePolicy('ASSET_REQUEST', { amount: assetValue, tenantId });

        if (approvalPolicy && approvalPolicy.levels.length > 0) {
          // Initialize approval chain
          const steps = await initializeApprovalChain('ASSET_REQUEST', assetRequest.id, approvalPolicy);

          // Notify users with the first level's required role
          const firstStep = steps[0];
          if (firstStep) {
            // Get approvers within the tenant
            const approvers = await prisma.user.findMany({
              where: {
                role: firstStep.requiredRole,
                organizationMemberships: { some: { organizationId: tenantId } },
              },
              select: { id: true, email: true },
            });

            // Send email to approvers
            const emailData = assetRequestSubmittedEmail({
              requestNumber: assetRequest.requestNumber,
              assetTag: asset.assetTag,
              assetModel: asset.model,
              assetBrand: asset.brand,
              assetType: assetRequest.asset.type,
              requesterName: assetRequest.user.name || assetRequest.user.email,
              requesterEmail: assetRequest.user.email,
              reason: reason || '',
            });
            await sendBatchEmails(approvers.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

            // In-app notifications
            for (const approver of approvers) {
              await createNotification({
                recipientId: approver.id,
                type: 'APPROVAL_PENDING',
                title: 'Asset Request Approval Required',
                message: `${assetRequest.user.name || assetRequest.user.email} requested asset ${asset.model} (${asset.assetTag || 'N/A'}). Your approval is required.`,
                link: `/admin/asset-requests/${assetRequest.id}`,
                entityType: 'AssetRequest',
                entityId: assetRequest.id,
              });
            }
          }
        } else {
          // No policy - fall back to notifying all admins (tenant-scoped)
          const admins = await prisma.user.findMany({
            where: {
              role: Role.ADMIN,
              organizationMemberships: { some: { organizationId: tenantId } },
            },
            select: { id: true, email: true },
          });
          const emailData = assetRequestSubmittedEmail({
            requestNumber: assetRequest.requestNumber,
            assetTag: asset.assetTag,
            assetModel: asset.model,
            assetBrand: asset.brand,
            assetType: assetRequest.asset.type,
            requesterName: assetRequest.user.name || assetRequest.user.email,
            requesterEmail: assetRequest.user.email,
            reason: reason || '',
          });
          await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

          // In-app notifications
          const notifications = admins.map(admin =>
            NotificationTemplates.assetRequestSubmitted(
              admin.id,
              assetRequest.user.name || assetRequest.user.email,
              asset.assetTag || '',
              asset.model,
              assetRequest.requestNumber,
              assetRequest.id
            )
          );
          await createBulkNotifications(notifications);
        }
      } else if (type === AssetRequestType.ADMIN_ASSIGNMENT) {
        // Notify user about pending assignment
        const emailData = assetAssignmentPendingEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: asset.assetTag,
          assetModel: asset.model,
          assetBrand: asset.brand,
          assetType: assetRequest.asset.type,
          userName: assetRequest.user.name || assetRequest.user.email,
          assignerName: session.user.name || session.user.email || 'Admin',
          reason: notes || undefined,
        });
        await sendEmail({ to: assetRequest.user.email, subject: emailData.subject, html: emailData.html, text: emailData.text });

        // In-app notification
        await createNotification(
          NotificationTemplates.assetAssignmentPending(
            userId,
            asset.assetTag || '',
            asset.model,
            session.user.name || session.user.email || 'Admin',
            assetRequest.requestNumber,
            assetRequest.id
          )
        );
      } else if (type === AssetRequestType.RETURN_REQUEST) {
        // Notify admins about return request (tenant-scoped)
        const admins = await prisma.user.findMany({
          where: {
            role: Role.ADMIN,
            organizationMemberships: { some: { organizationId: tenantId } },
          },
          select: { id: true, email: true },
        });
        const emailData = assetReturnRequestEmail({
          requestNumber: assetRequest.requestNumber,
          assetTag: asset.assetTag,
          assetModel: asset.model,
          assetBrand: asset.brand,
          assetType: assetRequest.asset.type,
          userName: assetRequest.user.name || assetRequest.user.email,
          userEmail: assetRequest.user.email,
          reason: reason || '',
        });
        await sendBatchEmails(admins.map(a => ({ to: a.email, subject: emailData.subject, html: emailData.html, text: emailData.text })));

        // In-app notifications
        const notifications = admins.map(admin =>
          NotificationTemplates.assetReturnSubmitted(
            admin.id,
            assetRequest.user.name || assetRequest.user.email,
            asset.assetTag || '',
            asset.model,
            assetRequest.requestNumber,
            assetRequest.id
          )
        );
        await createBulkNotifications(notifications);
      }
    } catch (emailError) {
      console.error('Failed to send notification:', emailError);
      // Don't fail the request if notifications fail
    }

    return NextResponse.json(assetRequest, { status: 201 });
  } catch (error) {
    console.error('Asset requests POST error:', error);
    return NextResponse.json(
      { error: 'Failed to create asset request' },
      { status: 500 }
    );
  }
}
