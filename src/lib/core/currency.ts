/**
 * @file currency.ts
 * @description Multi-currency conversion utilities
 * @module lib/core
 *
 * QAR is always the primary/base currency.
 * Exchange rates are stored per-tenant in SystemSettings as "{CURRENCY}_TO_QAR_RATE".
 *
 * Supported currencies: USD, EUR, GBP, SAR, AED, KWD, BHD, OMR, INR, PKR, PHP,
 * BDT, NPR, LKR, EGP, JOD, CNY, JPY, AUD, CAD, CHF, SGD, MYR, THB, IDR, ZAR, TRY, RUB, BRL, MXN
 */

import { prisma } from './prisma';
import Decimal from 'decimal.js';

// FIN-003: Configure Decimal.js for financial precision
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

// ═══════════════════════════════════════════════════════════════════════════════
// DEFAULT RATES (fallback when no tenant-specific rate configured)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Default exchange rates to QAR (approximate values as fallback)
 * These are used when no tenant-specific rate is configured
 */
export const DEFAULT_RATES_TO_QAR: Record<string, number> = {
  QAR: 1,
  USD: 3.64,
  EUR: 3.96,
  GBP: 4.60,
  SAR: 0.97,
  AED: 0.99,
  KWD: 11.85,
  BHD: 9.66,
  OMR: 9.46,
  INR: 0.044,
  PKR: 0.013,
  PHP: 0.065,
  BDT: 0.033,
  NPR: 0.027,
  LKR: 0.011,
  EGP: 0.074,
  JOD: 5.14,
  CNY: 0.50,
  JPY: 0.024,
  AUD: 2.36,
  CAD: 2.68,
  CHF: 4.12,
  SGD: 2.71,
  MYR: 0.77,
  THB: 0.10,
  IDR: 0.00023,
  ZAR: 0.19,
  TRY: 0.11,
  RUB: 0.037,
  BRL: 0.60,
  MXN: 0.18,
};

// ═══════════════════════════════════════════════════════════════════════════════
// CURRENCY METADATA (for UI display)
// ═══════════════════════════════════════════════════════════════════════════════

export interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
}

/**
 * All supported currencies with display metadata.
 * QAR is first as it's the primary/base currency.
 */
export const ALL_CURRENCIES: CurrencyInfo[] = [
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'OMR', name: 'Omani Rial', flag: '🇴🇲' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'NPR', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'JOD', name: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
];

/**
 * Currency lookup map for O(1) access by code.
 */
export const CURRENCY_MAP: Record<string, CurrencyInfo> = Object.fromEntries(
  ALL_CURRENCIES.map((c) => [c.code, c])
);

/**
 * Suggested currencies for quick selection (GCC region + USD).
 */
export const SUGGESTED_CURRENCIES = ['USD', 'EUR', 'SAR', 'AED', 'KWD', 'BHD', 'OMR'];

// ═══════════════════════════════════════════════════════════════════════════════
// CACHE
// ═══════════════════════════════════════════════════════════════════════════════

// Cache: Map<tenantId_currency, { rate, timestamp }>
const rateCache = new Map<string, { rate: number; time: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function getCacheKey(tenantId: string, currency: string): string {
  return `${tenantId}_${currency}`;
}

/**
 * Multiply amount by rate with financial precision.
 * FIN-003: Uses Decimal.js, rounds to 2 decimal places.
 * @internal
 */
function multiplyPrecise(amount: number, rate: number): number {
  return new Decimal(amount)
    .times(new Decimal(rate))
    .toDecimalPlaces(2, Decimal.ROUND_HALF_UP)
    .toNumber();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CORE FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get exchange rate for a currency to QAR.
 * Looks up tenant-specific rate from SystemSettings, falls back to default.
 *
 * @param tenantId - Organization ID
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @returns Exchange rate (1 {currency} = X QAR)
 *
 * @example
 * const rate = await getExchangeRateToQAR('tenant-123', 'USD');
 * // Returns 3.64 (or tenant's configured rate)
 */
export async function getExchangeRateToQAR(
  tenantId: string,
  currency: string
): Promise<number> {
  // QAR to QAR is always 1
  if (currency === 'QAR') return 1;

  const cacheKey = getCacheKey(tenantId, currency);

  // Check cache
  const cached = rateCache.get(cacheKey);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return cached.rate;
  }

  // Look up from database
  try {
    const settingKey = `${currency}_TO_QAR_RATE`;
    const setting = await prisma.systemSettings.findUnique({
      where: {
        tenantId_key: { tenantId, key: settingKey },
      },
    });

    if (setting?.value) {
      const rate = new Decimal(setting.value).toNumber();
      if (!isNaN(rate) && rate > 0) {
        rateCache.set(cacheKey, { rate, time: Date.now() });
        return rate;
      }
    }
  } catch (error) {
    console.error(`Failed to fetch exchange rate for ${currency}:`, error);
  }

  // Fallback to default
  const defaultRate = DEFAULT_RATES_TO_QAR[currency];
  if (defaultRate === undefined) {
    console.warn(
      `[Currency] No exchange rate configured for ${currency} (tenant: ${tenantId}). ` +
      `Using rate of 1. Configure ${currency}_TO_QAR_RATE in SystemSettings.`
    );
    return 1;
  }
  return defaultRate;
}

/**
 * Convert an amount from any currency to QAR.
 * Uses tenant-specific exchange rate if configured.
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @param tenantId - Organization ID
 * @returns Amount in QAR
 *
 * @example
 * const qarAmount = await convertToQAR(100, 'USD', 'tenant-123');
 * // Returns 364 (100 * 3.64)
 */
export async function convertToQAR(
  amount: number | null | undefined,
  fromCurrency: string,
  tenantId: string
): Promise<number | null> {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return null;
  }

  if (fromCurrency === 'QAR') {
    return amount;
  }

  const rate = await getExchangeRateToQAR(tenantId, fromCurrency);
  return multiplyPrecise(amount, rate);
}

