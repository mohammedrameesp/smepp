/**
 * @file pagination-schema.test.ts
 * @description Unit tests for pagination and query parameter schemas
 * @module tests/unit/lib/validations
 */

import { z } from 'zod';
import {
  basePaginationSchema,
  searchablePaginationSchema,
  createQuerySchema,
} from '@/lib/validations/pagination-schema';

describe('Pagination Schemas', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // BASE PAGINATION SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('basePaginationSchema', () => {
    describe('page (p) field', () => {
      it('should default to page 1 when not provided', () => {
        const result = basePaginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(1);
        }
      });

      it('should accept valid page numbers', () => {
        const result = basePaginationSchema.safeParse({ p: 5 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(5);
        }
      });

      it('should coerce string page numbers', () => {
        const result = basePaginationSchema.safeParse({ p: '3' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(3);
        }
      });

      it('should reject page 0', () => {
        const result = basePaginationSchema.safeParse({ p: 0 });
        expect(result.success).toBe(false);
      });

      it('should reject negative page numbers', () => {
        const result = basePaginationSchema.safeParse({ p: -1 });
        expect(result.success).toBe(false);
      });

      it('should reject non-integer page numbers', () => {
        const result = basePaginationSchema.safeParse({ p: 1.5 });
        expect(result.success).toBe(false);
      });
    });

    describe('page size (ps) field', () => {
      it('should default to 20 when not provided', () => {
        const result = basePaginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ps).toBe(20);
        }
      });

      it('should accept valid page sizes', () => {
        const result = basePaginationSchema.safeParse({ ps: 50 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ps).toBe(50);
        }
      });

      it('should coerce string page sizes', () => {
        const result = basePaginationSchema.safeParse({ ps: '100' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ps).toBe(100);
        }
      });

      it('should accept minimum page size of 1', () => {
        const result = basePaginationSchema.safeParse({ ps: 1 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ps).toBe(1);
        }
      });

      it('should accept maximum page size of 10000', () => {
        const result = basePaginationSchema.safeParse({ ps: 10000 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.ps).toBe(10000);
        }
      });

      it('should reject page size of 0', () => {
        const result = basePaginationSchema.safeParse({ ps: 0 });
        expect(result.success).toBe(false);
      });

      it('should reject page size above maximum', () => {
        const result = basePaginationSchema.safeParse({ ps: 10001 });
        expect(result.success).toBe(false);
      });

      it('should reject negative page sizes', () => {
        const result = basePaginationSchema.safeParse({ ps: -10 });
        expect(result.success).toBe(false);
      });
    });

    describe('sort field', () => {
      it('should accept sort field', () => {
        const result = basePaginationSchema.safeParse({ sort: 'createdAt' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe('createdAt');
        }
      });

      it('should be optional (undefined when not provided)', () => {
        const result = basePaginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBeUndefined();
        }
      });
    });

    describe('order field', () => {
      it('should default to desc when not provided', () => {
        const result = basePaginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe('desc');
        }
      });

      it('should accept asc order', () => {
        const result = basePaginationSchema.safeParse({ order: 'asc' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe('asc');
        }
      });

      it('should accept desc order', () => {
        const result = basePaginationSchema.safeParse({ order: 'desc' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.order).toBe('desc');
        }
      });

      it('should reject invalid order values', () => {
        const result = basePaginationSchema.safeParse({ order: 'ascending' });
        expect(result.success).toBe(false);
      });
    });

    describe('complete pagination object', () => {
      it('should parse complete valid pagination params', () => {
        const result = basePaginationSchema.safeParse({
          p: 2,
          ps: 50,
          sort: 'name',
          order: 'asc',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toEqual({
            p: 2,
            ps: 50,
            sort: 'name',
            order: 'asc',
          });
        }
      });

      it('should handle string query params (URL parsing scenario)', () => {
        const result = basePaginationSchema.safeParse({
          p: '3',
          ps: '25',
          sort: 'updatedAt',
          order: 'desc',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(3);
          expect(result.data.ps).toBe(25);
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SEARCHABLE PAGINATION SCHEMA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('searchablePaginationSchema', () => {
    it('should include all base pagination fields', () => {
      const result = searchablePaginationSchema.safeParse({
        p: 1,
        ps: 20,
        order: 'desc',
      });
      expect(result.success).toBe(true);
    });

    describe('search query (q) field', () => {
      it('should accept search query', () => {
        const result = searchablePaginationSchema.safeParse({ q: 'laptop' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe('laptop');
        }
      });

      it('should accept empty search query', () => {
        const result = searchablePaginationSchema.safeParse({ q: '' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe('');
        }
      });

      it('should be optional (undefined when not provided)', () => {
        const result = searchablePaginationSchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBeUndefined();
        }
      });

      it('should accept search query with special characters', () => {
        const result = searchablePaginationSchema.safeParse({
          q: 'MacBook Pro 2023',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe('MacBook Pro 2023');
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CREATE QUERY SCHEMA FACTORY
  // ═══════════════════════════════════════════════════════════════════════════

  describe('createQuerySchema', () => {
    describe('with custom filter fields', () => {
      const assetQuerySchema = createQuerySchema({
        status: z.enum(['ACTIVE', 'DISPOSED', 'MAINTENANCE']).optional(),
        categoryId: z.string().optional(),
        assignedTo: z.string().optional(),
      });

      it('should include pagination fields', () => {
        const result = assetQuerySchema.safeParse({ p: 2, ps: 30 });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(2);
          expect(result.data.ps).toBe(30);
        }
      });

      it('should include search field', () => {
        const result = assetQuerySchema.safeParse({ q: 'laptop' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.q).toBe('laptop');
        }
      });

      it('should include custom filter fields', () => {
        const result = assetQuerySchema.safeParse({
          status: 'ACTIVE',
          categoryId: 'cat-123',
          assignedTo: 'user-456',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe('ACTIVE');
          expect(result.data.categoryId).toBe('cat-123');
          expect(result.data.assignedTo).toBe('user-456');
        }
      });

      it('should validate custom enum fields', () => {
        const result = assetQuerySchema.safeParse({ status: 'INVALID' });
        expect(result.success).toBe(false);
      });

      it('should parse complete query with all fields', () => {
        const result = assetQuerySchema.safeParse({
          p: '1',
          ps: '50',
          q: 'dell',
          sort: 'name',
          order: 'asc',
          status: 'ACTIVE',
          categoryId: 'cat-001',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toMatchObject({
            p: 1,
            ps: 50,
            q: 'dell',
            sort: 'name',
            order: 'asc',
            status: 'ACTIVE',
            categoryId: 'cat-001',
          });
        }
      });
    });

    describe('with sort options validation', () => {
      const employeeQuerySchema = createQuerySchema(
        {
          department: z.string().optional(),
          isActive: z.coerce.boolean().optional(),
        },
        ['name', 'dateOfJoining', 'department', 'createdAt']
      );

      it('should accept valid sort field from options', () => {
        const result = employeeQuerySchema.safeParse({ sort: 'name' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe('name');
        }
      });

      it('should accept all valid sort options', () => {
        const validSorts = ['name', 'dateOfJoining', 'department', 'createdAt'];
        for (const sort of validSorts) {
          const result = employeeQuerySchema.safeParse({ sort });
          expect(result.success).toBe(true);
        }
      });

      it('should reject sort field not in options', () => {
        const result = employeeQuerySchema.safeParse({ sort: 'email' });
        expect(result.success).toBe(false);
      });

      it('should reject sort field not in options (salary)', () => {
        const result = employeeQuerySchema.safeParse({ sort: 'salary' });
        expect(result.success).toBe(false);
      });

      it('should still allow sort to be optional', () => {
        const result = employeeQuerySchema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBeUndefined();
        }
      });

      it('should include custom boolean filter with coercion', () => {
        const result = employeeQuerySchema.safeParse({ isActive: 'true' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.isActive).toBe(true);
        }
      });
    });

    describe('without sort options (any sort field allowed)', () => {
      const genericQuerySchema = createQuerySchema({
        type: z.string().optional(),
      });

      it('should accept any sort field when no options specified', () => {
        const result = genericQuerySchema.safeParse({ sort: 'anyField' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.sort).toBe('anyField');
        }
      });

      it('should accept complex sort field names', () => {
        const result = genericQuerySchema.safeParse({
          sort: 'someComplexFieldName',
        });
        expect(result.success).toBe(true);
      });
    });

    describe('with empty fields object', () => {
      const minimalQuerySchema = createQuerySchema({});

      it('should work with no custom fields', () => {
        const result = minimalQuerySchema.safeParse({
          p: 1,
          ps: 10,
          q: 'search',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(1);
          expect(result.data.ps).toBe(10);
          expect(result.data.q).toBe('search');
        }
      });
    });

    describe('edge cases', () => {
      const schema = createQuerySchema({
        count: z.coerce.number().optional(),
      });

      it('should handle coercion for custom numeric fields', () => {
        const result = schema.safeParse({ count: '42' });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.count).toBe(42);
        }
      });

      it('should apply defaults when parsing empty object', () => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.p).toBe(1);
          expect(result.data.ps).toBe(20);
          expect(result.data.order).toBe('desc');
        }
      });
    });
  });
});
