/**
 * WhatsApp Business API Integration Types
 *
 * Types for Meta Cloud API integration, message templates,
 * and approval workflow notifications.
 */

import { ApprovalModule } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WhatsAppConfigInput {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string; // Will be encrypted before storage
}

export interface WhatsAppConfigData {
  phoneNumberId: string;
  businessAccountId: string;
  accessToken: string; // Decrypted for use
  webhookVerifyToken: string;
  isActive: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MESSAGE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface WhatsAppTemplateMessage {
  to: string; // Phone number in E.164 format
  templateName: string;
  languageCode: string;
  components: WhatsAppTemplateComponent[];
}

export interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: WhatsAppParameter[];
  sub_type?: 'quick_reply';
  index?: number;
  // For button components
  payload?: string;
}

export interface WhatsAppParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
}

export interface WhatsAppButton {
  type: 'quick_reply';
  payload: string; // Action token
  text: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// META API RESPONSE TYPES
// ═══════════════════════════════════════════════════════════════════════════════

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

export interface MetaWebhookPayload {
  object: 'whatsapp_business_account';
  entry: MetaWebhookEntry[];
}

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookChange[];
}

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

export interface MetaWebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'button' | 'interactive';
  text?: {
    body: string;
  };
  button?: {
    payload: string; // The action token
    text: string;
  };
  interactive?: {
    type: 'button_reply';
    button_reply: {
      id: string;
      title: string;
    };
  };
}

export interface MetaWebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: string;
    };
  };
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

export interface ActionTokenPayload {
  tenantId: string;
  entityType: ApprovalModule;
  entityId: string;
  action: 'approve' | 'reject';
  approverId: string;
  expiresAt: number; // Unix timestamp
}

export interface ActionTokenValidationResult {
  valid: boolean;
  payload?: ActionTokenPayload;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ApprovalEntityType = 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';

export interface ApprovalNotificationData {
  tenantId: string;
  approverId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  details: ApprovalDetails;
}

export interface ApprovalDetails {
  requesterName: string;
  // Leave request specific
  leaveType?: string;
  startDate?: Date;
  endDate?: Date;
  totalDays?: number;
  reason?: string;
  // Purchase request specific
  title?: string;
  totalAmount?: number;
  currency?: string;
  // Asset request specific
  assetName?: string;
  assetType?: string;
  justification?: string;
}

export interface SendNotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE NAMES (must match approved templates in Meta)
// ═══════════════════════════════════════════════════════════════════════════════

export const WHATSAPP_TEMPLATES = {
  LEAVE_APPROVAL: 'leave_approval_request',
  PURCHASE_APPROVAL: 'purchase_approval_request',
  ASSET_APPROVAL: 'asset_approval_request',
  ACTION_CONFIRMATION: 'approval_action_confirmed',
} as const;

export type WhatsAppTemplateName = typeof WHATSAPP_TEMPLATES[keyof typeof WHATSAPP_TEMPLATES];
