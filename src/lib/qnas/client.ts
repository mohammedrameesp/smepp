/**
 * @file client.ts
 * @description QNAS (Qatar National Address System) API client for fetching
 *              zones, streets, buildings, and location coordinates.
 * @module qnas
 *
 * This module provides a typed client for the official QNAS API, which is
 * Qatar's national addressing system. All addresses in Qatar follow the format:
 * Zone Number, Street Number, Building Number.
 *
 * @example
 * ```typescript
 * import { fetchZones, fetchStreets, fetchBuildings, fetchLocation } from '@/lib/qnas';
 *
 * // Get all zones
 * const zones = await fetchZones();
 *
 * // Get streets in zone 24
 * const streets = await fetchStreets('24');
 *
 * // Get buildings on street 123 in zone 24
 * const buildings = await fetchBuildings('24', '123');
 *
 * // Get GPS coordinates for a specific address
 * const location = await fetchLocation('24', '123', '45');
 * ```
 *
 * @security
 * - API credentials are stored in environment variables
 * - All URL parameters are encoded to prevent injection
 * - API token is never logged or exposed in errors
 */

import type { QNASZone, QNASStreet, QNASBuilding, QNASLocation } from './types';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** QNAS API base URL */
const QNAS_API_BASE = 'https://qnas.qa';

/** Cache duration for zone data (24 hours - zones rarely change) */
const ZONE_CACHE_SECONDS = 86400;

/** Cache duration for street data (24 hours - streets rarely change) */
const STREET_CACHE_SECONDS = 86400;

/** Cache duration for building data (1 hour - buildings change more often) */
const BUILDING_CACHE_SECONDS = 3600;

/** Cache duration for location data (24 hours - coordinates don't change) */
const LOCATION_CACHE_SECONDS = 86400;

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Custom error class for QNAS API errors
 *
 * Provides structured error information including HTTP status codes
 * and additional details from the API response.
 *
 * @example
 * ```typescript
 * try {
 *   await fetchZones();
 * } catch (error) {
 *   if (error instanceof QNASApiError) {
 *     console.error(`QNAS Error ${error.code}: ${error.message}`);
 *   }
 * }
 * ```
 */
export class QNASApiError extends Error {
  /** HTTP status code (if applicable) */
  code?: number;
  /** Additional error details from the API */
  details?: unknown;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);
    this.name = 'QNASApiError';
    this.code = code;
    this.details = details;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if QNAS API is configured
 *
 * Returns true if both QNAS_API_TOKEN and QNAS_API_DOMAIN environment
 * variables are set. Use this to conditionally show QNAS features.
 *
 * @returns true if QNAS API credentials are configured
 *
 * @example
 * ```typescript
 * if (isQNASConfigured()) {
 *   // Show Qatar address picker
 * } else {
 *   // Show generic address input
 * }
 * ```
 */
export function isQNASConfigured(): boolean {
  return !!(process.env.QNAS_API_TOKEN && process.env.QNAS_API_DOMAIN);
}

/**
 * Get QNAS API request headers
 *
 * @returns Headers object with authentication and content type
 * @throws {QNASApiError} If QNAS API credentials are not configured
 *
 * @security API token is only included in headers, never logged
 */
