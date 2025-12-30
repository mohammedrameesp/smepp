import { storageRemove } from './index';

/**
 * STORAGE CLEANUP UTILITY
 * Handles deletion of orphaned files when records are deleted
 */

/**
 * Safely delete a file from storage
 * @param fileUrl - The file URL or path to delete
 * @param tenantId - The tenant ID for ownership verification
 * @returns true if deleted successfully, false if skipped or failed
 */
export async function cleanupStorageFile(
  fileUrl: string | null | undefined,
  tenantId: string
): Promise<boolean> {
  if (!fileUrl || !tenantId) {
    return false;
  }

  try {
    // Extract path from URL if it's a full URL
    let filePath = fileUrl;

    // Handle Supabase storage URLs
    // e.g., https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.pdf
    if (fileUrl.includes('/storage/v1/object/')) {
      const parts = fileUrl.split('/storage/v1/object/public/');
      if (parts.length === 2) {
        // Get everything after bucket name
        const bucketAndPath = parts[1];
        const slashIndex = bucketAndPath.indexOf('/');
        if (slashIndex > 0) {
          filePath = bucketAndPath.substring(slashIndex + 1);
        }
      }
    }

    // Handle signed URLs (they have query params)
    if (filePath.includes('?')) {
      filePath = filePath.split('?')[0];
    }

    // Only attempt deletion if path belongs to tenant (security check is in storageRemove)
    await storageRemove(filePath, tenantId);
    console.log(`[Storage Cleanup] Deleted file: ${filePath}`);
    return true;
  } catch (error) {
    // Log but don't throw - file cleanup should not block record deletion
    console.error('[Storage Cleanup] Failed to delete file:', error);
    return false;
  }
}

/**
 * Cleanup multiple files
 * @param fileUrls - Array of file URLs to delete
 * @param tenantId - The tenant ID for ownership verification
 * @returns Count of successfully deleted files
 */
export async function cleanupStorageFiles(
  fileUrls: (string | null | undefined)[],
  tenantId: string
): Promise<number> {
  const validUrls = fileUrls.filter((url): url is string => !!url);

  const results = await Promise.allSettled(
    validUrls.map(url => cleanupStorageFile(url, tenantId))
  );

  return results.filter(r => r.status === 'fulfilled' && r.value).length;
}
