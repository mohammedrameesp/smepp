'use client';

/**
 * @file qatar-address-select.tsx
 * @description Qatar Address selector with cascading dropdowns and Leaflet map preview
 * @module components/ui
 *
 * Features:
 * - Three cascading Select dropdowns (Zone → Street → Building)
 * - Unit remains a text input (optional)
 * - Loading states while fetching QNAS data
 * - Inline Leaflet map preview showing location pin when building is selected
 * - Falls back gracefully if QNAS API unavailable
 */

import * as React from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { QNASZone, QNASStreet, QNASBuilding, QNASLocation } from '@/lib/qnas/types';

// Dynamic import for Leaflet to avoid SSR issues
import dynamic from 'next/dynamic';

const LeafletMap = dynamic(() => import('./leaflet-map'), {
  ssr: false,
  loading: () => (
    <div className="h-[200px] w-full bg-slate-100 rounded-lg flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
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
          <AlertCircle className="h-4 w-4" />
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
          <Select
            value={value.zone}
            onValueChange={handleZoneChange}
            disabled={disabled || loadingZones}
          >
            <SelectTrigger className={errors.zone ? 'border-red-500' : ''}>
              {loadingZones ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SelectValue placeholder="Select zone" />
              )}
            </SelectTrigger>
            <SelectContent>
              {zones.map((zone) => (
                <SelectItem key={zone.zone_number} value={zone.zone_number}>
                  {zone.zone_number} - {zone.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.zone && <p className="text-xs text-red-600">{errors.zone}</p>}
        </div>

        {/* Street Select */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">
            Street <span className="text-red-500">*</span>
          </Label>
          <Select
            value={value.street}
            onValueChange={handleStreetChange}
            disabled={disabled || !value.zone || loadingStreets}
          >
            <SelectTrigger className={errors.street ? 'border-red-500' : ''}>
              {loadingStreets ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SelectValue placeholder={value.zone ? 'Select street' : 'Select zone first'} />
              )}
            </SelectTrigger>
            <SelectContent>
              {streets.map((street) => (
                <SelectItem key={street.street_number} value={street.street_number}>
                  {street.street_number} - {street.name_en}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.street && <p className="text-xs text-red-600">{errors.street}</p>}
        </div>

        {/* Building Select */}
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">
            Building <span className="text-red-500">*</span>
          </Label>
          <Select
            value={value.building}
            onValueChange={handleBuildingChange}
            disabled={disabled || !value.street || loadingBuildings}
          >
            <SelectTrigger className={errors.building ? 'border-red-500' : ''}>
              {loadingBuildings ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SelectValue placeholder={value.street ? 'Select building' : 'Select street first'} />
              )}
            </SelectTrigger>
            <SelectContent>
              {buildings.map((building) => (
                <SelectItem key={building.building_number} value={building.building_number}>
                  {building.building_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : location ? (
            <div className="relative">
              <LeafletMap
                latitude={location.latitude}
                longitude={location.longitude}
                zoom={17}
              />
              <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-xs text-slate-600 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Zone {value.zone}, Street {value.street}, Building {value.building}
              </div>
            </div>
          ) : (
            <div className="h-[200px] w-full bg-slate-100 rounded-lg flex items-center justify-center text-slate-500">
              <div className="text-center">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Location not found</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
