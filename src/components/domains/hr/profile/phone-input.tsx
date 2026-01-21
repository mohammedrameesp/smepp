/**
 * @file phone-input.tsx
 * @description Phone number input components with country code selection and validation
 * @module components/domains/hr
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { COUNTRY_CODES } from '@/lib/data/constants';
import { ChevronDown, Search } from 'lucide-react';
import { cn } from '@/lib/core/utils';

interface PhoneInputProps {
  codeValue: string;
  numberValue: string;
  onCodeChange: (code: string) => void;
  onNumberChange: (number: string) => void;
  codePlaceholder?: string;
  numberPlaceholder?: string;
  disabled?: boolean;
  codeId?: string;
  numberId?: string;
  error?: string;
  fixedCode?: string; // If provided, shows fixed code (e.g., +974 for Qatar)
}

// Helper to find a matching entry in COUNTRY_CODES by code
const findCountryByCode = (code: string) => {
  return COUNTRY_CODES.find((c) => c.code === code);
};

export function PhoneInput({
  codeValue,
  numberValue,
  onCodeChange,
  onNumberChange,
  codePlaceholder = 'Code',
  numberPlaceholder = 'Phone number',
  disabled = false,
  codeId,
  numberId,
  error,
  fixedCode,
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const matchedCountry = codeValue ? findCountryByCode(codeValue) : null;

  // Filter countries based on search
  const filteredCountries = search
    ? COUNTRY_CODES.filter(
        (item) =>
          item.country.toLowerCase().startsWith(search.toLowerCase()) ||
          item.code.includes(search)
      )
    : COUNTRY_CODES;

  // Focus search input when popover opens
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (code: string) => {
    onCodeChange(code);
    setOpen(false);
    setSearch('');
  };

  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        {fixedCode ? (
          <div className="flex items-center justify-center px-3 py-2 bg-gray-100 border rounded-md text-sm font-medium text-gray-700 min-w-[80px]">
            {fixedCode}
          </div>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button
                id={codeId}
                variant="outline"
                role="combobox"
                aria-expanded={open}
                className="w-[100px] justify-between font-normal"
                disabled={disabled}
                type="button"
              >
                {matchedCountry ? (
                  <span className="truncate">
                    {matchedCountry.flag} {matchedCountry.code}
                  </span>
                ) : (
                  <span className="text-gray-500">{codePlaceholder}</span>
                )}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0" align="start">
              <div className="flex items-center border-b px-3 py-2">
                <Search className="h-4 w-4 mr-2 opacity-50" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Type country name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 outline-none text-sm bg-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setOpen(false);
                      setSearch('');
                    }
                    if (e.key === 'Enter' && filteredCountries.length > 0) {
                      handleSelect(filteredCountries[0].code);
                    }
                  }}
                />
              </div>
              <ScrollArea className="h-[200px]">
                {filteredCountries.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500 text-center">
                    No country found
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredCountries.map((item) => (
                      <button
                        key={`${item.code}::${item.country}`}
                        type="button"
                        onClick={() => handleSelect(item.code)}
                        className={cn(
                          'w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-gray-100 cursor-pointer',
                          codeValue === item.code && 'bg-gray-100 font-medium'
                        )}
                      >
                        <span className="mr-2">{item.flag}</span>
                        <span className="mr-2">{item.code}</span>
                        <span className="text-gray-500 truncate">({item.country})</span>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </PopoverContent>
          </Popover>
        )}
        <Input
          id={numberId}
          type="tel"
          value={numberValue || ''}
          onChange={(e) => {
            // Only allow digits
            const value = e.target.value.replace(/\D/g, '');
            onNumberChange(value);
          }}
          placeholder={numberPlaceholder}
          disabled={disabled}
          className="flex-1"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

// Qatar-specific phone input with hardcoded +974
interface QatarPhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  error?: string;
}

export function QatarPhoneInput({
  value,
  onChange,
  placeholder = '12345678',
  disabled = false,
  id,
  error,
}: QatarPhoneInputProps) {
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <div className="flex items-center justify-center px-3 py-2 bg-gray-100 border rounded-md text-sm font-medium text-gray-700 min-w-[80px]">
          🇶🇦 +974
        </div>
        <Input
          id={id}
          type="tel"
          value={value || ''}
          onChange={(e) => {
            // Only allow digits, max 8
            const val = e.target.value.replace(/\D/g, '').slice(0, 8);
            onChange(val);
          }}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1"
          maxLength={8}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