function getHeaders(): HeadersInit {
  const token = process.env.QNAS_API_TOKEN;
  const domain = process.env.QNAS_API_DOMAIN;

  if (!token || !domain) {
    throw new QNASApiError(
      'QNAS API not configured. Set QNAS_API_TOKEN and QNAS_API_DOMAIN environment variables.'
    );
  }

  return {
    'X-Token': token,
    'X-Domain': domain,
    'Accept': 'application/json',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all zones from QNAS API
 *
 * Zones are the top-level geographic divisions in Qatar's address system.
 * Results are cached for 24 hours as zones rarely change.
 *
 * @returns Array of zone objects with numbers and names in English/Arabic
 * @throws {QNASApiError} If the API request fails or credentials are missing
 *
 * @example
 * ```typescript
 * const zones = await fetchZones();
 * // [{ zone_number: 1, zone_name_en: 'Doha', zone_name_ar: 'الدوحة' }, ...]
 * ```
 */
export async function fetchZones(): Promise<QNASZone[]> {
  const response = await fetch(`${QNAS_API_BASE}/get_zones`, {
    method: 'GET',
    headers: getHeaders(),
    next: { revalidate: ZONE_CACHE_SECONDS },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new QNASApiError(
      `Failed to fetch zones: ${response.statusText}`,
      response.status,
      error
    );
  }

  const data = await response.json();

  // API may return { zones: [...] } or just [...] depending on version
  return data.zones || data || [];
}

/**
 * Fetch streets for a specific zone
 *
 * Streets belong to zones and have unique numbers within each zone.
 * Results are cached for 24 hours as street data rarely changes.
 *
 * @param zone - Zone number (e.g., '24')
 * @returns Array of street objects with numbers and names in English/Arabic
 * @throws {QNASApiError} If zone is empty, API request fails, or credentials are missing
 *
 * @example
 * ```typescript
 * const streets = await fetchStreets('24');
 * // [{ street_number: 1, street_name_en: 'Main St', street_name_ar: 'الشارع الرئيسي' }, ...]
 * ```
 */
export async function fetchStreets(zone: string): Promise<QNASStreet[]> {
  if (!zone) {
    throw new QNASApiError('Zone is required');
  }

  const response = await fetch(
    `${QNAS_API_BASE}/get_streets/${encodeURIComponent(zone)}`,
    {
      method: 'GET',
      headers: getHeaders(),
      next: { revalidate: STREET_CACHE_SECONDS },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new QNASApiError(
      `Failed to fetch streets: ${response.statusText}`,
      response.status,
      error
    );
  }

  const data = await response.json();

  // API may return { streets: [...] } or just [...] depending on version
  return data.streets || data || [];
}

/**
 * Fetch buildings for a specific zone and street
 *
 * Buildings have unique numbers within each street.
 * Results are cached for 1 hour as building data may change more frequently.
 *
 * @param zone - Zone number (e.g., '24')
 * @param street - Street number (e.g., '123')
 * @returns Array of building objects with numbers and optional coordinates
 * @throws {QNASApiError} If zone/street is empty, API request fails, or credentials are missing
 *
 * @example
 * ```typescript
 * const buildings = await fetchBuildings('24', '123');
 * // [{ building_number: 1, latitude: 25.2854, longitude: 51.5310 }, ...]
 * ```
 */
export async function fetchBuildings(zone: string, street: string): Promise<QNASBuilding[]> {
  if (!zone || !street) {
    throw new QNASApiError('Zone and street are required');
  }

  const response = await fetch(
    `${QNAS_API_BASE}/get_buildings/${encodeURIComponent(zone)}/${encodeURIComponent(street)}`,
    {
      method: 'GET',
      headers: getHeaders(),
      next: { revalidate: BUILDING_CACHE_SECONDS },
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new QNASApiError(
      `Failed to fetch buildings: ${response.statusText}`,
      response.status,
      error
    );
  }

  const data = await response.json();

  // API may return { buildings: [...] } or just [...] depending on version
  return data.buildings || data || [];
}

/**
 * Fetch location coordinates for a specific address
 *
 * Returns GPS coordinates for a complete Qatar address.
 * Results are cached for 24 hours as coordinates don't change.
 *
 * @param zone - Zone number (e.g., '24')
 * @param street - Street number (e.g., '123')
 * @param building - Building number (e.g., '45')
 * @returns Location object with latitude/longitude, or null if not found
 * @throws {QNASApiError} If required params are empty, API request fails, or credentials are missing
 *
 * @example
 * ```typescript
 * const location = await fetchLocation('24', '123', '45');
 * if (location) {
 *   console.log(`GPS: ${location.latitude}, ${location.longitude}`);
 * }
 * ```
 */
export async function fetchLocation(
  zone: string,
  street: string,
  building: string
): Promise<QNASLocation | null> {
  if (!zone || !street || !building) {
    throw new QNASApiError('Zone, street, and building are required');
  }

  const response = await fetch(
    `${QNAS_API_BASE}/get_location/${encodeURIComponent(zone)}/${encodeURIComponent(street)}/${encodeURIComponent(building)}`,
    {
      method: 'GET',
      headers: getHeaders(),
      next: { revalidate: LOCATION_CACHE_SECONDS },
    }
  );

  if (!response.ok) {
    // Return null for not found (address doesn't exist in QNAS)
    if (response.status === 404) {
      return null;
    }
    const error = await response.text();
    throw new QNASApiError(
      `Failed to fetch location: ${response.statusText}`,
      response.status,
      error
    );
  }

  const data = await response.json();

  // Validate and parse coordinates
  if (data.latitude && data.longitude) {
    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
    };
  }

  return null;
}
