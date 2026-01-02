'use client';

/**
 * @file CurrencyStep.tsx
 * @description Step 2 - Currency selection (primary + additional)
 * @module setup/steps
 */

import { Coins, Check } from 'lucide-react';

interface CurrencyStepProps {
  primaryCurrency: string;
  additionalCurrencies: string[];
  onPrimaryChange: (currency: string) => void;
  onAdditionalChange: (currencies: string[]) => void;
}

const ALL_CURRENCIES = [
  { code: 'QAR', name: 'Qatari Riyal', flag: '🇶🇦' },
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
];

export function CurrencyStep({
  primaryCurrency,
  additionalCurrencies,
  onPrimaryChange,
  onAdditionalChange,
}: CurrencyStepProps) {
  const toggleAdditional = (code: string) => {
    // Can't add primary as additional
    if (code === primaryCurrency) return;

    onAdditionalChange(
      additionalCurrencies.includes(code)
        ? additionalCurrencies.filter((c) => c !== code)
        : [...additionalCurrencies, code]
    );
  };

  const selectPrimary = (code: string) => {
    onPrimaryChange(code);
    // Remove from additional if it was there
    if (additionalCurrencies.includes(code)) {
      onAdditionalChange(additionalCurrencies.filter((c) => c !== code));
    }
  };

  // Get additional currencies excluding primary
  const availableAdditional = ALL_CURRENCIES.filter(c => c.code !== primaryCurrency);

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Coins className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Select your currencies
        </h1>
        <p className="text-slate-600">
          Choose your primary currency and any additional currencies you use
        </p>
      </div>

      {/* Primary Currency Selection */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <p className="text-sm font-medium text-slate-700 mb-4">
          Primary currency
        </p>
        <div className="grid grid-cols-2 gap-3">
          {ALL_CURRENCIES.map((currency) => {
            const isSelected = primaryCurrency === currency.code;
            return (
              <button
                key={currency.code}
                onClick={() => selectPrimary(currency.code)}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">{currency.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">
                    {currency.code}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {currency.name}
                  </p>
                </div>
                {isSelected && (
                  <span className="text-xs bg-slate-900 text-white px-2 py-0.5 rounded-full font-medium">
                    Primary
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Additional Currencies */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-700 mb-4">
          Additional currencies <span className="text-slate-400 font-normal">(optional)</span>
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Select currencies you accept in addition to {primaryCurrency}. You can set exchange rates in settings.
        </p>
        <div className="grid grid-cols-2 gap-3">
          {availableAdditional.map((currency) => {
            const isSelected = additionalCurrencies.includes(currency.code);
            return (
              <button
                key={currency.code}
                onClick={() => toggleAdditional(currency.code)}
                className={`flex items-center gap-3 p-4 border-2 rounded-xl transition-all text-left ${
                  isSelected
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span className="text-xl">{currency.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">
                    {currency.code}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {currency.name}
                  </p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    isSelected ? 'bg-slate-900' : 'border-2 border-slate-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
