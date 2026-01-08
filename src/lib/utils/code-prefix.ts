/**
 * @file code-prefix.ts
 * @description Multi-tenant reference code generation utilities - supports customizable
 *              format patterns for employee IDs, asset tags, purchase requests, and loans
 * @module lib/utils
 *
 * Format tokens:
 * - {PREFIX} - Organization code prefix (e.g., ORG)
 * - {YYYY} - 4-digit year (e.g., 2024)
 * - {YY} - 2-digit year (e.g., 24)
 * - {MM} - 2-digit month (e.g., 12)
 * - {YYMM} - Year + Month (e.g., 2412)
 * - {YYYYMM} - Full year + Month (e.g., 202412)
 * - {DD} - 2-digit day (e.g., 28)
 * - {SEQ:n} - Sequential number padded to n digits (e.g., {SEQ:3} -> 001)
 * - {TYPE} - Entity subtype (e.g., LAP for Laptop, used in assets)
 * - Any static text (e.g., PR, LOAN, EMP)
 */

import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type EntityType =
  | 'employees'
  | 'assets'
  | 'loans'
  | 'purchase-requests'
  | 'asset-requests'
  | 'leave-requests'
  | 'payroll-runs'
  | 'suppliers'
  | 'subscriptions';

export interface CodeFormatConfig {
  employees?: string;
  assets?: string;
  loans?: string;
  'purchase-requests'?: string;
  'asset-requests'?: string;
  'leave-requests'?: string;
  'payroll-runs'?: string;
  suppliers?: string;
  subscriptions?: string;
}

// Default format patterns for each entity type
export const DEFAULT_FORMATS: Required<CodeFormatConfig> = {
  employees: '{PREFIX}-{YYYY}-{SEQ:3}',
  assets: '{PREFIX}-{TYPE}-{YYMM}-{SEQ:3}',
  loans: '{PREFIX}-LOAN-{SEQ:5}',
  'purchase-requests': '{PREFIX}-PR-{YYMM}-{SEQ:3}',
  'asset-requests': '{PREFIX}-AR-{YYMM}-{SEQ:3}',
  'leave-requests': '{PREFIX}-LR-{YYMM}-{SEQ:3}',
  'payroll-runs': '{PREFIX}-PAY-{YYYYMM}-{SEQ:2}',
  suppliers: '{PREFIX}-SUP-{SEQ:4}',
  subscriptions: '{PREFIX}-SUB-{YYMM}-{SEQ:3}',
};

// Human-readable labels for entity types
export const ENTITY_LABELS: Record<EntityType, string> = {
  employees: 'Employee ID',
  assets: 'Asset Tag',
  loans: 'Loan Reference',
  'purchase-requests': 'Purchase Request',
  'asset-requests': 'Asset Request',
  'leave-requests': 'Leave Request',
  'payroll-runs': 'Payroll Run',
  suppliers: 'Supplier Code',
  subscriptions: 'Subscription Tag',
};

// Map entity types to required module IDs for filtering
export const ENTITY_TO_MODULE: Record<EntityType, string> = {
  employees: 'employees',
  assets: 'assets',
  suppliers: 'suppliers',
  'leave-requests': 'leave',
  'purchase-requests': 'purchase-requests',
  'asset-requests': 'assets',
  loans: 'payroll',
  'payroll-runs': 'payroll',
  subscriptions: 'subscriptions',
};

// Example values for preview
export const EXAMPLE_VALUES: Record<string, string> = {
  PREFIX: 'ORG',
  TYPE: 'LAP',
  YYYY: '2024',
  YY: '24',
  MM: '12',
  DD: '28',
  YYMM: '2412',
  YYYYMM: '202412',
  'SEQ:2': '01',
  'SEQ:3': '001',
  'SEQ:4': '0001',
  'SEQ:5': '00001',
};

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

interface CachedOrgData {
  prefix: string;
  formats: CodeFormatConfig;
  timestamp: number;
}

const orgCache = new Map<string, CachedOrgData>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// ═══════════════════════════════════════════════════════════════════════════════
// PREFIX GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a 3-letter code prefix from an organization name
 *
 * Rules:
 * 1. If 3+ words, use first letter of first 3 words
 * 2. If 2 words, use first 2 letters of first word + first letter of second word
 * 3. If 1 word, use first 3 letters
 *
 * Examples:
 * "Acme Corporation Inc" -> "ACI"
 * "BeCreative Studio" -> "BES"
 * "Jasira" -> "JAS"
 */
