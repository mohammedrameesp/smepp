import { sbUpload, sbPublicUrl, sbSignedUrl, sbRemove, sbList, UploadParams } from './supabase';

// Re-export cleanup utilities
export { cleanupStorageFile, cleanupStorageFiles } from './cleanup';

// Generic storage interface - can be swapped for other providers later
export async function storageUpload(params: UploadParams) {
  return sbUpload(params);
}

export async function storagePublicUrl(path: string, tenantId?: string) {
  return sbPublicUrl(path, tenantId);
}

export async function storageSignedUrl(path: string, expiresInSec: number = 3600, tenantId?: string) {
  return sbSignedUrl(path, expiresInSec, tenantId);
}

/**
 * SECURITY: Remove a file from storage
 * @param path - The file path to remove
 * @param tenantId - REQUIRED - The tenant ID to verify ownership
 * @throws Error if tenantId is not provided or path doesn't match tenant
 */
export async function storageRemove(path: string, tenantId: string) {
  // SECURITY: tenantId is required to prevent cross-tenant file deletion
  if (!tenantId) {
    throw new Error('SECURITY: tenantId is required for file deletion');
  }

  // SECURITY: Verify the file belongs to this tenant
  // Path should start with tenantId/ (from upload) or tenants/{tenantId}/ (from supabase.ts)
  const validPrefixes = [`${tenantId}/`, `tenants/${tenantId}/`];
  const isValidPath = validPrefixes.some(prefix => path.startsWith(prefix));

  if (!isValidPath) {
    console.error(`[STORAGE] Unauthorized delete attempt: tenant ${tenantId} trying to delete ${path}`);
    throw new Error('SECURITY: Cannot delete file - path does not belong to your organization');
  }

  return sbRemove(path, tenantId);
}

/**
 * SECURITY: List files in storage for a tenant
 * @param prefix - The path prefix to list
 * @param tenantId - REQUIRED - The tenant ID to scope the listing
 */
export async function storageList(prefix: string | undefined, tenantId: string) {
  // SECURITY: tenantId is required to prevent cross-tenant listing
  if (!tenantId) {
    throw new Error('SECURITY: tenantId is required for file listing');
  }

  return sbList(prefix, tenantId);
}

// Helper function to upload a File object with tenant isolation
export async function uploadFile(file: File, folder: string, tenantId: string): Promise<string> {
  // SECURITY: tenantId is required for file uploads
  if (!tenantId) {
    throw new Error('SECURITY: tenantId is required for file upload');
  }

  const timestamp = Date.now();
  const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const fileName = `${timestamp}.${extension}`;
  // SECURITY: Prefix path with tenantId for isolation
  const filePath = `${tenantId}/${folder}/${fileName}`;

  // Convert File to Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  await storageUpload({
    path: filePath,
    bytes: buffer,
    contentType: file.type,
    tenantId,
  });

  return filePath;
}

export type { UploadParams };