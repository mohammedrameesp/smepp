/**
 * AI Rate Limiter
 *
 * Manages token and request limits for AI chat usage
 * to prevent abuse and control costs.
 */

import { prisma } from '@/lib/core/prisma';
import { SubscriptionTier } from '@prisma/client';

// Default limits by subscription tier
const TIER_LIMITS: Record<SubscriptionTier, { dailyTokens: number; monthlyTokens: number; requestsPerHour: number }> = {
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

// Environment variable overrides
const ENV_DAILY_LIMIT = process.env.AI_TOKEN_DAILY_LIMIT
  ? parseInt(process.env.AI_TOKEN_DAILY_LIMIT, 10)
  : null;
const ENV_MONTHLY_LIMIT = process.env.AI_TOKEN_MONTHLY_LIMIT
  ? parseInt(process.env.AI_TOKEN_MONTHLY_LIMIT, 10)
  : null;
const ENV_REQUESTS_PER_HOUR = process.env.AI_RATE_LIMIT_REQUESTS_PER_HOUR
  ? parseInt(process.env.AI_RATE_LIMIT_REQUESTS_PER_HOUR, 10)
  : null;

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'daily_token_limit' | 'monthly_token_limit' | 'hourly_request_limit' | 'org_budget_exceeded';
  current: number;
  limit: number;
  resetAt?: Date;
  retryAfterSeconds?: number;
}

export interface UsageStats {
  userId: string;
  tenantId: string;
  dailyTokensUsed: number;
  dailyTokenLimit: number;
  monthlyTokensUsed: number;
  monthlyTokenLimit: number;
  hourlyRequestsUsed: number;
  hourlyRequestLimit: number;
  percentDailyUsed: number;
  percentMonthlyUsed: number;
}

// In-memory cache for request counting (per user, per hour)
// In production, consider using Redis for distributed rate limiting
const requestCache = new Map<string, { count: number; resetAt: number }>();

/**
 * Get limits for a subscription tier
 */
export function getLimitsForTier(tier: SubscriptionTier) {
  const baseLimits = TIER_LIMITS[tier] || TIER_LIMITS[SubscriptionTier.FREE];

  return {
    dailyTokens: ENV_DAILY_LIMIT || baseLimits.dailyTokens,
    monthlyTokens: ENV_MONTHLY_LIMIT || baseLimits.monthlyTokens,
    requestsPerHour: ENV_REQUESTS_PER_HOUR || baseLimits.requestsPerHour,
  };
}

/**
 * Get the start of the current day (UTC)
 */
function getStartOfDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Get the start of the current month (UTC)
 */
function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

/**
 * Get the start of the current hour
 */
function getStartOfHour(): Date {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
}

/**
 * Check hourly request rate limit (in-memory)
 */
function checkHourlyRequestLimit(
  userId: string,
  limit: number
): { allowed: boolean; count: number; resetAt: Date } {
  const cacheKey = `requests:${userId}`;
  const now = Date.now();
  const hourStart = getStartOfHour().getTime();

  const cached = requestCache.get(cacheKey);

  if (!cached || cached.resetAt <= now) {
    // Reset or initialize
    requestCache.set(cacheKey, {
      count: 1,
      resetAt: hourStart + 60 * 60 * 1000, // 1 hour from start of hour
    });
    return { allowed: true, count: 1, resetAt: new Date(hourStart + 60 * 60 * 1000) };
  }

  if (cached.count >= limit) {
    return {
      allowed: false,
      count: cached.count,
      resetAt: new Date(cached.resetAt),
    };
  }

  // Increment count
  cached.count++;
  requestCache.set(cacheKey, cached);

  return { allowed: true, count: cached.count, resetAt: new Date(cached.resetAt) };
}

/**
 * Check if a user can make an AI request
 */
