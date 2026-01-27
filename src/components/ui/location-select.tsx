'use client';

/**
 * @file location-select.tsx
 * @description Searchable location select with autocomplete from organization settings
 * @module components/ui
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search, MapPin } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Location {
  id: string;
  name: string;
  description?: string | null;
}

export interface LocationSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function LocationSelect({
  value,
  onChange,
  placeholder = 'Select location',
  disabled = false,
  className,
  id,
}: LocationSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [locations, setLocations] = React.useState<Location[]>([]);
  const [loading, setLoading] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch locations on mount
  React.useEffect(() => {
    async function fetchLocations() {
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error('Failed to fetch locations:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchLocations();
  }, []);

  // Filter locations based on search
  const filteredLocations = React.useMemo(() => {
    if (!search) return locations;
    const searchLower = search.toLowerCase();
    return locations.filter((loc) =>
      loc.name.toLowerCase().includes(searchLower)
    );
  }, [search, locations]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (locationName: string) => {
    onChange?.(locationName);
    setOpen(false);
  };

  // Find the selected location name
  const selectedLocation = locations.find((loc) => loc.name === value);

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
          <span className="flex items-center gap-2 truncate">
            {selectedLocation ? (
              <>
                <MapPin className={`${ICON_SIZES.sm} shrink-0 text-muted-foreground`} />
                {selectedLocation.name}
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className={`ml-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className={`mr-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
          <Input
            ref={inputRef}
            placeholder="Search locations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0"
          />
        </div>
        <ScrollArea className="max-h-[200px]">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : locations.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No locations configured. Add locations in Organization Settings.
            </div>
          ) : filteredLocations.length === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No matching location found.
            </div>
          ) : (
            <div className="p-1">
              {/* Clear selection option */}
              <button
                type="button"
                onClick={() => handleSelect('')}
                className={cn(
                  'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-muted-foreground',
                  !value && 'bg-accent'
                )}
              >
                <Check
                  className={cn(
                    `mr-2 ${ICON_SIZES.sm}`,
                    !value ? 'opacity-100' : 'opacity-0'
                  )}
                />
                No location
              </button>
              {filteredLocations.map((location) => (
                <button
                  key={location.id}
                  type="button"
                  onClick={() => handleSelect(location.name)}
                  className={cn(
                    'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                    value === location.name && 'bg-accent'
                  )}
                >
                  <Check
                    className={cn(
                      `mr-2 ${ICON_SIZES.sm}`,
                      value === location.name ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <div className="flex flex-col items-start">
                    <span>{location.name}</span>
                    {location.description && (
                      <span className="text-xs text-muted-foreground">{location.description}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
