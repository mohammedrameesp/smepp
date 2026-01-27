'use client';

/**
 * @file qatar-address-select.tsx
 * @description Qatar Address selector with searchable cascading dropdowns and Leaflet map preview
 * @module components/ui
 *
 * Features:
 * - Three cascading searchable dropdowns (Zone → Street → Building)
 * - Unit remains a text input (optional)
 * - Loading states while fetching QNAS data
 * - Inline Leaflet map preview showing location pin when building is selected
 * - Falls back gracefully if QNAS API unavailable
 */

import * as React from 'react';
import { useCallback, useEffect, useState, useRef } from 'react';
import { Loader2, MapPin, AlertCircle, ChevronDown, Search } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/core/utils';
import type { QNASZone, QNASStreet, QNASBuilding, QNASLocation } from '@/lib/qnas/types';

// Dynamic import for Leaflet to avoid SSR issues
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full bg-slate-100 rounded-lg flex items-center justify-center">
      <Loader2 className={`${ICON_SIZES.lg} animate-spin text-slate-400`} />
    </div>
  ),
});

export interface QatarAddressValue {
  zone: string;
  street: string;
  building: string;
  unit?: string;
  latitude?: number;
  longitude?: number;
}

export interface QatarAddressSelectProps {
  value: QatarAddressValue;
  onChange: (value: QatarAddressValue) => void;
  errors?: {
    zone?: string;
    street?: string;
    building?: string;
    unit?: string;
  };
  showMap?: boolean;
  disabled?: boolean;
}

// Searchable dropdown component
interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onSelect: (value: string) => void;
  getItemValue: (item: T) => string;
  getItemLabel: (item: T) => string;
  getSearchText: (item: T) => string;
  placeholder: string;
  searchPlaceholder: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
}

