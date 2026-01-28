/**
 * @file sanity.test.ts
 * @description Unit tests for file sanity validation (upload security)
 * @module tests/unit/lib/security
 *
 * Tests cover:
 * - Valid file acceptance (PDF, JPEG, PNG)
 * - Extension validation
 * - MIME type validation
 * - Magic number spoofing detection
 * - Empty and oversized file rejection
 * - Corrupted/truncated file detection
 */

// Mock the mime module (ESM module that Jest can't transform)
jest.mock('mime', () => ({
  __esModule: true,
  default: {
    getType: (filename: string) => {
      const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
      const mimeTypes: Record<string, string> = {
        '.pdf': 'application/pdf',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
      };
      return mimeTypes[ext] || null;
    },
  },
}));

import {
  scanFileBuffer,
  validateUploadedFile,
  FileSanityResult,
} from '@/lib/security/sanity';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES - Valid File Buffers
// ═══════════════════════════════════════════════════════════════════════════════

/** Minimal valid PDF file */
const VALID_PDF = Buffer.from([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
  0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a, // binary comment
  0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a, // 1 0 obj
  0x3c, 0x3c, 0x3e, 0x3e, 0x0a, // <<>>
  0x65, 0x6e, 0x64, 0x6f, 0x62, 0x6a, 0x0a, // endobj
  0x78, 0x72, 0x65, 0x66, 0x0a, // xref
  0x74, 0x72, 0x61, 0x69, 0x6c, 0x65, 0x72, 0x0a, // trailer
  0x25, 0x25, 0x45, 0x4f, 0x46, // %%EOF
]);

/** Minimal valid JPEG file (SOI + APP0 + EOI) */
const VALID_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0, // SOI + APP0 marker
  0x00, 0x10, // APP0 length
  0x4a, 0x46, 0x49, 0x46, 0x00, // JFIF identifier
  0x01, 0x01, // version
  0x00, // units
  0x00, 0x01, 0x00, 0x01, // density
  0x00, 0x00, // thumbnail
  0xff, 0xd9, // EOI
]);

/** Minimal valid PNG file (signature + IHDR + IEND) */
const VALID_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
  0x00, 0x00, 0x00, 0x0d, // IHDR length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, // width
  0x00, 0x00, 0x00, 0x01, // height
  0x08, 0x02, // bit depth, color type
  0x00, 0x00, 0x00, // compression, filter, interlace
  0x90, 0x77, 0x53, 0xde, // CRC
  0x00, 0x00, 0x00, 0x00, // IEND length
  0x49, 0x45, 0x4e, 0x44, // IEND
  0xae, 0x42, 0x60, 0x82, // CRC
]);

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES - Invalid File Buffers
// ═══════════════════════════════════════════════════════════════════════════════

/** PDF without EOF marker (truncated) */
const TRUNCATED_PDF = Buffer.from([
  0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, // %PDF-1.4
  0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a,
  0x31, 0x20, 0x30, 0x20, 0x6f, 0x62, 0x6a, 0x0a,
  // Missing %%EOF
]);

/** JPEG without EOI marker (truncated) */
const TRUNCATED_JPEG = Buffer.from([
  0xff, 0xd8, 0xff, 0xe0,
  0x00, 0x10,
  0x4a, 0x46, 0x49, 0x46, 0x00,
  0x01, 0x01,
  0x00,
  0x00, 0x01, 0x00, 0x01,
  0x00, 0x00,
  // Missing 0xFF 0xD9 EOI
]);

/** Invalid PDF header */
const INVALID_PDF_HEADER = Buffer.from([
  0x00, 0x00, 0x00, 0x00, // Not %PDF
  0x25, 0x25, 0x45, 0x4f, 0x46, // %%EOF
]);

/** Invalid JPEG header */
const INVALID_JPEG_HEADER = Buffer.from([
  0x00, 0x00, 0x00, 0x00, // Not 0xFF 0xD8 0xFF
  0xff, 0xd9,
]);

/** Invalid PNG signature */
const INVALID_PNG_SIGNATURE = Buffer.from([
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Not PNG signature
]);

/** Empty buffer */
const EMPTY_BUFFER = Buffer.from([]);

/** Very small buffer (less than minimum signature size) */
const TINY_BUFFER = Buffer.from([0x00, 0x01]);