export function generateCodePrefixFromName(orgName: string): string {
  const cleanName = orgName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

  let prefix: string;

  if (words.length >= 3) {
    prefix = words
      .slice(0, 3)
      .map((w) => w[0])
      .join('');
  } else if (words.length === 2) {
    prefix = words[0].substring(0, 2) + words[1][0];
  } else if (words.length === 1) {
    prefix = words[0].substring(0, 3);
  } else {
    prefix = 'ORG';
  }

  return prefix.toUpperCase().padEnd(3, 'X');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORGANIZATION DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get organization code data (prefix + formats) with caching
 */
async function getOrgCodeData(tenantId: string): Promise<CachedOrgData> {
  const cached = orgCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached;
  }

  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { codePrefix: true, codeFormats: true, name: true },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  let prefix = org.codePrefix;

  // If prefix is default "ORG", generate from name
  if (!prefix || prefix === 'ORG') {
    prefix = await ensureUniquePrefixFromName(org.name, tenantId);
    await prisma.organization.update({
      where: { id: tenantId },
      data: { codePrefix: prefix },
    });
  }

  const formats = (org.codeFormats as CodeFormatConfig) || {};

  const data: CachedOrgData = {
    prefix,
    formats,
    timestamp: Date.now(),
  };

  orgCache.set(tenantId, data);
  return data;
}

/**
 * Get the code prefix for an organization
 */
export async function getOrganizationCodePrefix(tenantId: string): Promise<string> {
  const data = await getOrgCodeData(tenantId);
  return data.prefix;
}

/**
 * Get the format pattern for a specific entity type
 */
export async function getEntityFormat(
  tenantId: string,
  entityType: EntityType
): Promise<string> {
  const data = await getOrgCodeData(tenantId);
  return data.formats[entityType] || DEFAULT_FORMATS[entityType];
}

// ═══════════════════════════════════════════════════════════════════════════════
// CODE GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

interface GenerateCodeOptions {
  tenantId: string;
  entityType: EntityType;
  sequenceNumber: number;
  subType?: string; // For assets (e.g., "LAP" for Laptop)
  date?: Date; // Defaults to current date
}

/**
 * Generate a formatted code based on the organization's format pattern
 */
export async function generateFormattedCode(options: GenerateCodeOptions): Promise<string> {
  const { tenantId, entityType, sequenceNumber, subType, date = new Date() } = options;

  const data = await getOrgCodeData(tenantId);
  const format = data.formats[entityType] || DEFAULT_FORMATS[entityType];

  return applyFormat(format, {
    prefix: data.prefix,
    sequenceNumber,
    subType,
    date,
  });
}

interface FormatContext {
  prefix: string;
  sequenceNumber: number;
  subType?: string;
  date: Date;
}

/**
 * Apply format tokens to generate the final code
 */
export function applyFormat(format: string, context: FormatContext): string {
  const { prefix, sequenceNumber, subType, date } = context;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let result = format;

  // Replace tokens
  result = result.replace(/\{PREFIX\}/gi, prefix);
  result = result.replace(/\{YYYY\}/gi, year.toString());
  result = result.replace(/\{YY\}/gi, year.toString().slice(-2));
  result = result.replace(/\{MM\}/gi, month.toString().padStart(2, '0'));
  result = result.replace(/\{DD\}/gi, day.toString().padStart(2, '0'));
  result = result.replace(/\{YYMM\}/gi, year.toString().slice(-2) + month.toString().padStart(2, '0'));
  result = result.replace(/\{YYYYMM\}/gi, year.toString() + month.toString().padStart(2, '0'));
  result = result.replace(/\{TYPE\}/gi, subType || 'GEN');

  // Replace sequence with padding: {SEQ:3} -> 001
  result = result.replace(/\{SEQ:(\d+)\}/gi, (_, digits) => {
    return sequenceNumber.toString().padStart(parseInt(digits), '0');
  });

  // Simple {SEQ} without padding specification defaults to 3 digits
  result = result.replace(/\{SEQ\}/gi, sequenceNumber.toString().padStart(3, '0'));

  return result;
}

/**
 * Generate a preview of what a code will look like
 */
