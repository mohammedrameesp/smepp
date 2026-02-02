/**
 * @file code-prefix.ts
 * @description Multi-tenant reference code generation utilities.
 * @module lib/utils
 *
 * @remarks
 * Supports customizable format patterns for generating unique reference codes:
 * - Employee IDs (e.g., ORG-2024-001)
 * - Asset tags (e.g., ORG-LAP-2412-001)
 * - Purchase/spend requests (e.g., ORG-SR-2412-001)
 * - Loan references, payslips, etc.
 *
 * Each organization can customize their code formats via settings.
 *
 * ## Format Tokens
 * - `{PREFIX}` - Organization code prefix (e.g., ORG)
 * - `{YYYY}` - 4-digit year (e.g., 2024)
 * - `{YY}` - 2-digit year (e.g., 24)
 * - `{MM}` - 2-digit month (e.g., 12)
 * - `{YYMM}` - Year + Month (e.g., 2412)
 * - `{YYYYMM}` - Full year + Month (e.g., 202412)
 * - `{DD}` - 2-digit day (e.g., 28)
 * - `{SEQ:n}` - Sequential number padded to n digits (e.g., {SEQ:3} -> 001)
 * - `{TYPE}` - Entity subtype (e.g., LAP for Laptop, used in assets)
 *
 * @example
 * ```ts
 * import { generateFormattedCode, getOrganizationCodePrefix } from '@/lib/utils/code-prefix';
 *
 * // Get organization's prefix
 * const prefix = await getOrganizationCodePrefix(tenantId);
 *
 * // Generate an employee code
 * const empCode = await generateFormattedCode({
 *   tenantId,
 *   entityType: 'employees',
 *   sequenceNumber: 42,
 * });
 * ```
 */

import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/** Supported entity types for code generation */
export type EntityType =
  | 'employees'
  | 'assets'
  | 'loans'
  | 'spend-requests'
  | 'asset-requests'
  | 'leave-requests'
  | 'payroll-runs'
  | 'payslips'
  | 'suppliers'
  | 'subscriptions';

/** Configuration for code formats per entity type */
export interface CodeFormatConfig {
  employees?: string;
  assets?: string;
  loans?: string;
  'spend-requests'?: string;
  'asset-requests'?: string;
  'leave-requests'?: string;
  'payroll-runs'?: string;
  payslips?: string;
  suppliers?: string;
  subscriptions?: string;
}

/** Default format patterns for each entity type */
export const DEFAULT_FORMATS: Required<CodeFormatConfig> = {
  employees: '{PREFIX}-{YYYY}-{SEQ:3}',
  assets: '{PREFIX}-{TYPE}-{YYMM}-{SEQ:3}',
  loans: '{PREFIX}-LOAN-{SEQ:5}',
  'spend-requests': '{PREFIX}-SR-{YYMM}-{SEQ:3}',
  'asset-requests': '{PREFIX}-AR-{YYMM}-{SEQ:3}',
  'leave-requests': '{PREFIX}-LR-{YYMM}-{SEQ:3}',
  'payroll-runs': '{PREFIX}-PAY-{YYYYMM}-{SEQ:2}',
  payslips: '{PREFIX}-PS-{YYYYMM}-{SEQ:5}',
  suppliers: '{PREFIX}-SUP-{SEQ:4}',
  subscriptions: '{PREFIX}-SUB-{YYMM}-{SEQ:3}',
};

/** Human-readable labels for entity types (used in settings UI) */
export const ENTITY_LABELS: Record<EntityType, string> = {
  employees: 'Employee ID',
  assets: 'Asset Tag',
  loans: 'Loan Reference',
  'spend-requests': 'Spend Request',
  'asset-requests': 'Asset Request',
  'leave-requests': 'Leave Request',
  'payroll-runs': 'Payroll Run',
  payslips: 'Payslip Number',
  suppliers: 'Supplier Code',
  subscriptions: 'Subscription Tag',
};

