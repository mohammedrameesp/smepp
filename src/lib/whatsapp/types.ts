/**
 * @file types.ts
 * @description WhatsApp Business API Integration Types
 * @module lib/whatsapp
 *
 * Types for Meta Cloud API integration, message templates,
 * and approval workflow notifications.
 *
 * @example
 * ```typescript
 * import type {
 *   WhatsAppConfigData,
 *   ApprovalNotificationData,
 *   SendNotificationResult,
 * } from '@/lib/whatsapp';
 *
 * const result: SendNotificationResult = await sendApprovalNotification(data);
 * ```
 */

import { ApprovalModule } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Input for creating/updating WhatsApp configuration.
 * @security Access token will be encrypted before storage.
 */
export interface WhatsAppConfigInput {
  /** Meta Cloud API phone number ID */
  phoneNumberId: string;
  /** Meta Business Account ID */
  businessAccountId: string;
  /** Meta access token - will be encrypted before storage */
  accessToken: string;
}

/**
 * Decrypted WhatsApp configuration for use in API calls.
 * @security Contains decrypted access token - do not log or expose.
 */
export interface WhatsAppConfigData {
  /** Meta Cloud API phone number ID */
  phoneNumberId: string;
  /** Meta Business Account ID */
  businessAccountId: string;
  /** Decrypted access token for API authentication */
  accessToken: string;
  /** Token for webhook verification */
  webhookVerifyToken: string;
  /** Whether this configuration is active */
  isActive: boolean;
}

/**
 * Input for platform-wide WhatsApp configuration (super admin).
 */
export interface PlatformWhatsAppConfigInput {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string;
  /** Phone number for display purposes (e.g., +974 XXXX XXXX) */
  displayPhoneNumber?: string;
  /** Business name associated with this WhatsApp account */
  businessName?: string;
}

/**
 * Platform WhatsApp configuration with display metadata.
 */
export interface PlatformWhatsAppConfigData extends WhatsAppConfigData {
  displayPhoneNumber?: string;
  businessName?: string;
}

/** WhatsApp source type for tenant configuration */
export type WhatsAppSourceType = 'NONE' | 'PLATFORM' | 'CUSTOM';

/**
 * Resolved effective WhatsApp configuration for a tenant.
 * Indicates whether platform or custom config is being used.
 */
