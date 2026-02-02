/**
 * @file config.ts
 * @description WhatsApp Configuration Utilities
 * @module lib/whatsapp
 *
 * Handles encryption/decryption of access tokens and configuration
 * management for per-tenant and platform-wide WhatsApp setup.
 *
 * @security This module handles sensitive data (access tokens).
 * All tokens are encrypted with AES-256-GCM before storage.
 *
 * @example
 * ```typescript
 * import { getEffectiveWhatsAppConfig, getMemberWhatsAppPhone } from '@/lib/whatsapp';
 *
 * // Get active config for a tenant (resolves platform vs custom)
 * const config = await getEffectiveWhatsAppConfig(tenantId);
 *
 * // Get approver's phone number for notifications
 * const phone = await getMemberWhatsAppPhone(memberId);
 * ```
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import type {
  WhatsAppConfigData,
  WhatsAppConfigInput,
  PlatformWhatsAppConfigData,
  PlatformWhatsAppConfigInput,
  EffectiveWhatsAppConfig,
} from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTION CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** AES-256-GCM provides authenticated encryption */
const ALGORITHM = 'aes-256-gcm';

/** Initialization vector length for AES-GCM */
const IV_LENGTH = 16;

/** Default country code for Qatar phone numbers */
const DEFAULT_COUNTRY_CODE_QATAR = '+974';

// ═══════════════════════════════════════════════════════════════════════════════
// ENCRYPTION UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the encryption key from environment.
 * Falls back to a derived key from NEXTAUTH_SECRET if not set.
 *
 * @returns 32-byte encryption key
 * @throws Error if no encryption key is available
 * @security Uses SHA-256 to derive a consistent 32-byte key
 */
function getEncryptionKey(): Buffer {
  const key = process.env.WHATSAPP_ENCRYPTION_KEY || process.env.NEXTAUTH_SECRET;
  if (!key) {
    throw new Error('WHATSAPP_ENCRYPTION_KEY or NEXTAUTH_SECRET must be set');
  }
  // Derive a 32-byte key using SHA-256
  return createHash('sha256').update(key).digest();
}

/**
 * Encrypt a string value using AES-256-GCM.
 *
 * @param text - Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (all hex encoded)
 * @throws Error if encryption fails
 *
 * @security Uses authenticated encryption (GCM) to prevent tampering.
 *
 * @example
 * ```typescript
 * const encrypted = encrypt('my-access-token');
 * // Returns: "1234abcd...:5678efgh...:9abc0def..."
 * ```
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt an encrypted string.
 *
 * @param encryptedText - Encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plain text
 * @throws Error if decryption fails or format is invalid
 *
 * @security Verifies auth tag to detect tampering.
 *
 * @example
 * ```typescript
 * const token = decrypt(config.accessTokenEncrypted);
 * ```
 */
