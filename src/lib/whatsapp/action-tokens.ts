/**
 * @file action-tokens.ts
 * @description WhatsApp Action Token System
 * @module lib/whatsapp
 *
 * Generates and validates secure, one-time use tokens for
 * approve/reject actions via WhatsApp button callbacks.
 *
 * @security
 * This module implements critical security controls:
 * - HMAC-SHA256 signature verification
 * - One-time use tokens (consumed on first use)
 * - Short expiration window (15 minutes)
 * - Atomic race condition protection
 * - Tokens stored in database, not embedded in URL
 *
 * @example
 * ```typescript
 * import { generateActionTokenPair, validateAndConsumeToken } from '@/lib/whatsapp';
 *
 * // Generate tokens for a request
 * const { approveToken, rejectToken } = await generateActionTokenPair({
 *   tenantId: 'tenant-123',
 *   entityType: 'LEAVE_REQUEST',
 *   entityId: 'leave-456',
 *   approverId: 'member-789',
 * });
 *
 * // Later, validate and consume token from webhook
 * const result = await validateAndConsumeToken(token);
 * if (result.valid) {
 *   // Process the approval action
 * }
 * ```
 */

import { randomBytes, createHmac } from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { ApprovalModule } from '@prisma/client';
import logger from '@/lib/core/log';
import type { ActionTokenValidationResult, ApprovalEntityType } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Token expiration time in minutes.
 * @security NOTIF-003: Reduced from 60 to 15 minutes for security-sensitive approval actions
 */
const TOKEN_EXPIRY_MINUTES = 15;

