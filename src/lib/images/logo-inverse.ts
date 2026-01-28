/**
 * @file logo-inverse.ts
 * @module lib/images
 * @description Generates inverse (white) versions of organization logos for dark backgrounds.
 *
 * Used by the organization settings to create light-colored logo variants that
 * display properly on dark navigation bars and headers.
 *
 * **Supported formats:**
 * - PNG: Full support with alpha preservation
 * - WebP: Full support with alpha preservation
 * - SVG: Not supported (jsdom ESM/CommonJS compatibility issues in serverless)
 *
 * **Rejected formats:**
 * - JPEG/JPG: No transparency support, not suitable for logos
 *
 * @example
 * ```typescript
 * import { generateInverseLogo, isSupportedMimeType } from '@/lib/images';
 *
 * if (isSupportedMimeType(file.type)) {
 *   const result = await generateInverseLogo(buffer, file.type);
 *   if (result.success) {
 *     // Upload result.buffer as inverse logo
 *   }
 * }
 * ```
 */

import sharp from 'sharp';

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/** White color value for RGB channels */
const WHITE_CHANNEL_VALUE = 255;

/** Number of channels in RGBA format */
const RGBA_CHANNELS = 4;

/** Offset for alpha channel in RGBA pixel data */
const ALPHA_CHANNEL_OFFSET = 3;

/** Supported MIME types for logo upload */
const SUPPORTED_MIME_TYPES = ['image/png', 'image/webp', 'image/svg+xml'] as const;

/** MIME types that should be rejected (no transparency support) */
const REJECTED_MIME_TYPES = ['image/jpeg', 'image/jpg'] as const;

/** MIME type to file extension mapping */
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
};

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Result of inverse logo generation
 */
export interface InverseLogoResult {
  /** Whether the generation was successful */
  success: boolean;
  /** The processed image buffer (null if failed) */
  buffer: Buffer | null;
  /** Error message if generation failed */
  error?: string;
}

/** Supported output formats for raster images */
type RasterFormat = 'png' | 'webp';

// ═══════════════════════════════════════════════════════════════════════════════
// MIME TYPE UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if a MIME type is supported for logo upload
 *
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type is supported (PNG, WebP, SVG)
 *
 * @example
 * ```typescript
 * if (isSupportedMimeType('image/png')) {
 *   // Process the logo
 * }
 * ```
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return (SUPPORTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Check if a MIME type should be explicitly rejected
 *
 * JPEG/JPG files are rejected because they don't support transparency,
 * which is required for logos that need to display on various backgrounds.
 *
 * @param mimeType - The MIME type to check
 * @returns True if the MIME type should be rejected (JPEG/JPG)
 *
 * @example
 * ```typescript
 * if (isRejectedMimeType(file.type)) {
 *   return { error: 'JPEG not supported - please use PNG or WebP' };
 * }
 * ```
 */
export function isRejectedMimeType(mimeType: string): boolean {
  return (REJECTED_MIME_TYPES as readonly string[]).includes(mimeType);
}

/**
 * Get the file extension for a MIME type
 *
 * @param mimeType - The MIME type to get extension for
 * @returns File extension without dot (e.g., 'png', 'webp'), defaults to 'png'
 *
 * @example
 * ```typescript
 * const ext = getExtensionForMimeType('image/webp'); // 'webp'
 * const filename = `logo.${ext}`;
 * ```
 */
export function getExtensionForMimeType(mimeType: string): string {
  return MIME_TO_EXTENSION[mimeType] || 'png';
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVERSE LOGO GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Generate an inverse (white) version of a logo
 *
 * Converts all non-transparent pixels to white while preserving the alpha channel.
 * This creates a logo suitable for display on dark backgrounds.
 *
 * **Processing by format:**
 * - PNG/WebP: Converts all colored pixels to white (255,255,255), preserves alpha
 * - SVG: Not supported - returns error (jsdom ESM compatibility issues)
 *
 * @param buffer - The original image buffer
 * @param mimeType - The MIME type of the image
 * @returns Result object with success status, processed buffer, and optional error
 *
 * @example
 * ```typescript
 * const logoBuffer = await fs.readFile('logo.png');
 * const result = await generateInverseLogo(logoBuffer, 'image/png');
 *
 * if (result.success && result.buffer) {
 *   await uploadToStorage(result.buffer, 'logo-inverse.png');
 * } else {
 *   console.error('Failed to generate inverse:', result.error);
 * }
 * ```
 */
export async function generateInverseLogo(
  buffer: Buffer,
  mimeType: string
): Promise<InverseLogoResult> {
  try {
    // SVG inverse generation is disabled due to jsdom ESM compatibility issues
    // in serverless environments. Users can manually create inverse SVGs.
    if (mimeType === 'image/svg+xml') {
      return {
        success: false,
        buffer: null,
        error:
          'SVG inverse generation not supported - please upload PNG or WebP for automatic inverse generation',
      };
    }

    const format: RasterFormat = mimeType === 'image/webp' ? 'webp' : 'png';
    return await processRasterToWhite(buffer, format);
  } catch (error) {
    return {
      success: false,
      buffer: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Process a raster image (PNG/WebP) to white
 *
 * Iterates through all pixels and converts any pixel with alpha > 0 to white
 * while preserving the original alpha value. This maintains anti-aliasing
 * and transparency edges.
 *
 * @param buffer - Raw image buffer
 * @param format - Output format ('png' or 'webp')
 * @returns Result with processed buffer or error
 */
async function processRasterToWhite(
  buffer: Buffer,
  format: RasterFormat
): Promise<InverseLogoResult> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    // Validate image has dimensions
    if (!metadata.width || !metadata.height) {
      return {
        success: false,
        buffer: null,
        error: 'Invalid image dimensions',
      };
    }

    // Extract raw RGBA pixel data
    const { data, info } = await image
      .ensureAlpha() // Ensure 4 channels (RGBA)
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert all non-transparent pixels to white
    // Loop through pixels (4 bytes per pixel: R, G, B, A)
    for (let i = 0; i < data.length; i += RGBA_CHANNELS) {
      const alpha = data[i + ALPHA_CHANNEL_OFFSET];

      // Only modify pixels that have some opacity
      if (alpha > 0) {
        data[i] = WHITE_CHANNEL_VALUE; // Red
        data[i + 1] = WHITE_CHANNEL_VALUE; // Green
        data[i + 2] = WHITE_CHANNEL_VALUE; // Blue
        // Alpha channel (data[i + 3]) is preserved unchanged
      }
    }

    // Reconstruct image from modified pixel data
    const outputBuffer = await sharp(data, {
      raw: {
        width: info.width,
        height: info.height,
        channels: RGBA_CHANNELS,
      },
    })
      [format]()
      .toBuffer();

    return { success: true, buffer: outputBuffer };
  } catch (error) {
    return {
      success: false,
      buffer: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
