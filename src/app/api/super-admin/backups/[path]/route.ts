/**
 * @file route.ts
 * @description Download or delete specific backup files with path validation
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/core/log';

const BACKUP_BUCKET = 'database-backups';
function validateBackupPath(path: string): string | null {
  // Reject empty paths
  if (!path || path.trim() === '') {
    return null;
  }

  // SECURITY: Reject path traversal attempts
  if (path.includes('..')) {
    logger.warn({ path }, 'Path traversal attempt detected in backup path');
    return null;
  }

  // SECURITY: Reject absolute paths
  if (path.startsWith('/')) {
    logger.warn({ path }, 'Absolute path rejected in backup path');
    return null;
  }

  // SECURITY: Reject null bytes
  if (path.includes('\0')) {
    logger.warn({ path }, 'Null byte detected in backup path');
    return null;
  }

  // SECURITY: Only allow safe characters
  // Backup paths should be like: "platform/YYYY-MM-DD/backup.json" or "tenant-slug/YYYY-MM-DD/backup.json"
  const safePathPattern = /^[a-zA-Z0-9\-_./]+$/;
  if (!safePathPattern.test(path)) {
    logger.warn({ path }, 'Invalid characters in backup path');
    return null;
  }

  // SECURITY: Prevent double slashes
  if (path.includes('//')) {
    logger.warn({ path }, 'Double slashes rejected in backup path');
    return null;
  }

  // SECURITY: Validate it looks like a backup file
  // Expected patterns: platform/YYYY-MM-DD/backup.json or {org-slug}/YYYY-MM-DD/backup.json
  const backupFilePattern = /^[a-zA-Z0-9-]+\/\d{4}-\d{2}-\d{2}\/backup\.json$/;
  if (!backupFilePattern.test(path)) {
    logger.warn({ path }, 'Path does not match expected backup file pattern');
    return null;
  }

  return path;
}

function getSupabaseClient() {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Supabase credentials not configured');
  }

  return createClient(supabaseUrl, supabaseKey);
}

// GET - Download a specific backup file
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { path: encodedPath } = await params;
    const decodedPath = decodeURIComponent(encodedPath);

    // SECURITY: Validate path after decoding to prevent path traversal
    const filePath = validateBackupPath(decodedPath);
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid backup path' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    // Download the file
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(filePath);

    if (error) {
      logger.error({ error: error.message, filePath }, 'Failed to download backup');
      return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
    }

    const filename = filePath.split('/').pop() || 'backup.json';
    const content = await data.text();

    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to download backup');
    return NextResponse.json(
      { error: 'Download failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a specific backup file
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isSuperAdmin) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const { path: encodedPath } = await params;
    const decodedPath = decodeURIComponent(encodedPath);

    // SECURITY: Validate path after decoding to prevent path traversal
    const filePath = validateBackupPath(decodedPath);
    if (!filePath) {
      return NextResponse.json({ error: 'Invalid backup path' }, { status: 400 });
    }

    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error({ error: error.message, filePath }, 'Failed to delete backup');
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    logger.info(`Backup deleted: ${filePath}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Failed to delete backup');
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
