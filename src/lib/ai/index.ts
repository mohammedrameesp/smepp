/**
 * AI Module - Central Exports
 *
 * This barrel file provides clean imports for the AI module.
 * Import from '@/lib/ai' instead of individual files.
 */

// ============================================================================
// Configuration
// ============================================================================

export {
  AI_ENV,
  AI_MODEL,
  MODEL_PRICING,
  MAX_CONCURRENT_REQUESTS,
  GET_REQUESTS_PER_HOUR,
  ALERT_THRESHOLDS,
  MAX_INPUT_LENGTH,
  MAX_RESULT_ARRAY_LENGTH,
  getLimitsForTier,
  validateOpenAIConfig,
} from './config';

export type { TierLimits, AlertThreshold } from './config';

// ============================================================================
// Core Chat Service
// ============================================================================

export {
  processChat,
  processChatStream,
  getConversations,
  getConversationMessages,
  deleteConversation,
} from './chat-service';

export type { ChatContext, ChatResponse } from './chat-service';

// ============================================================================
// Functions
// ============================================================================

export {
  chatFunctions,
  executeFunction,
  FUNCTION_METADATA,
} from './functions';

export type { ChatFunction } from './functions';

// ============================================================================
// Permissions
// ============================================================================

export { canAccessFunction } from './permissions';

// ============================================================================
// Rate Limiting
// ============================================================================

export {
  checkAIRateLimit,
  checkReadRateLimit,
  formatRateLimitError,
  acquireConcurrentSlot,
  releaseConcurrentSlot,
} from './rate-limiter';

export type { RateLimitResult } from './rate-limiter';

// ============================================================================
// Budget Tracking
// ============================================================================

export { trackTokenUsage } from './budget-tracker';

// ============================================================================
// Audit Logging
// ============================================================================

export {
  logAuditEntry,
  createAuditEntry,
  getAuditSummary,
  getFlaggedQueries,
} from './audit-logger';

export type { AuditLogEntry, DataAccessSummary } from './audit-logger';

// ============================================================================
// Input Sanitization
// ============================================================================

export {
  sanitizeInput,
  shouldBlockInput,
  getRiskScore,
  formatSanitizationLog,
} from './input-sanitizer';

export type { SanitizationResult } from './input-sanitizer';
