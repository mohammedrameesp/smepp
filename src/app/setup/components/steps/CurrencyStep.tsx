'use client';

/**
 * @file CurrencyStep.tsx
 * @description Step 2 - Currency selection (QAR fixed as primary + tag-based additional)
 * @module setup/steps
 */

import { Coins } from 'lucide-react';
import { CurrencySelector } from '@/components/currency-selector';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface CurrencyStepProps {
  primaryCurrency: string;
  additionalCurrencies: string[];
  onPrimaryChange: (currency: string) => void;
  onAdditionalChange: (currencies: string[]) => void;
}

export function CurrencyStep({
  additionalCurrencies,
  onAdditionalChange,
}: CurrencyStepProps) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Coins className={`${ICON_SIZES.lg} text-slate-600`} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Currencies
        </h1>
        <p className="text-sm text-slate-600">
          Add any currencies you use besides QAR
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
              <p className="text-xs text-slate-500">Used as your default reporting currency</p>
            </div>
          </div>
        </div>

        {/* Additional Currencies */}
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
            Additional Currencies <span className="font-normal text-slate-400">(optional)</span>
          </p>
          <p className="text-xs text-slate-400 mb-2">
            Add currencies only if you transact or track expenses in them
          </p>
          <CurrencySelector
            selectedCurrencies={additionalCurrencies}
            onChange={onAdditionalChange}
            showSuggestions={true}
          />
        </div>

        <p className="text-xs text-slate-400 text-center pt-2">
          You can set exchange rates later in settings
        </p>
      </div>
    </div>
  );
}
