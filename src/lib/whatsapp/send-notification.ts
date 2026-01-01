/**
 * WhatsApp Notification Sender
 *
 * High-level API for sending approval notifications via WhatsApp.
 * Handles configuration lookup, token generation, and message sending.
 */

import { WhatsAppClient, logWhatsAppMessage } from './client';
import { getEffectiveWhatsAppConfig, getMemberWhatsAppPhone } from './config';
import { generateActionTokenPair } from './action-tokens';
import { buildApprovalTemplate, buildActionConfirmationText } from './templates';
import type {
  ApprovalNotificationData,
  SendNotificationResult,
  ApprovalEntityType,
} from './types';

/**
 * Send an approval notification to an approver via WhatsApp
 *
 * This is the main entry point for sending approval notifications.
 * It handles all the complexity of:
 * - Checking if WhatsApp is configured for the tenant
 * - Getting the approver's WhatsApp number
 * - Generating action tokens
 * - Building the template message
 * - Sending via Meta API
 * - Logging the result
 */
export async function sendApprovalNotification(
  data: ApprovalNotificationData
): Promise<SendNotificationResult> {
  try {
    // 1. Get effective WhatsApp configuration (platform or custom)
    const configResult = await getEffectiveWhatsAppConfig(data.tenantId);
    if (!configResult) {
      return {
        success: false,
        error: 'WhatsApp not configured for this organization',
      };
    }
    const { config, source } = configResult;

    // 2. Get approver's WhatsApp phone number
    const approverPhone = await getMemberWhatsAppPhone(data.approverId);
    if (!approverPhone) {
      return {
        success: false,
        error: 'Approver does not have a verified WhatsApp number',
      };
    }

    // 3. Generate action tokens for approve/reject buttons
    const { approveToken, rejectToken } = await generateActionTokenPair({
      tenantId: data.tenantId,
      entityType: data.entityType,
      entityId: data.entityId,
      approverId: data.approverId,
    });

    // 4. Build the template message
    const message = buildApprovalTemplate(
      approverPhone,
      data.entityType,
      data.details,
      approveToken,
      rejectToken
    );

    // 5. Send via Meta API
    const client = new WhatsAppClient(config);
    const response = await client.sendTemplateMessage(message);
    const messageId = response.messages[0]?.id;

    // 6. Log the message with config source
    await logWhatsAppMessage({
      tenantId: data.tenantId,
      messageId,
      recipientPhone: approverPhone,
      templateName: message.templateName,
      status: 'sent',
      entityType: data.entityType,
      entityId: data.entityId,
      configSource: source,
    });

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    // Log the failure
    try {
      const approverPhone = await getMemberWhatsAppPhone(data.approverId);
      if (approverPhone) {
        await logWhatsAppMessage({
          tenantId: data.tenantId,
          recipientPhone: approverPhone,
          templateName: getTemplateName(data.entityType),
          status: 'failed',
          errorMessage,
          entityType: data.entityType,
          entityId: data.entityId,
        });
      }
    } catch {
      // Ignore logging errors
    }

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Send a confirmation message after an action is taken
 */
export async function sendActionConfirmation(params: {
  tenantId: string;
  recipientPhone: string;
  action: 'approve' | 'reject';
  entityType: ApprovalEntityType;
  details: { requesterName: string; title?: string };
}): Promise<SendNotificationResult> {
  try {
    const configResult = await getEffectiveWhatsAppConfig(params.tenantId);
    if (!configResult) {
      return { success: false, error: 'WhatsApp not configured' };
    }

    const text = buildActionConfirmationText(
      params.action,
      params.entityType,
      params.details
    );

    const client = new WhatsAppClient(configResult.config);
    const response = await client.sendTextMessage(params.recipientPhone, text);
    const messageId = response.messages[0]?.id;

    return { success: true, messageId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if WhatsApp notifications can be sent for a tenant/member
 */
export async function canSendWhatsAppNotification(
  tenantId: string,
  memberId: string
): Promise<{ canSend: boolean; reason?: string }> {
  const configResult = await getEffectiveWhatsAppConfig(tenantId);
  if (!configResult) {
    return { canSend: false, reason: 'WhatsApp not configured' };
  }

  const phone = await getMemberWhatsAppPhone(memberId);
  if (!phone) {
    return { canSend: false, reason: 'Member has no verified WhatsApp number' };
  }

  return { canSend: true };
}

/**
 * Get template name for an entity type
 */
function getTemplateName(entityType: ApprovalEntityType): string {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return 'leave_approval_request';
    case 'PURCHASE_REQUEST':
      return 'purchase_approval_request';
    case 'ASSET_REQUEST':
      return 'asset_approval_request';
    default:
      return 'unknown';
  }
}
