/**
 * QNAS (Qatar National Address System) API Client
 *
 * Handles communication with the QNAS API for fetching
 * zones, streets, buildings, and location coordinates.
 */

import type { QNASZone, QNASStreet, QNASBuilding, QNASLocation } from './types';

const QNAS_API_BASE = 'https://api.qna.gov.qa/api/v2';

/**
 * Custom error class for QNAS API errors
 */
export class QNASApiError extends Error {
  code?: number;
  details?: unknown;

  constructor(message: string, code?: number, details?: unknown) {
    super(message);
    this.name = 'QNASApiError';
    this.code = code;
    this.details = details;
  }
}

/**
 * Check if QNAS API is configured
 */
export function isQNASConfigured(): boolean {
  return !!(process.env.QNAS_API_TOKEN && process.env.QNAS_API_DOMAIN);
}

/**
 * Get QNAS API headers
 */
function getHeaders(): HeadersInit {
  const token = process.env.QNAS_API_TOKEN;
  const domain = process.env.QNAS_API_DOMAIN;

  if (!token || !domain) {
    throw new QNASApiError('QNAS API not configured. Set QNAS_API_TOKEN and QNAS_API_DOMAIN environment variables.');
  }

  return {
    'X-Token': token,
    'X-Domain': domain,
    'Accept': 'application/json',
  };
}

/**
 * Fetch all zones from QNAS API
 */
export async function fetchZones(): Promise<QNASZone[]> {
  const response = await fetch(`${QNAS_API_BASE}/get_zones`, {
    method: 'GET',
    headers: getHeaders(),
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    const error = await response.text();
    throw new QNASApiError(`Failed to fetch zones: ${response.statusText}`, response.status, error);
  }

  const data = await response.json();
  return data.zones || data || [];
}

/**
 * Fetch streets for a specific zone
 */
export async function fetchStreets(zone: string): Promise<QNASStreet[]> {
  if (!zone) {
    throw new QNASApiError('Zone is required');
  }

  const response = await fetch(`${QNAS_API_BASE}/get_streets/${encodeURIComponent(zone)}`, {
    method: 'GET',
    headers: getHeaders(),
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!response.ok) {
    const error = await response.text();
    throw new QNASApiError(`Failed to fetch streets: ${response.statusText}`, response.status, error);
  }

  const data = await response.json();
  return data.streets || data || [];
}

/**
 * Fetch buildings for a specific zone and street
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
      next: { revalidate: 3600 }, // Cache for 1 hour
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new QNASApiError(`Failed to fetch buildings: ${response.statusText}`, response.status, error);
  }

  const data = await response.json();
  return data.buildings || data || [];
}

/**
 * Fetch location coordinates for a specific address
 */
export async function fetchLocation(zone: string, street: string, building: string): Promise<QNASLocation | null> {
  if (!zone || !street || !building) {
    throw new QNASApiError('Zone, street, and building are required');
  }

  const response = await fetch(
    `${QNAS_API_BASE}/get_location/${encodeURIComponent(zone)}/${encodeURIComponent(street)}/${encodeURIComponent(building)}`,
    {
      method: 'GET',
      headers: getHeaders(),
      next: { revalidate: 86400 }, // Cache for 24 hours
    }
  );

  if (!response.ok) {
    // Return null for not found
    if (response.status === 404) {
      return null;
    }
    const error = await response.text();
    throw new QNASApiError(`Failed to fetch location: ${response.statusText}`, response.status, error);
  }

  const data = await response.json();

  if (data.latitude && data.longitude) {
    return {
      latitude: parseFloat(data.latitude),
      longitude: parseFloat(data.longitude),
    };
  }

  return null;
}
