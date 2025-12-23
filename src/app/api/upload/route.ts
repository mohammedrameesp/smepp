import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { validateUploadedFile } from '@/lib/files/sanity';
import { storageUpload, storagePublicUrl } from '@/lib/storage';
import { logAction } from '@/lib/activity';

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
  console.log('[UPLOAD] Starting file upload...');

  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    console.log('[UPLOAD] Session check:', session?.user ? 'Authenticated' : 'Not authenticated');

    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the multipart form data using Next.js built-in API
    let formData: FormData;
    try {
      console.log('[UPLOAD] Parsing multipart form...');
      formData = await request.formData();
      console.log('[UPLOAD] Form parsed successfully');
    } catch (error) {
      console.error('[UPLOAD] Error parsing form data:', error);
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

    // Generate unique file path
    const timestamp = Date.now();
    const fileName = `${timestamp}${extension}`;
    const filePath = fileName; // File will be stored directly in the bucket root

    // Upload to Supabase storage
    try {
      console.log('[UPLOAD] Uploading to Supabase storage...');
      console.log('[UPLOAD] File path:', filePath);
      console.log('[UPLOAD] File size:', buffer.length, 'bytes');

      await storageUpload({
        path: filePath,
        bytes: buffer,
        contentType: file.type || 'application/octet-stream',
      });

      console.log('[UPLOAD] Upload to Supabase successful');
    } catch (error) {
      console.error('[UPLOAD] Error uploading to Supabase:', error);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 500 }
      );
    }

    // Get the public URL for the uploaded file
    const publicUrl = await storagePublicUrl(filePath);
    console.log('[UPLOAD] Public URL:', publicUrl);

    // Log the upload action
    try {
      await logAction(
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
    } catch (error) {
      console.error('Error logging upload action:', error);
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
    console.error('[UPLOAD] Unexpected error in upload endpoint:', error);
    console.error('[UPLOAD] Error stack:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { error: 'An unexpected error occurred during upload' },
      { status: 500 }
    );
  }
}
