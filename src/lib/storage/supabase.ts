import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';

const bucketName = process.env.SUPABASE_BUCKET || 'durj-storage';

/**
 * SECURITY: Validate file path to prevent path traversal attacks
 * @param path - The file path to validate
 * @param tenantId - Optional tenant ID to enforce tenant-scoped paths
 * @returns Sanitized path
 * @throws Error if path is invalid
 */
function validateAndSanitizePath(path: string, tenantId?: string): string {
  // Reject empty paths
  if (!path || path.trim() === '') {
    throw new Error('SECURITY: Path cannot be empty');
  }

  // Reject path traversal attempts
  if (path.includes('..')) {
    throw new Error('SECURITY: Path traversal detected - ".." is not allowed');
  }

  // Reject absolute paths (shouldn't start with /)
  if (path.startsWith('/')) {
    throw new Error('SECURITY: Absolute paths are not allowed');
  }

  // Reject null bytes (can bypass some security checks)
  if (path.includes('\0')) {
    throw new Error('SECURITY: Null bytes are not allowed in path');
  }

  // Only allow safe characters: alphanumeric, dash, underscore, dot, forward slash
  const safePathPattern = /^[a-zA-Z0-9\-_./]+$/;
  if (!safePathPattern.test(path)) {
    throw new Error('SECURITY: Path contains invalid characters. Only alphanumeric, dash, underscore, dot, and forward slash are allowed');
  }

  // Prevent double slashes
  if (path.includes('//')) {
    throw new Error('SECURITY: Double slashes are not allowed in path');
  }

  // If tenantId is provided, ensure path is tenant-scoped
  if (tenantId) {
    const expectedPrefix = `tenants/${tenantId}/`;
    if (!path.startsWith(expectedPrefix)) {
      // Auto-prefix with tenant path for safety
      return `${expectedPrefix}${path}`;
    }
  }

  return path;
}

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
  tenantId?: string; // SECURITY: Optional tenant ID for path enforcement
}

// SECURITY: Allowed MIME types for uploads
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain', 'text/csv',
  // Archives (be careful with these)
  'application/zip',
]);


export async function sbUpload({ path, bytes, contentType, tenantId }: UploadParams) {
  // SECURITY: Validate path
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  // SECURITY: Validate content type
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`SECURITY: Content type "${contentType}" is not allowed`);
  }

  // SECURITY: Validate file size
  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`SECURITY: File size exceeds maximum allowed (${MAX_FILE_SIZE_BYTES / 1024 / 1024}MB)`);
  }

  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .upload(sanitizedPath, bytes, {
      contentType,
      upsert: true,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data;
}

export async function sbPublicUrl(path: string, tenantId?: string) {
  // SECURITY: Validate path even for reads
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  const client = getSupabaseClient();
  const { data } = client.storage
    .from(bucketName)
    .getPublicUrl(sanitizedPath);

  return data.publicUrl;
}

export async function sbSignedUrl(path: string, expiresInSec: number = 3600, tenantId?: string) {
  // SECURITY: Validate path
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  // SECURITY: Limit maximum expiry to 1 hour for sensitive files
  const maxExpiry = 3600;
  const safeExpiry = Math.min(expiresInSec, maxExpiry);

  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .createSignedUrl(sanitizedPath, safeExpiry);

  if (error) {
    console.error('Supabase signed URL error:', error);
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

export async function sbRemove(path: string, tenantId?: string) {
  // SECURITY: Validate path
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .remove([sanitizedPath]);

  if (error) {
    console.error('Supabase remove error:', error);
    throw new Error(`Failed to remove file: ${error.message}`);
  }

  return data;
}

export async function sbList(prefix?: string, tenantId?: string) {
  // SECURITY: Validate prefix if provided
  let sanitizedPrefix = prefix;
  if (prefix) {
    sanitizedPrefix = validateAndSanitizePath(prefix, tenantId);
  } else if (tenantId) {
    // If no prefix but tenantId provided, scope to tenant directory
    sanitizedPrefix = `tenants/${tenantId}`;
  }

  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(bucketName)
    .list(sanitizedPrefix);

  if (error) {
    console.error('Supabase list error:', error);
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return data;
}

// Export for testing
export { validateAndSanitizePath };