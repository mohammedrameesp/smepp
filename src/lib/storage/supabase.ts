/**
 * @file supabase.ts
 * @description Supabase storage client with comprehensive security validations.
 *
 * Provides low-level storage operations with:
 * - Path traversal prevention
 * - Tenant isolation enforcement
 * - MIME type validation
 * - File size limits
 * - Signed URL expiry limits
 *
 * @module lib/storage
 *
 * @security
 * - All paths are validated and sanitized before use
 * - Tenant-scoped paths are auto-prefixed when tenantId is provided
 * - Only allowed MIME types can be uploaded
 * - File size is capped at MAX_FILE_SIZE_BYTES
 * - Signed URLs are limited to MAX_SIGNED_URL_EXPIRY_SECONDS
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Storage bucket name from environment or default */
const BUCKET_NAME = process.env.SUPABASE_BUCKET || 'durj-storage';

/** Maximum expiry time for signed URLs (1 hour) - security measure for sensitive files */
const MAX_SIGNED_URL_EXPIRY_SECONDS = 3600;

/** Default expiry time for signed URLs (1 hour) */
const DEFAULT_SIGNED_URL_EXPIRY_SECONDS = 3600;

/**
 * Allowed MIME types for file uploads.
 * Blocks executable and script files to prevent security issues.
 *
 * @security Only these content types are allowed for upload
 */
const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  // Text
  'text/plain',
  'text/csv',
  // Archives (be careful with these)
  'application/zip',
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parameters for uploading a file to storage.
 */
export interface UploadParams {
  /** File path within the bucket (will be sanitized) */
  path: string;
  /** File content as a Buffer */
  bytes: Buffer;
  /** MIME content type (must be in ALLOWED_MIME_TYPES) */
  contentType: string;
  /**
   * Optional tenant ID for path enforcement.
   * When provided, path will be auto-prefixed with tenant directory.
   * @security Ensures tenant isolation when set
   */
  tenantId?: string;
}

/**
 * Result from a successful Supabase upload operation.
 */
export interface SupabaseUploadResult {
  /** The final path where the file was stored */
  path: string;
  /** Unique identifier for the uploaded object */
  id: string;
  /** Full path including bucket */
  fullPath: string;
}

/**
 * Result from a successful Supabase remove operation.
 */
export interface SupabaseRemoveResult {
  /** Array of removed file objects */
  data: Array<{ name: string }>;
}

/**
 * Result from a successful Supabase list operation.
 */
