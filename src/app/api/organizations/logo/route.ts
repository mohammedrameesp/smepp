/**
 * @file route.ts
 * @description Organization logo upload endpoint
 * @module api/organizations/logo
 *
 * Handles organization logo uploads with:
 * - File type validation (PNG, WebP, SVG only - JPEG rejected for transparency)
 * - File size validation (max 2MB)
 * - Automatic inverse logo generation for dark backgrounds
 * - Storage in Supabase with public URL generation
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { sbUpload, sbPublicUrl } from '@/lib/storage/supabase';
import { updateSetupProgress } from '@/features/onboarding/lib';
import {
  generateInverseLogo,
  isRejectedMimeType,
  getExtensionForMimeType,
} from '@/lib/images';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';
import { MAX_LOGO_SIZE_BYTES } from '@/lib/constants';

// Force Node.js runtime (required for Buffer operations)
export const runtime = 'nodejs';

/** Allowed image MIME types - JPEG excluded as it doesn't support transparency */
const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/svg+xml'];

// ═══════════════════════════════════════════════════════════════════════════════
// OPTIONS /api/organizations/logo - Handle CORS preflight
// ═══════════════════════════════════════════════════════════════════════════════

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/organizations/logo - Upload organization logo
// ═══════════════════════════════════════════════════════════════════════════════

export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;

  // Parse form data
  const formData = await request.formData();
  const file = formData.get('logo') as File | null;

  if (!file) {
    return badRequestResponse('No file provided');
  }

  // Explicitly reject JPEG/JPG with helpful message
  if (isRejectedMimeType(file.type)) {
    return badRequestResponse(
      'JPEG/JPG format is not supported for logos. Please use PNG, WebP, or SVG for better quality with transparency support.'
    );
  }

  // Validate file type
  if (!ALLOWED_TYPES.includes(file.type)) {
    return badRequestResponse('Invalid file type. Allowed: PNG, WebP, SVG');
  }

  // Validate file size
  if (file.size > MAX_LOGO_SIZE_BYTES) {
    return badRequestResponse('File too large. Maximum size is 2MB');
  }

  // Get file extension from MIME type for consistency
  const ext = getExtensionForMimeType(file.type);
  const logoPath = `orgs/${tenantId}/logo.${ext}`;
  const inversePath = `orgs/${tenantId}/logo-inverse.${ext}`;

  // Upload to Supabase
  const bytes = Buffer.from(await file.arrayBuffer());

  logger.debug({ path: logoPath, size: bytes.length, contentType: file.type }, 'Logo upload starting');

  await sbUpload({
    path: logoPath,
    bytes,
    contentType: file.type,
  });
  logger.debug('Logo original upload successful');

  // Get public URL with cache-busting timestamp
  const baseUrl = await sbPublicUrl(logoPath);
  const logoUrl = `${baseUrl}?v=${Date.now()}`;
  logger.debug({ logoUrl }, 'Logo public URL generated');

  // Generate inverse (white) version for dark backgrounds
  let logoUrlInverse: string | null = null;

  logger.debug('Generating inverse logo version');
  const inverseResult = await generateInverseLogo(bytes, file.type);

  if (inverseResult.success && inverseResult.buffer) {
    try {
      await sbUpload({
        path: inversePath,
        bytes: inverseResult.buffer,
        contentType: file.type,
      });

      const baseInverseUrl = await sbPublicUrl(inversePath);
      logoUrlInverse = `${baseInverseUrl}?v=${Date.now()}`;
      logger.debug({ logoUrlInverse }, 'Logo inverse upload successful');
    } catch (inverseUploadError) {
      // Log but don't fail - inverse is optional enhancement
      logger.error(
        { error: inverseUploadError instanceof Error ? inverseUploadError.message : String(inverseUploadError) },
        'Logo inverse upload failed (non-critical)'
      );
    }
  } else {
    logger.warn(
      { error: inverseResult.error },
      'Logo inverse generation failed (non-critical)'
    );
  }

  // Update organization with both URLs
  await prisma.organization.update({
    where: { id: tenantId },
    data: { logoUrl, logoUrlInverse },
  });

  // Update setup progress (non-blocking)
  updateSetupProgress(tenantId, 'logoUploaded', true).catch(() => {});

  return NextResponse.json({
    success: true,
    logoUrl,
    logoUrlInverse,
    inverseGenerated: !!logoUrlInverse,
  });
}, { requireAuth: true, requireAdmin: true });

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
