/**
 * QNAS (Qatar National Address System) API Types
 *
 * Types for Qatar's official addressing system API
 * which provides zone, street, building, and location data.
 */

/**
 * Zone data from QNAS API
 */
export interface QNASZone {
  zone_number: number;
  zone_name_en: string;
  zone_name_ar: string;
}

/**
 * Street data from QNAS API
 */
export interface QNASStreet {
  street_number: number;
  street_name_en: string;
  street_name_ar: string;
}

/**
 * Building data from QNAS API
 */
export interface QNASBuilding {
  building_number: number;
  latitude?: number;
  longitude?: number;
}

/**
 * Location coordinates from QNAS API
 */
export interface QNASLocation {
  latitude: number;
  longitude: number;
}

/**
 * Complete Qatar address
 */
export interface QatarAddress {
  zone: string;
  street: string;
  building: string;
  unit?: string;
  latitude?: number;
  longitude?: number;
}

/**
 * API response wrapper for QNAS endpoints
 */
export interface QNASApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}
