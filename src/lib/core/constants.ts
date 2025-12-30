/**
 * Application-wide constants
 */

import { prisma } from './prisma';

/**
 * Exchange rate: US Dollar to Qatari Riyal
 * Default fallback rate - actual rate is stored in SystemSettings
 */
export const USD_TO_QAR_RATE = 3.64;

// Cache for exchange rate per tenant (avoid repeated DB calls)
const rateCache: Map<string, { rate: number; time: number }> = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current exchange rate from database (server-side only)
 * Falls back to constant if database unavailable
 * @param tenantId - The organization/tenant ID
 */
export async function getExchangeRate(tenantId: string): Promise<number> {
  // Return cached value if still fresh
  const cached = rateCache.get(tenantId);
  if (cached && Date.now() - cached.time < CACHE_DURATION) {
    return cached.rate;
  }

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: {
        tenantId_key: { tenantId, key: 'USD_TO_QAR_RATE' },
      },
    });

    if (setting?.value) {
      const rate = parseFloat(setting.value);
      rateCache.set(tenantId, { rate, time: Date.now() });
      return rate;
    }
  } catch (error) {
    console.error('Failed to fetch exchange rate from database:', error);
  }

  // Fallback to constant
  return USD_TO_QAR_RATE;
}

/**
 * Convert USD amount to QAR (client-side safe)
 */
export function convertUsdToQar(usdAmount: number): number {
  return usdAmount * USD_TO_QAR_RATE;
}

/**
 * Convert QAR amount to USD (client-side safe)
 */
export function convertQarToUsd(qarAmount: number): number {
  return qarAmount / USD_TO_QAR_RATE;
}

/**
 * Convert USD amount to QAR using database rate (server-side only)
 * @param usdAmount - Amount in USD
 * @param tenantId - The organization/tenant ID
 */
export async function convertUsdToQarAsync(usdAmount: number, tenantId: string): Promise<number> {
  const rate = await getExchangeRate(tenantId);
  return usdAmount * rate;
}

/**
 * Convert QAR amount to USD using database rate (server-side only)
 * @param qarAmount - Amount in QAR
 * @param tenantId - The organization/tenant ID
 */
export async function convertQarToUsdAsync(qarAmount: number, tenantId: string): Promise<number> {
  const rate = await getExchangeRate(tenantId);
  return qarAmount / rate;
}
