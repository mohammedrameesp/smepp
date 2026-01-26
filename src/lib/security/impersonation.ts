/**
 * @file impersonation.ts
 * @description Impersonation token management with revocation support
 * @module lib/security
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * SECURITY FEATURES:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * - Unique JTI (JWT ID) for each token using crypto.randomBytes
 * - Token revocation via database lookup
 * - Bulk revocation support (revoke all tokens for a super admin)
 * - Automatic cleanup of expired revocation records
 * - Audit logging via activity log
 *
 * FAIL-SAFE BEHAVIOR:
 * - On database error during revocation check, treat token as revoked
 * - This prevents access in case of database connectivity issues
 *
 * @security All tokens are tracked in RevokedImpersonationToken table
 * @security Bulk revocation invalidates all tokens issued before the revocation
 */

import { prisma } from '@/lib/core/prisma';
import { randomBytes } from 'crypto';
import { logAction, ActivityActions } from '@/lib/core/activity';
import logger from '@/lib/core/log';

/**
 * Generate a unique JWT ID for impersonation tokens
 */
export function generateJti(): string {
  return `imp_${randomBytes(16).toString('hex')}`;
}

/**
 * Check if an impersonation token has been revoked
 * @param jti - The JWT ID to check
 * @param superAdminId - Optional super admin ID to check bulk revocations
 * @param issuedAt - Optional token issue time to check against bulk revocations
 * @returns true if revoked, false otherwise
 */
export async function isTokenRevoked(
  jti: string,
  superAdminId?: string,
  issuedAt?: Date
): Promise<boolean> {
  if (!jti) return false;

  try {
    // Check for direct token revocation
    const revoked = await prisma.revokedImpersonationToken.findUnique({
      where: { jti },
      select: { id: true },
    });
    if (revoked) return true;

    // Check for bulk revocation (if superAdminId provided)
    if (superAdminId && issuedAt) {
      const bulkRevoke = await prisma.revokedImpersonationToken.findFirst({
        where: {
          superAdminId,
          organizationSlug: 'BULK_REVOKE',
          revokedAt: { gt: issuedAt }, // Bulk revoke happened after token was issued
        },
        select: { id: true },
      });
      if (bulkRevoke) return true;
    }

    return false;
  } catch (error) {
    // On database error, fail safe - treat as revoked
    logger.error(
      { event: 'IMPERSONATION_REVOCATION_CHECK_ERROR', error: error instanceof Error ? error.message : String(error) },
      'Error checking token revocation - failing safe (treating as revoked)'
    );
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
 *
 * Implementation: Creates a "bulk revocation" entry with a special JTI pattern.
 * The isTokenRevoked function checks for bulk revocations by superAdminId.
 */
export async function revokeAllTokensForSuperAdmin(
  superAdminId: string,
  revokedBy: string,
  reason?: string,
  organizationId?: string
): Promise<number> {
  const now = new Date();
  const bulkRevokeJti = `bulk_revoke_${superAdminId}_${now.getTime()}`;

  // Create a bulk revocation entry
  // Any token for this super admin issued before this timestamp is considered revoked
  await prisma.revokedImpersonationToken.create({
    data: {
      jti: bulkRevokeJti,
      revokedBy,
      reason: reason || 'Bulk revocation - all tokens invalidated',
      superAdminId,
      organizationId: organizationId || 'ALL',
      organizationSlug: 'BULK_REVOKE',
      issuedAt: new Date(0), // Epoch - covers all tokens
      expiresAt: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours from now
    },
  });

  // Also update the User's passwordChangedAt to invalidate session tokens
  // This provides defense-in-depth
  await prisma.user.update({
    where: { id: superAdminId },
    data: { passwordChangedAt: now },
  });

  // Log to audit trail
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
        bulkRevokeJti,
        timestamp: now.toISOString(),
      }
    );
  }

  return 1; // Bulk revocation created
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
