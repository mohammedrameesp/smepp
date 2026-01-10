import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import logger from '@/lib/core/log';
import { sbUpload, sbPublicUrl } from '@/lib/storage/supabase';
import { updateSetupProgress } from '@/features/onboarding/lib';
import {
  generateInverseLogo,
  isRejectedMimeType,
  getExtensionForMimeType,
} from '@/lib/images';

// Force Node.js runtime (required for Buffer operations)
export const runtime = 'nodejs';

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image types (no JPEG - doesn't support transparency well)
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

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user has an organization
    const organizationId = session.user.organizationId;
    if (!organizationId) {
      return NextResponse.json(
        { error: 'No organization found' },
        { status: 400 }
      );
    }

    // Check user is owner/admin of org
    const membership = await prisma.teamMember.findFirst({
      where: {
        id: session.user.id,
        tenantId: organizationId,
        isDeleted: false,
        OR: [{ isOwner: true }, { role: 'ADMIN' }],
      },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'You do not have permission to update organization logo' },
        { status: 403 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Explicitly reject JPEG/JPG with helpful message
    if (isRejectedMimeType(file.type)) {
      return NextResponse.json(
        {
          error:
            'JPEG/JPG format is not supported for logos. Please use PNG, WebP, or SVG for better quality with transparency support.',
        },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, WebP, SVG' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 2MB' },
        { status: 400 }
      );
    }

    // Get file extension from MIME type for consistency
    const ext = getExtensionForMimeType(file.type);
    const logoPath = `orgs/${organizationId}/logo.${ext}`;
    const inversePath = `orgs/${organizationId}/logo-inverse.${ext}`;

    // Upload to Supabase
    const bytes = Buffer.from(await file.arrayBuffer());

    logger.debug({ path: logoPath, size: bytes.length, contentType: file.type }, 'Logo upload starting');

    try {
      await sbUpload({
        path: logoPath,
        bytes,
        contentType: file.type,
      });
      logger.debug('Logo original upload successful');
    } catch (uploadError) {
      logger.error({ error: uploadError instanceof Error ? uploadError.message : String(uploadError) }, 'Logo upload failed');
      throw uploadError;
    }

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
      where: { id: organizationId },
      data: { logoUrl, logoUrlInverse },
    });

    // Update setup progress (non-blocking)
    updateSetupProgress(organizationId, 'logoUploaded', true).catch(() => {});

    return NextResponse.json({
      success: true,
      logoUrl,
      logoUrlInverse,
      inverseGenerated: !!logoUrlInverse,
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : String(error) }, 'Logo upload error');
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to upload logo: ${message}` },
      { status: 500 }
    );
  }
}
