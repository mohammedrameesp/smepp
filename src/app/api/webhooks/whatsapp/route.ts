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
import logger from '@/lib/core/log';
import { AssetHistoryAction } from '@prisma/client';
import {
  validateAndConsumeToken,
  updateMessageStatus,
  sendActionConfirmation,
  invalidateTokensForEntity,
} from '@/lib/whatsapp';
import type { MetaWebhookPayload, ApprovalEntityType } from '@/lib/whatsapp';

// NOTIF-002: Simple in-memory rate limiting for webhook
// Allows 100 requests per minute per IP
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 100;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkWebhookRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  entry.count++;
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW_MS);

/**
 * GET /api/webhooks/whatsapp
 *
 * Webhook verification endpoint called by Meta when configuring the webhook.
 * Returns the challenge token if verify_token matches.
 * Supports both platform-wide and tenant-specific configurations.
 */
export async function GET(request: NextRequest): Promise<Response> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode !== 'subscribe' || !token || !challenge) {
    return new Response('Missing parameters', { status: 400 });
  }

  // Check platform config first
  const platformConfig = await prisma.platformWhatsAppConfig.findFirst({
    where: { webhookVerifyToken: token },
  });

  if (platformConfig) {
    return new Response(challenge, { status: 200 });
  }

  // Then check tenant configs
  const tenantConfig = await prisma.whatsAppConfig.findFirst({
    where: { webhookVerifyToken: token },
  });

  if (!tenantConfig) {
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
    // NOTIF-002: Apply rate limiting
    const clientIp = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';

    if (!checkWebhookRateLimit(clientIp)) {
      logger.warn('WhatsApp webhook: Rate limited');
      return new Response('Rate limit exceeded', { status: 429 });
    }

    // Get raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get('x-hub-signature-256');

    // NOTIF-005: Verify signature - MUST be present if app secret is configured
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (appSecret) {
      if (!signature) {
        logger.error('WhatsApp webhook: Missing signature header');
        return new Response('Missing signature', { status: 403 });
      }

      const expectedSignature = 'sha256=' + createHmac('sha256', appSecret)
        .update(body)
        .digest('hex');

      if (signature !== expectedSignature) {
        logger.error('WhatsApp webhook: Invalid signature');
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
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'WhatsApp webhook error');
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
    logger.debug({ error: result.error }, 'WhatsApp: Invalid token received');
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

    logger.info(
      { action, entityType, entityId },
      'WhatsApp: Action executed'
    );
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'WhatsApp: Error executing action');
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
      member: { select: { name: true } },
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
        memberId: request.memberId,
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
        memberId: request.memberId,
        leaveTypeId: request.leaveTypeId,
        year: request.startDate.getFullYear(),
      },
      data: {
        pending: { decrement: Number(request.totalDays) },
      },
    });
  }

  // Invalidate all other tokens for this entity
  await invalidateTokensForEntity('LEAVE_REQUEST', entityId);

  return {
    requesterName: request.member.name || 'Employee',
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

  // Invalidate all other tokens for this entity
  await invalidateTokensForEntity('PURCHASE_REQUEST', entityId);

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
      member: { select: { id: true, name: true } },
      asset: { select: { id: true, model: true, type: true, assetTag: true, status: true, assignedMemberId: true } },
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

  // If approved, assign the asset to the member and create history
  if (action === 'approve') {
    const isReassignment = request.asset.assignedMemberId !== null;

    await prisma.asset.update({
      where: { id: request.assetId },
      data: {
        assignedMemberId: request.memberId,
        assignmentDate: new Date().toISOString(),
        status: 'IN_USE',
      },
    });

    // Create asset history entry
    await prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: request.asset.id,
        action: AssetHistoryAction.ASSIGNED,
        fromMemberId: request.asset.assignedMemberId,
        toMemberId: request.memberId,
        fromStatus: request.asset.status,
        toStatus: 'IN_USE',
        notes: isReassignment
          ? `Reassigned via WhatsApp approval (${request.requestNumber})`
          : `Assigned via WhatsApp approval (${request.requestNumber})`,
        performedById: approverId,
        assignmentDate: new Date(),
      },
    });
  }

  // Invalidate all other tokens for this entity
  await invalidateTokensForEntity('ASSET_REQUEST', entityId);

  return {
    requesterName: request.member.name || 'Employee',
    title: `${request.asset.type} - ${request.asset.model}`,
  };
}
