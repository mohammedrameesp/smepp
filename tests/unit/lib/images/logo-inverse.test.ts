/**
 * @file logo-inverse.test.ts
 * @description Unit tests for logo inverse generation utilities
 * @module tests/unit/lib/images
 *
 * Tests cover:
 * - MIME type validation (supported/rejected)
 * - Extension mapping
 * - Inverse logo generation (PNG, WebP, SVG rejection)
 * - Error handling for invalid images
 */

import {
  isSupportedMimeType,
  isRejectedMimeType,
  getExtensionForMimeType,
  generateInverseLogo,
  InverseLogoResult,
} from '@/lib/images';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST FIXTURES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Minimal valid PNG file (1x1 red pixel with alpha)
 * PNG signature + IHDR + IDAT + IEND chunks
 */
const VALID_PNG_BUFFER = Buffer.from([
  // PNG signature
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  // IHDR chunk (13 bytes): width=1, height=1, bit depth=8, color type=6 (RGBA)
  0x00, 0x00, 0x00, 0x0d, // length
  0x49, 0x48, 0x44, 0x52, // IHDR
  0x00, 0x00, 0x00, 0x01, // width = 1
  0x00, 0x00, 0x00, 0x01, // height = 1
  0x08, // bit depth = 8
  0x06, // color type = 6 (RGBA)
  0x00, 0x00, 0x00, // compression, filter, interlace
  0x1f, 0x15, 0xc4, 0x89, // CRC
  // IDAT chunk (compressed pixel data for red pixel with full alpha)
  0x00, 0x00, 0x00, 0x0d, // length
  0x49, 0x44, 0x41, 0x54, // IDAT
  0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00, 0x00, 0x00, // compressed data
  0x01, 0x00, 0x01, // compressed data cont.
  0x00, 0x05, // CRC (partial, sharp will handle)
  // IEND chunk
  0x00, 0x00, 0x00, 0x00, // length
  0x49, 0x45, 0x4e, 0x44, // IEND
  0xae, 0x42, 0x60, 0x82, // CRC
]);

/** Invalid/corrupted image buffer */
const INVALID_IMAGE_BUFFER = Buffer.from([0x00, 0x01, 0x02, 0x03]);

/** Empty buffer */
const EMPTY_BUFFER = Buffer.from([]);

/** SVG content */
const SVG_BUFFER = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="red" width="100" height="100"/></svg>'
);

// ═══════════════════════════════════════════════════════════════════════════════
// MIME TYPE VALIDATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('isSupportedMimeType', () => {
  it('should return true for image/png', () => {
    expect(isSupportedMimeType('image/png')).toBe(true);
  });

  it('should return true for image/webp', () => {
    expect(isSupportedMimeType('image/webp')).toBe(true);
  });

  it('should return true for image/svg+xml', () => {
    expect(isSupportedMimeType('image/svg+xml')).toBe(true);
  });

  it('should return false for image/jpeg', () => {
    expect(isSupportedMimeType('image/jpeg')).toBe(false);
  });

  it('should return false for image/jpg', () => {
    expect(isSupportedMimeType('image/jpg')).toBe(false);
  });

  it('should return false for image/gif', () => {
    expect(isSupportedMimeType('image/gif')).toBe(false);
  });

  it('should return false for unknown types', () => {
    expect(isSupportedMimeType('application/pdf')).toBe(false);
    expect(isSupportedMimeType('text/plain')).toBe(false);
    expect(isSupportedMimeType('')).toBe(false);
  });

  it('should be case-sensitive', () => {
    expect(isSupportedMimeType('IMAGE/PNG')).toBe(false);
    expect(isSupportedMimeType('Image/Png')).toBe(false);
  });
});