/** Map entity types to required module IDs for filtering settings by enabled modules */
export const ENTITY_TO_MODULE: Record<EntityType, string> = {
  employees: 'employees',
  assets: 'assets',
  suppliers: 'suppliers',
  'leave-requests': 'leave',
  'spend-requests': 'spend-requests',
  'asset-requests': 'assets',
  loans: 'payroll',
  'payroll-runs': 'payroll',
  payslips: 'payroll',
  subscriptions: 'subscriptions',
};

/** Example values for preview generation */
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

/** In-memory cache for organization code data */
const orgCache = new Map<string, CachedOrgData>();

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

// ═══════════════════════════════════════════════════════════════════════════════
// PREFIX GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate a 3-letter code prefix from an organization name.
 *
 * Rules:
 * 1. If 3+ words, use first letter of first 3 words
 * 2. If 2 words, use first 2 letters of first word + first letter of second word
 * 3. If 1 word, use first 3 letters
 *
 * @param orgName - Organization name to generate prefix from
 * @returns 3-character uppercase prefix
 *
 * @example
 * ```ts
 * generateCodePrefixFromName('Acme Corporation Inc');  // 'ACI'
 * generateCodePrefixFromName('BeCreative Studio');     // 'BES'
 * generateCodePrefixFromName('Jasira');                // 'JAS'
 * generateCodePrefixFromName('');                      // 'ORG' (fallback)
 * ```
 */
