/**
 * Application-wide constants
 */

import { prisma } from './prisma';

/**
 * Exchange rate: US Dollar to Qatari Riyal
 * Default fallback rate - actual rate is stored in SystemSettings
 */
export const USD_TO_QAR_RATE = 3.64;

// Cache for exchange rate (avoid repeated DB calls)
let cachedRate: number | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get current exchange rate from database (server-side only)
 * Falls back to constant if database unavailable
 */
export async function getExchangeRate(): Promise<number> {
  // Return cached value if still fresh
  if (cachedRate !== null && Date.now() - cacheTime < CACHE_DURATION) {
    return cachedRate;
  }

  try {
    const setting = await prisma.systemSettings.findUnique({
      where: { key: 'USD_TO_QAR_RATE' },
    });

    if (setting?.value) {
      cachedRate = parseFloat(setting.value);
      cacheTime = Date.now();
      return cachedRate;
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
 */
export async function convertUsdToQarAsync(usdAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return usdAmount * rate;
}

/**
 * Convert QAR amount to USD using database rate (server-side only)
 */
export async function convertQarToUsdAsync(qarAmount: number): Promise<number> {
  const rate = await getExchangeRate();
  return qarAmount / rate;
}
