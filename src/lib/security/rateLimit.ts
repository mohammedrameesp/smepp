import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate Limiting with Redis (Upstash) and In-Memory Fallback
 *
 * Uses Upstash Redis for distributed rate limiting in production.
 * Falls back to in-memory rate limiting for development or when Redis isn't configured.
 *
 * Required environment variables for Redis:
 * - UPSTASH_REDIS_REST_URL: Upstash Redis REST endpoint
 * - UPSTASH_REDIS_REST_TOKEN: Upstash Redis auth token
 */

// ═══════════════════════════════════════════════════════════════════════════════
// REDIS RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

let redisRateLimiter: {
  general: import('@upstash/ratelimit').Ratelimit | null;
  auth: import('@upstash/ratelimit').Ratelimit | null;
} = { general: null, auth: null };

let redisInitialized = false;
let useRedis = false;

async function initRedisRateLimiter() {
  if (redisInitialized) return;
  redisInitialized = true;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.log('[RateLimit] Redis not configured, using in-memory rate limiting');
    return;
  }

  try {
    // Dynamic imports to avoid issues when Redis isn't configured
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');

    const redis = new Redis({ url, token });

    // General API rate limiter: 60 requests per minute using sliding window
    redisRateLimiter.general = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(
        parseInt(process.env.RATE_LIMIT_MAX || '60'),
        `${parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000')}ms`
      ),
      prefix: 'durj:ratelimit:general',
      analytics: true,
    });

    // Auth rate limiter: 5 attempts per 15 minutes using sliding window
    redisRateLimiter.auth = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15m'),
      prefix: 'durj:ratelimit:auth',
      analytics: true,
    });

    useRedis = true;
    console.log('[RateLimit] Redis rate limiting initialized');
  } catch (error) {
    console.error('[RateLimit] Failed to initialize Redis, falling back to in-memory:', error);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// IN-MEMORY FALLBACK RATE LIMITER
// ═══════════════════════════════════════════════════════════════════════════════

interface TokenBucketStore {
  [key: string]: {
    tokens: number;
    lastRefill: number;
  };
}

class InMemoryRateLimiter {
  private store: TokenBucketStore = {};
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 60) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): { allowed: boolean; remaining: number; resetIn: number } {
    const now = Date.now();
    const bucket = this.store[identifier];

    if (!bucket) {
      // First request from this identifier
      this.store[identifier] = {
        tokens: this.maxRequests - 1,
        lastRefill: now,
      };
      return { allowed: true, remaining: this.maxRequests - 1, resetIn: this.windowMs };
    }

    // Calculate how many tokens to add based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.windowMs) * this.maxRequests);

    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    const resetIn = this.windowMs - (now - bucket.lastRefill);

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return { allowed: true, remaining: bucket.tokens, resetIn };
    }

    return { allowed: false, remaining: 0, resetIn };
  }

  // Clean up old entries to prevent memory leaks
  cleanup() {
    const now = Date.now();
    Object.keys(this.store).forEach((key) => {
      const bucket = this.store[key];
      if (now - bucket.lastRefill > this.windowMs * 2) {
        delete this.store[key];
      }
    });
  }
}

// In-memory fallback instances
const memoryRateLimiter = new InMemoryRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  parseInt(process.env.RATE_LIMIT_MAX || '60')
);

const memoryAuthRateLimiter = new InMemoryRateLimiter(15 * 60 * 1000, 5);

// Cleanup old entries every 5 minutes (only for in-memory)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    if (!useRedis) {
      memoryRateLimiter.cleanup();
      memoryAuthRateLimiter.cleanup();
    }
  }, 5 * 60 * 1000);
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLIENT IDENTIFIER EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

