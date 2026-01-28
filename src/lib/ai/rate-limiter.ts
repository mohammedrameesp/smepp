/**
 * AI Rate Limiter
 *
 * Manages token and request limits for AI chat usage
 * to prevent abuse and control costs.
 *
 * Uses database-backed rate limiting for distributed deployments.
 */

import { prisma } from '@/lib/core/prisma';
import { SubscriptionTier } from '@prisma/client';
import {
  getLimitsForTier,
  MAX_CONCURRENT_REQUESTS,
  GET_REQUESTS_PER_HOUR,
} from './config';

// Re-export for backward compatibility
export { GET_REQUESTS_PER_HOUR, getLimitsForTier } from './config';

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'daily_token_limit' | 'monthly_token_limit' | 'hourly_request_limit' | 'org_budget_exceeded' | 'concurrent_limit';
  current: number;
  limit: number;
  resetAt?: Date;
  retryAfterSeconds?: number;
}

// In-memory concurrent request tracking (per user)
// NOTE: This is a best-effort limit that only works within a single serverless instance.
// In serverless deployments (Vercel), each cold start creates a new instance with its own Map,
// so this won't prevent concurrent requests across instances. For stricter enforcement,
// consider using Redis or database-backed tracking. However, for our use case this is
// acceptable since it still provides per-instance protection against batching attacks.
const activeRequests = new Map<string, number>();

/**
 * Check and increment concurrent request count
 * Returns true if request is allowed, false if limit exceeded
 */
export function acquireConcurrentSlot(memberId: string): boolean {
  const current = activeRequests.get(memberId) || 0;
  if (current >= MAX_CONCURRENT_REQUESTS) {
    return false;
  }
  activeRequests.set(memberId, current + 1);
  return true;
}

/**
 * Release concurrent request slot
 */
export function releaseConcurrentSlot(memberId: string): void {
  const current = activeRequests.get(memberId) || 0;
  if (current <= 1) {
    activeRequests.delete(memberId);
  } else {
    activeRequests.set(memberId, current - 1);
  }
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
 * Check hourly request rate limit using database
 * This is distributed-safe as it queries the AIChatUsage table
 */
async function checkHourlyRequestLimit(
  memberId: string,
  tenantId: string,
  limit: number
): Promise<{ allowed: boolean; count: number; resetAt: Date }> {
  const hourStart = getStartOfHour();
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

  // Count requests in the current hour
  const hourlyCount = await prisma.aIChatUsage.count({
    where: {
      memberId,
      tenantId,
      createdAt: { gte: hourStart },
    },
  });

  if (hourlyCount >= limit) {
    return {
      allowed: false,
      count: hourlyCount,
      resetAt: hourEnd,
    };
  }

  return { allowed: true, count: hourlyCount, resetAt: hourEnd };
}

/**
 * Check hourly request rate limit for read-only operations (GET requests)
 * Uses a lighter limit since these don't incur AI costs
 */
export async function checkReadRateLimit(
  memberId: string,
  _tenantId: string
): Promise<RateLimitResult> {
  const hourStart = getStartOfHour();
  const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

  // For GET requests, we count based on a simple in-memory counter
  // since these don't have AIChatUsage records
  // In a distributed setup, this could use Redis or a separate table
  const cacheKey = `get:${memberId}`;
  const now = Date.now();

  // Use a simple in-memory cache for GET request counting
  // This is acceptable since GET requests are read-only and low-risk
  if (!globalThis.getRequestCache) {
    globalThis.getRequestCache = new Map<string, { count: number; resetAt: number }>();
  }

  const cached = globalThis.getRequestCache.get(cacheKey);

  if (!cached || cached.resetAt <= now) {
    globalThis.getRequestCache.set(cacheKey, {
      count: 1,
      resetAt: hourEnd.getTime(),
    });
    return { allowed: true, current: 1, limit: GET_REQUESTS_PER_HOUR };
  }

  if (cached.count >= GET_REQUESTS_PER_HOUR) {
    const retryAfterSeconds = Math.ceil((cached.resetAt - now) / 1000);
    return {
      allowed: false,
      reason: 'hourly_request_limit',
      current: cached.count,
      limit: GET_REQUESTS_PER_HOUR,
      resetAt: hourEnd,
      retryAfterSeconds: Math.max(0, retryAfterSeconds),
    };
  }

  cached.count++;
  globalThis.getRequestCache.set(cacheKey, cached);
  return { allowed: true, current: cached.count, limit: GET_REQUESTS_PER_HOUR };
}

// Declare global type for TypeScript
declare global {
  // eslint-disable-next-line no-var
  var getRequestCache: Map<string, { count: number; resetAt: number }> | undefined;
}

/**
 * Check if a member can make an AI request.
 * Named checkAIRateLimit to distinguish from security/rateLimit.ts checkRateLimit.
 */
export async function checkAIRateLimit(
  memberId: string,
  tenantId: string,
  tier: SubscriptionTier
): Promise<RateLimitResult> {
  const limits = getLimitsForTier(tier);
  const dayStart = getStartOfDay();
  const monthStart = getStartOfMonth();

  // Check hourly request limit (database-backed for distributed safety)
  const hourlyCheck = await checkHourlyRequestLimit(memberId, tenantId, limits.requestsPerHour);
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
      memberId,
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
    case 'concurrent_limit':
      return `Too many simultaneous requests. Please wait for your current requests to complete.`;
    default:
      return 'Rate limit exceeded. Please try again later.';
  }
}

/**
 * Clean up expired cache entries (call periodically)
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();

  // Clean up GET request cache
  if (globalThis.getRequestCache) {
    for (const [key, value] of globalThis.getRequestCache.entries()) {
      if (value.resetAt <= now) {
        globalThis.getRequestCache.delete(key);
      }
    }
  }
}

// Clean up cache every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}