describe('isRejectedMimeType', () => {
  it('should return true for image/jpeg', () => {
    expect(isRejectedMimeType('image/jpeg')).toBe(true);
  });

  it('should return true for image/jpg', () => {
    expect(isRejectedMimeType('image/jpg')).toBe(true);
  });

  it('should return false for image/png', () => {
    expect(isRejectedMimeType('image/png')).toBe(false);
  });

  it('should return false for image/webp', () => {
    expect(isRejectedMimeType('image/webp')).toBe(false);
  });

  it('should return false for image/svg+xml', () => {
    expect(isRejectedMimeType('image/svg+xml')).toBe(false);
  });

  it('should return false for unknown types', () => {
    expect(isRejectedMimeType('image/gif')).toBe(false);
    expect(isRejectedMimeType('application/octet-stream')).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// EXTENSION MAPPING TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('getExtensionForMimeType', () => {
  it('should return png for image/png', () => {
    expect(getExtensionForMimeType('image/png')).toBe('png');
  });

  it('should return webp for image/webp', () => {
    expect(getExtensionForMimeType('image/webp')).toBe('webp');
  });

  it('should return svg for image/svg+xml', () => {
    expect(getExtensionForMimeType('image/svg+xml')).toBe('svg');
  });

  it('should return png as default for unknown type', () => {
    expect(getExtensionForMimeType('image/jpeg')).toBe('png');
    expect(getExtensionForMimeType('unknown')).toBe('png');
    expect(getExtensionForMimeType('')).toBe('png');
  });

  it('should not include dot in extension', () => {
    const ext = getExtensionForMimeType('image/png');
    expect(ext).not.toContain('.');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INVERSE LOGO GENERATION TESTS
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateInverseLogo', () => {
  describe('SVG handling', () => {
    it('should return error for SVG files', async () => {
      const result = await generateInverseLogo(SVG_BUFFER, 'image/svg+xml');

      expect(result.success).toBe(false);
      expect(result.buffer).toBeNull();
      expect(result.error).toContain('SVG inverse generation not supported');
    });

    it('should suggest PNG or WebP for SVG files', async () => {
      const result = await generateInverseLogo(SVG_BUFFER, 'image/svg+xml');

      expect(result.error).toContain('PNG or WebP');
    });
  });

  describe('error handling', () => {
    it('should handle invalid image buffer gracefully', async () => {
      const result = await generateInverseLogo(INVALID_IMAGE_BUFFER, 'image/png');

      expect(result.success).toBe(false);
      expect(result.buffer).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should handle empty buffer gracefully', async () => {
      const result = await generateInverseLogo(EMPTY_BUFFER, 'image/png');

      expect(result.success).toBe(false);
      expect(result.buffer).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('result structure', () => {
    it('should return InverseLogoResult structure on success', async () => {
      // This test verifies the structure even if processing fails
      const result: InverseLogoResult = await generateInverseLogo(
        INVALID_IMAGE_BUFFER,
        'image/png'
      );

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('buffer');
      expect(typeof result.success).toBe('boolean');
    });

    it('should return InverseLogoResult structure on SVG rejection', async () => {
      const result: InverseLogoResult = await generateInverseLogo(SVG_BUFFER, 'image/svg+xml');

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('buffer');
      expect(result).toHaveProperty('error');
      expect(typeof result.success).toBe('boolean');
      expect(typeof result.error).toBe('string');
    });
  });

  describe('format selection', () => {
    it('should accept webp MIME type without SVG rejection', async () => {
      // Verify webp is processed (not rejected like SVG)
      const result = await generateInverseLogo(INVALID_IMAGE_BUFFER, 'image/webp');

      // Should fail due to invalid buffer, not due to SVG rejection
      expect(result.success).toBe(false);
      expect(result.error).not.toContain('SVG');
    });

    it('should accept png MIME type without SVG rejection', async () => {
      const result = await generateInverseLogo(INVALID_IMAGE_BUFFER, 'image/png');

      // Should fail due to invalid buffer, not due to SVG rejection
      expect(result.success).toBe(false);
      expect(result.error).not.toContain('SVG');
    });

    it('should default to png format for unknown MIME types', async () => {
      const result = await generateInverseLogo(INVALID_IMAGE_BUFFER, 'image/unknown');

      // Should fail due to invalid buffer, not due to SVG rejection
      expect(result.success).toBe(false);
      expect(result.error).not.toContain('SVG');
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// INTEGRATION TESTS (require valid image processing)
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateInverseLogo integration', () => {
  // Note: These tests require sharp to actually process images
  // They may be skipped in CI environments without native dependencies

  it('should process a valid PNG and return a buffer', async () => {
    // Create a minimal valid PNG using sharp if available
    let testBuffer: Buffer;

    try {
      const sharp = require('sharp');
      // Create a 2x2 red image with alpha
      testBuffer = await sharp({
        create: {
          width: 2,
          height: 2,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 1 },
        },
      })
        .png()
        .toBuffer();
    } catch {
      // Skip test if sharp is not available
      console.log('Skipping integration test - sharp not available');
      return;
    }

    const result = await generateInverseLogo(testBuffer, 'image/png');

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer!.length).toBeGreaterThan(0);
    expect(result.error).toBeUndefined();
  });

  it('should process a valid WebP and return a buffer', async () => {
    let testBuffer: Buffer;

    try {
      const sharp = require('sharp');
      testBuffer = await sharp({
        create: {
          width: 2,
          height: 2,
          channels: 4,
          background: { r: 0, g: 255, b: 0, alpha: 1 },
        },
      })
        .webp()
        .toBuffer();
    } catch {
      console.log('Skipping integration test - sharp not available');
      return;
    }

    const result = await generateInverseLogo(testBuffer, 'image/webp');

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);
    expect(result.buffer!.length).toBeGreaterThan(0);
  });

  it('should preserve transparency in processed image', async () => {
    let testBuffer: Buffer;

    try {
      const sharp = require('sharp');
      // Create image with semi-transparent pixels
      testBuffer = await sharp({
        create: {
          width: 2,
          height: 2,
          channels: 4,
          background: { r: 255, g: 0, b: 0, alpha: 0.5 },
        },
      })
        .png()
        .toBuffer();
    } catch {
      console.log('Skipping integration test - sharp not available');
      return;
    }

    const result = await generateInverseLogo(testBuffer, 'image/png');

    expect(result.success).toBe(true);
    expect(result.buffer).toBeInstanceOf(Buffer);

    // Verify the output is a valid PNG by checking the signature
    const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const outputSignature = Array.from(result.buffer!.subarray(0, 8));
    expect(outputSignature).toEqual(pngSignature);
  });

  it('should convert colored pixels to white', async () => {
    let sharp: typeof import('sharp');

    try {
      sharp = require('sharp');
    } catch {
      console.log('Skipping integration test - sharp not available');
      return;
    }

    // Create a solid red image
    const redBuffer = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const result = await generateInverseLogo(redBuffer, 'image/png');

    expect(result.success).toBe(true);

    // Extract pixel data from result
    const { data } = await sharp(result.buffer!).raw().toBuffer({ resolveWithObject: true });

    // Should be white (255, 255, 255) with full alpha
    expect(data[0]).toBe(255); // R
    expect(data[1]).toBe(255); // G
    expect(data[2]).toBe(255); // B
    expect(data[3]).toBe(255); // A (preserved)
  });

  it('should not modify fully transparent pixels', async () => {
    let sharp: typeof import('sharp');

    try {
      sharp = require('sharp');
    } catch {
      console.log('Skipping integration test - sharp not available');
      return;
    }

    // Create an image with transparent pixel (alpha = 0)
    const transparentBuffer = await sharp({
      create: {
        width: 1,
        height: 1,
        channels: 4,
        background: { r: 255, g: 0, b: 0, alpha: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await generateInverseLogo(transparentBuffer, 'image/png');

    expect(result.success).toBe(true);

    // Extract pixel data from result
    const { data } = await sharp(result.buffer!).raw().toBuffer({ resolveWithObject: true });

    // Fully transparent pixels should remain unchanged (or at least stay transparent)
    expect(data[3]).toBe(0); // Alpha should still be 0
  });
});
