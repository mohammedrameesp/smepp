/**
 * @file route.ts
 * @description Health check endpoint for monitoring and load balancer probes
 * @module system/health
 *
 * Returns system health status including:
 * - Database connectivity and latency
 * - Supabase storage connectivity
 * - Application version (Git SHA)
 * - Process uptime
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import { sbSignedUrl } from '@/lib/storage/supabase';

interface HealthCheck {
  status: 'up' | 'down' | 'unknown';
  latency?: number;
  error?: string;
}

export async function GET() {
  const startTime = Date.now();
  const checks: Record<string, HealthCheck> = {};
  let allHealthy = true;

  // Database check
  try {
    const dbStart = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    checks.db = {
      status: 'up',
      latency: Date.now() - dbStart,
    };
  } catch (error) {
    checks.db = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Database connection failed',
    };
    allHealthy = false;
  }

  // Supabase Storage check
  try {
    const supabaseStart = Date.now();
    
    // Try to generate a signed URL for a dummy path (doesn't need to exist)
    const testPath = 'health-check/test.txt';
    await sbSignedUrl(testPath, 60);
    
    checks.supabase = {
      status: 'up',
      latency: Date.now() - supabaseStart,
    };
  } catch (error) {
    const isConfigIssue = error instanceof Error && 
      (error.message.includes('SUPABASE_URL') || 
       error.message.includes('SUPABASE_SERVICE_ROLE_KEY'));
    
    checks.supabase = {
      status: isConfigIssue ? 'unknown' : 'down',
      error: error instanceof Error ? error.message : 'Supabase connection failed',
    };
    
    if (!isConfigIssue) {
      allHealthy = false;
    }
  }

  // Get Git SHA if available (for deployment tracking)
  const version = process.env.GIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || 'dev';

  const response = {
    ok: allHealthy,
    time: new Date().toISOString(),
    version,
    uptime: process.uptime(),
    totalLatency: Date.now() - startTime,
    checks,
  };

  return NextResponse.json(response, {
    status: allHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
  });
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */