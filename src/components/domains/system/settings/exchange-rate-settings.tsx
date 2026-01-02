/**
 * @file exchange-rate-settings.tsx
 * @description Settings component for managing currency exchange rates
 * Dynamically shows exchange rates for additional currencies relative to primary currency
 * @module components/domains/system/settings
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Coins, Loader2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface CurrencyRate {
  code: string;
  name: string;
  flag: string;
  rate: string;
  lastUpdated: string | null;
}

const CURRENCY_INFO: Record<string, { name: string; flag: string }> = {
  QAR: { name: 'Qatari Riyal', flag: '🇶🇦' },
  USD: { name: 'US Dollar', flag: '🇺🇸' },
  EUR: { name: 'Euro', flag: '🇪🇺' },
  GBP: { name: 'British Pound', flag: '🇬🇧' },
  SAR: { name: 'Saudi Riyal', flag: '🇸🇦' },
  AED: { name: 'UAE Dirham', flag: '🇦🇪' },
  KWD: { name: 'Kuwaiti Dinar', flag: '🇰🇼' },
};

export function ExchangeRateSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [primaryCurrency, setPrimaryCurrency] = useState('QAR');
  const [rates, setRates] = useState<CurrencyRate[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      // Fetch organization settings
      const orgResponse = await fetch('/api/admin/organization');
      if (!orgResponse.ok) throw new Error('Failed to fetch organization');
      const orgData = await orgResponse.json();

      const currency = orgData.currency || 'QAR';
      const additionalCurrencies = orgData.additionalCurrencies || [];
      setPrimaryCurrency(currency);

      // Fetch exchange rates for each additional currency
      const ratesPromises = additionalCurrencies.map(async (code: string) => {
        try {
          const response = await fetch(`/api/settings/exchange-rate?currency=${code}`);
          const data = await response.json();
          return {
            code,
            name: CURRENCY_INFO[code]?.name || code,
            flag: CURRENCY_INFO[code]?.flag || '',
            rate: data.rate?.toString() || '',
            lastUpdated: data.lastUpdated || null,
          };
        } catch {
          return {
            code,
            name: CURRENCY_INFO[code]?.name || code,
            flag: CURRENCY_INFO[code]?.flag || '',
            rate: '',
            lastUpdated: null,
          };
        }
      });

      const fetchedRates = await Promise.all(ratesPromises);
      setRates(fetchedRates);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to load exchange rate settings');
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (code: string, value: string) => {
    setRates(rates.map(r => r.code === code ? { ...r, rate: value } : r));
  };

  const handleSave = async (code: string) => {
    const rate = rates.find(r => r.code === code);
    if (!rate) return;

    const rateNum = parseFloat(rate.rate);
    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Invalid exchange rate', { description: 'Please enter a valid positive number' });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/exchange-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: code, rate: rateNum }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rate');
      }

      const data = await response.json();
      setRates(rates.map(r => r.code === code ? {
        ...r,
        rate: data.rate.toString(),
        lastUpdated: data.lastUpdated,
      } : r));

      toast.success(`${code} exchange rate updated`, {
        description: `1 ${code} = ${data.rate} ${primaryCurrency}`,
      });
    } catch (error) {
      console.error('Error updating rate:', error);
      toast.error('Failed to update exchange rate');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency Exchange Rates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // No additional currencies configured
  if (rates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Currency Exchange Rates
          </CardTitle>
          <CardDescription>
            Configure exchange rates for currency conversions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Coins className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No additional currencies configured</p>
            <p className="text-sm mt-1">
              Add currencies in your organization setup to configure exchange rates.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-5 w-5" />
          Currency Exchange Rates
        </CardTitle>
        <CardDescription>
          Set exchange rates to convert additional currencies to {primaryCurrency}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Primary Currency Display */}
        <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3">
          <span className="text-2xl">{CURRENCY_INFO[primaryCurrency]?.flag}</span>
          <div>
            <p className="font-medium text-slate-900">{primaryCurrency}</p>
            <p className="text-sm text-slate-500">Primary currency</p>
          </div>
        </div>

        {/* Exchange Rates */}
        <div className="space-y-4">
          {rates.map((rate) => (
            <div key={rate.code} className="border rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xl">{rate.flag}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900">{rate.code}</p>
                  <p className="text-xs text-slate-500">{rate.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Label className="text-xs text-slate-600">
                    1 {rate.code} = ? {primaryCurrency}
                  </Label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={rate.rate}
                    onChange={(e) => handleRateChange(rate.code, e.target.value)}
                    placeholder="Enter rate"
                    className="mt-1"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={() => handleSave(rate.code)}
                  disabled={saving || !rate.rate}
                  className="mt-5"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {rate.lastUpdated && (
                <p className="text-xs text-slate-400 mt-2">
                  Last updated: {new Date(rate.lastUpdated).toLocaleString()}
                </p>
              )}

              {rate.rate && !isNaN(parseFloat(rate.rate)) && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-slate-500">Quick reference:</p>
                  <div className="grid grid-cols-3 gap-2 mt-1 text-xs">
                    <span>100 {rate.code} = {(100 * parseFloat(rate.rate)).toFixed(2)} {primaryCurrency}</span>
                    <span>1000 {rate.code} = {(1000 * parseFloat(rate.rate)).toFixed(2)} {primaryCurrency}</span>
                    <span>10000 {rate.code} = {(10000 * parseFloat(rate.rate)).toFixed(2)} {primaryCurrency}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchSettings}
          className="w-full"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Rates
        </Button>
      </CardContent>
    </Card>
  );
}
