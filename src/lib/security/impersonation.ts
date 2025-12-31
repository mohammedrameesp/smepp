/**
 * @file impersonation.ts
 * @description Impersonation token management with revocation support
 * @module lib/security
 *
 * Security Features:
 * - Unique JTI (JWT ID) for each token
 * - Token revocation via database lookup
 * - Automatic cleanup of expired revocation records
 * - Audit logging for all impersonation events
 */

import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { logAction, ActivityActions } from '@/lib/core/activity';

/**
 * Generate a unique JWT ID for impersonation tokens
 */
export function generateJti(): string {
  return `imp_${randomBytes(16).toString('hex')}`;
}

/**
 * Check if an impersonation token has been revoked
 * @param jti - The JWT ID to check
 * @returns true if revoked, false otherwise
 */
export async function isTokenRevoked(jti: string): Promise<boolean> {
  if (!jti) return false;

  try {
    const revoked = await prisma.revokedImpersonationToken.findUnique({
      where: { jti },
      select: { id: true },
    });
    return !!revoked;
  } catch (error) {
    // On database error, fail safe - treat as revoked
    console.error('[SECURITY] Error checking token revocation:', error);
    return true;
  }
}

/**
 * Revoke an impersonation token
 */
export async function revokeToken(params: {
  jti: string;
  revokedBy: string;
  reason?: string;
  superAdminId: string;
  organizationId: string;
  organizationSlug: string;
  issuedAt: Date;
  expiresAt: Date;
}): Promise<void> {
  await prisma.revokedImpersonationToken.upsert({
    where: { jti: params.jti },
    create: {
      jti: params.jti,
      revokedBy: params.revokedBy,
      reason: params.reason,
      superAdminId: params.superAdminId,
      organizationId: params.organizationId,
      organizationSlug: params.organizationSlug,
      issuedAt: params.issuedAt,
      expiresAt: params.expiresAt,
    },
    update: {
      revokedBy: params.revokedBy,
      reason: params.reason,
      revokedAt: new Date(),
    },
  });
}

/**
 * Revoke all active impersonation tokens for a super admin
 * Use this when a super admin's session is compromised
 */
export async function revokeAllTokensForSuperAdmin(
  superAdminId: string,
  revokedBy: string,
  reason?: string,
  organizationId?: string
): Promise<number> {
  // We can't revoke tokens we don't know about, but we can mark a timestamp
  // Any token issued before this time will be treated as revoked
  // For now, we'll rely on short expiry times (15 minutes)
  // This function is a placeholder for future enhancement

  // Log to audit trail if organizationId is provided
  if (organizationId) {
    await logAction(
      organizationId,
      revokedBy,
      ActivityActions.SECURITY_IMPERSONATION_REVOKED,
      'SECURITY',
      superAdminId,
      {
        superAdminId,
        revokedBy,
        reason,
        action: 'REVOKE_ALL_TOKENS',
        timestamp: new Date().toISOString(),
      }
    );
  }

  return 0; // No active tokens database yet
}

/**
 * Clean up expired revocation records
 * Should be run periodically (e.g., daily cron job)
 */
export async function cleanupExpiredRevocations(): Promise<number> {
  const result = await prisma.revokedImpersonationToken.deleteMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
    },
  });

  return result.count;
}

/**
 * Get active impersonation sessions for a super admin
 * Note: This returns revoked tokens as "sessions" for audit purposes
 */
export async function getImpersonationHistory(
  superAdminId: string,
  limit = 20
): Promise<Array<{
  id: string;
  organizationId: string;
  organizationSlug: string;
  issuedAt: Date;
  expiresAt: Date;
  revokedAt: Date;
  reason: string | null;
}>> {
  const records = await prisma.revokedImpersonationToken.findMany({
    where: { superAdminId },
    orderBy: { revokedAt: 'desc' },
    take: limit,
    select: {
      id: true,
      organizationId: true,
      organizationSlug: true,
      issuedAt: true,
      expiresAt: true,
      revokedAt: true,
      reason: true,
    },
  });

  return records;
}
