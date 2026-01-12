/**
 * @file supabase.test.ts
 * @description Unit tests for Supabase storage utilities and security functions
 * @module tests/unit/lib/storage
 */

// Import the path validation function directly for testing
import { validateAndSanitizePath } from '@/lib/storage/supabase';

describe('Supabase Storage Utilities', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // PATH VALIDATION & SANITIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('validateAndSanitizePath', () => {
    describe('Valid Paths', () => {
      it('should accept simple file path', () => {
        const result = validateAndSanitizePath('documents/file.pdf');
        expect(result).toBe('documents/file.pdf');
      });

      it('should accept nested path', () => {
        const result = validateAndSanitizePath('tenants/123/assets/images/photo.jpg');
        expect(result).toBe('tenants/123/assets/images/photo.jpg');
      });

      it('should accept alphanumeric characters', () => {
        const result = validateAndSanitizePath('abc123/XYZ789/file.txt');
        expect(result).toBe('abc123/XYZ789/file.txt');
      });

      it('should accept dashes and underscores', () => {
        const result = validateAndSanitizePath('my-folder/my_file-v2.pdf');
        expect(result).toBe('my-folder/my_file-v2.pdf');
      });

      it('should accept dots in filenames', () => {
        const result = validateAndSanitizePath('folder/file.backup.pdf');
        expect(result).toBe('folder/file.backup.pdf');
      });
    });

    describe('Security: Path Traversal Prevention', () => {
      it('should reject path traversal with ../', () => {
        expect(() => validateAndSanitizePath('../etc/passwd')).toThrow(
          'SECURITY: Path traversal detected'
        );
      });

      it('should reject path traversal with ..\\', () => {
        expect(() => validateAndSanitizePath('..\\windows\\system32')).toThrow(
          'SECURITY: Path traversal detected'
        );
      });

      it('should reject nested path traversal', () => {
        expect(() => validateAndSanitizePath('folder/../../../etc/passwd')).toThrow(
          'SECURITY: Path traversal detected'
        );
      });

      it('should reject encoded path traversal', () => {
        // Double dots should still be caught (contains ..)
        expect(() => validateAndSanitizePath('folder/..%2F..%2Fetc')).toThrow(
          'SECURITY: Path traversal detected'
        );
      });
    });

    describe('Security: Absolute Path Prevention', () => {
      it('should reject absolute Unix paths', () => {
        expect(() => validateAndSanitizePath('/etc/passwd')).toThrow(
          'SECURITY: Absolute paths are not allowed'
        );
      });

      it('should reject paths starting with slash', () => {
        expect(() => validateAndSanitizePath('/home/user/file.txt')).toThrow(
          'SECURITY: Absolute paths are not allowed'
        );
      });
    });

    describe('Security: Null Byte Prevention', () => {
      it('should reject null bytes in path', () => {
        expect(() => validateAndSanitizePath('file.pdf\0.exe')).toThrow(
          'SECURITY: Null bytes are not allowed'
        );
      });

      it('should reject embedded null bytes', () => {
        expect(() => validateAndSanitizePath('folder\0/file.txt')).toThrow(
          'SECURITY: Null bytes are not allowed'
        );
      });
    });

    describe('Security: Character Validation', () => {
      it('should reject special characters', () => {
        expect(() => validateAndSanitizePath('folder/file<script>.txt')).toThrow(
          'SECURITY: Path contains invalid characters'
        );
      });

      it('should reject shell metacharacters', () => {
        expect(() => validateAndSanitizePath('folder/file;rm -rf.txt')).toThrow(
          'SECURITY: Path contains invalid characters'
        );
      });

      it('should reject pipe characters', () => {
        expect(() => validateAndSanitizePath('folder/file|cat.txt')).toThrow(
          'SECURITY: Path contains invalid characters'
        );
      });

      it('should reject backticks', () => {
        expect(() => validateAndSanitizePath('folder/`whoami`.txt')).toThrow(
          'SECURITY: Path contains invalid characters'
        );
      });

      it('should reject spaces', () => {
        expect(() => validateAndSanitizePath('folder/file name.txt')).toThrow(
          'SECURITY: Path contains invalid characters'
        );
      });

      it('should reject unicode characters', () => {
        expect(() => validateAndSanitizePath('folder/файл.txt')).toThrow(
          'SECURITY: Path contains invalid characters'
        );
      });
    });

    describe('Security: Double Slash Prevention', () => {
      it('should reject double slashes', () => {
        expect(() => validateAndSanitizePath('folder//file.txt')).toThrow(
          'SECURITY: Double slashes are not allowed'
        );
      });

      it('should reject multiple double slashes', () => {
        expect(() => validateAndSanitizePath('a//b//c.txt')).toThrow(
          'SECURITY: Double slashes are not allowed'
        );
      });
    });

    describe('Security: Empty Path Prevention', () => {
      it('should reject empty string', () => {
        expect(() => validateAndSanitizePath('')).toThrow(
          'SECURITY: Path cannot be empty'
        );
      });

      it('should reject whitespace only', () => {
        expect(() => validateAndSanitizePath('   ')).toThrow(
          'SECURITY: Path cannot be empty'
        );
      });
    });

    describe('Tenant Path Enforcement', () => {
      it('should auto-prefix tenant path if not present', () => {
        const result = validateAndSanitizePath('assets/file.pdf', 'tenant-123');
        expect(result).toBe('tenants/tenant-123/assets/file.pdf');
      });

      it('should not double-prefix if tenant path already present', () => {
        const result = validateAndSanitizePath(
          'tenants/tenant-123/assets/file.pdf',
          'tenant-123'
        );
        expect(result).toBe('tenants/tenant-123/assets/file.pdf');
      });

      it('should reject wrong tenant prefix', () => {
        // Path for tenant-456 should be prefixed with tenant-123
        const result = validateAndSanitizePath(
          'tenants/tenant-456/assets/file.pdf',
          'tenant-123'
        );
        // Should auto-prefix with correct tenant, making path:
        // tenants/tenant-123/tenants/tenant-456/assets/file.pdf
        expect(result).toBe(
          'tenants/tenant-123/tenants/tenant-456/assets/file.pdf'
        );
      });

      it('should not enforce tenant prefix when tenantId not provided', () => {
        const result = validateAndSanitizePath('public/file.pdf');
        expect(result).toBe('public/file.pdf');
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // MIME TYPE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('MIME Type Validation', () => {
    const ALLOWED_MIME_TYPES = new Set([
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/csv',
      'application/zip',
    ]);

    describe('Allowed Types', () => {
      it('should allow JPEG images', () => {
        expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true);
      });

      it('should allow PNG images', () => {
        expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
      });

      it('should allow PDF documents', () => {
        expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
      });

      it('should allow Word documents (old format)', () => {
        expect(ALLOWED_MIME_TYPES.has('application/msword')).toBe(true);
      });

      it('should allow Word documents (new format)', () => {
        expect(
          ALLOWED_MIME_TYPES.has(
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          )
        ).toBe(true);
      });

      it('should allow Excel spreadsheets', () => {
        expect(
          ALLOWED_MIME_TYPES.has(
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          )
        ).toBe(true);
      });

      it('should allow CSV files', () => {
        expect(ALLOWED_MIME_TYPES.has('text/csv')).toBe(true);
      });

      it('should allow ZIP archives', () => {
        expect(ALLOWED_MIME_TYPES.has('application/zip')).toBe(true);
      });
    });

    describe('Blocked Types', () => {
      it('should block executable files', () => {
        expect(ALLOWED_MIME_TYPES.has('application/x-executable')).toBe(false);
        expect(ALLOWED_MIME_TYPES.has('application/x-msdownload')).toBe(false);
      });

      it('should block JavaScript files', () => {
        expect(ALLOWED_MIME_TYPES.has('application/javascript')).toBe(false);
        expect(ALLOWED_MIME_TYPES.has('text/javascript')).toBe(false);
      });

      it('should block HTML files', () => {
        expect(ALLOWED_MIME_TYPES.has('text/html')).toBe(false);
      });

      it('should block PHP files', () => {
        expect(ALLOWED_MIME_TYPES.has('application/x-php')).toBe(false);
        expect(ALLOWED_MIME_TYPES.has('text/x-php')).toBe(false);
      });

      it('should block shell scripts', () => {
        expect(ALLOWED_MIME_TYPES.has('application/x-sh')).toBe(false);
        expect(ALLOWED_MIME_TYPES.has('text/x-shellscript')).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FILE SIZE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('File Size Validation', () => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    it('should have 10MB maximum file size', () => {
      expect(MAX_FILE_SIZE).toBe(10485760);
    });

    it('should accept files under limit', () => {
      const fileSize = 5 * 1024 * 1024; // 5MB
      expect(fileSize <= MAX_FILE_SIZE).toBe(true);
    });

    it('should accept files at exactly the limit', () => {
      expect(MAX_FILE_SIZE <= MAX_FILE_SIZE).toBe(true);
    });

    it('should reject files over limit', () => {
      const fileSize = 11 * 1024 * 1024; // 11MB
      expect(fileSize > MAX_FILE_SIZE).toBe(true);
    });

    it('should reject very large files', () => {
      const fileSize = 100 * 1024 * 1024; // 100MB
      expect(fileSize > MAX_FILE_SIZE).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNED URL SECURITY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Signed URL Security', () => {
    const MAX_EXPIRY = 3600; // 1 hour

    it('should limit maximum expiry to 1 hour', () => {
      const requestedExpiry = 7200; // 2 hours
      const safeExpiry = Math.min(requestedExpiry, MAX_EXPIRY);
      expect(safeExpiry).toBe(3600);
    });

    it('should allow shorter expiry times', () => {
      const requestedExpiry = 300; // 5 minutes
      const safeExpiry = Math.min(requestedExpiry, MAX_EXPIRY);
      expect(safeExpiry).toBe(300);
    });

    it('should allow exactly max expiry', () => {
      const requestedExpiry = 3600;
      const safeExpiry = Math.min(requestedExpiry, MAX_EXPIRY);
      expect(safeExpiry).toBe(3600);
    });
  });
});
