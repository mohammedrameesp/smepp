/**
 * @file index.ts
 * @description QNAS (Qatar National Address System) integration module.
 * @module qnas
 *
 * Provides Qatar address lookup functionality using the official QNAS API.
 * Includes zones, streets, buildings, and GPS coordinate resolution.
 *
 * ## Qatar Address Format
 * All addresses in Qatar follow the format:
 * - Zone Number (e.g., 24)
 * - Street Number (e.g., 123)
 * - Building Number (e.g., 45)
 *
 * ## Configuration
 * Requires environment variables:
 * - `QNAS_API_TOKEN` - API authentication token
 * - `QNAS_API_DOMAIN` - Registered domain for API access
 *
 * @example
 * ```typescript
 * import {
 *   isQNASConfigured,
 *   fetchZones,
 *   fetchStreets,
 *   fetchBuildings,
 *   fetchLocation,
 *   QNASApiError,
 * } from '@/lib/qnas';
 *
 * // Check if QNAS is available
 * if (isQNASConfigured()) {
 *   const zones = await fetchZones();
 *   const streets = await fetchStreets('24');
 *   const buildings = await fetchBuildings('24', '123');
 *   const location = await fetchLocation('24', '123', '45');
 * }
 * ```
 *
 * @see https://qnas.qa - Official QNAS website
 */

// Types
export type {
  QNASZone,
  QNASStreet,
  QNASBuilding,
  QNASLocation,
  QatarAddress,
  QNASApiResponse,
} from './types';

// Client
export {
  isQNASConfigured,
  fetchZones,
  fetchStreets,
  fetchBuildings,
  fetchLocation,
  QNASApiError,
} from './client';
