/**
 * @file constants.ts
 * @description Legacy constants - mostly re-exports from currency.ts
 * @module lib/core
 *
 * @deprecated Most functions in this file are deprecated. Use @/lib/core/currency instead.
 *
 * MIGRATION GUIDE:
 * - USD_TO_QAR_RATE → DEFAULT_RATES_TO_QAR.USD (from @/lib/core/currency)
 * - getExchangeRate() → getExchangeRateToQAR() (supports ALL currencies)
 * - convertUsdToQar() → convertToQARSync() (supports ALL currencies)
 * - convertQarToUsd() → No direct replacement (rarely needed)
 * - convertUsdToQarAsync() → convertToQAR() (supports ALL currencies)
 * - convertQarToUsdAsync() → No direct replacement (rarely needed)
 */

import { DEFAULT_RATES_TO_QAR, getExchangeRateToQAR, convertToQAR, convertToQARSync } from './currency';

/**
 * Exchange rate: US Dollar to Qatari Riyal
 * Default fallback rate - actual rate is stored in SystemSettings
 *
 * @deprecated Use DEFAULT_RATES_TO_QAR.USD from @/lib/core/currency instead.
 * The new module supports ALL currencies, not just USD.
 */
export const USD_TO_QAR_RATE = DEFAULT_RATES_TO_QAR.USD;

/**
 * Get current exchange rate from database (server-side only)
 * Falls back to constant if database unavailable
 *
 * @deprecated Use getExchangeRateToQAR(tenantId, currency) from @/lib/core/currency instead.
 * The new function supports ALL currencies, not just USD.
 *
 * @param tenantId - The organization/tenant ID
 */
export async function getExchangeRate(tenantId: string): Promise<number> {
  // Delegate to new multi-currency function for USD
  return getExchangeRateToQAR(tenantId, 'USD');
}

/**
 * Convert USD amount to QAR (client-side safe)
 *
 * @deprecated Use convertToQARSync(amount, currency) from @/lib/core/currency instead.
 * The new function supports ALL currencies, not just USD.
 */
export function convertUsdToQar(usdAmount: number): number {
  return convertToQARSync(usdAmount, 'USD');
}

/**
 * Convert QAR amount to USD (client-side safe)
 *
 * @deprecated This function is rarely needed. If you need to convert FROM QAR,
 * consider storing the original currency and amount separately.
 */
export function convertQarToUsd(qarAmount: number): number {
  return qarAmount / USD_TO_QAR_RATE;
}

/**
 * Convert USD amount to QAR using database rate (server-side only)
 *
 * @deprecated Use convertToQAR(amount, currency, tenantId) from @/lib/core/currency instead.
 * The new function supports ALL currencies, not just USD.
 *
 * @param usdAmount - Amount in USD
 * @param tenantId - The organization/tenant ID
 */
export async function convertUsdToQarAsync(usdAmount: number, tenantId: string): Promise<number> {
  const result = await convertToQAR(usdAmount, 'USD', tenantId);
  return result ?? usdAmount * USD_TO_QAR_RATE;
}

/**
 * Convert QAR amount to USD using database rate (server-side only)
 *
 * @deprecated This function is rarely needed. If you need to convert FROM QAR,
 * consider storing the original currency and amount separately.
 *
 * @param qarAmount - Amount in QAR
 * @param tenantId - The organization/tenant ID
 */
export async function convertQarToUsdAsync(qarAmount: number, tenantId: string): Promise<number> {
  const rate = await getExchangeRateToQAR(tenantId, 'USD');
  return qarAmount / rate;
}
