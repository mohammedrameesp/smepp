/**
 * @file logo-inverse.ts
 * @description Generates inverse (white) versions of logos for dark backgrounds
 * @module lib/images
 */

import sharp from 'sharp';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

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
 * - For SVG: Sanitizes and converts all fills/strokes to white
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
    if (mimeType === 'image/svg+xml') {
      return processSvgToWhite(buffer.toString('utf-8'));
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

/**
 * Process SVG to white
 * Sanitizes for security and converts all fills/strokes to white
 */
function processSvgToWhite(svgString: string): InverseLogoResult {
  try {
    // Create DOM environment for DOMPurify
    const window = new JSDOM('').window;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const purify = DOMPurify(window as any);

    // Sanitize - remove scripts, event handlers, external refs
    const cleanSvg = purify.sanitize(svgString, {
      USE_PROFILES: { svg: true, svgFilters: true },
      ADD_TAGS: ['use'],
      FORBID_TAGS: ['script', 'foreignObject', 'iframe', 'embed', 'object'],
      FORBID_ATTR: [
        'onload',
        'onerror',
        'onclick',
        'onmouseover',
        'onmouseout',
        'onfocus',
        'onblur',
      ],
    });

    // Parse sanitized SVG
    const doc = new JSDOM(cleanSvg, { contentType: 'image/svg+xml' }).window
      .document;
    const svg = doc.querySelector('svg');

    if (!svg) {
      return {
        success: false,
        buffer: null,
        error: 'No SVG element found after sanitization',
      };
    }

    // Convert fills and strokes to white on all elements
    const elements = svg.querySelectorAll('*');
    elements.forEach((el) => {
      // Handle fill attribute
      const fill = el.getAttribute('fill');
      if (fill && fill !== 'none' && fill !== 'transparent') {
        el.setAttribute('fill', '#FFFFFF');
      }

      // Handle stroke attribute
      const stroke = el.getAttribute('stroke');
      if (stroke && stroke !== 'none' && stroke !== 'transparent') {
        el.setAttribute('stroke', '#FFFFFF');
      }

      // Handle inline style attribute
      const style = el.getAttribute('style');
      if (style) {
        const newStyle = style
          .replace(/fill:\s*(?!none|transparent)[^;]+/gi, 'fill:#FFFFFF')
          .replace(/stroke:\s*(?!none|transparent)[^;]+/gi, 'stroke:#FFFFFF');
        el.setAttribute('style', newStyle);
      }
    });

    // Handle <style> blocks
    const styleElements = svg.querySelectorAll('style');
    styleElements.forEach((styleEl) => {
      if (styleEl.textContent) {
        styleEl.textContent = styleEl.textContent
          .replace(/fill:\s*(?!none|transparent)[^;]+/gi, 'fill:#FFFFFF')
          .replace(/stroke:\s*(?!none|transparent)[^;]+/gi, 'stroke:#FFFFFF');
      }
    });

    // Handle gradients and patterns - remove defs and replace references
    const defs = svg.querySelector('defs');
    if (defs) {
      const gradients = defs.querySelectorAll(
        'linearGradient, radialGradient, pattern'
      );
      gradients.forEach((g) => g.remove());
    }

    // Elements referencing removed gradients/patterns get solid white
    elements.forEach((el) => {
      const fill = el.getAttribute('fill');
      if (fill?.startsWith('url(')) {
        el.setAttribute('fill', '#FFFFFF');
      }
      const stroke = el.getAttribute('stroke');
      if (stroke?.startsWith('url(')) {
        el.setAttribute('stroke', '#FFFFFF');
      }
    });

    const outputSvg = svg.outerHTML;
    return { success: true, buffer: Buffer.from(outputSvg, 'utf-8') };
  } catch (error) {
    return {
      success: false,
      buffer: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
