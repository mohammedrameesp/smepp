/**
 * @file locations.test.ts
 * @description Unit tests for location validation schemas
 * @module tests/unit/lib/validations
 */

import {
  createLocationSchema,
  updateLocationSchema,
  locationQuerySchema,
} from '@/features/locations/validations/locations';

describe('Location Validation Schemas', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE LOCATION SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createLocationSchema', () => {
    describe('name field', () => {
      it('should accept valid name', () => {
        const result = createLocationSchema.safeParse({ name: 'Main Office' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.name).toBe('Main Office');
        }
      });

      it('should reject empty name', () => {
        const result = createLocationSchema.safeParse({ name: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name is required');
        }
      });

      it('should reject missing name', () => {
        const result = createLocationSchema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject name over 100 characters', () => {
        const longName = 'a'.repeat(101);
        const result = createLocationSchema.safeParse({ name: longName });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name must be less than 100 characters');
        }
      });

      it('should accept name exactly 100 characters', () => {
        const maxName = 'a'.repeat(100);
        const result = createLocationSchema.safeParse({ name: maxName });
        expect(result.success).toBe(true);
      });

      it('should accept name with special characters', () => {
        const result = createLocationSchema.safeParse({ name: 'Building A - Floor 3 (West Wing)' });
        expect(result.success).toBe(true);
      });

      it('should accept Unicode characters', () => {
        const result = createLocationSchema.safeParse({ name: 'مكتب الدوحة' });
        expect(result.success).toBe(true);
      });
    });

    describe('description field', () => {
      it('should accept valid description', () => {
        const result = createLocationSchema.safeParse({
          name: 'Office',
          description: 'Main headquarters office',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBe('Main headquarters office');
        }
      });

      it('should accept null description', () => {
        const result = createLocationSchema.safeParse({
          name: 'Office',
          description: null,
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeNull();
        }
      });

      it('should accept undefined description (optional)', () => {
        const result = createLocationSchema.safeParse({ name: 'Office' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.description).toBeUndefined();
        }
      });

      it('should reject description over 500 characters', () => {
        const longDesc = 'a'.repeat(501);
        const result = createLocationSchema.safeParse({
          name: 'Office',
          description: longDesc,
        });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Description must be less than 500 characters');
        }
      });

      it('should accept description exactly 500 characters', () => {
        const maxDesc = 'a'.repeat(500);
        const result = createLocationSchema.safeParse({
          name: 'Office',
          description: maxDesc,
        });
        expect(result.success).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE LOCATION SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateLocationSchema', () => {
    it('should accept partial update with only name', () => {
      const result = updateLocationSchema.safeParse({ name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only description', () => {
      const result = updateLocationSchema.safeParse({ description: 'New description' });
      expect(result.success).toBe(true);
    });

    it('should accept partial update with only isActive', () => {
      const result = updateLocationSchema.safeParse({ isActive: false });
      expect(result.success).toBe(true);
    });

    it('should accept full update with all fields', () => {
      const result = updateLocationSchema.safeParse({
        name: 'Updated Office',
        description: 'Updated description',
        isActive: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Office');
        expect(result.data.description).toBe('Updated description');
        expect(result.data.isActive).toBe(true);
      }
    });

    it('should accept empty object (no fields to update)', () => {
      const result = updateLocationSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject name if provided but empty', () => {
      const result = updateLocationSchema.safeParse({ name: '' });
      expect(result.success).toBe(false);
    });

    it('should validate isActive as boolean', () => {
      const validTrue = updateLocationSchema.safeParse({ isActive: true });
      const validFalse = updateLocationSchema.safeParse({ isActive: false });
      expect(validTrue.success).toBe(true);
      expect(validFalse.success).toBe(true);
    });

    it('should reject invalid isActive values', () => {
      const result = updateLocationSchema.safeParse({ isActive: 'yes' });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // LOCATION QUERY SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('locationQuerySchema', () => {
    it('should transform "true" string to boolean true', () => {
      const result = locationQuerySchema.safeParse({ includeInactive: 'true' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeInactive).toBe(true);
      }
    });

    it('should transform "false" string to boolean false', () => {
      const result = locationQuerySchema.safeParse({ includeInactive: 'false' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeInactive).toBe(false);
      }
    });

    it('should transform null to boolean false', () => {
      const result = locationQuerySchema.safeParse({ includeInactive: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeInactive).toBe(false);
      }
    });

    it('should transform undefined to boolean false', () => {
      const result = locationQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeInactive).toBe(false);
      }
    });

    it('should transform any non-"true" string to false', () => {
      const result = locationQuerySchema.safeParse({ includeInactive: 'yes' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.includeInactive).toBe(false);
      }
    });
  });
});
