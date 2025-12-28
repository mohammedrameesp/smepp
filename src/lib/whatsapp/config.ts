/**
 * WhatsApp Configuration Utilities
 *
 * Handles encryption/decryption of access tokens and
 * configuration management for per-tenant WhatsApp setup.
 */

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { prisma } from '@/lib/core/prisma';
import type { WhatsAppConfigData, WhatsAppConfigInput } from './types';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get the encryption key from environment
 * Falls back to a derived key from NEXTAUTH_SECRET if not set
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
 * Encrypt a string value
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
 * Decrypt an encrypted string
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
 * Generate a random webhook verify token
 */
export function generateWebhookVerifyToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Get WhatsApp configuration for a tenant
 * Returns null if not configured or inactive
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
 * Save or update WhatsApp configuration for a tenant
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
 * Disable WhatsApp for a tenant
 */
export async function disableWhatsApp(tenantId: string): Promise<void> {
  await prisma.whatsAppConfig.update({
    where: { tenantId },
    data: { isActive: false },
  });
}

/**
 * Get a user's WhatsApp phone number
 */
export async function getUserWhatsAppPhone(
  userId: string
): Promise<string | null> {
  const phone = await prisma.whatsAppUserPhone.findUnique({
    where: { userId },
    select: { phoneNumber: true, isVerified: true },
  });

  if (!phone || !phone.isVerified) {
    return null;
  }

  return phone.phoneNumber;
}

/**
 * Save or update a user's WhatsApp phone number
 */
export async function saveUserWhatsAppPhone(
  tenantId: string,
  userId: string,
  phoneNumber: string
): Promise<void> {
  // Normalize phone number to E.164 format
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  await prisma.whatsAppUserPhone.upsert({
    where: { userId },
    update: {
      phoneNumber: normalizedPhone,
      isVerified: false, // Reset verification on number change
      updatedAt: new Date(),
    },
    create: {
      tenantId,
      userId,
      phoneNumber: normalizedPhone,
      isVerified: false,
    },
  });
}

/**
 * Mark a user's WhatsApp phone as verified
 */
export async function verifyUserWhatsAppPhone(userId: string): Promise<void> {
  await prisma.whatsAppUserPhone.update({
    where: { userId },
    data: { isVerified: true },
  });
}

/**
 * Normalize a phone number to E.164 format
 * Assumes Qatar (+974) if no country code provided
 */
function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

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
    return '+974' + cleaned;
  }

  // Otherwise add + prefix
  return '+' + cleaned;
}
