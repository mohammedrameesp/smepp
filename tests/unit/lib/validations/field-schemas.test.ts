/**
 * @file field-schemas.test.ts
 * @description Unit tests for common field validation schemas
 * @module tests/unit/lib/validations
 */

import { z } from 'zod';
import {
  optionalString,
  optionalStringToNull,
  requiredString,
  optionalEmail,
} from '@/lib/validations/field-schemas';

describe('Field Schemas', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL STRING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('optionalString', () => {
    const schema = z.object({ field: optionalString() });

    it('should accept a regular string', () => {
      const result = schema.safeParse({ field: 'hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBe('hello');
      }
    });

    it('should accept an empty string and preserve it', () => {
      const result = schema.safeParse({ field: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBe('');
      }
    });

    it('should accept null', () => {
      const result = schema.safeParse({ field: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBeNull();
      }
    });

    it('should accept undefined', () => {
      const result = schema.safeParse({ field: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBeUndefined();
      }
    });

    it('should accept missing field', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject non-string values', () => {
      const result = schema.safeParse({ field: 123 });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL STRING TO NULL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('optionalStringToNull', () => {
    const schema = z.object({ field: optionalStringToNull() });

    it('should accept a regular string and preserve it', () => {
      const result = schema.safeParse({ field: 'hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBe('hello');
      }
    });

    it('should transform empty string to null', () => {
      const result = schema.safeParse({ field: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBeNull();
      }
    });

    it('should accept null and preserve it', () => {
      const result = schema.safeParse({ field: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBeNull();
      }
    });

    it('should accept undefined and preserve it', () => {
      const result = schema.safeParse({ field: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBeUndefined();
      }
    });

    it('should accept missing field', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject non-string values', () => {
      const result = schema.safeParse({ field: 123 });
      expect(result.success).toBe(false);
    });

    it('should preserve whitespace-only strings (not transform to null)', () => {
      const result = schema.safeParse({ field: '   ' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.field).toBe('   ');
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // REQUIRED STRING
  // ═══════════════════════════════════════════════════════════════════════════

  describe('requiredString', () => {
    describe('with default message', () => {
      const schema = z.object({ field: requiredString() });

      it('should accept a non-empty string', () => {
        const result = schema.safeParse({ field: 'hello' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.field).toBe('hello');
        }
      });

      it('should accept a single character', () => {
        const result = schema.safeParse({ field: 'a' });
        expect(result.success).toBe(true);
      });

      it('should reject empty string with default message', () => {
        const result = schema.safeParse({ field: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('This field is required');
        }
      });

      it('should reject missing field', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(false);
      });

      it('should reject null', () => {
        const result = schema.safeParse({ field: null });
        expect(result.success).toBe(false);
      });

      it('should reject undefined', () => {
        const result = schema.safeParse({ field: undefined });
        expect(result.success).toBe(false);
      });
    });

    describe('with custom message', () => {
      const schema = z.object({ name: requiredString('Name is required') });

      it('should reject empty string with custom message', () => {
        const result = schema.safeParse({ name: '' });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Name is required');
        }
      });
    });

    it('should accept whitespace-only strings', () => {
      const schema = z.object({ field: requiredString() });
      const result = schema.safeParse({ field: '   ' });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OPTIONAL EMAIL
  // ═══════════════════════════════════════════════════════════════════════════

  describe('optionalEmail', () => {
    const schema = z.object({ email: optionalEmail() });

    it('should accept a valid email', () => {
      const result = schema.safeParse({ email: 'test@example.com' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should accept complex valid emails', () => {
      const validEmails = [
        'user.name@domain.com',
        'user+tag@example.org',
        'name@subdomain.domain.co.uk',
      ];

      for (const email of validEmails) {
        const result = schema.safeParse({ email });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.email).toBe(email);
        }
      }
    });

    it('should transform empty string to null', () => {
      const result = schema.safeParse({ email: '' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeNull();
      }
    });

    it('should accept null and preserve it', () => {
      const result = schema.safeParse({ email: null });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeNull();
      }
    });

    it('should accept undefined and preserve it', () => {
      const result = schema.safeParse({ email: undefined });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBeUndefined();
      }
    });

    it('should accept missing field', () => {
      const result = schema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        'missing@domain',
        '@nodomain.com',
        'spaces in@email.com',
      ];

      for (const email of invalidEmails) {
        const result = schema.safeParse({ email });
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.issues[0].message).toBe('Invalid email address');
        }
      }
    });
  });
});
