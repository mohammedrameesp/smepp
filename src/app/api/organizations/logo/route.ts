import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { sbUpload, sbPublicUrl } from '@/lib/storage/supabase';

// Maximum file size: 2MB
const MAX_FILE_SIZE = 2 * 1024 * 1024;

// Allowed image types
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

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
    const membership = await prisma.organizationUser.findFirst({
      where: {
        userId: session.user.id,
        organizationId,
        role: { in: ['OWNER', 'ADMIN'] },
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

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PNG, JPEG, WebP, SVG' },
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

    // Get file extension
    const ext = file.name.split('.').pop() || 'png';
    const path = `orgs/${organizationId}/logo.${ext}`;

    // Upload to Supabase
    const bytes = Buffer.from(await file.arrayBuffer());

    console.log('[Logo Upload] Uploading to path:', path);
    console.log('[Logo Upload] File size:', bytes.length, 'bytes');
    console.log('[Logo Upload] Content type:', file.type);

    try {
      await sbUpload({
        path,
        bytes,
        contentType: file.type,
      });
      console.log('[Logo Upload] Upload successful');
    } catch (uploadError) {
      console.error('[Logo Upload] Upload failed:', uploadError);
      throw uploadError;
    }

    // Get public URL
    const logoUrl = await sbPublicUrl(path);
    console.log('[Logo Upload] Public URL:', logoUrl);

    // Update organization
    await prisma.organization.update({
      where: { id: organizationId },
      data: { logoUrl },
    });

    return NextResponse.json({
      success: true,
      logoUrl,
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
