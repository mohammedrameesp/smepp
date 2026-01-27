/**
 * @file route.ts
 * @description File upload endpoint with Supabase storage
 * @module api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateUploadedFile } from '@/lib/files/sanity';
import { storageUpload, storagePublicUrl } from '@/lib/storage';
import { logAction, ActivityActions } from '@/lib/core/activity';
import logger from '@/lib/core/log';
import { withErrorHandler } from '@/lib/http/handler';
import { badRequestResponse } from '@/lib/http/errors';

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
export const POST = withErrorHandler(async (request: NextRequest, { tenant }) => {
  const tenantId = tenant!.tenantId;
  const userId = tenant!.userId;

  logger.debug('Starting file upload');

  // Parse the multipart form data using Next.js built-in API
  let formData: FormData;
  try {
    logger.debug('Parsing multipart form');
    formData = await request.formData();
    logger.debug('Form parsed successfully');
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Error parsing form data');
    return badRequestResponse('Failed to parse upload data. Please ensure the file is under 10MB.');
  }

  // Get the file from form data
  const file = formData.get('file') as File | null;
  if (!file) {
    return badRequestResponse('No file provided');
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    return badRequestResponse('File size exceeds 10MB limit');
  }

  // Validate file extension
  const extension = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return badRequestResponse(`File type ${extension} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Validate MIME type
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return badRequestResponse(`Invalid file type: ${file.type}`);
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
    return badRequestResponse(sanityCheck.error || 'File content validation failed');
  }

  // Generate unique file path with tenant isolation
  // Files are stored under: {tenantId}/{timestamp}.{ext}
  const timestamp = Date.now();
  const fileName = `${timestamp}${extension}`;
  const filePath = `${tenantId}/${fileName}`; // Tenant-scoped path for isolation

  // Upload to Supabase storage
  logger.debug({ fileSize: buffer.length }, 'Uploading to Supabase storage');

  await storageUpload({
    path: filePath,
    bytes: buffer,
    contentType: file.type || 'application/octet-stream',
  });

  logger.debug('Upload to Supabase successful');

  // Get the public URL for the uploaded file
  const publicUrl = await storagePublicUrl(filePath);

  // Log the upload action
  try {
    await logAction(
      tenantId,
      userId,
      ActivityActions.FILE_UPLOADED,
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
}, { requireAuth: true });
