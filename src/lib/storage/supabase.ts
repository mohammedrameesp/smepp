import { createClient, SupabaseClient } from '@supabase/supabase-js';

const bucketName = process.env.SUPABASE_BUCKET || 'smepp-storage';

// Lazy-initialized Supabase client to avoid build-time errors
let supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (supabase) return supabase;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars:', {
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    });
    throw new Error('Missing Supabase environment variables');
  }

  supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabase;
}

export interface UploadParams {
  path: string;
  bytes: Buffer;
  contentType: string;
}

export async function sbUpload({ path, bytes, contentType }: UploadParams) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .upload(path, bytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data;
}

export async function sbPublicUrl(path: string) {
  const client = getSupabaseClient();
  const { data } = client.storage
    .from(bucketName)
    .getPublicUrl(path);

  return data.publicUrl;
}

export async function sbSignedUrl(path: string, expiresInSec: number = 3600) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUrl(path, expiresInSec);

  if (error) {
    console.error('Supabase signed URL error:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function sbRemove(path: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .remove([path]);

  if (error) {
    console.error('Supabase remove error:', error);
    throw new Error(`Failed to remove file: ${error.message}`);
  }

  return data;
}

export async function sbList(prefix?: string) {
  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .list(prefix);

  if (error) {
    console.error('Supabase list error:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data;
}