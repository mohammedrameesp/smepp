import { prisma } from '@/lib/core/prisma';

/**
 * Generate next project code in format PRJ-YYYY-NNNN
 */
export async function generateProjectCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRJ-${year}-`;

  const lastProject = await prisma.project.findFirst({
    where: {
      code: { startsWith: prefix },
    },
    orderBy: { code: 'desc' },
    select: { code: true },
  });

  let nextNumber = 1;
  if (lastProject) {
    const lastNumber = parseInt(lastProject.code.slice(-4), 10);
    nextNumber = lastNumber + 1;
  }

  return `${prefix}${nextNumber.toString().padStart(4, '0')}`;
}

/**
 * Get exchange rate for currency conversion to QAR
 */
export async function getExchangeRate(currency: string): Promise<number> {
  if (currency === 'QAR') return 1;

  const settings = await prisma.systemSettings.findFirst({
    where: { key: `exchange_rate_${currency.toUpperCase()}_QAR` },
  });

  if (settings?.value) {
    return parseFloat(settings.value);
  }

  // Default rates if not configured
  const defaultRates: Record<string, number> = {
    USD: 3.64,
    EUR: 3.97,
    GBP: 4.62,
    AED: 0.99,
  };

  return defaultRates[currency.toUpperCase()] || 1;
}

/**
 * Convert amount to QAR
 */
export async function convertToQAR(amount: number, currency: string): Promise<number> {
  const rate = await getExchangeRate(currency);
  return Math.round(amount * rate * 100) / 100;
}

