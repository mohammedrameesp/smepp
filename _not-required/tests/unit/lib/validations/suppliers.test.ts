/**
 * Tests for Supplier Validation Schemas
 * @see src/lib/validations/suppliers.ts
 */

import { SupplierStatus } from '@prisma/client';
import {
  createSupplierSchema,
  updateSupplierSchema,
  approveSupplierSchema,
  rejectSupplierSchema,
  createEngagementSchema,
  supplierQuerySchema,
} from '@/lib/validations/suppliers';

describe('Supplier Validation Schemas', () => {
  describe('createSupplierSchema', () => {
    it('should validate a complete valid supplier', () => {
      const validSupplier = {
        name: 'Tech Solutions Ltd',
        category: 'IT Services',
        address: '123 Business Park',
        city: 'Doha',
        country: 'Qatar',
        website: 'https://techsolutions.com',
        establishmentYear: 2015,
        primaryContactName: 'Ahmed Ali',
        primaryContactTitle: 'Sales Manager',
        primaryContactEmail: 'ahmed@techsolutions.com',
        primaryContactMobile: '+97412345678',
        secondaryContactName: 'Sara Khan',
        secondaryContactTitle: 'Account Executive',
        secondaryContactEmail: 'sara@techsolutions.com',
        secondaryContactMobile: '+97487654321',
        paymentTerms: 'Net 30',
        additionalInfo: 'Preferred vendor for IT equipment',
      };

      const result = createSupplierSchema.safeParse(validSupplier);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields', () => {
      const minimalSupplier = {
        name: 'Simple Supplier',
        category: 'General',
      };

      const result = createSupplierSchema.safeParse(minimalSupplier);
      expect(result.success).toBe(true);
    });

    it('should fail when name is missing', () => {
      const invalidSupplier = {
        category: 'IT Services',
      };

      const result = createSupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
      }
    });

    it('should fail when name is empty', () => {
      const invalidSupplier = {
        name: '',
        category: 'IT Services',
      };

      const result = createSupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
    });

    it('should fail when category is missing', () => {
      const invalidSupplier = {
        name: 'Test Supplier',
      };

      const result = createSupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('category'))).toBe(true);
      }
    });

    it('should fail when category is empty', () => {
      const invalidSupplier = {
        name: 'Test Supplier',
        category: '',
      };

      const result = createSupplierSchema.safeParse(invalidSupplier);
      expect(result.success).toBe(false);
    });

    it('should accept valid website formats', () => {
      const validWebsites = [
        'https://example.com',
        'http://example.com',
        'example.com',
        'www.example.com',
        'https://sub.example.co.uk',
        'https://example.com/page',
      ];

      validWebsites.forEach(website => {
        const result = createSupplierSchema.safeParse({
          name: 'Test Supplier',
          category: 'General',
          website,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid website format', () => {
      const invalidWebsites = [
        'not a website',
        'ftp://example.com',
        'example',
        '@example.com',
      ];

      invalidWebsites.forEach(website => {
        const result = createSupplierSchema.safeParse({
          name: 'Test Supplier',
          category: 'General',
          website,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should accept empty/null website', () => {
      const suppliers = [
        { name: 'Test', category: 'General', website: '' },
        { name: 'Test', category: 'General', website: null },
      ];

      suppliers.forEach(supplier => {
        const result = createSupplierSchema.safeParse(supplier);
        expect(result.success).toBe(true);
      });
    });

    it('should validate establishment year range', () => {
      // Valid years
      const validYears = [1800, 2000, 2024, new Date().getFullYear()];
      validYears.forEach(year => {
        const result = createSupplierSchema.safeParse({
          name: 'Test',
          category: 'General',
          establishmentYear: year,
        });
        expect(result.success).toBe(true);
      });

      // Invalid years
      const invalidYears = [1799, new Date().getFullYear() + 1];
      invalidYears.forEach(year => {
        const result = createSupplierSchema.safeParse({
          name: 'Test',
          category: 'General',
          establishmentYear: year,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid email formats for contacts', () => {
      const validEmails = [
        'test@example.com',
        'test.user@example.com',
        'test+tag@example.com',
      ];

      validEmails.forEach(email => {
        const result = createSupplierSchema.safeParse({
          name: 'Test',
          category: 'General',
          primaryContactEmail: email,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid primary contact email', () => {
      const invalidEmails = ['notanemail', 'test@', '@example.com'];

      invalidEmails.forEach(email => {
        const result = createSupplierSchema.safeParse({
          name: 'Test',
          category: 'General',
          primaryContactEmail: email,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should fail with invalid secondary contact email', () => {
      const result = createSupplierSchema.safeParse({
        name: 'Test',
        category: 'General',
        secondaryContactEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should accept null/empty optional fields', () => {
      const supplier = {
        name: 'Test Supplier',
        category: 'General',
        address: null,
        city: '',
        country: null,
        primaryContactName: '',
        primaryContactEmail: null,
        additionalInfo: '',
      };

      const result = createSupplierSchema.safeParse(supplier);
      expect(result.success).toBe(true);
    });
  });

  describe('updateSupplierSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Supplier Name',
        city: 'Al Khor',
      };

      const result = updateSupplierSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateSupplierSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate website on update', () => {
      const invalidUpdate = {
        website: 'not a valid website',
      };

      const result = updateSupplierSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should validate email on update', () => {
      const invalidUpdate = {
        primaryContactEmail: 'invalid-email',
      };

      const result = updateSupplierSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('approveSupplierSchema', () => {
    it('should validate with approver ID', () => {
      const approval = {
        approvedById: 'admin-user-123',
      };

      const result = approveSupplierSchema.safeParse(approval);
      expect(result.success).toBe(true);
    });

    it('should fail without approver ID', () => {
      const result = approveSupplierSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should fail with empty approver ID', () => {
      const result = approveSupplierSchema.safeParse({ approvedById: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('rejectSupplierSchema', () => {
    it('should validate with rejection reason', () => {
      const rejection = {
        rejectionReason: 'Incomplete documentation provided',
      };

      const result = rejectSupplierSchema.safeParse(rejection);
      expect(result.success).toBe(true);
    });

    it('should fail without rejection reason', () => {
      const result = rejectSupplierSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should fail with empty rejection reason', () => {
      const result = rejectSupplierSchema.safeParse({ rejectionReason: '' });
      expect(result.success).toBe(false);
    });
  });

  describe('createEngagementSchema', () => {
    it('should validate a complete engagement', () => {
      const engagement = {
        date: '2024-06-15',
        notes: 'Initial meeting to discuss requirements',
        rating: 4,
        createdById: 'user-123',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(true);
    });

    it('should validate engagement without rating', () => {
      const engagement = {
        date: '2024-06-15',
        notes: 'Follow-up call',
        createdById: 'user-123',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(true);
    });

    it('should fail without date', () => {
      const engagement = {
        notes: 'Some notes',
        createdById: 'user-123',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(false);
    });

    it('should fail without notes', () => {
      const engagement = {
        date: '2024-06-15',
        createdById: 'user-123',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(false);
    });

    it('should fail with empty notes', () => {
      const engagement = {
        date: '2024-06-15',
        notes: '',
        createdById: 'user-123',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(false);
    });

    it('should fail without createdById', () => {
      const engagement = {
        date: '2024-06-15',
        notes: 'Some notes',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(false);
    });

    it('should validate rating range (1-5)', () => {
      // Valid ratings
      for (let rating = 1; rating <= 5; rating++) {
        const result = createEngagementSchema.safeParse({
          date: '2024-06-15',
          notes: 'Test',
          rating,
          createdById: 'user-123',
        });
        expect(result.success).toBe(true);
      }

      // Invalid ratings
      const invalidRatings = [0, 6, -1, 10];
      invalidRatings.forEach(rating => {
        const result = createEngagementSchema.safeParse({
          date: '2024-06-15',
          notes: 'Test',
          rating,
          createdById: 'user-123',
        });
        expect(result.success).toBe(false);
      });
    });

    it('should accept null rating', () => {
      const engagement = {
        date: '2024-06-15',
        notes: 'Test notes',
        rating: null,
        createdById: 'user-123',
      };

      const result = createEngagementSchema.safeParse(engagement);
      expect(result.success).toBe(true);
    });
  });

  describe('supplierQuerySchema', () => {
    it('should validate empty query (use defaults)', () => {
      const result = supplierQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(20);
        expect(result.data.sort).toBe('createdAt');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should validate query with filters', () => {
      const query = {
        q: 'tech',
        status: SupplierStatus.APPROVED,
        category: 'IT Services',
        p: 2,
        ps: 50,
      };

      const result = supplierQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should validate all status options', () => {
      const statuses = [SupplierStatus.PENDING, SupplierStatus.APPROVED, SupplierStatus.REJECTED];

      statuses.forEach(status => {
        const result = supplierQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });

    it('should coerce page and pageSize from strings', () => {
      const query = {
        p: '3',
        ps: '25',
      };

      const result = supplierQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(3);
        expect(result.data.ps).toBe(25);
      }
    });

    it('should fail with invalid page number', () => {
      const query = { p: 0 };
      const result = supplierQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should fail with page size over 100', () => {
      const query = { ps: 101 };
      const result = supplierQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate sort options', () => {
      const validSorts = ['name', 'category', 'suppCode', 'createdAt'];

      validSorts.forEach(sort => {
        const result = supplierQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid sort option', () => {
      const query = { sort: 'invalidField' };
      const result = supplierQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate order options', () => {
      const ascResult = supplierQuerySchema.safeParse({ order: 'asc' });
      const descResult = supplierQuerySchema.safeParse({ order: 'desc' });

      expect(ascResult.success).toBe(true);
      expect(descResult.success).toBe(true);
    });
  });
});