export interface SupabaseListResult {
  /** File/folder name */
  name: string;
  /** Unique identifier */
  id: string | null;
  /** Last update timestamp */
  updated_at: string | null;
  /** Creation timestamp */
  created_at: string | null;
  /** Last access timestamp */
  last_accessed_at: string | null;
  /** File metadata */
  metadata: Record<string, unknown> | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PATH VALIDATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Validate and sanitize a file path to prevent security attacks.
 *
 * @param path - The file path to validate
 * @param tenantId - Optional tenant ID to enforce tenant-scoped paths
 * @returns Sanitized path (may be prefixed with tenant directory)
 * @throws Error if path contains security violations
 *
 * @security Prevents:
 * - Path traversal attacks (..)
 * - Absolute paths
 * - Null byte injection
 * - Invalid characters
 * - Double slashes
 *
 * @example
 * ```ts
 * // Simple path
 * validateAndSanitizePath('docs/file.pdf'); // 'docs/file.pdf'
 *
 * // With tenant ID - auto-prefixes
 * validateAndSanitizePath('docs/file.pdf', 'org_123');
 * // 'tenants/org_123/docs/file.pdf'
 *
 * // Path traversal blocked
 * validateAndSanitizePath('../etc/passwd'); // throws Error
 * ```
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
    throw new Error(
      'SECURITY: Path contains invalid characters. Only alphanumeric, dash, underscore, dot, and forward slash are allowed'
    );
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════

/** Lazy-initialized Supabase client instance */
let supabaseClient: SupabaseClient | null = null;

/**
 * Get the Supabase client instance, initializing if needed.
 *
 * Uses lazy initialization to avoid build-time errors when
 * environment variables are not yet available.
 *
 * @returns Configured Supabase client
 * @throws Error if required environment variables are missing
 *
 * @internal
 */
function getSupabaseClient(): SupabaseClient {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    logger.error(
      { hasUrl: !!supabaseUrl, hasKey: !!supabaseServiceKey },
      'Missing Supabase environment variables'
    );
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return supabaseClient;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE OPERATIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Upload a file to Supabase storage.
 *
 * @param params - Upload parameters
 * @returns Upload result with path information
 * @throws Error if validation fails or upload fails
 *
 * @security
 * - Path is validated and sanitized
 * - Content type must be in ALLOWED_MIME_TYPES
 * - File size must not exceed MAX_FILE_SIZE_BYTES
 *
 * @example
 * ```ts
 * const result = await sbUpload({
 *   path: 'documents/report.pdf',
 *   bytes: fileBuffer,
 *   contentType: 'application/pdf',
 *   tenantId: 'org_123',
 * });
 * // result.path = 'tenants/org_123/documents/report.pdf'
 * ```
 */
export async function sbUpload({
  path,
  bytes,
  contentType,
  tenantId,
}: UploadParams): Promise<SupabaseUploadResult> {
  // SECURITY: Validate path
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  // SECURITY: Validate content type
  if (!ALLOWED_MIME_TYPES.has(contentType)) {
    throw new Error(`SECURITY: Content type "${contentType}" is not allowed`);
  }

  // SECURITY: Validate file size
  if (bytes.length > MAX_FILE_SIZE_BYTES) {
    const maxSizeMB = MAX_FILE_SIZE_BYTES / 1024 / 1024;
    throw new Error(`SECURITY: File size exceeds maximum allowed (${maxSizeMB}MB)`);
  }

  const client = getSupabaseClient();
  const { data, error } = await client.storage.from(BUCKET_NAME).upload(sanitizedPath, bytes, {
    contentType,
    upsert: true,
  });

  if (error) {
    logger.error({ error: error.message, path: sanitizedPath }, 'Supabase upload failed');
    throw new Error(`Upload failed: ${error.message}`);
  }

  return data as SupabaseUploadResult;
}

/**
 * Get the public URL for a file in storage.
 *
 * @param path - File path in storage
 * @param tenantId - Optional tenant ID for path enforcement
 * @returns Public URL for the file
 *
 * @security Path is validated even for read operations
 *
 * @example
 * ```ts
 * const url = await sbPublicUrl('documents/report.pdf', 'org_123');
 * // https://xxx.supabase.co/storage/v1/object/public/bucket/tenants/org_123/documents/report.pdf
 * ```
 */
export async function sbPublicUrl(path: string, tenantId?: string): Promise<string> {
  // SECURITY: Validate path even for reads
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  const client = getSupabaseClient();
  const { data } = client.storage.from(BUCKET_NAME).getPublicUrl(sanitizedPath);

  return data.publicUrl;
}

/**
 * Create a signed URL for temporary file access.
 *
 * @param path - File path in storage
 * @param expiresInSec - URL expiry time in seconds (max: MAX_SIGNED_URL_EXPIRY_SECONDS)
 * @param tenantId - Optional tenant ID for path enforcement
 * @returns Signed URL with limited validity
 * @throws Error if URL creation fails
 *
 * @security
 * - Expiry is capped at MAX_SIGNED_URL_EXPIRY_SECONDS for sensitive files
 * - Path is validated before URL generation
 *
 * @example
 * ```ts
 * // URL valid for 5 minutes
 * const url = await sbSignedUrl('documents/sensitive.pdf', 300, 'org_123');
 *
 * // Requesting 2 hours gets capped to 1 hour
 * const url = await sbSignedUrl('documents/file.pdf', 7200, 'org_123');
 * // Actual expiry: 3600 seconds (1 hour)
 * ```
 */
export async function sbSignedUrl(
  path: string,
  expiresInSec: number = DEFAULT_SIGNED_URL_EXPIRY_SECONDS,
  tenantId?: string
): Promise<string> {
  // SECURITY: Validate path
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  // SECURITY: Limit maximum expiry for sensitive files
  const safeExpiry = Math.min(expiresInSec, MAX_SIGNED_URL_EXPIRY_SECONDS);

  const client = getSupabaseClient();
  const { data, error } = await client.storage
    .from(BUCKET_NAME)
    .createSignedUrl(sanitizedPath, safeExpiry);

  if (error) {
    logger.error({ error: error.message, path: sanitizedPath }, 'Supabase signed URL creation failed');
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  return data.signedUrl;
}

/**
 * Remove a file from storage.
 *
 * @param path - File path to remove
 * @param tenantId - Optional tenant ID for path enforcement
 * @returns Remove operation result
 * @throws Error if removal fails
 *
 * @security Path is validated before removal
 *
 * @example
 * ```ts
 * await sbRemove('documents/old-file.pdf', 'org_123');
 * ```
 */
export async function sbRemove(path: string, tenantId?: string): Promise<SupabaseRemoveResult> {
  // SECURITY: Validate path
  const sanitizedPath = validateAndSanitizePath(path, tenantId);

  const client = getSupabaseClient();
  const { data, error } = await client.storage.from(BUCKET_NAME).remove([sanitizedPath]);

  if (error) {
    logger.error({ error: error.message, path: sanitizedPath }, 'Supabase file removal failed');
    throw new Error(`Failed to remove file: ${error.message}`);
  }

  return { data: data ?? [] } as SupabaseRemoveResult;
}

/**
 * List files in a storage directory.
 *
 * @param prefix - Directory prefix to list (optional)
 * @param tenantId - Optional tenant ID to scope listing
 * @returns Array of file/folder objects
 * @throws Error if listing fails
 *
 * @security
 * - Prefix is validated if provided
 * - Listing is auto-scoped to tenant directory when tenantId is provided
 *
 * @example
 * ```ts
 * // List all files for a tenant
 * const files = await sbList(undefined, 'org_123');
 * // Lists contents of tenants/org_123/
 *
 * // List specific directory
 * const docs = await sbList('documents', 'org_123');
 * // Lists contents of tenants/org_123/documents/
 * ```
 */
export async function sbList(
  prefix?: string,
  tenantId?: string
): Promise<SupabaseListResult[]> {
  // SECURITY: Validate prefix if provided
  let sanitizedPrefix = prefix;
  if (prefix) {
    sanitizedPrefix = validateAndSanitizePath(prefix, tenantId);
  } else if (tenantId) {
    // If no prefix but tenantId provided, scope to tenant directory
    sanitizedPrefix = `tenants/${tenantId}`;
  }

  const client = getSupabaseClient();
  const { data, error } = await client.storage.from(BUCKET_NAME).list(sanitizedPrefix);

  if (error) {
    logger.error({ error: error.message, prefix: sanitizedPrefix }, 'Supabase file listing failed');
    throw new Error(`Failed to list files: ${error.message}`);
  }

  return (data ?? []) as SupabaseListResult[];
}

// Export for testing
export { validateAndSanitizePath };
