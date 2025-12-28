import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { createClient } from '@supabase/supabase-js';
import logger from '@/lib/log';

const BACKUP_BUCKET = 'database-backups';

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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { path: encodedPath } = await params;
    const filePath = decodeURIComponent(encodedPath);

    const supabase = getSupabaseClient();

    // Download the file
    const { data, error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .download(filePath);

    if (error) {
      logger.error({ error, filePath }, 'Failed to download backup');
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
    logger.error({ error }, 'Failed to download backup');
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
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { path: encodedPath } = await params;
    const filePath = decodeURIComponent(encodedPath);

    const supabase = getSupabaseClient();

    const { error } = await supabase.storage
      .from(BACKUP_BUCKET)
      .remove([filePath]);

    if (error) {
      logger.error({ error, filePath }, 'Failed to delete backup');
      return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
    }

    logger.info(`Backup deleted: ${filePath}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete backup');
    return NextResponse.json(
      { error: 'Delete failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
