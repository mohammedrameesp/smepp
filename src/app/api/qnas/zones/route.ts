/**
 * @file route.ts
 * @description QNAS Zones API - Fetch all Qatar zones
 * @module api/qnas/zones
 *
 * PUBLIC ENDPOINT - No authentication required
 * Returns all zones from the QNAS (Qatar National Address System) API
 */

import { NextResponse } from 'next/server';
import { isQNASConfigured, fetchZones, QNASApiError } from '@/lib/qnas';

export async function GET() {
  // Check if QNAS is configured
  if (!isQNASConfigured()) {
    return NextResponse.json(
      { error: 'QNAS API not configured', zones: [] },
      { status: 503 }
    );
  }

  try {
    const zones = await fetchZones();

    return NextResponse.json({
      zones,
      count: zones.length,
    });
  } catch (error) {
    console.error('[QNAS] Failed to fetch zones:', error);

    if (error instanceof QNASApiError) {
      return NextResponse.json(
        { error: error.message, zones: [] },
        { status: error.code || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch zones', zones: [] },
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
