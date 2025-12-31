'use client';

/**
 * @file CurrencyStep.tsx
 * @description Step 2 - Additional currencies selection (skippable)
 * @module setup/steps
 */

import { Coins, Check } from 'lucide-react';

interface CurrencyStepProps {
  selected: string[];
  onChange: (currencies: string[]) => void;
}

const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
];

export function CurrencyStep({ selected, onChange }: CurrencyStepProps) {
  const toggleCurrency = (code: string) => {
    onChange(
      selected.includes(code)
        ? selected.filter((c) => c !== code)
        : [...selected, code]
    );
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Coins className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Need additional currencies?
        </h1>
        <p className="text-slate-600">
          QAR is your primary currency. Select any additional currencies you use.
        </p>
      </div>

      {/* Primary Currency - Fixed */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🇶🇦</span>
            <div>
              <p className="font-medium text-slate-900">QAR - Qatari Riyal</p>
              <p className="text-sm text-slate-500">Primary currency</p>
            </div>
          </div>
          <span className="text-xs bg-slate-900 text-white px-3 py-1 rounded-full font-medium">
            Primary
          </span>
        </div>
      </div>

      {/* Additional Currencies */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <p className="text-sm font-medium text-slate-700 mb-4">
          Additional currencies (optional)
        </p>
        <div className="grid grid-cols-2 gap-3">
          {CURRENCIES.map((currency) => {
            const isSelected = selected.includes(currency.code);
            return (
              <button
                key={currency.code}
                onClick={() => toggleCurrency(currency.code)}
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