export function getClientIdentifier(request: NextRequest): string {
  // Use IP address as identifier (in production, consider using user ID for authenticated requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

/**
 * Get identifier that combines IP + optional tenant/user for more granular limiting
 */
export function getEnhancedIdentifier(request: NextRequest): string {
  const ip = getClientIdentifier(request);
  const tenantId = request.headers.get('x-tenant-id');
  const userId = request.headers.get('x-user-id');

  // For authenticated requests, use userId for per-user limiting
  // This prevents one user from exhausting the limit for others on same IP
  if (userId) {
    return `user:${userId}:${ip}`;
  }

  // For tenant-scoped requests, add tenant context
  if (tenantId) {
    return `tenant:${tenantId}:${ip}`;
  }

  return `ip:${ip}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RATE LIMIT CHECK FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetIn: number;
}

export async function checkRateLimit(request: NextRequest): Promise<RateLimitResult> {
  await initRedisRateLimiter();

  const identifier = getEnhancedIdentifier(request);

  if (useRedis && redisRateLimiter.general) {
    try {
      const result = await redisRateLimiter.general.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetIn: Math.max(0, result.reset - Date.now()),
      };
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to in-memory:', error);
      // Fall through to in-memory
    }
  }

  return memoryRateLimiter.isAllowed(identifier);
}

/**
 * Check rate limit for authentication endpoints (stricter: 5 attempts per 15 minutes)
 */
export async function checkAuthRateLimit(request: NextRequest): Promise<RateLimitResult> {
  await initRedisRateLimiter();

  const identifier = getClientIdentifier(request);

  if (useRedis && redisRateLimiter.auth) {
    try {
      const result = await redisRateLimiter.auth.limit(identifier);
      return {
        allowed: result.success,
        remaining: result.remaining,
        resetIn: Math.max(0, result.reset - Date.now()),
      };
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to in-memory:', error);
      // Fall through to in-memory
    }
  }

  return memoryAuthRateLimiter.isAllowed(identifier);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MIDDLEWARE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

export async function rateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { allowed, remaining, resetIn } = await checkRateLimit(request);

  if (!allowed) {
    const retryAfterSeconds = Math.ceil(resetIn / 1000);
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX || '60',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + resetIn) / 1000)),
        },
      }
    );
  }

  return null;
}

/**
 * Rate limit middleware for authentication endpoints (stricter limits)
 */
export async function authRateLimitMiddleware(request: NextRequest): Promise<NextResponse | null> {
  const { allowed, remaining, resetIn } = await checkAuthRateLimit(request);

  if (!allowed) {
    const retryAfterSeconds = Math.ceil(resetIn / 1000);
    return NextResponse.json(
      {
        error: 'Too many login attempts',
        message: `Too many failed attempts. Please try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSeconds),
          'X-RateLimit-Limit': '5',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': String(Math.ceil((Date.now() + resetIn) / 1000)),
        },
      }
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if Redis rate limiting is active
 */
export function isRedisRateLimitingActive(): boolean {
  return useRedis;
}

/**
 * Create a custom rate limiter for specific endpoints
 * Useful for endpoints that need different limits (e.g., file uploads, exports)
 */
export async function createCustomRateLimiter(
  maxRequests: number,
  windowMs: number,
  prefix: string
): Promise<{
  check: (identifier: string) => Promise<RateLimitResult>;
}> {
  await initRedisRateLimiter();

  if (useRedis) {
    const { Redis } = await import('@upstash/redis');
    const { Ratelimit } = await import('@upstash/ratelimit');

    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });

    const limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(maxRequests, `${windowMs}ms`),
      prefix: `durj:ratelimit:${prefix}`,
    });

    return {
      check: async (identifier: string) => {
        try {
          const result = await limiter.limit(identifier);
          return {
            allowed: result.success,
            remaining: result.remaining,
            resetIn: Math.max(0, result.reset - Date.now()),
          };
        } catch {
          // Fallback
          return { allowed: true, remaining: maxRequests, resetIn: windowMs };
        }
      },
    };
  }

  // In-memory fallback
  const memLimiter = new InMemoryRateLimiter(windowMs, maxRequests);
  return {
    check: async (identifier: string) => memLimiter.isAllowed(identifier),
  };
}
