'use client';

import { useState, useMemo } from 'react';
import { X, Search, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  ALL_CURRENCIES,
  CURRENCY_MAP,
  SUGGESTED_CURRENCIES,
} from '@/lib/core/currency';

interface CurrencySelectorProps {
  selectedCurrencies: string[];
  onChange: (currencies: string[]) => void;
  disabled?: boolean;
  showSuggestions?: boolean;
}

export function CurrencySelector({
  selectedCurrencies,
  onChange,
  disabled = false,
  showSuggestions = true,
}: CurrencySelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Get all available currencies (exclude QAR and already selected)
  const availableCurrencies = useMemo(() => {
    return ALL_CURRENCIES.filter(
      (c) =>
        c.code !== 'QAR' &&
        !selectedCurrencies.includes(c.code)
    );
  }, [selectedCurrencies]);

  // Filter currencies based on search
  const filteredCurrencies = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    // If searching, filter by query
    if (query) {
      return availableCurrencies.filter(
        (c) =>
          c.code.toLowerCase().includes(query) ||
          c.name.toLowerCase().includes(query)
      ).slice(0, 8);
    }

    // If showAll, return all available
    if (showAll) {
      return availableCurrencies;
    }

    // Default: show first 10
    return availableCurrencies.slice(0, 10);
  }, [searchQuery, availableCurrencies, showAll]);

  // Get suggested currencies that haven't been added yet
  const availableSuggestions = useMemo(() => {
    return SUGGESTED_CURRENCIES.filter(
      (code) => !selectedCurrencies.includes(code)
    );
  }, [selectedCurrencies]);

  const addCurrency = (code: string) => {
    if (!selectedCurrencies.includes(code)) {
      onChange([...selectedCurrencies, code]);
    }
    setSearchQuery('');
    setShowDropdown(false);
  };

  const removeCurrency = (code: string) => {
    onChange(selectedCurrencies.filter((c) => c !== code));
  };

  return (
    <div className="space-y-3">
      {/* Selected currencies as tags */}
      {selectedCurrencies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedCurrencies.map((code) => {
            const info = CURRENCY_MAP[code];
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-sm"
              >
                <span>{info?.flag || '💰'}</span>
                <span className="font-medium">{code}</span>
                {!disabled && (
                  <button
                    onClick={() => removeCurrency(code)}
                    className="ml-0.5 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </span>
            );
          })}
        </div>
      )}

      {/* Search input */}
      {!disabled && (
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
            onBlur={() => {
              // Delay hiding to allow click on dropdown items
              setTimeout(() => setShowDropdown(false), 150);
            }}
            className="pl-10 bg-slate-50 border-slate-200 rounded-xl h-11"
          />

          {/* Search dropdown */}
          {showDropdown && filteredCurrencies.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1 max-h-64 overflow-y-auto">
              {filteredCurrencies.map((currency) => (
                <button
                  key={currency.code}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => addCurrency(currency.code)}
                  className="w-full flex items-center gap-3 px-3 py-2 hover:bg-slate-50 transition-colors text-left"
                >
                  <span className="text-lg">{currency.flag}</span>
                  <div className="flex-1">
                    <span className="font-medium text-slate-900">
                      {currency.code}
                    </span>
                    <span className="text-slate-500 ml-2 text-sm">
                      {currency.name}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-slate-400" />
                </button>
              ))}
              {/* Show more button when not searching and more currencies available */}
              {!searchQuery.trim() && !showAll && availableCurrencies.length > 10 && (
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowAll(true)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-t border-slate-100"
                >
                  Show all {availableCurrencies.length} currencies
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick-add suggestions */}
      {showSuggestions && !disabled && availableSuggestions.length > 0 && (
        <div>
          <p className="text-xs text-slate-400 mb-2">Commonly used currencies:</p>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((code) => {
              const info = CURRENCY_MAP[code];
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
  );
}