export function decrypt(encryptedText: string): string {
  const key = getEncryptionKey();
  const parts = encryptedText.split(':');

  if (parts.length !== 3) {
    throw new Error('Invalid encrypted text format');
  }

  const [ivHex, authTagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate a random webhook verify token.
 *
 * @returns 64-character hex string for webhook verification
 */
function generateWebhookVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get WhatsApp configuration for a tenant.
 *
 * @param tenantId - The tenant/organization ID
 * @returns Decrypted configuration or null if not configured/inactive
 *
 * @security Access token is decrypted - do not log the return value.
 */
export async function getWhatsAppConfig(tenantId: string): Promise<WhatsAppConfigData | null> {
  const config = await prisma.whatsAppConfig.findUnique({
    where: { tenantId },
  });

  if (!config || !config.isActive) {
    return null;
  }

  return {
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    accessToken: decrypt(config.accessTokenEncrypted),
    webhookVerifyToken: config.webhookVerifyToken,
    isActive: config.isActive,
  };
}

/**
 * Save or update WhatsApp configuration for a tenant.
 *
 * @param tenantId - The tenant/organization ID
 * @param input - Configuration input with plain text access token
 *
 * @security Access token is encrypted before storage.
 */
export async function saveWhatsAppConfig(
  tenantId: string,
  input: WhatsAppConfigInput
): Promise<void> {
  const encryptedToken = encrypt(input.accessToken);
  const webhookVerifyToken = generateWebhookVerifyToken();

  await prisma.whatsAppConfig.upsert({
    where: { tenantId },
    update: {
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
      accessTokenEncrypted: encryptedToken,
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      phoneNumberId: input.phoneNumberId,
      businessAccountId: input.businessAccountId,
      accessTokenEncrypted: encryptedToken,
      webhookVerifyToken,
      isActive: true,
    },
  });
}

/**
 * Disable WhatsApp for a tenant.
 *
 * @param tenantId - The tenant/organization ID
 */
export async function disableWhatsApp(tenantId: string): Promise<void> {
  await prisma.whatsAppConfig.update({
    where: { tenantId },
    data: { isActive: false },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBER PHONE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get a member's WhatsApp phone number.
 *
 * Resolution priority:
 * 1. Verified WhatsAppUserPhone record (explicit registration)
 * 2. TeamMember.qatarMobile (HR profile - Qatar number)
 * 3. TeamMember.otherMobile with country code (HR profile - international)
 *
 * This allows using HR phone numbers without separate WhatsApp registration.
 *
 * @param memberId - The team member ID
 * @returns Phone number in E.164 format or null if not found
 *
 * @remarks Qatar (+974) is the default country code if none is provided.
 */
export async function getMemberWhatsAppPhone(memberId: string): Promise<string | null> {
  // First check explicit WhatsApp registration
  const whatsAppPhone = await prisma.whatsAppUserPhone.findUnique({
    where: { memberId },
    select: { phoneNumber: true, isVerified: true },
  });

  if (whatsAppPhone?.isVerified) {
    return whatsAppPhone.phoneNumber;
  }

  // Fall back to HR profile phone numbers
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      qatarMobile: true,
      otherMobileCode: true,
      otherMobileNumber: true,
    },
  });

  if (!member) {
    return null;
  }

  // Priority: qatarMobile > otherMobile
  if (member.qatarMobile) {
    return normalizePhoneNumber(member.qatarMobile);
  }

  if (member.otherMobileNumber) {
    const code = member.otherMobileCode || '+91';
    return normalizePhoneNumber(`${code}${member.otherMobileNumber}`);
  }

  return null;
}

/**
 * Save or update a member's WhatsApp phone number.
 *
 * @param tenantId - The tenant/organization ID
 * @param memberId - The team member ID
 * @param phoneNumber - Phone number (will be normalized to E.164)
 *
 * @remarks Resets verification status when number changes.
 */
export async function saveMemberWhatsAppPhone(
  tenantId: string,
  memberId: string,
  phoneNumber: string
): Promise<void> {
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  await prisma.whatsAppUserPhone.upsert({
    where: { memberId },
    update: {
      phoneNumber: normalizedPhone,
      isVerified: false, // Reset verification on number change
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      memberId,
      phoneNumber: normalizedPhone,
      isVerified: false,
    },
  });
}

/**
 * Mark a member's WhatsApp phone as verified.
 *
 * @param memberId - The team member ID
 */
export async function verifyMemberWhatsAppPhone(memberId: string): Promise<void> {
  await prisma.whatsAppUserPhone.update({
    where: { memberId },
    data: { isVerified: true },
  });
}

/**
 * Normalize a phone number to E.164 format.
 *
 * @param phone - Raw phone number in various formats
 * @returns Normalized phone number with + prefix
 *
 * @remarks
 * - If 8 digits: assumes Qatar local number, adds +974
 * - If starts with 00: replaces with +
 * - If starts with +: keeps as-is
 * - Otherwise: adds + prefix
 *
 * @example
 * ```typescript
 * normalizePhoneNumber('55123456')     // '+97455123456' (Qatar local)
 * normalizePhoneNumber('+97455123456') // '+97455123456' (already E.164)
 * normalizePhoneNumber('0097455123456')// '+97455123456' (00 prefix)
 * ```
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If starts with +, keep as is
  if (cleaned.startsWith('+')) {
    return cleaned;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    return '+' + cleaned.slice(2);
  }

  // If 8 digits (Qatar local), add +974
  if (cleaned.length === 8) {
    return DEFAULT_COUNTRY_CODE_QATAR + cleaned;
  }

  // Otherwise add + prefix
  return '+' + cleaned;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PLATFORM CONFIGURATION (Super Admin)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the platform-wide WhatsApp configuration.
 *
 * @returns Decrypted platform configuration or null if not configured/inactive
 *
 * @security Access token is decrypted - do not log the return value.
 */
export async function getPlatformWhatsAppConfig(): Promise<PlatformWhatsAppConfigData | null> {
  const config = await prisma.platformWhatsAppConfig.findFirst({
    where: { isActive: true },
  });

  if (!config) {
    return null;
  }

  return {
    phoneNumberId: config.phoneNumberId,
    businessAccountId: config.businessAccountId,
    accessToken: decrypt(config.accessTokenEncrypted),
    webhookVerifyToken: config.webhookVerifyToken,
    isActive: config.isActive,
    displayPhoneNumber: config.displayPhoneNumber || undefined,
    businessName: config.businessName || undefined,
  };
}

/**
 * Save or update the platform-wide WhatsApp configuration.
 *
 * @param input - Configuration input with plain text access token
 *
 * @security Access token is encrypted before storage.
 */
export async function savePlatformWhatsAppConfig(
  input: PlatformWhatsAppConfigInput
): Promise<void> {
  const encryptedToken = encrypt(input.accessToken);
  const webhookVerifyToken = generateWebhookVerifyToken();

  // Check if a config already exists
  const existing = await prisma.platformWhatsAppConfig.findFirst();

  if (existing) {
    await prisma.platformWhatsAppConfig.update({
      where: { id: existing.id },
      data: {
        phoneNumberId: input.phoneNumberId,
        businessAccountId: input.businessAccountId,
        accessTokenEncrypted: encryptedToken,
        displayPhoneNumber: input.displayPhoneNumber,
        businessName: input.businessName,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  } else {
    await prisma.platformWhatsAppConfig.create({
      data: {
        phoneNumberId: input.phoneNumberId,
        businessAccountId: input.businessAccountId,
        accessTokenEncrypted: encryptedToken,
        webhookVerifyToken,
        displayPhoneNumber: input.displayPhoneNumber,
        businessName: input.businessName,
        isActive: true,
      },
    });
  }
}

/**
 * Disable the platform-wide WhatsApp configuration.
 */
export async function disablePlatformWhatsApp(): Promise<void> {
  await prisma.platformWhatsAppConfig.updateMany({
    data: { isActive: false },
  });
}

/**
 * Get platform WhatsApp config for display (with masked token).
 *
 * @returns Configuration status and safe-to-display config details
 */
export async function getPlatformWhatsAppConfigForDisplay(): Promise<{
  configured: boolean;
  config?: {
    phoneNumberId: string;
    businessAccountId: string;
    displayPhoneNumber?: string;
    businessName?: string;
    isActive: boolean;
    webhookVerifyToken: string;
  };
}> {
  const config = await prisma.platformWhatsAppConfig.findFirst();

  if (!config) {
    return { configured: false };
  }

  return {
    configured: true,
    config: {
      phoneNumberId: config.phoneNumberId,
      businessAccountId: config.businessAccountId,
      displayPhoneNumber: config.displayPhoneNumber || undefined,
      businessName: config.businessName || undefined,
      isActive: config.isActive,
      webhookVerifyToken: config.webhookVerifyToken,
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EFFECTIVE CONFIG RESOLUTION (Hybrid)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get the effective WhatsApp configuration for a tenant.
 *
 * Resolution order:
 * 1. If tenant source = CUSTOM and has active custom config, use custom
 * 2. If tenant source = PLATFORM and platform is active and enabled for tenant, use platform
 * 3. Return null (WhatsApp disabled)
 *
 * @param tenantId - The tenant/organization ID
 * @returns Effective configuration with source indicator, or null if disabled
 *
 * @security Access token is decrypted - do not log the return value.
 */
export async function getEffectiveWhatsAppConfig(
  tenantId: string
): Promise<EffectiveWhatsAppConfig | null> {
  // Get tenant's preference and config in one query
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: {
      whatsAppSource: true,
      whatsAppPlatformEnabled: true,
      whatsAppConfig: true,
    },
  });

  if (!org || org.whatsAppSource === 'NONE') {
    return null;
  }

  // Try custom config first
  if (org.whatsAppSource === 'CUSTOM' && org.whatsAppConfig?.isActive) {
    return {
      config: {
        phoneNumberId: org.whatsAppConfig.phoneNumberId,
        businessAccountId: org.whatsAppConfig.businessAccountId,
        accessToken: decrypt(org.whatsAppConfig.accessTokenEncrypted),
        webhookVerifyToken: org.whatsAppConfig.webhookVerifyToken,
        isActive: true,
      },
      source: 'CUSTOM',
    };
  }

  // Try platform config
  if (org.whatsAppSource === 'PLATFORM' && org.whatsAppPlatformEnabled) {
    const platformConfig = await prisma.platformWhatsAppConfig.findFirst({
      where: { isActive: true },
    });

    if (platformConfig) {
      return {
        config: {
          phoneNumberId: platformConfig.phoneNumberId,
          businessAccountId: platformConfig.businessAccountId,
          accessToken: decrypt(platformConfig.accessTokenEncrypted),
          webhookVerifyToken: platformConfig.webhookVerifyToken,
          isActive: true,
        },
        source: 'PLATFORM',
      };
    }
  }

  return null;
}

/**
 * Update a tenant's WhatsApp source preference.
 *
 * @param tenantId - The tenant/organization ID
 * @param source - The new source preference
 */
export async function updateTenantWhatsAppSource(
  tenantId: string,
  source: 'NONE' | 'PLATFORM' | 'CUSTOM'
): Promise<void> {
  await prisma.organization.update({
    where: { id: tenantId },
    data: { whatsAppSource: source },
  });

  logger.info({ tenantId, source }, 'WhatsApp source updated for tenant');
}

/**
 * Enable or disable platform WhatsApp access for a tenant.
 *
 * @param tenantId - The tenant/organization ID
 * @param enabled - Whether to enable or disable
 *
 * @remarks This is a super admin only operation.
 */
export async function setTenantPlatformWhatsAppAccess(
  tenantId: string,
  enabled: boolean
): Promise<void> {
  await prisma.organization.update({
    where: { id: tenantId },
    data: { whatsAppPlatformEnabled: enabled },
  });

  logger.info({ tenantId, enabled }, 'WhatsApp platform access updated for tenant');
}

/**
 * Get tenant's WhatsApp status for display.
 *
 * @param tenantId - The tenant/organization ID
 * @returns Status object with all relevant flags
 */
export async function getTenantWhatsAppStatus(tenantId: string): Promise<{
  source: 'NONE' | 'PLATFORM' | 'CUSTOM';
  platformEnabled: boolean;
  platformAvailable: boolean;
  hasCustomConfig: boolean;
  customConfigActive: boolean;
}> {
  const [org, platformConfig] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        whatsAppSource: true,
        whatsAppPlatformEnabled: true,
        whatsAppConfig: {
          select: { isActive: true },
        },
      },
    }),
    prisma.platformWhatsAppConfig.findFirst({
      where: { isActive: true },
      select: { id: true },
    }),
  ]);

  if (!org) {
    return {
      source: 'NONE',
      platformEnabled: false,
      platformAvailable: false,
      hasCustomConfig: false,
      customConfigActive: false,
    };
  }

  return {
    source: org.whatsAppSource,
    platformEnabled: org.whatsAppPlatformEnabled,
    platformAvailable: !!platformConfig,
    hasCustomConfig: !!org.whatsAppConfig,
    customConfigActive: org.whatsAppConfig?.isActive ?? false,
  };
}
