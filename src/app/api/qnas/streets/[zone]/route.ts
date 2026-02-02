/**
 * @file route.ts
 * @description QNAS Streets API - Fetch streets for a specific zone
 * @module api/qnas/streets
 *
 * PUBLIC ENDPOINT - No authentication required
 * Returns all streets in a zone from the QNAS (Qatar National Address System) API
 */

import { NextRequest, NextResponse } from 'next/server';
import { isQNASConfigured, fetchStreets, QNASApiError } from '@/lib/qnas';

interface RouteParams {
  params: Promise<{ zone: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { zone } = await params;

  if (!zone) {
    return NextResponse.json(
      { error: 'Zone is required', streets: [] },
      { status: 400 }
    );
  }

  // Check if QNAS is configured
  if (!isQNASConfigured()) {
    return NextResponse.json(
      { error: 'QNAS API not configured', streets: [] },
      { status: 503 }
    );
  }

  try {
    const streets = await fetchStreets(zone);

    return NextResponse.json({
      zone,
      streets,
      count: streets.length,
    });
  } catch (error) {
    console.error(`[QNAS] Failed to fetch streets for zone ${zone}:`, error);

    if (error instanceof QNASApiError) {
      return NextResponse.json(
        { error: error.message, streets: [] },
        { status: error.code || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch streets', streets: [] },
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
