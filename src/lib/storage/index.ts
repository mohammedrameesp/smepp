/**
 * @file index.ts
 * @description Barrel exports for storage module with tenant-isolated wrappers.
 *
 * Provides a provider-agnostic interface that wraps Supabase storage.
 * All operations enforce tenant isolation via path prefixing.
 *
 * @module lib/storage
 *
 * @example
 * ```ts
 * import { storageUpload, storagePublicUrl, cleanupStorageFile } from '@/lib/storage';
 *
 * // Upload a file
 * await storageUpload({ path: 'docs/file.pdf', bytes: buffer, contentType: 'application/pdf', tenantId });
 *
 * // Get public URL
 * const url = await storagePublicUrl('docs/file.pdf', tenantId);
 *
 * // Clean up on delete
 * await cleanupStorageFile(fileUrl, tenantId);
 * ```
 */

import logger from '@/lib/core/log';
import {
  sbUpload,
  sbPublicUrl,
  sbRemove,
  type UploadParams,
  type SupabaseUploadResult,
  type SupabaseRemoveResult,
} from './supabase';

// Re-export cleanup utility
export { cleanupStorageFile } from './cleanup';

// Re-export types
export type { UploadParams };

/**
 * Upload a file to storage with tenant isolation.
 *
 * @param params - Upload parameters including path, bytes, contentType, and optional tenantId
 * @returns Supabase upload response data with path information
 * @throws Error if upload fails, content type is not allowed, or file exceeds size limit
 *
 * @security
 * - Files are validated for MIME type before upload
 * - File size is validated against MAX_FILE_SIZE_BYTES
 * - Path is sanitized to prevent traversal attacks
 *
 * @example
 * ```ts
 * const result = await storageUpload({
 *   path: 'documents/contract.pdf',
 *   bytes: Buffer.from(fileContent),
 *   contentType: 'application/pdf',
 *   tenantId: 'org_123',
 * });
 * console.log(result.path); // tenants/org_123/documents/contract.pdf
 * ```
 */
export async function storageUpload(params: UploadParams): Promise<SupabaseUploadResult> {
  return sbUpload(params);
}

/**
 * Get the public URL for a stored file.
 *
 * @param path - The file path in storage
 * @param tenantId - Optional tenant ID for path enforcement
 * @returns The public URL for the file
 *
 * @security Path is validated and sanitized before URL generation
 *
 * @example
 * ```ts
 * const url = await storagePublicUrl('documents/contract.pdf', 'org_123');
 * // Returns: https://xxx.supabase.co/storage/v1/object/public/bucket/tenants/org_123/documents/contract.pdf
 * ```
 */
export async function storagePublicUrl(path: string, tenantId?: string): Promise<string> {
  return sbPublicUrl(path, tenantId);
}

/**
 * Remove a file from storage with tenant ownership verification.
 *
 * @param path - The file path to remove
 * @param tenantId - REQUIRED - The tenant ID to verify ownership
 * @returns Supabase remove response data
 * @throws Error if tenantId is not provided or path doesn't match tenant
 *
 * @security
 * - tenantId is REQUIRED to prevent cross-tenant file deletion
 * - Path must start with tenant prefix to be deleted
 * - Unauthorized attempts are logged for security auditing
 *
 * @example
 * ```ts
 * // Delete a tenant's file
 * await storageRemove('org_123/documents/old-file.pdf', 'org_123');
 *
 * // This will throw - path doesn't match tenant
 * await storageRemove('org_456/documents/file.pdf', 'org_123');
 * // Error: SECURITY: Cannot delete file - path does not belong to your organization
 * ```
 */
export async function storageRemove(path: string, tenantId: string): Promise<SupabaseRemoveResult> {
  // SECURITY: tenantId is required to prevent cross-tenant file deletion
  if (!tenantId) {
    throw new Error('SECURITY: tenantId is required for file deletion');
  }

  // SECURITY: Verify the file belongs to this tenant
  // Path should start with tenantId/ (from upload) or tenants/{tenantId}/ (from supabase.ts)
  const validPrefixes = [`${tenantId}/`, `tenants/${tenantId}/`];
  const isValidPath = validPrefixes.some(prefix => path.startsWith(prefix));

  if (!isValidPath) {
    logger.error(
      { tenantId, path },
      'Unauthorized storage delete attempt - path does not belong to tenant'
    );
    throw new Error('SECURITY: Cannot delete file - path does not belong to your organization');
  }

  return sbRemove(path, tenantId);
}
