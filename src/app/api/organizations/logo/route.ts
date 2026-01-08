import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { sbUpload, sbPublicUrl } from '@/lib/storage/supabase';
import { updateSetupProgress } from '@/features/onboarding/lib';
import {
  generateInverseLogo,
  isRejectedMimeType,
  getExtensionForMimeType,
} from '@/lib/images';

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image types (no JPEG - doesn't support transparency well)
const ALLOWED_TYPES = ['image/png', 'image/webp', 'image/svg+xml'];

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

    console.log('[Logo Upload] Uploading to path:', logoPath);
    console.log('[Logo Upload] File size:', bytes.length, 'bytes');
    console.log('[Logo Upload] Content type:', file.type);

    try {
      await sbUpload({
        path: logoPath,
        bytes,
        contentType: file.type,
      });
      console.log('[Logo Upload] Original upload successful');
    } catch (uploadError) {
      console.error('[Logo Upload] Upload failed:', uploadError);
      throw uploadError;
    }

    // Get public URL with cache-busting timestamp
    const baseUrl = await sbPublicUrl(logoPath);
    const logoUrl = `${baseUrl}?v=${Date.now()}`;
    console.log('[Logo Upload] Public URL:', logoUrl);

    // Generate inverse (white) version for dark backgrounds
    let logoUrlInverse: string | null = null;

    console.log('[Logo Upload] Generating inverse version...');
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
        console.log('[Logo Upload] Inverse upload successful:', logoUrlInverse);
      } catch (inverseUploadError) {
        // Log but don't fail - inverse is optional enhancement
        console.error(
          '[Logo Upload] Inverse upload failed (non-critical):',
          inverseUploadError
        );
      }
    } else {
      console.warn(
        '[Logo Upload] Inverse generation failed (non-critical):',
        inverseResult.error
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
    console.error('Logo upload error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to upload logo: ${message}` },
      { status: 500 }
    );
  }
}
