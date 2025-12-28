/**
 * WhatsApp Webhook Handler
 *
 * Handles incoming webhooks from Meta Cloud API:
 * - GET: Webhook verification challenge
 * - POST: Message delivery status & button click callbacks
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { prisma } from '@/lib/core/prisma';
import {
  validateAndConsumeToken,
  updateMessageStatus,
  sendActionConfirmation,
} from '@/lib/whatsapp';
import type { MetaWebhookPayload, ApprovalEntityType } from '@/lib/whatsapp';

/**
 * GET /api/webhooks/whatsapp
 *
 * Webhook verification endpoint called by Meta when configuring the webhook.
 * Returns the challenge token if verify_token matches.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return new Response('Missing parameters', { status: 400 });
  }

  // Find any config with this verify token
  const config = await prisma.whatsAppConfig.findFirst({
    where: { webhookVerifyToken: token },
  });

  if (!config) {
    return new Response('Invalid verify token', { status: 403 });
  }

  // Return the challenge to verify ownership
  return new Response(challenge, { status: 200 });
}

/**
 * POST /api/webhooks/whatsapp
 *
 * Receives message delivery status updates and button click callbacks.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // Verify signature if app secret is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret && signature) {
      const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        console.error('WhatsApp webhook: Invalid signature');
        return new Response('Invalid signature', { status: 403 });
      }
    }

    const payload: MetaWebhookPayload = JSON.parse(body);

    // Process each entry
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        if (change.field !== 'messages') continue;

        // Process message status updates
        if (change.value.statuses) {
          for (const status of change.value.statuses) {
            await updateMessageStatus(
              status.id,
              status.status as 'sent' | 'delivered' | 'read' | 'failed',
              status.errors?.[0]?.message
            );
          }
        }

        // Process incoming messages (button clicks)
        if (change.value.messages) {
          for (const message of change.value.messages) {
            // Only process button replies
            if (message.type === 'button' && message.button) {
              await processButtonClick(
                message.from,
                message.button.payload,
                change.value.metadata.phone_number_id
              );
            }
          }
        }
      }
    }

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return new Response('Internal error', { status: 500 });
  }
}

/**
 * Process a button click from WhatsApp
 */
async function processButtonClick(
  senderPhone: string,
  tokenPayload: string,
  phoneNumberId: string
): Promise<void> {
  // Validate and consume the action token
  const result = await validateAndConsumeToken(tokenPayload);

  if (!result.valid || !result.payload) {
    console.log(`WhatsApp: Invalid token from ${senderPhone}: ${result.error}`);
    return;
  }

  const { tenantId, entityType, entityId, action, approverId } = result.payload;

  try {
    // Execute the approval/rejection based on entity type
    const details = await executeApprovalAction(
      tenantId,
      entityType as unknown as ApprovalEntityType,
      entityId,
      action,
      approverId
    );

    // Send confirmation message
    await sendActionConfirmation({
      tenantId,
      recipientPhone: senderPhone,
      action,
      entityType: entityType as unknown as ApprovalEntityType,
      details,
    });

    console.log(
      `WhatsApp: ${action} executed for ${entityType}:${entityId} by approver ${approverId}`
    );
  } catch (error) {
    console.error('WhatsApp: Error executing action:', error);
  }
}

/**
 * Execute the approval or rejection action
 */
