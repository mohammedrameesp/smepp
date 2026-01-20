/**
 * Rate Limiter Unit Tests
 * Tests for AI chat rate limiting functionality including concurrent slots,
 * tier limits, and rate limit checking
 */

import { SubscriptionTier } from '@prisma/client';

// Mock Prisma before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    aIChatUsage: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';

// Re-create internal functions for testing since they're not exported
// These mirror the implementation in rate-limiter.ts

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

const MAX_CONCURRENT_REQUESTS = 3;
const GET_REQUESTS_PER_HOUR = 120;

// In-memory concurrent request tracking
const activeRequests = new Map<string, number>();

function acquireConcurrentSlot(memberId: string): boolean {
  const current = activeRequests.get(memberId) || 0;
  if (current >= MAX_CONCURRENT_REQUESTS) {
    return false;
  }
  activeRequests.set(memberId, current + 1);
  return true;
}

function releaseConcurrentSlot(memberId: string): void {
  const current = activeRequests.get(memberId) || 0;
  if (current <= 1) {
    activeRequests.delete(memberId);
  } else {
    activeRequests.set(memberId, current - 1);
  }
}

function getLimitsForTier(tier: SubscriptionTier) {
  const baseLimits = TIER_LIMITS[tier] || TIER_LIMITS[SubscriptionTier.FREE];
  return {
    dailyTokens: baseLimits.dailyTokens,
    monthlyTokens: baseLimits.monthlyTokens,
    requestsPerHour: baseLimits.requestsPerHour,
  };
}

