/**
 * @file sanity.ts
 * @module lib/security
 * @description File sanity checking and validation for uploaded files.
 *
 * Provides security validation for file uploads including:
 * - File extension validation
 * - MIME type verification
 * - Magic number (file signature) validation
 * - File size checks
 * - Format-specific validation (PDF structure, image headers)
 *
 * @security This module is critical for preventing malicious file uploads.
 * All uploaded files MUST be validated through this module before storage.
 *
 * @example
 * ```typescript
 * import { validateUploadedFile, scanFileBuffer } from '@/lib/security/sanity';
 *
 * // Quick validation for upload endpoints
 * const { valid, error } = await validateUploadedFile(buffer, 'document.pdf', 'application/pdf');
 * if (!valid) {
 *   return { error };
 * }
 *
 * // Detailed validation with warnings
 * const result = await scanFileBuffer(buffer, 'photo.jpg', 'image/jpeg');
 * if (!result.valid) {
 *   console.error('Errors:', result.errors);
 * }
 * if (result.warnings.length > 0) {
 *   console.warn('Warnings:', result.warnings);
 * }
 * ```
 */

import mime from 'mime';
import { MAX_FILE_SIZE_BYTES } from '@/lib/constants';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS - File Signatures & Allowed Types
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Magic number signatures for validating file content matches declared type.
 * These are the first bytes of each file format that identify the file type.
 *
 * @security Magic number validation prevents file type spoofing attacks
 * where malicious files are disguised with wrong extensions.
 */
const FILE_SIGNATURES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xff, 0xd8, 0xff], // JPEG SOI marker
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], // PNG signature
} as const;

/** JPEG Start of Image marker */
const JPEG_SOI_MARKER = Buffer.from([0xff, 0xd8, 0xff]);

/** JPEG End of Image marker */
const JPEG_EOI_MARKER = Buffer.from([0xff, 0xd9]);

/** PNG file signature (8 bytes) */
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** PDF header signature */
const PDF_HEADER = Buffer.from([0x25, 0x50, 0x44, 0x46]); // %PDF

/** Minimum buffer size needed for signature detection */
const MIN_SIGNATURE_SIZE = 4;

/** Buffer size to check for PDF EOF marker */
const PDF_EOF_CHECK_SIZE = 50;

/** Buffer size to check for PDF version */
const PDF_VERSION_CHECK_SIZE = 10;

/** Minimum valid JPEG file size */
const MIN_JPEG_SIZE = 4;

/** Minimum valid PNG file size */
const MIN_PNG_SIZE = 8;

/** Allowed file extensions for upload */
const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const;

/** Type for allowed file extensions */
type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number];

/** Allowed MIME types derived from file signatures */
const ALLOWED_MIME_TYPES = Object.keys(FILE_SIGNATURES) as string[];

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of file sanity validation
 */
export interface FileSanityResult {
  /** Whether the file passed all validation checks */
  valid: boolean;
  /** List of validation errors (file is invalid) */
  errors: string[];
  /** List of warnings (file may have issues but is usable) */
  warnings: string[];
}

/**
 * Internal validation result used by format-specific validators
 */
