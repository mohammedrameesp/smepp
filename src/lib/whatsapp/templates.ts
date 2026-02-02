/**
 * @file templates.ts
 * @description WhatsApp Message Template Builders
 * @module lib/whatsapp
 *
 * Builds template message payloads for approval notifications.
 * Templates must be pre-approved in Meta Business Manager.
 *
 * @remarks
 * Template names must match exactly what is registered in Meta:
 * - leave_approval_request
 * - purchase_approval_request
 * - asset_approval_request
 *
 * @example
 * ```typescript
 * import { buildApprovalTemplate } from '@/lib/whatsapp';
 *
 * const message = buildApprovalTemplate(
 *   '+97455123456',
 *   'LEAVE_REQUEST',
 *   { requesterName: 'John', leaveType: 'Annual', startDate: new Date() },
 *   approveToken,
 *   rejectToken
 * );
 * ```
 */

import type {
  WhatsAppTemplateMessage,
  WhatsAppTemplateComponent,
  ApprovalDetails,
  ApprovalEntityType,
} from './types';
import { formatDate } from '@/lib/core/datetime';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Default language for templates (English) */
const DEFAULT_LANGUAGE = 'en';

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format currency amount for display.
 *
 * @param amount - Numeric amount to format
 * @param currency - ISO 4217 currency code (defaults to QAR for Qatar)
 * @returns Formatted currency string (e.g., "QAR 1,500")
 */
function formatAmount(amount: number, currency: string = 'QAR'): string {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATE BUILDERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build leave approval request template message.
 *
 * Template structure (must match Meta registration):
 * "New leave request requires your approval.
 *  Employee: {{1}}
 *  Leave Type: {{2}}
 *  Dates: {{3}}
 *  Reason: {{4}}
 *  Please tap a button below to respond to this request."
 *
 * @param to - Recipient phone number in E.164 format
 * @param details - Leave request details for template placeholders
 * @param approveToken - Token for approve button callback
 * @param rejectToken - Token for reject button callback
 * @returns WhatsApp template message ready for Meta API
 */
export function buildLeaveApprovalTemplate(
  to: string,
  details: ApprovalDetails,
  approveToken: string,
  rejectToken: string
): WhatsAppTemplateMessage {
  // Format dates as a single string "15 Jan - 20 Jan 2026"
  const dateRange = details.startDate && details.endDate
    ? `${formatDate(details.startDate)} - ${formatDate(details.endDate)}`
    : 'N/A';

  const components: WhatsAppTemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: details.requesterName },
        { type: 'text', text: details.leaveType || 'Leave' },
        { type: 'text', text: dateRange },
        { type: 'text', text: details.reason || 'No reason provided' },
      ],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      parameters: [{ type: 'payload', payload: approveToken }],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      parameters: [{ type: 'payload', payload: rejectToken }],
    },
  ];

  return {
    to,
    templateName: 'leave_approval_request',
    languageCode: DEFAULT_LANGUAGE,
    components,
  };
}

/**
 * Build spend request approval template message.
 *
 * Template structure (must match Meta registration):
 * "New spend request requires your approval.
 *  Requested by: {{1}}
 *  Title: {{2}}
 *  Amount: {{3}}
 *  Please tap a button below to respond to this request."
 *
 * @param to - Recipient phone number in E.164 format
 * @param details - Spend request details for template placeholders
 * @param approveToken - Token for approve button callback
 * @param rejectToken - Token for reject button callback
 * @returns WhatsApp template message ready for Meta API
 *
 * @remarks Template name is "purchase_approval_request" for backward compatibility.
 */
export function buildPurchaseApprovalTemplate(
  to: string,
  details: ApprovalDetails,
  approveToken: string,
  rejectToken: string
): WhatsAppTemplateMessage {
  const components: WhatsAppTemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: details.requesterName },
        { type: 'text', text: details.title || 'Spend Request' },
        { type: 'text', text: formatAmount(details.totalAmount || 0, details.currency) },
      ],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      parameters: [{ type: 'payload', payload: approveToken }],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      parameters: [{ type: 'payload', payload: rejectToken }],
    },
  ];

  return {
    to,
    templateName: 'purchase_approval_request',
    languageCode: DEFAULT_LANGUAGE,
    components,
  };
}

