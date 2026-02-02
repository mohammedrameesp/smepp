/**
 * @file route.ts
 * @description Exchange rates API endpoint for currency conversion
 * @module api/exchange-rates
 *
 * Provides exchange rates to QAR (Qatari Riyal) for the current tenant.
 * Supports tenant-specific rate overrides stored in SystemSettings.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { DEFAULT_RATES_TO_QAR, ALL_CURRENCIES } from '@/lib/core/currency';
import { withErrorHandler } from '@/lib/http/handler';

/**
 * GET /api/exchange-rates
 *
 * Returns all exchange rates to QAR for the current tenant.
 * Uses tenant-specific rates from SystemSettings, falls back to defaults.
 *
 * @returns {Object} rates - Map of currency codes to QAR exchange rates
 * @returns {string[]} currencies - List of all supported currency codes
 */
export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  // Fetch tenant-specific exchange rate overrides from SystemSettings
  const settings = await prisma.systemSettings.findMany({
    where: {
      tenantId,
      key: { endsWith: '_TO_QAR_RATE' },
    },
    select: { key: true, value: true },
  });

  // Build rates map: start with defaults, override with tenant-specific values
  const rates: Record<string, number> = { ...DEFAULT_RATES_TO_QAR };

  for (const setting of settings) {
    // Extract currency code from key (e.g., "USD_TO_QAR_RATE" -> "USD")
    const currency = setting.key.replace('_TO_QAR_RATE', '');
    const rate = parseFloat(setting.value);

    // Only apply valid positive rates
    if (!isNaN(rate) && rate > 0) {
      rates[currency] = rate;
    }
  }

  return NextResponse.json({
    rates,
    currencies: ALL_CURRENCIES,
  });
}, { requireAuth: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes:
 *   - Added JSDoc module documentation at top
 *   - Added return type documentation to GET handler
 *   - Added inline comment for rate validation logic
 * Issues: None
 */