interface ValidationResult {
  errors: string[];
  warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE GUARDS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Type guard to check if extension is in the allowed list
 *
 * @param ext - File extension to check (including dot, e.g., '.pdf')
 * @returns True if extension is allowed
 */
function isAllowedExtension(ext: string): ext is AllowedExtension {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Performs comprehensive file sanity validation
 *
 * Validates:
 * 1. File extension against allowlist
 * 2. MIME type against allowlist
 * 3. Magic number matches declared type (prevents spoofing)
 * 4. File is not empty
 * 5. File size within limits
 * 6. Format-specific structure (PDF headers, image markers)
 *
 * @param buffer - File content as Buffer
 * @param originalFilename - Original filename with extension
 * @param detectedMimeType - MIME type detected by upload handler (optional)
 * @returns Validation result with errors and warnings
 *
 * @security This function MUST be called for all file uploads to prevent
 * malicious file uploads, file type spoofing, and corrupted file storage.
 *
 * @example
 * ```typescript
 * const result = await scanFileBuffer(fileBuffer, 'report.pdf', 'application/pdf');
 * if (!result.valid) {
 *   throw new Error(`Invalid file: ${result.errors.join(', ')}`);
 * }
 * ```
 */
export async function scanFileBuffer(
  buffer: Buffer,
  originalFilename: string,
  detectedMimeType?: string
): Promise<FileSanityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Extension validation
    const extension = originalFilename.toLowerCase().substring(originalFilename.lastIndexOf('.'));
    if (!isAllowedExtension(extension)) {
      errors.push(`File extension ${extension} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // 2. MIME type validation
    const mimeFromExtension = mime.getType(originalFilename);
    if (detectedMimeType && !ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
      errors.push(`MIME type ${detectedMimeType} not allowed`);
    }

    // 3. Magic number verification (prevents file type spoofing)
    const signature = getMagicNumberSignature(buffer);
    if (signature) {
      const expectedMime = mimeFromExtension || detectedMimeType;
      if (expectedMime && !verifyMagicNumber(buffer, expectedMime)) {
        errors.push(`File content doesn't match expected type ${expectedMime}`);
      }
    } else {
      warnings.push('Could not verify file signature');
    }

    // 4. Empty file check
    if (buffer.length === 0) {
      errors.push('File is empty');
    }

    // 5. Size limit check (defense in depth - also checked at upload layer)
    if (buffer.length > MAX_FILE_SIZE_BYTES) {
      errors.push('File exceeds maximum size limit');
    }

    // 6. Format-specific validation
    if (mimeFromExtension === 'application/pdf') {
      const pdfChecks = validatePDFBuffer(buffer);
      errors.push(...pdfChecks.errors);
      warnings.push(...pdfChecks.warnings);
    }

    if (mimeFromExtension?.startsWith('image/')) {
      const imageChecks = validateImageBuffer(buffer, mimeFromExtension);
      errors.push(...imageChecks.errors);
      warnings.push(...imageChecks.warnings);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`File scanning failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
    };
  }
}

/**
 * Quick validation for upload endpoints
 *
 * Simplified wrapper around scanFileBuffer that returns a single error message.
 * Use this in API routes where you only need pass/fail with one error.
 *
 * @param buffer - File content as Buffer
 * @param originalFilename - Original filename with extension
 * @param mimeType - MIME type detected by upload handler (optional)
 * @returns Object with valid flag and optional error message
 *
 * @example
 * ```typescript
 * const { valid, error } = await validateUploadedFile(buffer, filename, mimeType);
 * if (!valid) {
 *   return NextResponse.json({ error }, { status: 400 });
 * }
 * ```
 */
export async function validateUploadedFile(
  buffer: Buffer,
  originalFilename: string,
  mimeType?: string
): Promise<{ valid: boolean; error?: string }> {
  const result = await scanFileBuffer(buffer, originalFilename, mimeType);

  if (!result.valid) {
    return {
      valid: false,
      error: result.errors[0] || 'File validation failed',
    };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Extracts the first 8 bytes of buffer for signature detection
 *
 * @param buffer - File buffer to extract signature from
 * @returns First 8 bytes as array, or null if buffer too small
 */
function getMagicNumberSignature(buffer: Buffer): number[] | null {
  if (buffer.length < MIN_SIGNATURE_SIZE) return null;
  return Array.from(buffer.subarray(0, 8));
}

/**
 * Verifies buffer starts with expected magic number for MIME type
 *
 * @param buffer - File buffer to verify
 * @param expectedMimeType - Expected MIME type to check against
 * @returns True if magic number matches or no signature defined for type
 */
function verifyMagicNumber(buffer: Buffer, expectedMimeType: string): boolean {
  const signature = FILE_SIGNATURES[expectedMimeType as keyof typeof FILE_SIGNATURES];

  // No signature defined for this type - assume valid
  if (!signature) return true;

  // Buffer too small to contain signature
  if (buffer.length < signature.length) return false;

  // Byte-by-byte comparison of signature
  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }

  return true;
}

/**
 * Validates PDF file structure
 *
 * Checks:
 * - PDF header (%PDF) present
 * - PDF version string in expected location
 * - EOF marker present (indicates complete file)
 *
 * @param buffer - PDF file buffer
 * @returns Validation errors and warnings
 */
function validatePDFBuffer(buffer: Buffer): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for PDF header signature
  const pdfHeader = buffer.subarray(0, 4);
  if (!pdfHeader.equals(PDF_HEADER)) {
    errors.push('Invalid PDF header');
  }

  // Check for PDF version string (e.g., %PDF-1.4)
  const firstLine = buffer.subarray(0, PDF_VERSION_CHECK_SIZE).toString('ascii');
  if (!firstLine.includes('%PDF-')) {
    warnings.push('PDF version not found in expected location');
  }

  // Check for EOF marker (indicates file is complete)
  const lastBytes = buffer.subarray(-PDF_EOF_CHECK_SIZE).toString('ascii');
  if (!lastBytes.includes('%%EOF')) {
    warnings.push('PDF EOF marker not found - file may be truncated');
  }

  return { errors, warnings };
}

/**
 * Validates image file structure (JPEG, PNG)
 *
 * Checks format-specific headers and end markers to detect
 * corrupted or truncated image files.
 *
 * @param buffer - Image file buffer
 * @param mimeType - Image MIME type (image/jpeg, image/png)
 * @returns Validation errors and warnings
 */
function validateImageBuffer(buffer: Buffer, mimeType: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (mimeType === 'image/jpeg') {
    // JPEG: Check SOI (Start of Image) and EOI (End of Image) markers
    if (buffer.length < MIN_JPEG_SIZE) {
      errors.push('JPEG file too small');
    } else {
      // Verify SOI marker (0xFF 0xD8 0xFF)
      const start = buffer.subarray(0, 3);
      if (!start.equals(JPEG_SOI_MARKER)) {
        errors.push('Invalid JPEG header');
      }

      // Verify EOI marker (0xFF 0xD9) - indicates complete file
      const end = buffer.subarray(-2);
      if (!end.equals(JPEG_EOI_MARKER)) {
        warnings.push('JPEG end marker not found - file may be corrupted');
      }
    }
  } else if (mimeType === 'image/png') {
    // PNG: Check 8-byte signature
    if (buffer.length < MIN_PNG_SIZE) {
      errors.push('PNG file too small');
    } else if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
      errors.push('Invalid PNG signature');
    }
  }

  return { errors, warnings };
}
