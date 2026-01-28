'use client';

/**
 * @file country-select.tsx
 * @description Searchable country select dropdown component
 * @module components/ui
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { COUNTRIES } from '@/lib/constants';
import { ICON_SIZES } from '@/lib/constants';

export interface CountrySelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function CountrySelect({
  value,
  onChange,
  placeholder = 'Select country',
  disabled = false,
  className,
  id,
}: CountrySelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Filter countries based on search
  const filteredCountries = React.useMemo(() => {
    if (!search) return COUNTRIES;
    const searchLower = search.toLowerCase();
    return COUNTRIES.filter((country) =>
      country.toLowerCase().includes(searchLower)
    );
  }, [search]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (country: string) => {
    onChange?.(country);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className={`ml-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className={`mr-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
          <Input
            ref={inputRef}
            placeholder="Search country..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0"
          />
        </div>
        <ScrollArea className="h-[200px]">
          {filteredCountries.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No country found.
            </div>
          ) : (
            <div className="p-1">
              {filteredCountries.map((country) => (
                <button
                  key={country}
                  type="button"
                  onClick={() => handleSelect(country)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === country && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      `mr-2 ${ICON_SIZES.sm}`,
                      value === country ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {country}
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
