/**
 * @file types.ts
 * @description Type definitions for QNAS (Qatar National Address System) API integration.
 * @module qnas
 *
 * QNAS is Qatar's official addressing system that provides structured address data
 * including zones, streets, buildings, and GPS coordinates.
 *
 * @see https://qnas.qa - Official QNAS website
 *
 * @example
 * ```typescript
 * import type { QNASZone, QatarAddress } from '@/lib/qnas';
 *
 * const zone: QNASZone = {
 *   zone_number: 1,
 *   zone_name_en: 'Doha',
 *   zone_name_ar: 'الدوحة',
 * };
 * ```
 */

/**
 * Zone data from QNAS API
 *
 * Qatar is divided into numbered zones, each with English and Arabic names.
 * Zone numbers are unique identifiers used in the official address format.
 */
export interface QNASZone {
  /** Unique zone number (e.g., 1, 2, 3) */
  zone_number: number;
  /** Zone name in English (e.g., 'Doha', 'Al Wakra') */
  zone_name_en: string;
  /** Zone name in Arabic (e.g., 'الدوحة', 'الوكرة') */
  zone_name_ar: string;
}

/**
 * Street data from QNAS API
 *
 * Streets belong to zones and have unique numbers within each zone.
 */
export interface QNASStreet {
  /** Unique street number within the zone */
  street_number: number;
  /** Street name in English */
  street_name_en: string;
  /** Street name in Arabic */
  street_name_ar: string;
}

/**
 * Building data from QNAS API
 *
 * Buildings belong to streets and have unique numbers within each street.
 * May include GPS coordinates for precise location.
 */
export interface QNASBuilding {
  /** Unique building number within the street */
  building_number: number;
  /** GPS latitude coordinate (if available) */
  latitude?: number;
  /** GPS longitude coordinate (if available) */
  longitude?: number;
}

/**
 * Location coordinates from QNAS API
 *
 * GPS coordinates for a specific address in Qatar.
 */
export interface QNASLocation {
  /** GPS latitude coordinate (decimal degrees) */
  latitude: number;
  /** GPS longitude coordinate (decimal degrees) */
  longitude: number;
}

/**
 * Complete Qatar address
 *
 * Full address structure following the QNAS format:
 * Zone Number, Street Number, Building Number, Unit (optional)
 *
 * @example
 * ```typescript
 * const address: QatarAddress = {
 *   zone: '24',
 *   street: '123',
 *   building: '45',
 *   unit: 'Floor 3, Office 301',
 *   latitude: 25.2854,
 *   longitude: 51.5310,
 * };
 * ```
 */
export interface QatarAddress {
  /** Zone number as string */
  zone: string;
  /** Street number as string */
  street: string;
  /** Building number as string */
  building: string;
  /** Optional unit/apartment/office details */
  unit?: string;
  /** GPS latitude coordinate (if resolved) */
  latitude?: number;
  /** GPS longitude coordinate (if resolved) */
  longitude?: number;
}

/**
 * Generic API response wrapper for QNAS endpoints
 *
 * @typeParam T - The type of data returned by the endpoint
 */
export interface QNASApiResponse<T> {
  /** Whether the API call was successful */
  success: boolean;
  /** Response data */
  data: T;
  /** Error message if success is false */
  error?: string;
}
