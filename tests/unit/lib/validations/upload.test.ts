/**
 * @file upload.test.ts
 * @description Unit tests for upload validation schemas
 * @module tests/unit/lib/validations
 */

import { uploadSchema, signedUrlSchema } from '@/lib/validations/core/upload';

describe('Upload Validation Schemas', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // UPLOAD SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('uploadSchema', () => {
    describe('entityType field', () => {
      it('should accept "asset" entity type', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
          entityId: 'asset-123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.entityType).toBe('asset');
        }
      });

      it('should accept "subscription" entity type', () => {
        const result = uploadSchema.safeParse({
          entityType: 'subscription',
          entityId: 'sub-123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.entityType).toBe('subscription');
        }
      });

      it('should reject invalid entity type', () => {
        const result = uploadSchema.safeParse({
          entityType: 'user',
          entityId: 'user-123',
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing entity type', () => {
        const result = uploadSchema.safeParse({
          entityId: 'asset-123',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('entityId field', () => {
      it('should accept valid entity ID', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
          entityId: 'clp123abc',
        });
        expect(result.success).toBe(true);
      });

      it('should reject empty entity ID', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
          entityId: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Entity ID is required');
        }
      });

      it('should reject missing entity ID', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
        });
        expect(result.success).toBe(false);
      });
    });

    describe('projectCode field', () => {
      it('should accept valid project code', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
          entityId: 'asset-123',
          projectCode: 'PROJ-001',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.projectCode).toBe('PROJ-001');
        }
      });

      it('should accept null project code', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
          entityId: 'asset-123',
          projectCode: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.projectCode).toBeNull();
        }
      });

      it('should accept missing project code (optional)', () => {
        const result = uploadSchema.safeParse({
          entityType: 'asset',
          entityId: 'asset-123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.projectCode).toBeUndefined();
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SIGNED URL SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('signedUrlSchema', () => {
    describe('path field', () => {
      it('should accept valid path', () => {
        const result = signedUrlSchema.safeParse({
          path: 'tenants/123/assets/file.pdf',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.path).toBe('tenants/123/assets/file.pdf');
        }
      });

      it('should reject empty path', () => {
        const result = signedUrlSchema.safeParse({
          path: '',
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Path is required');
        }
      });

      it('should reject missing path', () => {
        const result = signedUrlSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe('expiresInSec field', () => {
      it('should default to 3600 seconds (1 hour)', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.expiresInSec).toBe(3600);
        }
      });

      it('should accept custom expiry within range', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: 300, // 5 minutes
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.expiresInSec).toBe(300);
        }
      });

      it('should accept minimum expiry (60 seconds)', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: 60,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.expiresInSec).toBe(60);
        }
      });

      it('should accept maximum expiry (24 hours)', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: 86400,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.expiresInSec).toBe(86400);
        }
      });

      it('should reject expiry below minimum (< 60 seconds)', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: 30,
        });
        expect(result.success).toBe(false);
      });

      it('should reject expiry above maximum (> 24 hours)', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: 100000,
        });
        expect(result.success).toBe(false);
      });

      it('should reject negative expiry', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: -100,
        });
        expect(result.success).toBe(false);
      });

      it('should reject non-numeric expiry', () => {
        const result = signedUrlSchema.safeParse({
          path: 'file.pdf',
          expiresInSec: 'forever',
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