/**
 * Build asset request approval template message.
 *
 * Template structure (must match Meta registration):
 * "New asset request requires your approval.
 *  Requested by: {{1}}
 *  Asset: {{2}}
 *  Justification: {{3}}
 *  Please tap a button below to respond to this request."
 *
 * @param to - Recipient phone number in E.164 format
 * @param details - Asset request details for template placeholders
 * @param approveToken - Token for approve button callback
 * @param rejectToken - Token for reject button callback
 * @returns WhatsApp template message ready for Meta API
 */
export function buildAssetApprovalTemplate(
  to: string,
  details: ApprovalDetails,
  approveToken: string,
  rejectToken: string
): WhatsAppTemplateMessage {
  const components: WhatsAppTemplateComponent[] = [
    {
      type: 'body',
      parameters: [
        { type: 'text', text: details.requesterName },
        { type: 'text', text: `${details.assetType || ''} - ${details.assetName || 'Asset'}`.trim() },
        { type: 'text', text: details.justification || 'No justification provided' },
      ],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      parameters: [{ type: 'payload', payload: approveToken }],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      parameters: [{ type: 'payload', payload: rejectToken }],
    },
  ];

  return {
    to,
    templateName: 'asset_approval_request',
    languageCode: DEFAULT_LANGUAGE,
    components,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the appropriate template based on entity type.
 *
 * This is the main entry point for building approval templates.
 * It delegates to the specific template builder based on entity type.
 *
 * @param to - Recipient phone number in E.164 format
 * @param entityType - Type of approval entity
 * @param details - Entity-specific details for template placeholders
 * @param approveToken - Token for approve button callback
 * @param rejectToken - Token for reject button callback
 * @returns WhatsApp template message ready for Meta API
 * @throws Error if entity type is unknown
 */
export function buildApprovalTemplate(
  to: string,
  entityType: ApprovalEntityType,
  details: ApprovalDetails,
  approveToken: string,
  rejectToken: string
): WhatsAppTemplateMessage {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return buildLeaveApprovalTemplate(to, details, approveToken, rejectToken);
    case 'SPEND_REQUEST':
      return buildPurchaseApprovalTemplate(to, details, approveToken, rejectToken);
    case 'ASSET_REQUEST':
      return buildAssetApprovalTemplate(to, details, approveToken, rejectToken);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRMATION TEXT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build action confirmation message (simple text, not template).
 *
 * Sent after an approver taps approve/reject button to confirm the action.
 *
 * @param action - The action taken (approve or reject)
 * @param entityType - Type of approval entity
 * @param details - Details for the confirmation message
 * @returns Plain text confirmation message
 *
 * @remarks
 * This returns plain text, not a template message. It's sent via
 * sendTextMessage, not sendTemplateMessage.
 */
export function buildActionConfirmationText(
  action: 'approve' | 'reject',
  entityType: ApprovalEntityType,
  details: { requesterName: string; title?: string }
): string {
  const actionText = action === 'approve' ? 'approved' : 'rejected';
  const entityName = getEntityName(entityType);

  if (details.title) {
    return `You have ${actionText} the ${entityName} "${details.title}" from ${details.requesterName}.`;
  }

  return `You have ${actionText} the ${entityName} from ${details.requesterName}.`;
}

/**
 * Get human-readable entity name for display.
 *
 * @param entityType - The entity type enum value
 * @returns Human-readable lowercase entity name
 */
function getEntityName(entityType: ApprovalEntityType): string {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return 'leave request';
    case 'SPEND_REQUEST':
      return 'spend request';
    case 'ASSET_REQUEST':
      return 'asset request';
    default:
      return 'request';
  }
}
