/**
 * @file use-org-settings.ts
 * @description Hook for fetching organization settings
 * @module hooks
 */

'use client';

import { useState, useEffect } from 'react';

interface OrgSettings {
  defaultCurrency: string;
  timezone: string;
  primaryColor?: string;
  fiscalYearStart?: number;
  // Add other settings as needed
}

/**
 * Hook for fetching organization settings.
 *
 * @example
 * const { settings, loading, error } = useOrgSettings();
 *
 * if (loading) return <Spinner />;
 * if (error) return <Error message={error} />;
 *
 * return <div>Currency: {settings.defaultCurrency}</div>;
 */
export function useOrgSettings() {
  const [settings, setSettings] = useState<OrgSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        const data = await response.json();
        setSettings(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  return { settings, loading, error };
}