async function executeApprovalAction(
  tenantId: string,
  entityType: ApprovalEntityType,
  entityId: string,
  action: 'approve' | 'reject',
  approverId: string
): Promise<{ requesterName: string; title?: string }> {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return executeLeaveAction(tenantId, entityId, action, approverId);
    case 'PURCHASE_REQUEST':
      return executePurchaseAction(tenantId, entityId, action, approverId);
    case 'ASSET_REQUEST':
      return executeAssetAction(tenantId, entityId, action, approverId);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Execute leave request approval/rejection
 */
async function executeLeaveAction(
  tenantId: string,
  entityId: string,
  action: 'approve' | 'reject',
  approverId: string
): Promise<{ requesterName: string; title?: string }> {
  const request = await prisma.leaveRequest.findUnique({
    where: { id: entityId },
    include: {
      user: { select: { name: true } },
      leaveType: { select: { name: true } },
    },
  });

  if (!request || request.tenantId !== tenantId) {
    throw new Error('Leave request not found');
  }

  if (request.status !== 'PENDING') {
    throw new Error('Leave request already processed');
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

  // Update the request
  await prisma.leaveRequest.update({
    where: { id: entityId },
    data: {
      status: newStatus,
      approverId,
      approvedAt: action === 'approve' ? new Date() : undefined,
      rejectedAt: action === 'reject' ? new Date() : undefined,
    },
  });

  // Add history entry
  await prisma.leaveRequestHistory.create({
    data: {
      leaveRequestId: entityId,
      action: action === 'approve' ? 'APPROVED' : 'REJECTED',
      oldStatus: 'PENDING',
      newStatus,
      notes: 'Approved via WhatsApp',
      performedById: approverId,
    },
  });

  // Update leave balance if approved
  if (action === 'approve') {
    await prisma.leaveBalance.updateMany({
      where: {
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        year: request.startDate.getFullYear(),
      },
      data: {
        pending: { decrement: Number(request.totalDays) },
        used: { increment: Number(request.totalDays) },
      },
    });
  } else {
    // Rejected - release pending days
    await prisma.leaveBalance.updateMany({
      where: {
        userId: request.userId,
        leaveTypeId: request.leaveTypeId,
        year: request.startDate.getFullYear(),
      },
      data: {
        pending: { decrement: Number(request.totalDays) },
      },
    });
  }

  return {
    requesterName: request.user.name || 'Employee',
    title: `${request.leaveType.name} Leave`,
  };
}

/**
 * Execute purchase request approval/rejection
 */
async function executePurchaseAction(
  tenantId: string,
  entityId: string,
  action: 'approve' | 'reject',
  approverId: string
): Promise<{ requesterName: string; title?: string }> {
  const request = await prisma.purchaseRequest.findUnique({
    where: { id: entityId },
    include: {
      requester: { select: { name: true } },
    },
  });

  if (!request || request.tenantId !== tenantId) {
    throw new Error('Purchase request not found');
  }

  if (request.status !== 'PENDING' && request.status !== 'UNDER_REVIEW') {
    throw new Error('Purchase request already processed');
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

  await prisma.purchaseRequest.update({
    where: { id: entityId },
    data: {
      status: newStatus,
      reviewedById: approverId,
      reviewedAt: new Date(),
      reviewNotes: `${action === 'approve' ? 'Approved' : 'Rejected'} via WhatsApp`,
    },
  });

  await prisma.purchaseRequestHistory.create({
    data: {
      purchaseRequestId: entityId,
      action: 'STATUS_CHANGED',
      previousStatus: request.status,
      newStatus,
      performedById: approverId,
      details: 'Processed via WhatsApp',
    },
  });

  return {
    requesterName: request.requester.name || 'Employee',
    title: request.title,
  };
}

/**
 * Execute asset request approval/rejection
 */
async function executeAssetAction(
  tenantId: string,
  entityId: string,
  action: 'approve' | 'reject',
  approverId: string
): Promise<{ requesterName: string; title?: string }> {
  const request = await prisma.assetRequest.findUnique({
    where: { id: entityId },
    include: {
      user: { select: { name: true } },
      asset: { select: { model: true, type: true } },
    },
  });

  if (!request || request.tenantId !== tenantId) {
    throw new Error('Asset request not found');
  }

  if (request.status !== 'PENDING_ADMIN_APPROVAL') {
    throw new Error('Asset request already processed');
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED';

  await prisma.assetRequest.update({
    where: { id: entityId },
    data: {
      status: newStatus,
      processedById: approverId,
      processedAt: new Date(),
      processorNotes: `${action === 'approve' ? 'Approved' : 'Rejected'} via WhatsApp`,
    },
  });

  await prisma.assetRequestHistory.create({
    data: {
      assetRequestId: entityId,
      action: action === 'approve' ? 'APPROVED' : 'REJECTED',
      oldStatus: 'PENDING_ADMIN_APPROVAL',
      newStatus,
      notes: 'Processed via WhatsApp',
      performedById: approverId,
    },
  });

  // If approved, assign the asset to the user
  if (action === 'approve') {
    await prisma.asset.update({
      where: { id: request.assetId },
      data: {
        assignedUserId: request.userId,
        assignmentDate: new Date().toISOString(),
        status: 'IN_USE',
      },
    });
  }

  return {
    requesterName: request.user.name || 'Employee',
    title: `${request.asset.type} - ${request.asset.model}`,
  };
}
