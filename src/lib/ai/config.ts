/**
 * AI Module Configuration
 *
 * Centralized configuration for the AI chat system.
 * All constants, environment variables, and tier limits are defined here.
 */

import { SubscriptionTier } from '@prisma/client';

// ============================================================================
// Environment Configuration
// ============================================================================

export const AI_ENV = {
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  TOKEN_DAILY_LIMIT: process.env.AI_TOKEN_DAILY_LIMIT
    ? parseInt(process.env.AI_TOKEN_DAILY_LIMIT, 10)
    : null,
  TOKEN_MONTHLY_LIMIT: process.env.AI_TOKEN_MONTHLY_LIMIT
    ? parseInt(process.env.AI_TOKEN_MONTHLY_LIMIT, 10)
    : null,
  REQUESTS_PER_HOUR: process.env.AI_RATE_LIMIT_REQUESTS_PER_HOUR
    ? parseInt(process.env.AI_RATE_LIMIT_REQUESTS_PER_HOUR, 10)
    : null,
} as const;

// ============================================================================
// Model Configuration
// ============================================================================

export const AI_MODEL = 'gpt-4o-mini' as const;

export const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  'gpt-4o-mini': {
    input: 0.00000015,  // $0.15 per 1M tokens
    output: 0.0000006,  // $0.60 per 1M tokens
  },
  'gpt-4o': {
    input: 0.0000025,   // $2.50 per 1M tokens
    output: 0.00001,    // $10 per 1M tokens
  },
};

// ============================================================================
// Rate Limiting
// ============================================================================

export interface TierLimits {
  dailyTokens: number;
  monthlyTokens: number;
  requestsPerHour: number;
}

export const TIER_LIMITS: Record<SubscriptionTier, TierLimits> = {
  [SubscriptionTier.FREE]: {
    dailyTokens: 10000,
    monthlyTokens: 100000,
    requestsPerHour: 30,
  },
  [SubscriptionTier.PLUS]: {
    dailyTokens: 50000,
    monthlyTokens: 500000,
    requestsPerHour: 100,
  },
};

/** Max concurrent requests per user (prevents batching attacks) */
export const MAX_CONCURRENT_REQUESTS = 3;

/** Lighter rate limit for GET endpoints (read-only) */
export const GET_REQUESTS_PER_HOUR = 120;

// ============================================================================
// Budget Alerts
// ============================================================================

/** Usage thresholds for notifications (percentage) */
export const ALERT_THRESHOLDS = [75, 90, 100] as const;
export type AlertThreshold = (typeof ALERT_THRESHOLDS)[number];

// ============================================================================
// Input Limits
// ============================================================================

/** Maximum user input length for AI chat */
export const MAX_INPUT_LENGTH = 4000;

/** Maximum number of records to return from any function */
export const MAX_RESULT_ARRAY_LENGTH = 50;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get rate limits for a subscription tier, with env overrides
 */
export function getLimitsForTier(tier: SubscriptionTier): TierLimits {
  const baseLimits = TIER_LIMITS[tier] || TIER_LIMITS[SubscriptionTier.FREE];
  return {
    dailyTokens: AI_ENV.TOKEN_DAILY_LIMIT || baseLimits.dailyTokens,
    monthlyTokens: AI_ENV.TOKEN_MONTHLY_LIMIT || baseLimits.monthlyTokens,
    requestsPerHour: AI_ENV.REQUESTS_PER_HOUR || baseLimits.requestsPerHour,
  };
}

/**
 * Validate OpenAI API key is configured
 */
export function validateOpenAIConfig(): void {
  if (!AI_ENV.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }
}