// ═══════════════════════════════════════════════════════════════════════════════
// KEY MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the signing key for token HMAC signatures.
 *
 * @returns The signing key string
 * @throws Error if no valid key is available
 *
 * @security
 * SEC-007: Requires separate WHATSAPP_ENCRYPTION_KEY in production.
 * Falls back to NEXTAUTH_SECRET in development only.
 *
 * @remarks
 * Generate a key with:
 * `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
 */
function getSigningKey(): string {
  const key = process.env.WHATSAPP_ENCRYPTION_KEY;

  if (!key) {
    // In production, require a dedicated encryption key
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'CRITICAL: WHATSAPP_ENCRYPTION_KEY is required in production. ' +
          'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }

    // In development, fall back to NEXTAUTH_SECRET with warning
    const fallback = process.env.NEXTAUTH_SECRET;
    if (!fallback) {
      throw new Error('WHATSAPP_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
    }
    logger.warn('WHATSAPP_ENCRYPTION_KEY not set, using NEXTAUTH_SECRET as fallback');
    return fallback;
  }

  return key;
}

/**
 * Map entity type string to ApprovalModule enum.
 *
 * @param entityType - The entity type string
 * @returns ApprovalModule enum value
 * @throws Error if entity type is unknown
 */
function toApprovalModule(entityType: ApprovalEntityType): ApprovalModule {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return ApprovalModule.LEAVE_REQUEST;
    case 'SPEND_REQUEST':
      return ApprovalModule.SPEND_REQUEST;
    case 'ASSET_REQUEST':
      return ApprovalModule.ASSET_REQUEST;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a secure action token.
 *
 * Token format: `{random_id}:{hmac_signature}`
 * The payload is stored in database, not embedded in the token itself.
 *
 * @param params - Token parameters
 * @param params.tenantId - Tenant ID for the token
 * @param params.entityType - Type of entity being approved
 * @param params.entityId - ID of the entity being approved
 * @param params.action - The action this token represents
 * @param params.approverId - ID of the approver who can use this token
 * @returns The generated token string
 *
 * @security
 * - Token ID is 16 random bytes (128-bit entropy)
 * - HMAC signature prevents token tampering
 * - Signature is truncated to 16 chars for WhatsApp payload limit
 */
export async function generateActionToken(params: {
  tenantId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  action: 'approve' | 'reject';
  approverId: string;
}): Promise<string> {
  // Generate a random token ID
  const tokenId = randomBytes(16).toString('hex');

  // Create HMAC signature for integrity
  const hmac = createHmac('sha256', getSigningKey());
  hmac.update(`${tokenId}:${params.entityType}:${params.entityId}:${params.action}`);
  const signature = hmac.digest('hex').slice(0, 16); // Shortened for WhatsApp payload limit

  // The actual token stored and used
  const token = `${tokenId}:${signature}`;

  // Calculate expiry
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + TOKEN_EXPIRY_MINUTES);

  // Store in database
  await prisma.whatsAppActionToken.create({
    data: {
      tenantId: params.tenantId,
      token,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      approverId: params.approverId,
      expiresAt,
    },
  });

  return token;
}

/**
 * Generate both approve and reject tokens for a request.
 *
 * Convenience function that generates both tokens in parallel.
 *
 * @param params - Token parameters (excluding action)
 * @returns Object with approveToken and rejectToken strings
 */
export async function generateActionTokenPair(params: {
  tenantId: string;
  entityType: ApprovalEntityType;
  entityId: string;
  approverId: string;
}): Promise<{ approveToken: string; rejectToken: string }> {
  const [approveToken, rejectToken] = await Promise.all([
    generateActionToken({ ...params, action: 'approve' }),
    generateActionToken({ ...params, action: 'reject' }),
  ]);

  return { approveToken, rejectToken };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate and consume an action token.
 *
 * This is the main validation function called by the webhook handler.
 * If valid, the token is marked as used and cannot be reused.
 *
 * @param token - The token string to validate
 * @returns Validation result with payload if valid, error if not
 *
 * @security
 * - Uses atomic updateMany to prevent race conditions
 * - Verifies HMAC signature before accepting token
 * - Token is permanently consumed even if action fails later
 */
export async function validateAndConsumeToken(
  token: string
): Promise<ActionTokenValidationResult> {
  // Find the token
  const tokenRecord = await prisma.whatsAppActionToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    return { valid: false, error: 'Token not found' };
  }

  // Check if already used
  if (tokenRecord.used) {
    return { valid: false, error: 'Token already used' };
  }

  // Check if expired
  if (tokenRecord.expiresAt < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  // Verify HMAC signature
  const [tokenId, signature] = token.split(':');
  const hmac = createHmac('sha256', getSigningKey());
  hmac.update(`${tokenId}:${tokenRecord.entityType}:${tokenRecord.entityId}:${tokenRecord.action}`);
  const expectedSignature = hmac.digest('hex').slice(0, 16);

  if (signature !== expectedSignature) {
    return { valid: false, error: 'Invalid token signature' };
  }

  // Mark as used (atomic operation)
  const updated = await prisma.whatsAppActionToken.updateMany({
    where: {
      id: tokenRecord.id,
      used: false, // Ensure it hasn't been used in a race condition
    },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });

  if (updated.count === 0) {
    return { valid: false, error: 'Token already used (race condition)' };
  }

  return {
    valid: true,
    payload: {
      tenantId: tokenRecord.tenantId,
      entityType: toApprovalModule(tokenRecord.entityType as ApprovalEntityType),
      entityId: tokenRecord.entityId,
      action: tokenRecord.action as 'approve' | 'reject',
      approverId: tokenRecord.approverId,
      expiresAt: tokenRecord.expiresAt.getTime(),
    },
  };
}

/**
 * Validate token without consuming it.
 *
 * Use this for preview/verification when you need to check if a token
 * is valid without permanently consuming it.
 *
 * @param token - The token string to validate
 * @returns Validation result with payload if valid, error if not
 *
 * @remarks
 * This does NOT verify the HMAC signature (unlike validateAndConsumeToken).
 * It only checks database state: existence, used, expired.
 */
export async function validateToken(token: string): Promise<ActionTokenValidationResult> {
  const tokenRecord = await prisma.whatsAppActionToken.findUnique({
    where: { token },
  });

  if (!tokenRecord) {
    return { valid: false, error: 'Token not found' };
  }

  if (tokenRecord.used) {
    return { valid: false, error: 'Token already used' };
  }

  if (tokenRecord.expiresAt < new Date()) {
    return { valid: false, error: 'Token expired' };
  }

  return {
    valid: true,
    payload: {
      tenantId: tokenRecord.tenantId,
      entityType: toApprovalModule(tokenRecord.entityType as ApprovalEntityType),
      entityId: tokenRecord.entityId,
      action: tokenRecord.action as 'approve' | 'reject',
      approverId: tokenRecord.approverId,
      expiresAt: tokenRecord.expiresAt.getTime(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TOKEN CLEANUP
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clean up expired tokens.
 *
 * Should be run periodically via cron job to prevent database bloat.
 * Deletes:
 * - All expired tokens (regardless of used status)
 * - Used tokens older than 24 hours (for audit trail retention)
 *
 * @returns Number of tokens deleted
 *
 * @remarks
 * Called by /api/cron/cleanup-whatsapp-tokens route (daily at 2 AM UTC).
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const result = await prisma.whatsAppActionToken.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        // Also clean up used tokens older than 24 hours
        {
          used: true,
          usedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      ],
    },
  });

  return result.count;
}

/**
 * Invalidate all pending tokens for an entity.
 *
 * Call this when a request is approved/rejected through the web UI
 * to prevent the WhatsApp button from being used after the fact.
 *
 * @param entityType - Type of entity whose tokens to invalidate
 * @param entityId - ID of the entity whose tokens to invalidate
 *
 * @remarks
 * Marks tokens as "used" rather than deleting them for audit purposes.
 */
export async function invalidateTokensForEntity(
  entityType: ApprovalEntityType,
  entityId: string
): Promise<void> {
  await prisma.whatsAppActionToken.updateMany({
    where: {
      entityType,
      entityId,
      used: false,
    },
    data: {
      used: true,
      usedAt: new Date(),
    },
  });
}

