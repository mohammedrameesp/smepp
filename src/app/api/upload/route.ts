/**
 * @file route.ts
 * @description File upload endpoint with Supabase storage
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { validateUploadedFile } from '@/lib/files/sanity';
import { storageUpload, storagePublicUrl } from '@/lib/storage';
import { logAction } from '@/lib/core/activity';
import logger from '@/lib/core/log';

// Force Node.js runtime for file upload handling
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'];
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg'
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * POST /api/upload
 *
 * Handles file uploads to Supabase storage
 *
 * Request body (multipart/form-data):
 * - file: The file to upload (required)
 * - bucket: The bucket name (optional, defaults to 'storage')
 *
 * Response:
 * - url: The file path in Supabase storage
 */
export async function POST(request: NextRequest) {
  logger.debug('Starting file upload');

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    logger.debug({ authenticated: !!session?.user }, 'Session check');

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // SECURITY: Require tenant context for file isolation
    const tenantId = session.user.organizationId;
    if (!tenantId) {
      return NextResponse.json(
        { error: 'Tenant context required' },
        { status: 403 }
      );
    }

    // Parse the multipart form data using Next.js built-in API
    let formData: FormData;
    try {
      logger.debug('Parsing multipart form');
      formData = await request.formData();
      logger.debug('Form parsed successfully');
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error parsing form data');
      return NextResponse.json(
        { error: 'Failed to parse upload data. Please ensure the file is under 10MB.' },
        { status: 400 }
      );
    }

    // Get the file from form data
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    // Validate file extension
    const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return NextResponse.json(
        { error: `File type ${extension} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 }
      );
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `Invalid file type: ${file.type}` },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Run sanity checks on file content
    const sanityCheck = await validateUploadedFile(
      buffer,
      file.name,
      file.type
    );

    if (!sanityCheck.valid) {
      return NextResponse.json(
        { error: sanityCheck.error || 'File content validation failed' },
        { status: 400 }
      );
    }

    // Generate unique file path with tenant isolation
    // Files are stored under: {tenantId}/{timestamp}.{ext}
    const timestamp = Date.now();
    const fileName = `${timestamp}${extension}`;
    const filePath = `${tenantId}/${fileName}`; // Tenant-scoped path for isolation

    // Upload to Supabase storage
    try {
      logger.debug({ fileSize: buffer.length }, 'Uploading to Supabase storage');

      await storageUpload({
        path: filePath,
        bytes: buffer,
        contentType: file.type || 'application/octet-stream',
      });

      logger.debug('Upload to Supabase successful');
    } catch (error) {
      logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error uploading to Supabase');
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded file
    const publicUrl = await storagePublicUrl(filePath);

    // Log the upload action
    try {
      await logAction(
        tenantId,
        session.user.id,
        'UPLOAD_FILE',
        'file',
        filePath,
        {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          publicUrl,
        }
      );
    } catch {
      // Don't fail the request if logging fails
    }

    // Return the public URL
    return NextResponse.json({
      url: publicUrl,
      fileName: file.name,
      size: file.size,
      mimeType: file.type,
    });

  } catch (error) {
    logger.error({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Unexpected error in upload endpoint');
    return NextResponse.json(
      { error: 'An unexpected error occurred during upload' },
      { status: 500 }
    );
  }
}
