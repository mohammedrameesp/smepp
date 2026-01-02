'use client';

/**
 * @file CurrencyStep.tsx
 * @description Step 2 - Currency selection (QAR fixed as primary + tag-based additional)
 * @module setup/steps
 */

import { useState, useMemo } from 'react';
import { Coins, X, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface CurrencyStepProps {
  primaryCurrency: string;
  additionalCurrencies: string[];
  onPrimaryChange: (currency: string) => void;
  onAdditionalChange: (currencies: string[]) => void;
}

interface CurrencyInfo {
  code: string;
  name: string;
  flag: string;
}

// Comprehensive currency list
const ALL_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
  { code: 'BHD', name: 'Bahraini Dinar', flag: '🇧🇭' },
  { code: 'OMR', name: 'Omani Rial', flag: '🇴🇲' },
  { code: 'INR', name: 'Indian Rupee', flag: '🇮🇳' },
  { code: 'PKR', name: 'Pakistani Rupee', flag: '🇵🇰' },
  { code: 'PHP', name: 'Philippine Peso', flag: '🇵🇭' },
  { code: 'BDT', name: 'Bangladeshi Taka', flag: '🇧🇩' },
  { code: 'NPR', name: 'Nepalese Rupee', flag: '🇳🇵' },
  { code: 'LKR', name: 'Sri Lankan Rupee', flag: '🇱🇰' },
  { code: 'EGP', name: 'Egyptian Pound', flag: '🇪🇬' },
  { code: 'JOD', name: 'Jordanian Dinar', flag: '🇯🇴' },
  { code: 'CNY', name: 'Chinese Yuan', flag: '🇨🇳' },
  { code: 'JPY', name: 'Japanese Yen', flag: '🇯🇵' },
  { code: 'AUD', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'CAD', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'CHF', name: 'Swiss Franc', flag: '🇨🇭' },
  { code: 'SGD', name: 'Singapore Dollar', flag: '🇸🇬' },
  { code: 'MYR', name: 'Malaysian Ringgit', flag: '🇲🇾' },
  { code: 'THB', name: 'Thai Baht', flag: '🇹🇭' },
  { code: 'IDR', name: 'Indonesian Rupiah', flag: '🇮🇩' },
  { code: 'ZAR', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'TRY', name: 'Turkish Lira', flag: '🇹🇷' },
  { code: 'RUB', name: 'Russian Ruble', flag: '🇷🇺' },
  { code: 'BRL', name: 'Brazilian Real', flag: '🇧🇷' },
  { code: 'MXN', name: 'Mexican Peso', flag: '🇲🇽' },
];

// Quick-add suggestions (GCC + USD)
const SUGGESTED_CURRENCIES = ['USD', 'SAR', 'AED', 'KWD', 'BHD', 'OMR'];

export function CurrencyStep({
  additionalCurrencies,
  onAdditionalChange,
}: CurrencyStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return ALL_CURRENCIES.filter(
      (c) =>
        !additionalCurrencies.includes(c.code) &&
        (c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query))
    ).slice(0, 6);
  }, [searchQuery, additionalCurrencies]);

  // Get suggested currencies that haven't been added yet
  const availableSuggestions = useMemo(() => {
    return SUGGESTED_CURRENCIES.filter(
      (code) => !additionalCurrencies.includes(code)
    );
  }, [additionalCurrencies]);

  const addCurrency = (code: string) => {
    if (!additionalCurrencies.includes(code)) {
      onAdditionalChange([...additionalCurrencies, code]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeCurrency = (code: string) => {
    onAdditionalChange(additionalCurrencies.filter((c) => c !== code));
  };

  const getCurrencyInfo = (code: string): CurrencyInfo | undefined => {
    return ALL_CURRENCIES.find((c) => c.code === code);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Coins className="w-6 h-6 text-slate-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Select your currencies
        </h1>
        <p className="text-sm text-slate-600">
          Add currencies you use in addition to QAR
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        {/* Fixed Primary Currency */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Primary Currency
          </p>
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="text-2xl">🇶🇦</span>
            <div className="flex-1">
              <p className="font-medium text-slate-900">QAR - Qatari Riyal</p>
              <p className="text-xs text-slate-500">Fixed as primary currency</p>
            </div>
          </div>
        </div>

        {/* Additional Currencies */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
            Additional Currencies <span className="font-normal text-slate-400">(optional)</span>
          </p>

          {/* Selected currencies as tags */}
          {additionalCurrencies.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {additionalCurrencies.map((code) => {
                const info = getCurrencyInfo(code);
                return (
                  <span
                    key={code}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-sm"
                  >
                    <span>{info?.flag || '💰'}</span>
                    <span className="font-medium">{code}</span>
                    <button
                      onClick={() => removeCurrency(code)}
                      className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search currencies (e.g., USD, Euro, Rupee...)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-11"
            />

            {/* Search dropdown */}
            {showDropdown && filteredCurrencies.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 max-h-48 overflow-y-auto">
                {filteredCurrencies.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => addCurrency(currency.code)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                  >
                    <span className="text-lg">{currency.flag}</span>
                    <div className="flex-1">
                      <span className="font-medium text-slate-900">{currency.code}</span>
                      <span className="text-slate-500 ml-2 text-sm">{currency.name}</span>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick-add suggestions */}
          {availableSuggestions.length > 0 && (
            <div className="mt-3">
              <p className="text-xs text-slate-400 mb-2">Quick add:</p>
              <div className="flex flex-wrap gap-2">
                {availableSuggestions.map((code) => {
                  const info = getCurrencyInfo(code);
                  return (
                    <button
                      key={code}
                      onClick={() => addCurrency(code)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-full text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors"
                    >
                      <span>{info?.flag}</span>
                      <span className="text-slate-700">{code}</span>
                      <Plus className="w-3 h-3 text-slate-400" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 text-center pt-2">
          You can set exchange rates later in settings
        </p>
      </div>
    </div>
  );
}
