/**
 * @file index.ts
 * @description WhatsApp Business API Integration - Barrel Export
 * @module lib/whatsapp
 *
 * Provides WhatsApp notification capabilities for approval workflows.
 * Supports leave requests, spend requests, and asset requests.
 *
 * @example
 * ```typescript
 * import {
 *   sendApprovalNotification,
 *   notifyApproversViaWhatsApp,
 *   getEffectiveWhatsAppConfig,
 * } from '@/lib/whatsapp';
 *
 * // Send notification to a single approver
 * await sendApprovalNotification({ tenantId, approverId, entityType, entityId, details });
 *
 * // Notify all approvers for a role (used after creating approval chain)
 * notifyApproversViaWhatsApp(tenantId, entityType, entityId, firstStepRole, requesterId);
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export type {
  WhatsAppConfigInput,
  WhatsAppConfigData,
  WhatsAppTemplateMessage,
  WhatsAppButton,
  MetaSendMessageResponse,
  MetaWebhookPayload,
  MetaWebhookEntry,
  MetaWebhookChange,
  MetaWebhookMessage,
  MetaWebhookStatus,
  ActionTokenPayload,
  ActionTokenValidationResult,
  ApprovalEntityType,
  ApprovalNotificationData,
  ApprovalDetails,
  SendNotificationResult,
} from './types';

export { WHATSAPP_TEMPLATES } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

export {
  // Tenant config
  getWhatsAppConfig,
  saveWhatsAppConfig,
  disableWhatsApp,
  // Member phone management
  getMemberWhatsAppPhone,
  saveMemberWhatsAppPhone,
  verifyMemberWhatsAppPhone,
  // Encryption utilities
  encrypt,
  decrypt,
  // Platform config (super admin)
  getPlatformWhatsAppConfig,
  savePlatformWhatsAppConfig,
  disablePlatformWhatsApp,
  getPlatformWhatsAppConfigForDisplay,
  // Hybrid config resolution
  getEffectiveWhatsAppConfig,
  updateTenantWhatsAppSource,
  setTenantPlatformWhatsAppAccess,
  getTenantWhatsAppStatus,
} from './config';

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

export {
  WhatsAppClient,
  WhatsAppApiError,
  logWhatsAppMessage,
  updateMessageStatus,
} from './client';

// ═══════════════════════════════════════════════════════════════════════════════
// ACTION TOKENS
// ═══════════════════════════════════════════════════════════════════════════════

export {
  generateActionToken,
  generateActionTokenPair,
  validateAndConsumeToken,
  validateToken,
  cleanupExpiredTokens,
  invalidateTokensForEntity,
} from './action-tokens';

// ═══════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ═══════════════════════════════════════════════════════════════════════════════

export {
  buildLeaveApprovalTemplate,
  buildPurchaseApprovalTemplate,
  buildAssetApprovalTemplate,
  buildApprovalTemplate,
  buildActionConfirmationText,
} from './templates';

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFICATION SENDER (Main Entry Points)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  sendApprovalNotification,
  sendActionConfirmation,
  canSendWhatsAppNotification,
} from './send-notification';

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL INTEGRATION (Use in API Routes)
// ═══════════════════════════════════════════════════════════════════════════════

export {
  notifyApproversViaWhatsApp,
  notifyNextLevelApproversViaWhatsApp,
} from './approval-integration';
