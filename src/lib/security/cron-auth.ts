/**
 * @file cron-auth.ts
 * @description Secure authentication utilities for cron job endpoints
 * @module security
 *
 * SECURITY: All cron authentication uses timing-safe comparison to prevent
 * timing attacks that could leak secret information.
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';

/**
 * Maximum allowed timestamp drift for HMAC-based auth (5 minutes)
 * Protects against replay attacks
 */
const MAX_TIMESTAMP_DRIFT_MS = 5 * 60 * 1000;

export interface CronAuthResult {
  valid: boolean;
  error?: string;
}

/**
 * Timing-safe string comparison to prevent timing attacks.
 * Returns true if strings are equal, false otherwise.
 *
 * SECURITY: Uses crypto.timingSafeEqual which takes constant time
 * regardless of how many characters match.
 */
function timingSafeStringEquals(a: string, b: string): boolean {
  // If lengths differ, we still need to do constant-time work
  // to prevent length-based timing attacks
  if (a.length !== b.length) {
    // Compare against itself to maintain constant timing
    crypto.timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Verify cron job authentication using timing-safe comparison.
 *
 * Supports two authentication methods:
 * 1. Simple Bearer token (for Vercel Cron and simple setups)
 * 2. HMAC signature with timestamp (for external cron services, replay-protected)
 *
 * @param request - The incoming request
 * @returns Authentication result with validity and optional error message
 *
 * @example
 * ```typescript
 * export async function GET(request: NextRequest) {
 *   const authResult = verifyCronAuth(request);
 *   if (!authResult.valid) {
 *     return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
 *   }
 *   // ... cron job logic
 * }
 * ```
 */
export function verifyCronAuth(request: NextRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return { valid: false, error: 'CRON_SECRET not configured' };
  }

  // Method 1: Simple Bearer token (for Vercel Cron)
  // SECURITY: Uses timing-safe comparison to prevent timing attacks
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const expectedHeader = `Bearer ${cronSecret}`;
    if (timingSafeStringEquals(authHeader, expectedHeader)) {
      return { valid: true };
    }
  }

  // Method 2: HMAC signature with timestamp (for external cron services)
  // Headers: X-Cron-Timestamp, X-Cron-Signature
  const timestamp = request.headers.get('x-cron-timestamp');
  const signature = request.headers.get('x-cron-signature');

  if (timestamp && signature) {
    // Validate timestamp to prevent replay attacks
    const requestTime = parseInt(timestamp, 10);
    const now = Date.now();

    if (isNaN(requestTime)) {
      return { valid: false, error: 'Invalid timestamp format' };
    }

    if (Math.abs(now - requestTime) > MAX_TIMESTAMP_DRIFT_MS) {
      return { valid: false, error: 'Timestamp too old or too far in future (replay protection)' };
    }

    // Verify HMAC signature: HMAC-SHA256(timestamp + ":" + path)
    const path = new URL(request.url).pathname;
    const payload = `${timestamp}:${path}`;
    const expectedSignature = crypto
      .createHmac('sha256', cronSecret)
      .update(payload)
      .digest('hex');

    try {
      // SECURITY: Timing-safe comparison for signature verification
      if (crypto.timingSafeEqual(
        Buffer.from(signature, 'hex'),
        Buffer.from(expectedSignature, 'hex')
      )) {
        return { valid: true };
      }
    } catch {
      // Buffer creation might fail if signature is not valid hex
      return { valid: false, error: 'Invalid signature format' };
    }

    return { valid: false, error: 'Invalid signature' };
  }

  return { valid: false, error: 'Missing authentication' };
}