export function generateFormatPreview(format: string, prefix: string = 'ORG'): string {
  return applyFormat(format, {
    prefix,
    sequenceNumber: 1,
    subType: 'LAP',
    date: new Date(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// UNIQUENESS VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Ensure a code prefix is unique across all organizations
 */
export async function ensureUniquePrefixFromName(
  orgName: string,
  excludeOrgId?: string
): Promise<string> {
  const basePrefix = generateCodePrefixFromName(orgName);
  let prefix = basePrefix;
  let attempt = 0;

  while (true) {
    const existing = await prisma.organization.findFirst({
      where: {
        codePrefix: prefix,
        ...(excludeOrgId ? { NOT: { id: excludeOrgId } } : {}),
      },
    });

    if (!existing) {
      return prefix;
    }

    attempt++;
    if (attempt > 99) {
      prefix =
        basePrefix.substring(0, 2) +
        Math.random().toString(36).substring(2, 3).toUpperCase();
    } else {
      prefix = basePrefix.substring(0, 2) + attempt.toString().slice(-1);
    }
  }
}

/**
 * Check if a code prefix is available
 */
export async function isCodePrefixAvailable(
  prefix: string,
  excludeOrgId?: string
): Promise<boolean> {
  const validation = validateCodePrefix(prefix);
  if (!validation.valid) {
    return false;
  }

  const existing = await prisma.organization.findFirst({
    where: {
      codePrefix: prefix,
      ...(excludeOrgId ? { NOT: { id: excludeOrgId } } : {}),
    },
  });

  return !existing;
}

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate a code prefix format
 */
export function validateCodePrefix(prefix: string): {
  valid: boolean;
  error?: string;
} {
  if (!prefix) {
    return { valid: false, error: 'Code prefix is required' };
  }

  if (prefix.length !== 3) {
    return { valid: false, error: 'Code prefix must be exactly 3 characters' };
  }

  if (!/^[A-Z0-9]{3}$/.test(prefix)) {
    return {
      valid: false,
      error: 'Code prefix must contain only uppercase letters and numbers',
    };
  }

  return { valid: true };
}

/**
 * Validate a format pattern
 */
export function validateFormatPattern(pattern: string): {
  valid: boolean;
  error?: string;
} {
  if (!pattern || pattern.trim().length === 0) {
    return { valid: false, error: 'Format pattern is required' };
  }

  // Must contain at least {SEQ} or {SEQ:n}
  if (!/\{SEQ(:\d+)?\}/i.test(pattern)) {
    return { valid: false, error: 'Format must include {SEQ} or {SEQ:n} for sequential numbering' };
  }

  // Check for invalid tokens
  const validTokens = /\{(PREFIX|YYYY|YY|MM|DD|YYMM|YYYYMM|TYPE|SEQ(:\d+)?)\}/gi;
  const tokens = pattern.match(/\{[^}]+\}/g) || [];

  for (const token of tokens) {
    if (!validTokens.test(token)) {
      validTokens.lastIndex = 0; // Reset regex state
      if (!validTokens.test(token)) {
        return { valid: false, error: `Invalid token: ${token}` };
      }
    }
    validTokens.lastIndex = 0; // Reset for next iteration
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clear the cache for a specific tenant or all tenants
 */
export function clearPrefixCache(tenantId?: string): void {
  if (tenantId) {
    orgCache.delete(tenantId);
  } else {
    orgCache.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMAT TOKEN INFO
// ═══════════════════════════════════════════════════════════════════════════════

export const FORMAT_TOKENS = [
  { token: '{PREFIX}', description: 'Organization code prefix', example: 'ORG' },
  { token: '{YYYY}', description: '4-digit year', example: '2024' },
  { token: '{YY}', description: '2-digit year', example: '24' },
  { token: '{MM}', description: '2-digit month', example: '12' },
  { token: '{DD}', description: '2-digit day', example: '28' },
  { token: '{YYMM}', description: 'Year + Month', example: '2412' },
  { token: '{YYYYMM}', description: 'Full year + Month', example: '202412' },
  { token: '{TYPE}', description: 'Entity subtype (for assets)', example: 'LAP' },
  { token: '{SEQ:3}', description: 'Sequence padded to 3 digits', example: '001' },
  { token: '{SEQ:4}', description: 'Sequence padded to 4 digits', example: '0001' },
  { token: '{SEQ:5}', description: 'Sequence padded to 5 digits', example: '00001' },
];
