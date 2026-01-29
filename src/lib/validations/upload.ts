/**
 * @file upload.ts
 * @description Validation schemas for file upload operations and signed URL requests.
 *              Used by the upload API to validate file metadata and generate secure
 *              signed URLs for Supabase storage.
 * @module validations
 *
 * @example
 * ```typescript
 * import { uploadSchema, signedUrlSchema } from '@/lib/validations/upload';
 *
 * // Validate upload request
 * const uploadData = uploadSchema.parse(req.body);
 * // uploadData: { entityType: 'asset', entityId: 'clh...', projectCode?: string }
 *
 * // Validate signed URL request
 * const urlData = signedUrlSchema.parse({ path: 'tenants/123/file.pdf', expiresInSec: 3600 });
 * ```
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Supported entity types for file uploads.
 * Maps to the entity the file will be associated with.
 */
export const UPLOAD_ENTITY_TYPES = ['asset', 'subscription'] as const;

/** Minimum signed URL expiry in seconds (1 minute) */
const MIN_SIGNED_URL_EXPIRY_SEC = 60;

/** Maximum signed URL expiry in seconds (24 hours) */
const MAX_SIGNED_URL_EXPIRY_SEC = 86400;

/** Default signed URL expiry in seconds (1 hour) */
const DEFAULT_SIGNED_URL_EXPIRY_SEC = 3600;

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for file upload requests.
 *
 * Validates the metadata required to associate an uploaded file with
 * a specific entity in the system.
 *
 * @property entityType - Type of entity the file belongs to ('asset' | 'subscription')
 * @property entityId - The ID of the entity (must be non-empty)
 * @property projectCode - Optional project code for organizing files
 *
 * @example
 * ```typescript
 * const result = uploadSchema.safeParse({
 *   entityType: 'asset',
 *   entityId: 'clh8j0x5m0000qwer1234abcd',
 *   projectCode: 'PROJ-2024-001',
 * });
 *
 * if (!result.success) {
 *   // Handle validation errors
 *   console.error(result.error.issues);
 * }
 * ```
 */
export const uploadSchema = z.object({
  /**
   * The type of entity this file is associated with.
   * Determines the storage path and access permissions.
   */
  entityType: z.enum(UPLOAD_ENTITY_TYPES, {
    errorMap: () => ({ message: `Entity type must be one of: ${UPLOAD_ENTITY_TYPES.join(', ')}` }),
  }),

  /**
   * The unique identifier of the entity.
   * Used to organize files in tenant-scoped storage.
   */
  entityId: z.string().min(1, 'Entity ID is required'),

  /**
   * Optional project code for additional file organization.
   * Useful for grouping files by project within an entity.
   */
  projectCode: z.string().optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNED URL SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for signed URL requests.
 *
 * Validates parameters for generating time-limited signed URLs
 * that provide secure access to files in Supabase storage.
 *
 * @property path - The storage path of the file (relative to bucket root)
 * @property expiresInSec - URL expiry time in seconds (60-86400, defaults to 3600)
 *
 * @security Signed URLs provide temporary access to files without authentication.
 * Keep expiry times as short as practical for the use case.
 *
 * @example
 * ```typescript
 * const result = signedUrlSchema.parse({
 *   path: 'tenants/clh123/assets/document.pdf',
 *   expiresInSec: 300, // 5 minutes
 * });
 * ```
 */
export const signedUrlSchema = z.object({
  /**
   * The storage path of the file to generate a signed URL for.
   * Should be relative to the bucket root (e.g., 'tenants/{tenantId}/assets/file.pdf').
   * @security Validate that the path belongs to the requesting tenant.
   */
  path: z.string().min(1, 'Path is required'),

  /**
   * How long the signed URL should be valid, in seconds.
   * - Minimum: 60 seconds (1 minute)
   * - Maximum: 86400 seconds (24 hours)
   * - Default: 3600 seconds (1 hour)
   *
   * @security Use shorter expiry times for sensitive documents.
   */
  expiresInSec: z
    .number()
    .int('Expiry must be a whole number')
    .min(MIN_SIGNED_URL_EXPIRY_SEC, `Minimum expiry is ${MIN_SIGNED_URL_EXPIRY_SEC} seconds (1 minute)`)
    .max(MAX_SIGNED_URL_EXPIRY_SEC, `Maximum expiry is ${MAX_SIGNED_URL_EXPIRY_SEC} seconds (24 hours)`)
    .optional()
    .default(DEFAULT_SIGNED_URL_EXPIRY_SEC),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Input type for upload requests */
export type UploadRequest = z.infer<typeof uploadSchema>;

/** Input type for signed URL requests */
export type SignedUrlRequest = z.infer<typeof signedUrlSchema>;

/** Supported entity types for uploads */
export type UploadEntityType = (typeof UPLOAD_ENTITY_TYPES)[number];
