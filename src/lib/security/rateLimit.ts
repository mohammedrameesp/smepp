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

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const bucket = this.store[identifier];

    if (!bucket) {
      // First request from this identifier
      this.store[identifier] = {
        tokens: this.maxRequests - 1,
        lastRefill: now,
      };
      return true;
    }

    // Calculate how many tokens to add based on time passed
    const timePassed = now - bucket.lastRefill;
    const tokensToAdd = Math.floor((timePassed / this.windowMs) * this.maxRequests);
    
    if (tokensToAdd > 0) {
      bucket.tokens = Math.min(this.maxRequests, bucket.tokens + tokensToAdd);
      bucket.lastRefill = now;
    }

    if (bucket.tokens > 0) {
      bucket.tokens--;
      return true;
    }

    return false;
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

// Global rate limiter instance
const rateLimiter = new InMemoryRateLimiter(
  parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  parseInt(process.env.RATE_LIMIT_MAX || '60')
);

// Cleanup old entries every 5 minutes
setInterval(() => rateLimiter.cleanup(), 5 * 60 * 1000);

export function getClientIdentifier(request: NextRequest): string {
  // Use IP address as identifier (in production, consider using user ID for authenticated requests)
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  return ip;
}

export function checkRateLimit(request: NextRequest): { allowed: boolean; remaining?: number } {
  const identifier = getClientIdentifier(request);
  const allowed = rateLimiter.isAllowed(identifier);
  
  return { allowed };
}

export function rateLimitMiddleware(request: NextRequest): NextResponse | null {
  const { allowed } = checkRateLimit(request);
  
  if (!allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded', 
        message: 'Too many requests. Please try again later.' 
      },
      { 
        status: 429,
        headers: {
          'Retry-After': '60',
          'X-RateLimit-Limit': process.env.RATE_LIMIT_MAX || '60',
          'X-RateLimit-Window': process.env.RATE_LIMIT_WINDOW_MS || '60000',
        }
      }
    );
  }

  return null;
}