export interface EffectiveWhatsAppConfig {
  /** The resolved configuration */
  config: WhatsAppConfigData;
  /** Source of the configuration */
  source: 'PLATFORM' | 'CUSTOM';
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WhatsApp template message structure for Meta API.
 */
export interface WhatsAppTemplateMessage {
  /** Recipient phone number in E.164 format (e.g., +97455123456) */
  to: string;
  /** Template name as registered in Meta Business Manager */
  templateName: string;
  /** Language code (e.g., 'en', 'ar') */
  languageCode: string;
  /** Template components (header, body, buttons) */
  components: WhatsAppTemplateComponent[];
}

/**
 * Template component structure.
 */
export interface WhatsAppTemplateComponent {
  /** Component type */
  type: 'header' | 'body' | 'button';
  /** Parameters to fill template placeholders */
  parameters?: WhatsAppParameter[];
  /** Button subtype (for button components) */
  sub_type?: 'quick_reply';
  /** Button index (0-based) */
  index?: number;
  /** Button payload for quick_reply buttons */
  payload?: string;
}

/**
 * Template parameter types.
 */
export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video' | 'payload';
  text?: string;
  payload?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

/**
 * Quick reply button structure.
 */
export interface WhatsAppButton {
  type: 'quick_reply';
  /** Action token for the button callback */
  payload: string;
  /** Button display text */
  text: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// META API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response from Meta's send message API.
 */
export interface MetaSendMessageResponse {
  messaging_product: 'whatsapp';
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

/**
 * Webhook payload from Meta.
 */
export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}

/**
 * Webhook entry containing changes.
 */
export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

/**
 * Webhook change with message or status updates.
 */
export interface MetaWebhookChange {
  value: {
    messaging_product: 'whatsapp';
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    contacts?: Array<{
      profile: { name: string };
      wa_id: string;
    }>;
    messages?: MetaWebhookMessage[];
    statuses?: MetaWebhookStatus[];
  };
  field: 'messages';
}

/**
 * Incoming WhatsApp message from webhook.
 */
export interface MetaWebhookMessage {
  /** Sender's phone number */
  from: string;
  /** Message ID */
  id: string;
  /** Unix timestamp */
  timestamp: string;
  /** Message type */
  type: 'text' | 'button' | 'interactive';
  /** Text message content */
  text?: {
    body: string;
  };
  /** Button callback (for quick_reply buttons) */
  button?: {
    /** The action token from button payload */
    payload: string;
    text: string;
  };
  /** Interactive message response */
  interactive?: {
    type: 'button_reply';
    button_reply: {
      id: string;
      title: string;
    };
  };
}

/**
 * Message status update from webhook.
 */
export interface MetaWebhookStatus {
  /** Message ID */
  id: string;
  /** Delivery status */
  status: 'sent' | 'delivered' | 'read' | 'failed';
  /** Unix timestamp */
  timestamp: string;
  /** Recipient phone number */
  recipient_id: string;
  /** Conversation metadata */
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
  /** Error details if failed */
  errors?: Array<{
    code: number;
    title: string;
    message: string;
    error_data?: {
      details: string;
    };
  }>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION TOKEN TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Payload stored in action token for approve/reject actions.
 * @security Token payload is stored in database, not embedded in token string.
 */
export interface ActionTokenPayload {
  tenantId: string;
  entityType: ApprovalModule;
  entityId: string;
  action: 'approve' | 'reject';
  approverId: string;
  /** Token expiration as Unix timestamp (milliseconds) */
  expiresAt: number;
}

/**
 * Result of token validation.
 */
export interface ActionTokenValidationResult {
  /** Whether the token is valid */
  valid: boolean;
  /** Token payload if valid */
  payload?: ActionTokenPayload;
  /** Error message if invalid */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Entity types that support WhatsApp approval notifications */
export type ApprovalEntityType = 'LEAVE_REQUEST' | 'SPEND_REQUEST' | 'ASSET_REQUEST';

/**
 * Data required to send an approval notification.
 */
export interface ApprovalNotificationData {
  tenantId: string;
  approverId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  details: ApprovalDetails;
}

/**
 * Approval request details for template population.
 * Different fields are used depending on the entity type.
 */
export interface ApprovalDetails {
  /** Name of the person making the request */
  requesterName: string;

  // Leave request specific
  leaveType?: string;
  startDate?: Date;
  endDate?: Date;
  totalDays?: number;
  reason?: string;

  // Spend request specific
  title?: string;
  totalAmount?: number;
  /** Currency code (defaults to QAR for Qatar) */
  currency?: string;

  // Asset request specific
  assetName?: string;
  assetType?: string;
  justification?: string;
}

/**
 * Result of sending a notification.
 */
export interface SendNotificationResult {
  success: boolean;
  /** Meta message ID if successful */
  messageId?: string;
  /** Error message if failed */
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE NAMES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * WhatsApp template names registered in Meta Business Manager.
 * @remarks These must match the approved templates in your Meta account.
 */
export const WHATSAPP_TEMPLATES = {
  LEAVE_APPROVAL: 'leave_approval_request',
  PURCHASE_APPROVAL: 'purchase_approval_request',
  ASSET_APPROVAL: 'asset_approval_request',
  ACTION_CONFIRMATION: 'approval_action_confirmed',
} as const;

/** Type for template name values */
export type WhatsAppTemplateName = (typeof WHATSAPP_TEMPLATES)[keyof typeof WHATSAPP_TEMPLATES];

