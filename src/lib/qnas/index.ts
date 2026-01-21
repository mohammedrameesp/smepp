/**
 * QNAS (Qatar National Address System) Integration
 *
 * Provides Qatar address lookup functionality using the
 * official QNAS API. Includes zones, streets, buildings,
 * and location coordinates.
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
