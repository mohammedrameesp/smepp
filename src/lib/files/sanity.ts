import mime from 'mime';

// Magic number signatures for file types
const FILE_SIGNATURES = {
  'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
  'image/jpeg': [0xFF, 0xD8, 0xFF], // JPEG
  'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], // PNG
} as const;

const ALLOWED_EXTENSIONS = ['.pdf', '.png', '.jpg', '.jpeg'] as const;
const ALLOWED_MIME_TYPES = Object.keys(FILE_SIGNATURES) as string[];

export interface FileSanityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export async function scanFileBuffer(
  buffer: Buffer,
  originalFilename: string,
  detectedMimeType?: string
): Promise<FileSanityResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // 1. Extension check
    const extension = originalFilename.toLowerCase().substring(originalFilename.lastIndexOf('.'));
    if (!ALLOWED_EXTENSIONS.includes(extension as any)) {
      errors.push(`File extension ${extension} not allowed. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
    }

    // 2. MIME type check
    const mimeFromExtension = mime.getType(originalFilename);
    if (detectedMimeType && !ALLOWED_MIME_TYPES.includes(detectedMimeType)) {
      errors.push(`MIME type ${detectedMimeType} not allowed`);
    }

    // 3. Magic number verification
    const signature = getMagicNumberSignature(buffer);
    if (signature) {
      const expectedMime = mimeFromExtension || detectedMimeType;
      if (expectedMime && !verifyMagicNumber(buffer, expectedMime)) {
        errors.push(`File content doesn't match expected type ${expectedMime}`);
      }
    } else {
      warnings.push('Could not verify file signature');
    }

    // 4. Basic size checks (already done in upload, but double-check)
    if (buffer.length === 0) {
      errors.push('File is empty');
    }

    if (buffer.length > 10 * 1024 * 1024) { // 10MB
      errors.push('File exceeds maximum size limit');
    }

    // 5. PDF-specific checks
    if (mimeFromExtension === 'application/pdf') {
      const pdfChecks = validatePDFBuffer(buffer);
      errors.push(...pdfChecks.errors);
      warnings.push(...pdfChecks.warnings);
    }

    // 6. Image-specific checks
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

function getMagicNumberSignature(buffer: Buffer): number[] | null {
  if (buffer.length < 4) return null;
  return Array.from(buffer.subarray(0, 8));
}

function verifyMagicNumber(buffer: Buffer, expectedMimeType: string): boolean {
  const signature = FILE_SIGNATURES[expectedMimeType as keyof typeof FILE_SIGNATURES];
  if (!signature) return true; // No signature defined, assume valid

  if (buffer.length < signature.length) return false;

  for (let i = 0; i < signature.length; i++) {
    if (buffer[i] !== signature[i]) return false;
  }

  return true;
}

function validatePDFBuffer(buffer: Buffer): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for PDF header
  const pdfHeader = buffer.subarray(0, 4);
  if (!pdfHeader.equals(Buffer.from([0x25, 0x50, 0x44, 0x46]))) {
    errors.push('Invalid PDF header');
  }

  // Check for PDF version in first 10 bytes
  const firstLine = buffer.subarray(0, 10).toString('ascii');
  if (!firstLine.includes('%PDF-')) {
    warnings.push('PDF version not found in expected location');
  }

  // Look for EOF marker (basic check)
  const lastBytes = buffer.subarray(-50).toString('ascii');
  if (!lastBytes.includes('%%EOF')) {
    warnings.push('PDF EOF marker not found - file may be truncated');
  }

  return { errors, warnings };
}

function validateImageBuffer(buffer: Buffer, mimeType: string): { errors: string[], warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (mimeType === 'image/jpeg') {
    // JPEG should start with 0xFF 0xD8 and end with 0xFF 0xD9
    if (buffer.length < 4) {
      errors.push('JPEG file too small');
    } else {
      const start = buffer.subarray(0, 3);
      if (!start.equals(Buffer.from([0xFF, 0xD8, 0xFF]))) {
        errors.push('Invalid JPEG header');
      }
      
      const end = buffer.subarray(-2);
      if (!end.equals(Buffer.from([0xFF, 0xD9]))) {
        warnings.push('JPEG end marker not found - file may be corrupted');
      }
    }
  } else if (mimeType === 'image/png') {
    // PNG signature: 89 50 4E 47 0D 0A 1A 0A
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    if (buffer.length < 8) {
      errors.push('PNG file too small');
    } else if (!buffer.subarray(0, 8).equals(pngSignature)) {
      errors.push('Invalid PNG signature');
    }
  }

  return { errors, warnings };
}

// Quick validation for upload endpoints
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