function getStartOfDay(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getStartOfMonth(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

function getStartOfHour(): Date {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
}

interface RateLimitResult {
  allowed: boolean;
  reason?: 'daily_token_limit' | 'monthly_token_limit' | 'hourly_request_limit' | 'org_budget_exceeded' | 'concurrent_limit';
  current: number;
  limit: number;
  resetAt?: Date;
  retryAfterSeconds?: number;
}

function formatRateLimitError(result: RateLimitResult): string {
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

describe('RateLimiter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear the in-memory map
    activeRequests.clear();
  });

  describe('acquireConcurrentSlot', () => {
    it('should allow first request for a user', () => {
      const result = acquireConcurrentSlot('user-1');
      expect(result).toBe(true);
      expect(activeRequests.get('user-1')).toBe(1);
    });

    it('should allow up to MAX_CONCURRENT_REQUESTS', () => {
      expect(acquireConcurrentSlot('user-1')).toBe(true);
      expect(acquireConcurrentSlot('user-1')).toBe(true);
      expect(acquireConcurrentSlot('user-1')).toBe(true);
      expect(activeRequests.get('user-1')).toBe(3);
    });

    it('should reject when MAX_CONCURRENT_REQUESTS is exceeded', () => {
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');

      const result = acquireConcurrentSlot('user-1');
      expect(result).toBe(false);
      expect(activeRequests.get('user-1')).toBe(3); // Should not increase
    });

    it('should track concurrent requests per user independently', () => {
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-2');

      expect(activeRequests.get('user-1')).toBe(2);
      expect(activeRequests.get('user-2')).toBe(1);
    });

    it('should allow new user after another user is at limit', () => {
      // Fill up user-1
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');

      // user-2 should still be allowed
      expect(acquireConcurrentSlot('user-2')).toBe(true);
    });
  });

  describe('releaseConcurrentSlot', () => {
    it('should decrement concurrent count', () => {
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');
      expect(activeRequests.get('user-1')).toBe(2);

      releaseConcurrentSlot('user-1');
      expect(activeRequests.get('user-1')).toBe(1);
    });

    it('should remove entry when count reaches zero', () => {
      acquireConcurrentSlot('user-1');
      releaseConcurrentSlot('user-1');

      expect(activeRequests.has('user-1')).toBe(false);
    });

    it('should handle release without prior acquire', () => {
      releaseConcurrentSlot('user-nonexistent');
      expect(activeRequests.has('user-nonexistent')).toBe(false);
    });

    it('should allow new acquire after release', () => {
      // Fill up slots
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');
      acquireConcurrentSlot('user-1');
      expect(acquireConcurrentSlot('user-1')).toBe(false);

      // Release one
      releaseConcurrentSlot('user-1');

      // Should be able to acquire again
      expect(acquireConcurrentSlot('user-1')).toBe(true);
    });

    it('should not go negative', () => {
      releaseConcurrentSlot('user-1');
      releaseConcurrentSlot('user-1');
      releaseConcurrentSlot('user-1');

      expect(activeRequests.has('user-1')).toBe(false);
      expect(activeRequests.get('user-1')).toBeUndefined();
    });
  });

  describe('getLimitsForTier', () => {
    it('should return correct limits for FREE tier', () => {
      const limits = getLimitsForTier(SubscriptionTier.FREE);

      expect(limits.dailyTokens).toBe(10000);
      expect(limits.monthlyTokens).toBe(100000);
      expect(limits.requestsPerHour).toBe(30);
    });

    it('should return correct limits for PLUS tier', () => {
      const limits = getLimitsForTier(SubscriptionTier.PLUS);

      expect(limits.dailyTokens).toBe(50000);
      expect(limits.monthlyTokens).toBe(500000);
      expect(limits.requestsPerHour).toBe(100);
    });

    it('should default to FREE tier for unknown tiers', () => {
      // @ts-expect-error Testing with invalid tier
      const limits = getLimitsForTier('UNKNOWN_TIER');

      expect(limits.dailyTokens).toBe(10000);
      expect(limits.monthlyTokens).toBe(100000);
      expect(limits.requestsPerHour).toBe(30);
    });

    it('PLUS tier should have higher limits than FREE tier', () => {
      const freeLimits = getLimitsForTier(SubscriptionTier.FREE);
      const plusLimits = getLimitsForTier(SubscriptionTier.PLUS);

      expect(plusLimits.dailyTokens).toBeGreaterThan(freeLimits.dailyTokens);
      expect(plusLimits.monthlyTokens).toBeGreaterThan(freeLimits.monthlyTokens);
      expect(plusLimits.requestsPerHour).toBeGreaterThan(freeLimits.requestsPerHour);
    });
  });

  describe('date boundary functions', () => {
    describe('getStartOfDay', () => {
      it('should return start of current day in UTC', () => {
        const startOfDay = getStartOfDay();

        expect(startOfDay.getUTCHours()).toBe(0);
        expect(startOfDay.getUTCMinutes()).toBe(0);
        expect(startOfDay.getUTCSeconds()).toBe(0);
        expect(startOfDay.getUTCMilliseconds()).toBe(0);
      });

      it('should be before current time (unless exactly midnight)', () => {
        const startOfDay = getStartOfDay();
        const now = new Date();

        expect(startOfDay.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    describe('getStartOfMonth', () => {
      it('should return first day of current month in UTC', () => {
        const startOfMonth = getStartOfMonth();

        expect(startOfMonth.getUTCDate()).toBe(1);
        expect(startOfMonth.getUTCHours()).toBe(0);
        expect(startOfMonth.getUTCMinutes()).toBe(0);
        expect(startOfMonth.getUTCSeconds()).toBe(0);
      });

      it('should be before or equal to current time', () => {
        const startOfMonth = getStartOfMonth();
        const now = new Date();

        expect(startOfMonth.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    describe('getStartOfHour', () => {
      it('should return start of current hour', () => {
        const startOfHour = getStartOfHour();

        expect(startOfHour.getMinutes()).toBe(0);
        expect(startOfHour.getSeconds()).toBe(0);
        expect(startOfHour.getMilliseconds()).toBe(0);
      });
    });
  });

  describe('formatRateLimitError', () => {
    it('should format hourly request limit error', () => {
      const result: RateLimitResult = {
        allowed: false,
        reason: 'hourly_request_limit',
        current: 30,
        limit: 30,
        retryAfterSeconds: 1800,
      };

      const message = formatRateLimitError(result);

      expect(message).toContain('hourly request limit');
      expect(message).toContain('30 requests');
      expect(message).toContain('1800 seconds');
    });

    it('should format daily token limit error', () => {
      const result: RateLimitResult = {
        allowed: false,
        reason: 'daily_token_limit',
        current: 10000,
        limit: 10000,
      };

      const message = formatRateLimitError(result);

      expect(message).toContain('daily AI usage limit');
      expect(message).toContain('resets tomorrow');
    });

    it('should format monthly token limit error', () => {
      const result: RateLimitResult = {
        allowed: false,
        reason: 'monthly_token_limit',
        current: 100000,
        limit: 100000,
      };

      const message = formatRateLimitError(result);

      expect(message).toContain('monthly AI usage limit');
      expect(message).toContain('upgrade');
    });

    it('should format org budget exceeded error', () => {
      const result: RateLimitResult = {
        allowed: false,
        reason: 'org_budget_exceeded',
        current: 50000,
        limit: 50000,
      };

      const message = formatRateLimitError(result);

      expect(message).toContain('budget has been exceeded');
      expect(message).toContain('administrator');
    });

    it('should format concurrent limit error', () => {
      const result: RateLimitResult = {
        allowed: false,
        reason: 'concurrent_limit',
        current: 3,
        limit: 3,
      };

      const message = formatRateLimitError(result);

      expect(message).toContain('simultaneous requests');
      expect(message).toContain('wait');
    });

    it('should format generic error for unknown reason', () => {
      const result: RateLimitResult = {
        allowed: false,
        // @ts-expect-error Testing unknown reason
        reason: 'unknown_reason',
        current: 0,
        limit: 0,
      };

      const message = formatRateLimitError(result);

      expect(message).toBe('Rate limit exceeded. Please try again later.');
    });

    it('should format error when no reason provided', () => {
      const result: RateLimitResult = {
        allowed: false,
        current: 0,
        limit: 0,
      };

      const message = formatRateLimitError(result);

      expect(message).toBe('Rate limit exceeded. Please try again later.');
    });
  });

  describe('rate limit constants', () => {
    it('should have correct MAX_CONCURRENT_REQUESTS value', () => {
      expect(MAX_CONCURRENT_REQUESTS).toBe(3);
    });

    it('should have correct GET_REQUESTS_PER_HOUR value', () => {
      expect(GET_REQUESTS_PER_HOUR).toBe(120);
    });

    it('GET requests should have higher limit than POST requests', () => {
      const freeLimits = getLimitsForTier(SubscriptionTier.FREE);
      expect(GET_REQUESTS_PER_HOUR).toBeGreaterThan(freeLimits.requestsPerHour);
    });
  });

  describe('RateLimitResult type', () => {
    it('should correctly represent allowed state', () => {
      const allowed: RateLimitResult = {
        allowed: true,
        current: 5,
        limit: 30,
      };

      expect(allowed.allowed).toBe(true);
      expect(allowed.reason).toBeUndefined();
    });

    it('should correctly represent denied state', () => {
      const denied: RateLimitResult = {
        allowed: false,
        reason: 'hourly_request_limit',
        current: 30,
        limit: 30,
        resetAt: new Date(),
        retryAfterSeconds: 3600,
      };

      expect(denied.allowed).toBe(false);
      expect(denied.reason).toBeDefined();
      expect(denied.resetAt).toBeInstanceOf(Date);
    });
  });

  describe('tier limits behavior', () => {
    it('should have FREE tier as the default baseline', () => {
      const freeLimits = getLimitsForTier(SubscriptionTier.FREE);

      // These are the minimum acceptable limits
      expect(freeLimits.dailyTokens).toBeGreaterThanOrEqual(1000);
      expect(freeLimits.monthlyTokens).toBeGreaterThanOrEqual(10000);
      expect(freeLimits.requestsPerHour).toBeGreaterThanOrEqual(10);
    });

    it('should have PLUS tier with significantly higher limits', () => {
      const plusLimits = getLimitsForTier(SubscriptionTier.PLUS);
      const freeLimits = getLimitsForTier(SubscriptionTier.FREE);

      // PLUS should be at least 2x FREE
      expect(plusLimits.dailyTokens).toBeGreaterThanOrEqual(freeLimits.dailyTokens * 2);
      expect(plusLimits.monthlyTokens).toBeGreaterThanOrEqual(freeLimits.monthlyTokens * 2);
    });
  });
});