export async function checkRateLimit(
  userId: string,
  tenantId: string,
  tier: SubscriptionTier
): Promise<RateLimitResult> {
  const limits = getLimitsForTier(tier);
  const dayStart = getStartOfDay();
  const monthStart = getStartOfMonth();

  // Check hourly request limit first (fast, in-memory)
  const hourlyCheck = checkHourlyRequestLimit(userId, limits.requestsPerHour);
  if (!hourlyCheck.allowed) {
    const retryAfterSeconds = Math.ceil((hourlyCheck.resetAt.getTime() - Date.now()) / 1000);
    return {
      allowed: false,
      reason: 'hourly_request_limit',
      current: hourlyCheck.count,
      limit: limits.requestsPerHour,
      resetAt: hourlyCheck.resetAt,
      retryAfterSeconds: Math.max(0, retryAfterSeconds),
    };
  }

  // Check daily token usage (using AIChatUsage model)
  const dailyUsage = await prisma.aIChatUsage.aggregate({
    where: {
      userId,
      tenantId,
      createdAt: { gte: dayStart },
    },
    _sum: { totalTokens: true },
  });

  const dailyTokensUsed = dailyUsage._sum.totalTokens || 0;
  if (dailyTokensUsed >= limits.dailyTokens) {
    const tomorrow = new Date(dayStart);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    return {
      allowed: false,
      reason: 'daily_token_limit',
      current: dailyTokensUsed,
      limit: limits.dailyTokens,
      resetAt: tomorrow,
    };
  }

  // Check monthly organization token usage
  const monthlyUsage = await prisma.aIChatUsage.aggregate({
    where: {
      tenantId,
      createdAt: { gte: monthStart },
    },
    _sum: { totalTokens: true },
  });

  const monthlyTokensUsed = monthlyUsage._sum.totalTokens || 0;

  // Check organization's custom budget if set
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { aiTokenBudgetMonthly: true },
  });

  const monthlyLimit = org?.aiTokenBudgetMonthly || limits.monthlyTokens;

  if (monthlyTokensUsed >= monthlyLimit) {
    const nextMonth = new Date(monthStart);
    nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
    return {
      allowed: false,
      reason: 'monthly_token_limit',
      current: monthlyTokensUsed,
      limit: monthlyLimit,
      resetAt: nextMonth,
    };
  }

  return {
    allowed: true,
    current: dailyTokensUsed,
    limit: limits.dailyTokens,
  };
}

/**
 * Get usage statistics for a user
 */
export async function getUsageStats(
  userId: string,
  tenantId: string,
  tier: SubscriptionTier
): Promise<UsageStats> {
  const limits = getLimitsForTier(tier);
  const dayStart = getStartOfDay();
  const monthStart = getStartOfMonth();

  // Get daily user usage
  const dailyUsage = await prisma.aIChatUsage.aggregate({
    where: {
      userId,
      tenantId,
      createdAt: { gte: dayStart },
    },
    _sum: { totalTokens: true },
  });

  // Get monthly org usage
  const monthlyUsage = await prisma.aIChatUsage.aggregate({
    where: {
      tenantId,
      createdAt: { gte: monthStart },
    },
    _sum: { totalTokens: true },
  });

  // Get organization's custom budget
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { aiTokenBudgetMonthly: true },
  });

  const monthlyLimit = org?.aiTokenBudgetMonthly || limits.monthlyTokens;

  // Get hourly request count
  const cacheKey = `requests:${userId}`;
  const cached = requestCache.get(cacheKey);
  const hourlyRequestsUsed = cached && cached.resetAt > Date.now() ? cached.count : 0;

  const dailyTokensUsed = dailyUsage._sum.totalTokens || 0;
  const monthlyTokensUsed = monthlyUsage._sum.totalTokens || 0;

  return {
    userId,
    tenantId,
    dailyTokensUsed,
    dailyTokenLimit: limits.dailyTokens,
    monthlyTokensUsed,
    monthlyTokenLimit: monthlyLimit,
    hourlyRequestsUsed,
    hourlyRequestLimit: limits.requestsPerHour,
    percentDailyUsed: Math.round((dailyTokensUsed / limits.dailyTokens) * 100),
    percentMonthlyUsed: Math.round((monthlyTokensUsed / monthlyLimit) * 100),
  };
}

/**
 * Format rate limit error for user display
 */
export function formatRateLimitError(result: RateLimitResult): string {
  switch (result.reason) {
    case 'hourly_request_limit':
      return `You've reached your hourly request limit (${result.limit} requests). Please try again in ${result.retryAfterSeconds} seconds.`;
    case 'daily_token_limit':
      return `You've reached your daily AI usage limit. Your limit resets tomorrow.`;
    case 'monthly_token_limit':
      return `Your organization has reached its monthly AI usage limit. Please contact your administrator to upgrade your plan.`;
    case 'org_budget_exceeded':
      return `Your organization's AI budget has been exceeded. Please contact your administrator.`;
    default:
      return 'Rate limit exceeded. Please try again later.';
  }
}

/**
 * Clean up expired cache entries (call periodically)
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  for (const [key, value] of requestCache.entries()) {
    if (value.resetAt <= now) {
      requestCache.delete(key);
    }
  }
}

// Clean up cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
