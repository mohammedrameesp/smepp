import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { DEFAULT_RATES_TO_QAR, ALL_CURRENCIES } from '@/lib/core/currency';
import { withErrorHandler } from '@/lib/http/handler';

/**
 * GET /api/exchange-rates
 * Returns all exchange rates to QAR for the current tenant.
 * Uses tenant-specific rates from SystemSettings, falls back to defaults.
 */
export const GET = withErrorHandler(async (_request, { tenant }) => {
  const tenantId = tenant!.tenantId;

  // Get all tenant-specific exchange rate settings
  const settings = await prisma.systemSettings.findMany({
    where: {
      tenantId,
      key: { endsWith: '_TO_QAR_RATE' },
    },
    select: { key: true, value: true },
  });

  // Build rates map: start with defaults, override with tenant-specific
  const rates: Record<string, number> = { ...DEFAULT_RATES_TO_QAR };

  for (const setting of settings) {
    // Extract currency code from key (e.g., "USD_TO_QAR_RATE" -> "USD")
    const currency = setting.key.replace('_TO_QAR_RATE', '');
    const rate = parseFloat(setting.value);
    if (!isNaN(rate) && rate > 0) {
      rates[currency] = rate;
    }
  }

  return NextResponse.json({
    rates,
    currencies: ALL_CURRENCIES,
  });
}, { requireAuth: true });
