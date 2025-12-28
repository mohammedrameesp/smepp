/**
 * WhatsApp Action Token System
 *
 * Generates and validates secure, one-time use tokens for
 * approve/reject actions via WhatsApp button callbacks.
 */

import { randomBytes, createHash, createHmac } from 'crypto';
import { prisma } from '@/lib/core/prisma';
import { ApprovalModule } from '@prisma/client';
import type { ActionTokenPayload, ActionTokenValidationResult, ApprovalEntityType } from './types';

const TOKEN_EXPIRY_MINUTES = 60;

/**
 * Get the signing key for tokens
 */
function getSigningKey(): string {
  const key = process.env.WHATSAPP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
  }
  return key;
}

/**
 * Map entity type string to ApprovalModule enum
 */
function toApprovalModule(entityType: ApprovalEntityType): ApprovalModule {
  switch (entityType) {
    case 'LEAVE_REQUEST':
      return ApprovalModule.LEAVE_REQUEST;
    case 'PURCHASE_REQUEST':
      return ApprovalModule.PURCHASE_REQUEST;
    case 'ASSET_REQUEST':
      return ApprovalModule.ASSET_REQUEST;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Generate a secure action token
 *
 * Token format: base64(random_id):hmac_signature
 * The payload is stored in database, not in the token itself
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
 * Generate both approve and reject tokens for a request
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

/**
 * Validate and consume an action token
 *
 * Returns the action payload if valid, marks token as used
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
 * Validate token without consuming it (for preview/verification)
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

/**
 * Clean up expired tokens (run periodically)
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
 * Invalidate all pending tokens for an entity
 * (e.g., when request is approved/rejected through web UI)
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
