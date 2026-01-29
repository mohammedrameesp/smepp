/**
 * WhatsApp Business API Integration
 *
 * Provides WhatsApp notification capabilities for approval workflows.
 * Supports leave requests, purchase requests, and asset requests.
 */

// Types
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

// Configuration
export {
  getWhatsAppConfig,
  saveWhatsAppConfig,
  disableWhatsApp,
  getMemberWhatsAppPhone,
  saveMemberWhatsAppPhone,
  verifyMemberWhatsAppPhone,
  encrypt,
  decrypt,
  // Platform config
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

// Client
export { WhatsAppClient, WhatsAppApiError, logWhatsAppMessage, updateMessageStatus } from './client';

// Action Tokens
export {
  generateActionToken,
  generateActionTokenPair,
  validateAndConsumeToken,
  validateToken,
  cleanupExpiredTokens,
  invalidateTokensForEntity,
} from './action-tokens';

// Templates
export {
  buildLeaveApprovalTemplate,
  buildPurchaseApprovalTemplate,
  buildAssetApprovalTemplate,
  buildApprovalTemplate,
  buildActionConfirmationText,
} from './templates';

// Notification Sender (main entry point)
export {
  sendApprovalNotification,
  sendActionConfirmation,
  canSendWhatsAppNotification,
} from './send-notification';

// Approval Integration (use in API routes)
export {
  notifyApproversViaWhatsApp,
  notifyNextLevelApproversViaWhatsApp,
} from './approval-integration';