export function generateCodePrefixFromName(orgName: string): string {
  // Remove special characters, keep only alphanumeric and spaces
  const cleanName = orgName.trim().replace(/[^a-zA-Z0-9\s]/g, '');
  const words = cleanName.split(/\s+/).filter((w) => w.length > 0);

  let prefix: string;

  if (words.length >= 3) {
    // Use first letter of first 3 words
    prefix = words
      .slice(0, 3)
      .map((w) => w[0])
      .join('');
  } else if (words.length === 2) {
    // Use first 2 letters of first word + first letter of second word
    prefix = words[0].substring(0, 2) + words[1][0];
  } else if (words.length === 1) {
    // Use first 3 letters of single word
    prefix = words[0].substring(0, 3);
  } else {
    // Fallback for empty names
    prefix = 'ORG';
  }

  // Ensure uppercase and pad to 3 chars if needed
  return prefix.toUpperCase().padEnd(3, 'X');
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORGANIZATION DATA FETCHING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get organization code data (prefix + formats) with caching.
 *
 * @internal
 * @param tenantId - Organization ID
 * @returns Cached organization code data
 * @throws Error if organization not found
 */
async function getOrgCodeData(tenantId: string): Promise<CachedOrgData> {
  // Check cache first
  const cached = orgCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached;
  }

  // Fetch from database
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { codePrefix: true, codeFormats: true, name: true },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  let prefix = org.codePrefix;

  // If prefix is default "ORG" or empty, generate unique prefix from name
  if (!prefix || prefix === 'ORG') {
    prefix = await ensureUniquePrefixFromName(org.name, tenantId);
    // Persist the generated prefix
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
 * Get the code prefix for an organization.
 *
 * @param tenantId - Organization ID
 * @returns The organization's code prefix (e.g., 'ACM')
 *
 * @example
 * ```ts
 * const prefix = await getOrganizationCodePrefix(tenantId);
 * // Returns 'ACM' for Acme Corporation
 * ```
 */
export async function getOrganizationCodePrefix(tenantId: string): Promise<string> {
  const data = await getOrgCodeData(tenantId);
  return data.prefix;
}

/**
 * Get the format pattern for a specific entity type.
 *
 * @param tenantId - Organization ID
 * @param entityType - The entity type to get format for
 * @returns Format pattern string (e.g., '{PREFIX}-{YYYY}-{SEQ:3}')
 *
 * @example
 * ```ts
 * const format = await getEntityFormat(tenantId, 'employees');
 * // Returns '{PREFIX}-{YYYY}-{SEQ:3}' (or custom format if configured)
 * ```
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

/** Options for generating a formatted code */
interface GenerateCodeOptions {
  /** Organization ID */
  tenantId: string;
  /** Type of entity (determines format pattern) */
  entityType: EntityType;
  /** Sequence number for the code */
  sequenceNumber: number;
  /** Subtype for assets (e.g., 'LAP' for Laptop) */
  subType?: string;
  /** Date for year/month tokens (defaults to current date) */
  date?: Date;
}

/**
 * Generate a formatted code based on the organization's format pattern.
 *
 * @param options - Code generation options
 * @returns Generated code string
 *
 * @example
 * ```ts
 * const code = await generateFormattedCode({
 *   tenantId: 'org_123',
 *   entityType: 'employees',
 *   sequenceNumber: 42,
 * });
 * // Returns 'ACM-2024-042' (based on org prefix and format)
 *
 * const assetCode = await generateFormattedCode({
 *   tenantId: 'org_123',
 *   entityType: 'assets',
 *   sequenceNumber: 5,
 *   subType: 'LAP',
 * });
 * // Returns 'ACM-LAP-2401-005'
 * ```
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

/** Context for format token replacement */
interface FormatContext {
  prefix: string;
  sequenceNumber: number;
  subType?: string;
  date: Date;
}

/**
 * Apply format tokens to generate the final code.
 *
 * @param format - Format pattern string
 * @param context - Values for token replacement
 * @returns Generated code string
 *
 * @example
 * ```ts
 * applyFormat('{PREFIX}-{YYYY}-{SEQ:3}', {
 *   prefix: 'ACM',
 *   sequenceNumber: 42,
 *   date: new Date('2024-01-15'),
 * });
 * // Returns 'ACM-2024-042'
 * ```
 */
export function applyFormat(format: string, context: FormatContext): string {
  const { prefix, sequenceNumber, subType, date } = context;

  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let result = format;

  // Replace static tokens (case-insensitive)
  result = result.replace(/\{PREFIX\}/gi, prefix);
  result = result.replace(/\{YYYY\}/gi, year.toString());
  result = result.replace(/\{YY\}/gi, year.toString().slice(-2));
  result = result.replace(/\{MM\}/gi, month.toString().padStart(2, '0'));
  result = result.replace(/\{DD\}/gi, day.toString().padStart(2, '0'));
  result = result.replace(/\{YYMM\}/gi, year.toString().slice(-2) + month.toString().padStart(2, '0'));
  result = result.replace(/\{YYYYMM\}/gi, year.toString() + month.toString().padStart(2, '0'));
  result = result.replace(/\{TYPE\}/gi, subType || 'GEN');

  // Replace sequence with padding: {SEQ:3} -> 042
  result = result.replace(/\{SEQ:(\d+)\}/gi, (_, digits) => {
    return sequenceNumber.toString().padStart(parseInt(digits, 10), '0');
  });

  // Simple {SEQ} without padding specification defaults to 3 digits
  result = result.replace(/\{SEQ\}/gi, sequenceNumber.toString().padStart(3, '0'));

  return result;
}

/**
 * Generate a preview of what a code will look like with sample values.
 *
 * @param format - Format pattern to preview
 * @param prefix - Organization prefix (defaults to 'ORG')
 * @returns Preview string with sample values
 *
 * @example
 * ```ts
 * generateFormatPreview('{PREFIX}-{YYYY}-{SEQ:3}');
 * // Returns 'ORG-2024-001'
 * ```
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
 * Ensure a code prefix is unique across all organizations.
 * If the generated prefix already exists, appends a number or random character.
 *
 * @param orgName - Organization name to generate prefix from
 * @param excludeOrgId - Organization ID to exclude from uniqueness check (for updates)
 * @returns Unique prefix string
 *
 * @example
 * ```ts
 * // If 'ACM' is taken, might return 'AC1', 'AC2', etc.
 * const prefix = await ensureUniquePrefixFromName('Acme Corp', currentOrgId);
 * ```
 */
export async function ensureUniquePrefixFromName(
  orgName: string,
  excludeOrgId?: string
): Promise<string> {
  const basePrefix = generateCodePrefixFromName(orgName);
  let prefix = basePrefix;
  let attempt = 0;
  const maxAttempts = 100;

  while (attempt < maxAttempts) {
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
    if (attempt >= 10) {
      // After 10 attempts, use random character
      const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
      prefix = basePrefix.substring(0, 2) + randomChar;
    } else {
      // First 10 attempts, use sequential number
      prefix = basePrefix.substring(0, 2) + attempt.toString();
    }
  }

  // Fallback: use first 2 chars + random letter (extremely rare)
  const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return basePrefix.substring(0, 2) + randomChar;
}

/**
 * Check if a code prefix is available for use.
 *
 * @param prefix - Prefix to check
 * @param excludeOrgId - Organization ID to exclude (for updates)
 * @returns True if the prefix is available and valid
 *
 * @example
 * ```ts
 * const available = await isCodePrefixAvailable('ACM', currentOrgId);
 * if (!available) {
 *   // Show error: prefix already in use
 * }
 * ```
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

/** Validation result with error message */
interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validate a code prefix format.
 *
 * @param prefix - Prefix string to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```ts
 * validateCodePrefix('ACM');    // { valid: true }
 * validateCodePrefix('AC');     // { valid: true }
 * validateCodePrefix('A');      // { valid: false, error: '...' }
 * validateCodePrefix('acm');    // { valid: false, error: '...' }
 * ```
 */
export function validateCodePrefix(prefix: string): ValidationResult {
  if (!prefix) {
    return { valid: false, error: 'Code prefix is required' };
  }

  if (prefix.length < 2 || prefix.length > 3) {
    return { valid: false, error: 'Code prefix must be 2-3 characters' };
  }

  if (!/^[A-Z0-9]{2,3}$/.test(prefix)) {
    return {
      valid: false,
      error: 'Code prefix must contain only uppercase letters and numbers',
    };
  }

  return { valid: true };
}

/** Valid format tokens for pattern validation */
const VALID_FORMAT_TOKENS = new Set([
  'PREFIX',
  'YYYY',
  'YY',
  'MM',
  'DD',
  'YYMM',
  'YYYYMM',
  'TYPE',
]);

/**
 * Validate a format pattern.
 *
 * @param pattern - Format pattern to validate
 * @returns Validation result with error message if invalid
 *
 * @example
 * ```ts
 * validateFormatPattern('{PREFIX}-{YYYY}-{SEQ:3}');  // { valid: true }
 * validateFormatPattern('{PREFIX}-{INVALID}');       // { valid: false, error: '...' }
 * validateFormatPattern('{PREFIX}-{YYYY}');          // { valid: false, error: 'must include {SEQ}...' }
 * ```
 */
export function validateFormatPattern(pattern: string): ValidationResult {
  if (!pattern || pattern.trim().length === 0) {
    return { valid: false, error: 'Format pattern is required' };
  }

  // Must contain at least {SEQ} or {SEQ:n} for sequential numbering
  if (!/\{SEQ(:\d+)?\}/i.test(pattern)) {
    return { valid: false, error: 'Format must include {SEQ} or {SEQ:n} for sequential numbering' };
  }

  // Extract all tokens from the pattern
  const tokens = pattern.match(/\{([^}]+)\}/g) || [];

  for (const token of tokens) {
    // Remove braces to get token name
    const tokenName = token.slice(1, -1).toUpperCase();

    // Skip SEQ tokens (they have special format)
    if (tokenName === 'SEQ' || tokenName.startsWith('SEQ:')) {
      // Validate SEQ:n format
      if (tokenName.startsWith('SEQ:')) {
        const digits = tokenName.split(':')[1];
        if (!/^\d+$/.test(digits) || parseInt(digits, 10) < 1 || parseInt(digits, 10) > 10) {
          return { valid: false, error: `Invalid sequence padding in ${token}. Use {SEQ:1} to {SEQ:10}` };
        }
      }
      continue;
    }

    // Check if token is valid
    if (!VALID_FORMAT_TOKENS.has(tokenName)) {
      return { valid: false, error: `Invalid token: ${token}` };
    }
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Clear the cache for a specific tenant or all tenants.
 * Call this after updating organization code settings.
 *
 * @param tenantId - Organization ID to clear, or undefined to clear all
 *
 * @example
 * ```ts
 * // Clear cache for specific org after settings update
 * clearPrefixCache(tenantId);
 *
 * // Clear all cache (e.g., during deployment)
 * clearPrefixCache();
 * ```
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

/** Token information for documentation and UI help text */
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
] as const;

