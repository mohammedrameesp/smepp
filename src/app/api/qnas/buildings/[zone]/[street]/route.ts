/**
 * @file route.ts
 * @description QNAS Buildings API - Fetch buildings for a specific zone and street
 * @module api/qnas/buildings
 *
 * PUBLIC ENDPOINT - No authentication required
 * Returns all buildings on a street from the QNAS (Qatar National Address System) API
 */

import { NextRequest, NextResponse } from 'next/server';
import { isQNASConfigured, fetchBuildings, QNASApiError } from '@/lib/qnas';

interface RouteParams {
  params: Promise<{ zone: string; street: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { zone, street } = await params;

  if (!zone || !street) {
    return NextResponse.json(
      { error: 'Zone and street are required', buildings: [] },
      { status: 400 }
    );
  }

  // Check if QNAS is configured
  if (!isQNASConfigured()) {
    return NextResponse.json(
      { error: 'QNAS API not configured', buildings: [] },
      { status: 503 }
    );
  }

  try {
    const buildings = await fetchBuildings(zone, street);

    return NextResponse.json({
      zone,
      street,
      buildings,
      count: buildings.length,
    });
  } catch (error) {
    console.error(`[QNAS] Failed to fetch buildings for zone ${zone}, street ${street}:`, error);

    if (error instanceof QNASApiError) {
      return NextResponse.json(
        { error: error.message, buildings: [] },
        { status: error.code || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch buildings', buildings: [] },
      { status: 500 }
    );
  }
}
