import { NextRequest, NextResponse } from 'next/server';

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
    Object.keys(this.store).forEach(key => {
      const bucket = this.store[key];
      if (now - bucket.lastRefill > this.windowMs * 2) {
        delete this.store[key];
      }
    });
  }
}

// Global rate limiter instance (general API - 60 requests per minute)
const rateLimiter = new InMemoryRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  parseInt(process.env.RATE_LIMIT_MAX || '60')
);

// Strict rate limiter for authentication endpoints (5 attempts per 15 minutes)
const authRateLimiter = new InMemoryRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5 // 5 attempts
);

// Cleanup old entries every 5 minutes
setInterval(() => {
  rateLimiter.cleanup();
  authRateLimiter.cleanup();
}, 5 * 60 * 1000);

export function getClientIdentifier(request: NextRequest): string {
  // Use IP address as identifier (in production, consider using user ID for authenticated requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export function checkRateLimit(request: NextRequest): { allowed: boolean; remaining: number; resetIn: number } {
  const identifier = getClientIdentifier(request);
  return rateLimiter.isAllowed(identifier);
}

/**
 * Check rate limit for authentication endpoints (stricter: 5 attempts per 15 minutes)
 */
export function checkAuthRateLimit(request: NextRequest): { allowed: boolean; remaining: number; resetIn: number } {
  const identifier = getClientIdentifier(request);
  return authRateLimiter.isAllowed(identifier);
}

export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const { allowed } = checkRateLimit(request);

  if (!allowed) {
    return NextResponse.json(
      {
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
      },
      {
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX || '60',
          'X-RateLimit-Window': process.env.RATE_LIMIT_WINDOW_MS || '60000',
        },
      }
    );
  }

  return null;
}

/**
 * Rate limit middleware for authentication endpoints (stricter limits)
 */
export function authRateLimitMiddleware(request: NextRequest): NextResponse | null {
  const { allowed, remaining, resetIn } = checkAuthRateLimit(request);

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
          'X-RateLimit-Reset': String(Math.ceil(Date.now() / 1000) + retryAfterSeconds),
        },
      }
    );
  }

  return null;
}