function SearchableSelect<T>({
  items,
  value,
  onSelect,
  getItemValue,
  getItemLabel,
  getSearchText,
  placeholder,
  searchPlaceholder,
  disabled = false,
  loading = false,
  error,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((item) => getItemValue(item) === value);

  const filteredItems = search
    ? items.filter((item) =>
        getSearchText(item).toLowerCase().includes(search.toLowerCase())
      )
    : items;

  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 0);
    }
  }, [open]);

  const handleSelect = (itemValue: string) => {
    onSelect(itemValue);
    setOpen(false);
    setSearch('');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'w-full justify-between font-normal h-10',
            error && 'border-red-500',
            !selectedItem && 'text-muted-foreground'
          )}
          disabled={disabled || loading}
          type="button"
        >
          {loading ? (
            <Loader2 className={`${ICON_SIZES.sm} animate-spin`} />
          ) : selectedItem ? (
            <span className="truncate">{getItemLabel(selectedItem)}</span>
          ) : (
            <span>{placeholder}</span>
          )}
          <ChevronDown className={`ml-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[250px] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className={`${ICON_SIZES.sm} mr-2 opacity-50`} />
          <input
            ref={searchInputRef}
            type="text"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 outline-none text-sm bg-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setOpen(false);
                setSearch('');
              }
              if (e.key === 'Enter' && filteredItems.length > 0) {
                handleSelect(getItemValue(filteredItems[0]));
              }
            }}
          />
        </div>
        <ScrollArea className="h-[200px]">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No results found
            </div>
          ) : (
            <div className="p-1">
              {filteredItems.map((item) => {
                const itemValue = getItemValue(item);
                return (
                  <button
                    key={itemValue}
                    type="button"
                    onClick={() => handleSelect(itemValue)}
                    className={cn(
                      'w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-gray-100 cursor-pointer text-left',
                      value === itemValue && 'bg-gray-100 font-medium'
                    )}
                  >
                    {getItemLabel(item)}
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

export function QatarAddressSelect({
  value,
  onChange,
  errors = {},
  showMap = true,
  disabled = false,
}: QatarAddressSelectProps) {
  // QNAS data state
  const [zones, setZones] = useState<QNASZone[]>([]);
  const [streets, setStreets] = useState<QNASStreet[]>([]);
  const [buildings, setBuildings] = useState<QNASBuilding[]>([]);
  const [location, setLocation] = useState<QNASLocation | null>(null);

  // Loading states
  const [loadingZones, setLoadingZones] = useState(true);
  const [loadingStreets, setLoadingStreets] = useState(false);
  const [loadingBuildings, setLoadingBuildings] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);

  // API availability
  const [apiAvailable, setApiAvailable] = useState(true);

  // Fetch zones on mount
  useEffect(() => {
    async function loadZones() {
      try {
        setLoadingZones(true);
        const response = await fetch('/api/qnas/zones');
        const data = await response.json();

        if (response.status === 503) {
          setApiAvailable(false);
          return;
        }

        if (data.zones) {
          setZones(data.zones);
        }
      } catch (error) {
        console.error('Failed to load zones:', error);
        setApiAvailable(false);
      } finally {
        setLoadingZones(false);
      }
    }

    loadZones();
  }, []);

  // Fetch streets when zone changes
  useEffect(() => {
    if (!value.zone || !apiAvailable) {
      setStreets([]);
      return;
    }

    async function loadStreets() {
      try {
        setLoadingStreets(true);
        const response = await fetch(`/api/qnas/streets/${encodeURIComponent(value.zone)}`);
        const data = await response.json();

        if (data.streets) {
          setStreets(data.streets);
        }
      } catch (error) {
        console.error('Failed to load streets:', error);
      } finally {
        setLoadingStreets(false);
      }
    }

    loadStreets();
  }, [value.zone, apiAvailable]);

  // Fetch buildings when street changes
  useEffect(() => {
    if (!value.zone || !value.street || !apiAvailable) {
      setBuildings([]);
      return;
    }

    async function loadBuildings() {
      try {
        setLoadingBuildings(true);
        const response = await fetch(
          `/api/qnas/buildings/${encodeURIComponent(value.zone)}/${encodeURIComponent(value.street)}`
        );
        const data = await response.json();

        if (data.buildings) {
          setBuildings(data.buildings);
        }
      } catch (error) {
        console.error('Failed to load buildings:', error);
      } finally {
        setLoadingBuildings(false);
      }
    }

    loadBuildings();
  }, [value.zone, value.street, apiAvailable]);

  // Fetch location when building changes
  useEffect(() => {
    if (!value.zone || !value.street || !value.building || !apiAvailable) {
      setLocation(null);
      return;
    }

    async function loadLocation() {
      try {
        setLoadingLocation(true);
        const response = await fetch(
          `/api/qnas/location/${encodeURIComponent(value.zone)}/${encodeURIComponent(value.street)}/${encodeURIComponent(value.building)}`
        );
        const data = await response.json();

        if (data.location) {
          setLocation(data.location);
          // Update parent with coordinates
          onChange({
            ...value,
            latitude: data.location.latitude,
            longitude: data.location.longitude,
          });
        }
      } catch (error) {
        console.error('Failed to load location:', error);
      } finally {
        setLoadingLocation(false);
      }
    }

    loadLocation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.zone, value.street, value.building, apiAvailable]);

  const handleZoneChange = useCallback(
    (zone: string) => {
      onChange({
        zone,
        street: '',
        building: '',
        unit: value.unit,
        latitude: undefined,
        longitude: undefined,
      });
      setStreets([]);
      setBuildings([]);
      setLocation(null);
    },
    [onChange, value.unit]
  );

  const handleStreetChange = useCallback(
    (street: string) => {
      onChange({
        ...value,
        street,
        building: '',
        latitude: undefined,
        longitude: undefined,
      });
      setBuildings([]);
      setLocation(null);
    },
    [onChange, value]
  );

  const handleBuildingChange = useCallback(
    (building: string) => {
      onChange({
        ...value,
        building,
      });
    },
    [onChange, value]
  );

  const handleUnitChange = useCallback(
    (unit: string) => {
      onChange({
        ...value,
        unit,
      });
    },
    [onChange, value]
  );

  // If API is not available, show fallback text inputs
  if (!apiAvailable && !loadingZones) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
          <AlertCircle className={ICON_SIZES.sm} />
          <span>Address lookup unavailable. Please enter manually.</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">
              Zone <span className="text-red-500">*</span>
            </Label>
            <Input
              value={value.zone}
              onChange={(e) => onChange({ ...value, zone: e.target.value })}
              placeholder="45"
              className={errors.zone ? 'border-red-500' : ''}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">
              Street <span className="text-red-500">*</span>
            </Label>
            <Input
              value={value.street}
              onChange={(e) => onChange({ ...value, street: e.target.value })}
              placeholder="123"
              className={errors.street ? 'border-red-500' : ''}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">
              Building <span className="text-red-500">*</span>
            </Label>
            <Input
              value={value.building}
              onChange={(e) => onChange({ ...value, building: e.target.value })}
              placeholder="15"
              className={errors.building ? 'border-red-500' : ''}
              disabled={disabled}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-slate-500">Unit</Label>
            <Input
              value={value.unit || ''}
              onChange={(e) => onChange({ ...value, unit: e.target.value })}
              placeholder="5A"
              disabled={disabled}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Zone Select */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">
            Zone <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            items={zones}
            value={value.zone}
            onSelect={handleZoneChange}
            getItemValue={(zone) => String(zone.zone_number)}
            getItemLabel={(zone) => `${zone.zone_number} - ${zone.zone_name_en}`}
            getSearchText={(zone) => `${zone.zone_number} ${zone.zone_name_en} ${zone.zone_name_ar}`}
            placeholder="Select zone"
            searchPlaceholder="Search zone..."
            disabled={disabled}
            loading={loadingZones}
            error={errors.zone}
          />
          {errors.zone && <p className="text-xs text-red-600">{errors.zone}</p>}
        </div>

        {/* Street Select */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">
            Street <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            items={streets}
            value={value.street}
            onSelect={handleStreetChange}
            getItemValue={(street) => String(street.street_number)}
            getItemLabel={(street) => `${street.street_number} - ${street.street_name_en}`}
            getSearchText={(street) => `${street.street_number} ${street.street_name_en} ${street.street_name_ar}`}
            placeholder={value.zone ? 'Select street' : 'Select zone first'}
            searchPlaceholder="Search street..."
            disabled={disabled || !value.zone}
            loading={loadingStreets}
            error={errors.street}
          />
          {errors.street && <p className="text-xs text-red-600">{errors.street}</p>}
        </div>

        {/* Building Select */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">
            Building <span className="text-red-500">*</span>
          </Label>
          <SearchableSelect
            items={buildings}
            value={value.building}
            onSelect={handleBuildingChange}
            getItemValue={(building) => String(building.building_number)}
            getItemLabel={(building) => String(building.building_number)}
            getSearchText={(building) => String(building.building_number)}
            placeholder={value.street ? 'Select building' : 'Select street first'}
            searchPlaceholder="Search building..."
            disabled={disabled || !value.street}
            loading={loadingBuildings}
            error={errors.building}
          />
          {errors.building && <p className="text-xs text-red-600">{errors.building}</p>}
        </div>

        {/* Unit Input */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Unit</Label>
          <Input
            value={value.unit || ''}
            onChange={(e) => handleUnitChange(e.target.value)}
            placeholder="5A"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Map Preview */}
      {showMap && value.building && (
        <div className="mt-4">
          {loadingLocation ? (
            <div className="h-[200px] w-full bg-slate-100 rounded-lg flex items-center justify-center">
              <Loader2 className={`${ICON_SIZES.lg} animate-spin text-slate-400`} />
            </div>
          ) : location ? (
            <div className="relative">
              <LeafletMap
                latitude={location.latitude}
                longitude={location.longitude}
                zoom={17}
              />
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-600 flex items-center gap-1 z-10">
                <MapPin className={ICON_SIZES.xs} />
                Zone {value.zone}, Street {value.street}, Building {value.building}
              </div>
            </div>
          ) : (
            <div className="h-[200px] w-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MapPin className={`${ICON_SIZES.xl} mx-auto mb-2 opacity-50`} />
                <p className="text-sm">Location not found</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
