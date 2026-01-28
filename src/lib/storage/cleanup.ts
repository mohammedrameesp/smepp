/**
 * @file cleanup.ts
 * @description Storage cleanup utilities for deleting orphaned files when records are deleted.
 *
 * Provides safe, non-blocking file deletion that extracts paths from various URL formats
 * and delegates to the secure storageRemove function.
 *
 * @module lib/storage
 *
 * @example
 * ```ts
 * import { cleanupStorageFile } from '@/lib/storage';
 *
 * // When deleting a leave request with an attached document
 * await cleanupStorageFile(leaveRequest.documentUrl, tenantId);
 *
 * // When deleting a company document
 * await cleanupStorageFile(companyDoc.documentUrl, tenantId);
 * ```
 */

import logger from '@/lib/core/log';
import { storageRemove } from './index';

// ═══════════════════════════════════════════════════════════════════════════════
// URL PARSING UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extract the file path from a Supabase storage URL.
 *
 * Handles multiple URL formats:
 * - Full public URLs: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.pdf
 * - Signed URLs: https://xxx.supabase.co/storage/v1/object/sign/bucket-name/path?token=xxx
 * - Plain paths: path/to/file.pdf
 *
 * @param fileUrl - The URL or path to parse
 * @returns Extracted file path without bucket name or query parameters
 *
 * @example
 * ```ts
 * // Full URL
 * extractPathFromUrl('https://xxx.supabase.co/storage/v1/object/public/durj-storage/org_123/doc.pdf');
 * // Returns: 'org_123/doc.pdf'
 *
 * // Signed URL
 * extractPathFromUrl('https://xxx.supabase.co/storage/v1/object/public/durj-storage/file.pdf?token=abc');
 * // Returns: 'file.pdf'
 *
 * // Plain path (unchanged)
 * extractPathFromUrl('org_123/documents/file.pdf');
 * // Returns: 'org_123/documents/file.pdf'
 * ```
 */
function extractPathFromUrl(fileUrl: string): string {
  let filePath = fileUrl;

  // Handle Supabase storage URLs
  // Format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file.pdf
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

  return filePath;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Safely delete a file from storage.
 *
 * Extracts the file path from a full Supabase URL and removes it.
 * This is a **non-blocking** operation - errors are logged but do not throw,
 * ensuring that record deletion is not blocked by storage cleanup failures.
 *
 * @param fileUrl - The file URL or path to delete (handles various URL formats)
 * @param tenantId - The tenant ID for ownership verification
 * @returns `true` if deleted successfully, `false` if skipped or failed
 *
 * @security
 * - Delegates to storageRemove which enforces tenant ownership
 * - Path must belong to the specified tenant to be deleted
 * - Unauthorized deletion attempts are logged
 *
 * @example
 * ```ts
 * // Clean up document when deleting a leave request
 * const deleted = await cleanupStorageFile(leaveRequest.documentUrl, tenantId);
 * if (!deleted) {
 *   // File was already gone, invalid, or cleanup failed (non-critical)
 *   // The database record can still be deleted
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a DELETE API handler
 * export async function DELETE(request, { params }) {
 *   const record = await db.companyDocument.findFirst({ where: { id: params.id } });
 *
 *   // Clean up storage file (non-blocking)
 *   await cleanupStorageFile(record.documentUrl, tenantId);
 *
 *   // Delete database record
 *   await db.companyDocument.delete({ where: { id: params.id } });
 *
 *   return NextResponse.json({ success: true });
 * }
 * ```
 */
export async function cleanupStorageFile(
  fileUrl: string | null | undefined,
  tenantId: string
): Promise<boolean> {
  // Early return for invalid inputs
  if (!fileUrl || !tenantId) {
    return false;
  }

  try {
    // Extract clean path from URL
    const filePath = extractPathFromUrl(fileUrl);

    // Attempt deletion (security check is in storageRemove)
    await storageRemove(filePath, tenantId);

    logger.debug({ filePath, tenantId }, 'Storage file deleted successfully');
    return true;
  } catch (error) {
    // Log but don't throw - file cleanup should not block record deletion
    // Common reasons for failure:
    // - File already deleted
    // - Path doesn't match tenant (security block)
    // - Storage service unavailable
    logger.error(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        fileUrl,
        tenantId,
      },
      'Failed to cleanup storage file'
    );
    return false;
  }
}
