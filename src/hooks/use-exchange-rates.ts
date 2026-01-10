/**
 * @file use-exchange-rates.ts
 * @description Hook for fetching exchange rates
 * @module hooks
 */

'use client';

import { useState, useEffect } from 'react';

type ExchangeRates = Record<string, number>;

/**
 * Hook for fetching exchange rates.
 *
 * @example
 * const { rates, loading, error } = useExchangeRates();
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 *
 * const usdRate = rates['USD']; // Rate to convert USD to base currency
 */
export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRates>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates');
        if (!response.ok) throw new Error('Failed to fetch exchange rates');
        const data = await response.json();
        setRates(data.rates || data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch rates');
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  return { rates, loading, error };
}