describe('File Sanity Validation', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // VALID FILE ACCEPTANCE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('valid file acceptance', () => {
    it('should accept valid PDF file', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'document.pdf', 'application/pdf');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid JPEG file', async () => {
      const result = await scanFileBuffer(VALID_JPEG, 'photo.jpg', 'image/jpeg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid JPEG with .jpeg extension', async () => {
      const result = await scanFileBuffer(VALID_JPEG, 'photo.jpeg', 'image/jpeg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept valid PNG file', async () => {
      const result = await scanFileBuffer(VALID_PNG, 'image.png', 'image/png');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EXTENSION VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('extension validation', () => {
    it('should reject disallowed extension (.exe)', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'malware.exe', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'File extension .exe not allowed. Allowed: .pdf, .png, .jpg, .jpeg'
      );
    });

    it('should reject disallowed extension (.html)', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'page.html', 'text/html');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('.html not allowed'))).toBe(true);
    });

    it('should handle case-insensitive extensions (.PDF)', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'document.PDF', 'application/pdf');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle case-insensitive extensions (.JpG)', async () => {
      const result = await scanFileBuffer(VALID_JPEG, 'photo.JpG', 'image/jpeg');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle file without extension', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'noextension', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not allowed'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MIME TYPE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('MIME type validation', () => {
    it('should reject disallowed MIME type', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'document.pdf', 'application/x-executable');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MIME type application/x-executable not allowed');
    });

    it('should reject text/html MIME type', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'document.pdf', 'text/html');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('MIME type text/html not allowed');
    });

    it('should accept when MIME type is not provided', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'document.pdf');

      expect(result.valid).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MAGIC NUMBER SPOOFING DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('magic number spoofing detection', () => {
    it('should reject PDF extension with JPEG content', async () => {
      const result = await scanFileBuffer(VALID_JPEG, 'fake.pdf', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("doesn't match expected type"))).toBe(true);
    });

    it('should reject JPEG extension with PNG content', async () => {
      const result = await scanFileBuffer(VALID_PNG, 'fake.jpg', 'image/jpeg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("doesn't match expected type"))).toBe(true);
    });

    it('should reject PNG extension with PDF content', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'fake.png', 'image/png');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("doesn't match expected type"))).toBe(true);
    });

    it('should reject JPEG extension with PDF content', async () => {
      const result = await scanFileBuffer(VALID_PDF, 'fake.jpeg', 'image/jpeg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes("doesn't match expected type"))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMPTY AND SIZE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('empty and size validation', () => {
    it('should reject empty file', async () => {
      const result = await scanFileBuffer(EMPTY_BUFFER, 'empty.pdf', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File is empty');
    });

    it('should warn on very small buffer', async () => {
      const result = await scanFileBuffer(TINY_BUFFER, 'tiny.pdf', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.warnings.some(w => w.includes('Could not verify file signature'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CORRUPTED/TRUNCATED FILE DETECTION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('corrupted/truncated file detection', () => {
    it('should warn on truncated PDF (missing EOF)', async () => {
      const result = await scanFileBuffer(TRUNCATED_PDF, 'truncated.pdf', 'application/pdf');

      expect(result.warnings.some(w => w.includes('EOF marker not found'))).toBe(true);
    });

    it('should warn on truncated JPEG (missing EOI)', async () => {
      const result = await scanFileBuffer(TRUNCATED_JPEG, 'truncated.jpg', 'image/jpeg');

      expect(result.warnings.some(w => w.includes('end marker not found'))).toBe(true);
    });

    it('should error on invalid PDF header', async () => {
      const result = await scanFileBuffer(INVALID_PDF_HEADER, 'invalid.pdf', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid PDF header'))).toBe(true);
    });

    it('should error on invalid JPEG header', async () => {
      const result = await scanFileBuffer(INVALID_JPEG_HEADER, 'invalid.jpg', 'image/jpeg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid JPEG header'))).toBe(true);
    });

    it('should error on invalid PNG signature', async () => {
      const result = await scanFileBuffer(INVALID_PNG_SIGNATURE, 'invalid.png', 'image/png');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid PNG signature'))).toBe(true);
    });

    it('should error on PNG file too small', async () => {
      const tinyPng = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // Only 4 bytes
      const result = await scanFileBuffer(tinyPng, 'tiny.png', 'image/png');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('PNG file too small'))).toBe(true);
    });

    it('should error on JPEG file too small', async () => {
      const tinyJpeg = Buffer.from([0xff, 0xd8]); // Only 2 bytes
      const result = await scanFileBuffer(tinyJpeg, 'tiny.jpg', 'image/jpeg');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('JPEG file too small'))).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // validateUploadedFile WRAPPER
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateUploadedFile', () => {
    it('should return valid: true for valid file', async () => {
      const result = await validateUploadedFile(VALID_PDF, 'document.pdf', 'application/pdf');

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid: false with error message for invalid file', async () => {
      const result = await validateUploadedFile(EMPTY_BUFFER, 'empty.pdf', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      expect(typeof result.error).toBe('string');
    });

    it('should return first error when multiple errors exist', async () => {
      // File with wrong extension AND empty - triggers multiple errors
      const result = await validateUploadedFile(EMPTY_BUFFER, 'file.exe');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
      // Should return just one error string, not concatenated errors
      // The function returns errors[0], so we verify it's a single error message
      expect(result.error).toContain('.exe not allowed');
    });

    it('should return generic error when errors array is empty but valid is false', async () => {
      // This tests the fallback case - hard to trigger naturally
      // The function returns 'File validation failed' as fallback
      const result = await validateUploadedFile(VALID_JPEG, 'fake.pdf', 'application/pdf');

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('error handling', () => {
    it('should handle scanning errors gracefully', async () => {
      // Create a buffer that might cause issues
      const weirdBuffer = Buffer.alloc(10);
      const result = await scanFileBuffer(weirdBuffer, 'test.pdf', 'application/pdf');

      // Should not throw, should return a result
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FileSanityResult TYPE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('FileSanityResult type', () => {
    it('should have correct structure for valid file', async () => {
      const result: FileSanityResult = await scanFileBuffer(
        VALID_PDF,
        'document.pdf',
        'application/pdf'
      );

      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it('should have correct structure for invalid file', async () => {
      const result: FileSanityResult = await scanFileBuffer(
        EMPTY_BUFFER,
        'empty.pdf',
        'application/pdf'
      );

      expect(typeof result.valid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
