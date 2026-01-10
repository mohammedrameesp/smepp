/**
 * @file use-currency-conversion.ts
 * @description Hook for currency conversion using exchange rates
 * @module hooks
 */

'use client';

import { useMemo } from 'react';
import { useExchangeRates } from './use-exchange-rates';

/**
 * Hook for currency conversion to QAR.
 *
 * @example
 * const { convertToQAR, loading } = useCurrencyConversion();
 * const qarValue = convertToQAR(100, 'USD'); // Returns QAR equivalent
 */
export function useCurrencyConversion() {
  const { rates, loading, error } = useExchangeRates();

  const convertToQAR = useMemo(() => {
    return (amount: number | null | undefined, currency: string | null | undefined): number | null => {
      if (amount == null || !currency) return null;
      if (currency === 'QAR') return amount;

      const rate = rates[currency];
      if (!rate) return null;

      return amount * rate;
    };
  }, [rates]);

  return { convertToQAR, rates, loading, error };
}