/**
 * Calculate priceQAR for asset creation/update.
 * Handles the common pattern of converting price to QAR if not explicitly provided.
 *
 * @param price - Price in original currency
 * @param priceCurrency - Currency of the price (default: 'QAR')
 * @param tenantId - Organization ID
 * @param explicitPriceQAR - If provided, use this instead of calculating
 * @returns Price in QAR
 *
 * @example
 * // Price in USD, no explicit QAR - will convert
 * const qar = await calculatePriceInQAR(100, 'USD', 'tenant-123');
 *
 * // Explicit QAR provided - use as-is
 * const qar = await calculatePriceInQAR(100, 'USD', 'tenant-123', 400);
 */
export async function calculatePriceInQAR(
  price: number | null | undefined,
  priceCurrency: string | null | undefined,
  tenantId: string,
  explicitPriceQAR?: number | null
): Promise<number | null> {
  // If explicit QAR provided, use it
  if (explicitPriceQAR !== undefined && explicitPriceQAR !== null) {
    return explicitPriceQAR;
  }

  // No price to convert
  if (price === null || price === undefined) {
    return null;
  }

  const currency = priceCurrency || 'QAR';
  return convertToQAR(price, currency, tenantId);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC FUNCTIONS (for client-side or when tenant rate not needed)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert to QAR using default rate (no DB lookup).
 * Use this only when tenant-specific rate is not critical.
 *
 * @param amount - Amount to convert
 * @param fromCurrency - Source currency code
 * @returns Amount in QAR
 */
export function convertToQARSync(
  amount: number,
  fromCurrency: string
): number {
  if (fromCurrency === 'QAR') return amount;
  const rate = DEFAULT_RATES_TO_QAR[fromCurrency] ?? 1;
  return multiplyPrecise(amount, rate);
}

/**
 * Clear rate cache (useful for testing or after rate updates)
 */
export function clearRateCache(): void {
  rateCache.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// FORMATTING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Format a currency amount with the correct symbol/code.
 * Uses Intl.NumberFormat for proper locale-aware formatting.
 *
 * @param amount - Amount to format
 * @param currency - Currency code (e.g., 'USD', 'QAR', 'SAR')
 * @param options - Optional formatting options
 * @returns Formatted currency string (e.g., "$100.00", "QAR 100.00", "SAR 100.00")
 *
 * @example
 * formatCurrency(100, 'USD'); // "$100.00"
 * formatCurrency(100, 'QAR'); // "QAR 100.00"
 * formatCurrency(100, 'SAR'); // "SAR 100.00"
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null,
  options?: {
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    compact?: boolean;
  }
): string {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return '—';
  }

  const currencyCode = currency || 'QAR';
  const minDigits = options?.minimumFractionDigits ?? 2;
  const maxDigits = options?.maximumFractionDigits ?? 2;

  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: minDigits,
      maximumFractionDigits: maxDigits,
      notation: options?.compact ? 'compact' : 'standard',
    }).format(amount);
  } catch {
    // Fallback for unsupported currency codes
    return `${currencyCode} ${amount.toFixed(minDigits)}`;
  }
}
