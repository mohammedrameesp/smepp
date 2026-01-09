/**
 * @file logo-inverse.ts
 * @description Generates inverse (white) versions of logos for dark backgrounds
 * @module lib/images
 *
 * NOTE: SVG inverse generation is disabled due to jsdom ESM/CommonJS
 * compatibility issues in serverless environments. PNG/WebP work fine.
 */

import sharp from 'sharp';

/**
 * Result of inverse logo generation
 */
export interface InverseLogoResult {
  success: boolean;
  buffer: Buffer | null;
  error?: string;
}

/**
 * Check if a MIME type is supported for logo upload
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return ['image/png', 'image/webp', 'image/svg+xml'].includes(mimeType);
}

/**
 * Check if a MIME type should be explicitly rejected (JPEG/JPG)
 */
export function isRejectedMimeType(mimeType: string): boolean {
  return ['image/jpeg', 'image/jpg'].includes(mimeType);
}

/**
 * Get file extension for a MIME type
 */
export function getExtensionForMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] || 'png';
}

/**
 * Generate an inverse (white) version of a logo
 * - For PNG/WebP: Converts all non-transparent pixels to white (255,255,255)
 * - For SVG: Returns failure (not supported due to jsdom ESM issues)
 *
 * @param buffer - The original image buffer
 * @param mimeType - The MIME type of the image
 * @returns Result with success status and processed buffer
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
        error: 'SVG inverse generation not supported - please upload PNG or WebP for automatic inverse generation',
      };
    }
    const format = mimeType === 'image/webp' ? 'webp' : 'png';
    return processRasterToWhite(buffer, format);
  } catch (error) {
    console.error('[InverseLogo] Generation failed:', error);
    return {
      success: false,
      buffer: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process raster image (PNG/WebP) to white
 * Converts all non-transparent pixels to white while preserving alpha channel
 */
async function processRasterToWhite(
  buffer: Buffer,
  format: 'png' | 'webp'
): Promise<InverseLogoResult> {
  try {
    const image = sharp(buffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      return {
        success: false,
        buffer: null,
        error: 'Invalid image dimensions',
      };
    }

    // Get raw RGBA pixels
    const { data, info } = await image
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Convert all non-transparent pixels to white (preserve alpha exactly)
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha > 0) {
        data[i] = 255; // R
        data[i + 1] = 255; // G
        data[i + 2] = 255; // B
        // Alpha (data[i + 3]) unchanged
      }
    }

    // Reconstruct image in original format
    const outputBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
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

