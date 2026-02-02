/**
 * @file route.ts
 * @description QNAS Location API - Fetch coordinates for a specific address
 * @module api/qnas/location
 *
 * PUBLIC ENDPOINT - No authentication required
 * Returns latitude/longitude for an address from the QNAS (Qatar National Address System) API
 */

import { NextRequest, NextResponse } from 'next/server';
import { isQNASConfigured, fetchLocation, QNASApiError } from '@/lib/qnas';

interface RouteParams {
  params: Promise<{ zone: string; street: string; building: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { zone, street, building } = await params;

  if (!zone || !street || !building) {
    return NextResponse.json(
      { error: 'Zone, street, and building are required', location: null },
      { status: 400 }
    );
  }

  // Check if QNAS is configured
  if (!isQNASConfigured()) {
    return NextResponse.json(
      { error: 'QNAS API not configured', location: null },
      { status: 503 }
    );
  }

  try {
    const location = await fetchLocation(zone, street, building);

    if (!location) {
      return NextResponse.json({
        zone,
        street,
        building,
        location: null,
        message: 'Location not found',
      });
    }

    return NextResponse.json({
      zone,
      street,
      building,
      location,
    });
  } catch (error) {
    console.error(`[QNAS] Failed to fetch location for ${zone}/${street}/${building}:`, error);

    if (error instanceof QNASApiError) {
      return NextResponse.json(
        { error: error.message, location: null },
        { status: error.code || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch location', location: null },
      { status: 500 }
    );
  }
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
