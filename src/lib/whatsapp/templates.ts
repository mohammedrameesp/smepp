/**
 * WhatsApp Message Templates
 *
 * Builds template message payloads for approval notifications.
 * Templates must be pre-approved in Meta Business Manager.
 */

import type {
  WhatsAppTemplateMessage,
  WhatsAppTemplateComponent,
  ApprovalDetails,
  ApprovalEntityType,
} from './types';

const DEFAULT_LANGUAGE = 'en';

/**
 * Format a date for display
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format currency amount
 */
function formatAmount(amount: number, currency: string = 'QAR'): string {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Build leave approval request template message
 */
export function buildLeaveApprovalTemplate(
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
        { type: 'text', text: details.leaveType || 'Leave' },
        { type: 'text', text: details.startDate ? formatDate(details.startDate) : 'N/A' },
        { type: 'text', text: details.endDate ? formatDate(details.endDate) : 'N/A' },
        { type: 'text', text: details.reason || 'No reason provided' },
      ],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      payload: approveToken,
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      payload: rejectToken,
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
 * Build purchase request approval template message
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
        { type: 'text', text: details.title || 'Purchase Request' },
        { type: 'text', text: formatAmount(details.totalAmount || 0, details.currency) },
      ],
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 0,
      payload: approveToken,
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      payload: rejectToken,
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
 * Build asset request approval template message
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
      payload: approveToken,
    },
    {
      type: 'button',
      sub_type: 'quick_reply',
      index: 1,
      payload: rejectToken,
    },
  ];

  return {
    to,
    templateName: 'asset_approval_request',
    languageCode: DEFAULT_LANGUAGE,
    components,
  };
}

/**
 * Build the appropriate template based on entity type
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
    case 'PURCHASE_REQUEST':
      return buildPurchaseApprovalTemplate(to, details, approveToken, rejectToken);
    case 'ASSET_REQUEST':
      return buildAssetApprovalTemplate(to, details, approveToken, rejectToken);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Build action confirmation message (simple text, not template)
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
 * Get human-readable entity name
 */
function getEntityName(entityType: ApprovalEntityType): string {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return 'leave request';
    case 'PURCHASE_REQUEST':
      return 'purchase request';
    case 'ASSET_REQUEST':
      return 'asset request';
    default:
      return 'request';
  }
}
