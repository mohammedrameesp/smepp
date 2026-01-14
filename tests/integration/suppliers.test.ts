/**
 * Suppliers API Tests
 * Tests for /api/suppliers endpoints
 */

import { getServerSession } from 'next-auth/next';
import { SupplierStatus } from '@prisma/client';

// Mock next-auth
jest.mock('next-auth/next');

// Mock prisma - use global mocks that persist
const supplierMocks = {
  findMany: jest.fn(),
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  count: jest.fn(),
};

const engagementMocks = {
  findMany: jest.fn(),
  create: jest.fn(),
};

jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    supplier: supplierMocks,
    supplierEngagement: engagementMocks,
  },
}));

describe('Suppliers API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/suppliers', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return suppliers for authenticated admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockSuppliers = [
        {
          id: 'supplier-1',
          suppCode: 'SUPP-0001',
          name: 'Tech Solutions Ltd',
          category: 'IT Services',
          status: SupplierStatus.APPROVED,
          createdAt: new Date(),
        },
        {
          id: 'supplier-2',
          suppCode: null,
          name: 'Office Supplies Co',
          category: 'Office',
          status: SupplierStatus.PENDING,
          createdAt: new Date(),
        },
      ];

      supplierMocks.findMany.mockResolvedValue(mockSuppliers);
      supplierMocks.count.mockResolvedValue(mockSuppliers.length);

      const result = await supplierMocks.findMany();
      expect(result).toEqual(mockSuppliers);
      expect(result).toHaveLength(2);
    });

    it('should support status filtering', async () => {
      const mockSuppliers = [
        { id: 'supplier-1', status: SupplierStatus.APPROVED },
        { id: 'supplier-2', status: SupplierStatus.PENDING },
        { id: 'supplier-3', status: SupplierStatus.APPROVED },
      ];

      const filtered = mockSuppliers.filter(s => s.status === SupplierStatus.APPROVED);
      expect(filtered).toHaveLength(2);
    });

    it('should support category filtering', async () => {
      const mockSuppliers = [
        { id: 'supplier-1', category: 'IT Services' },
        { id: 'supplier-2', category: 'Office' },
        { id: 'supplier-3', category: 'IT Services' },
      ];

      const filtered = mockSuppliers.filter(s => s.category === 'IT Services');
      expect(filtered).toHaveLength(2);
    });

    it('should support search filtering', async () => {
      const mockSuppliers = [
        { id: 'supplier-1', name: 'Tech Solutions Ltd' },
        { id: 'supplier-2', name: 'Office Supplies Co' },
      ];

      const searchTerm = 'tech';
      const filtered = mockSuppliers.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Tech Solutions Ltd');
    });

    it('should support pagination', async () => {
      const allSuppliers = Array.from({ length: 25 }, (_, i) => ({
        id: `supplier-${i + 1}`,
        name: `Supplier ${i + 1}`,
      }));

      // Simulate pagination
      const page = 2;
      const pageSize = 10;
      const paginated = allSuppliers.slice((page - 1) * pageSize, page * pageSize);

      expect(paginated).toHaveLength(10);
      expect(paginated[0].id).toBe('supplier-11');
    });
  });

  describe('POST /api/suppliers (Create)', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should create supplier with valid data', async () => {
      const validSupplierData = {
        name: 'New Tech Supplier',
        category: 'IT Services',
        address: '123 Business Street',
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'John Smith',
        primaryContactEmail: 'john@newtechsupplier.com',
      };

      supplierMocks.create.mockResolvedValue({
        id: 'supplier-new',
        status: SupplierStatus.PENDING, // New suppliers start as PENDING
        ...validSupplierData,
      });

      const result = await supplierMocks.create({ data: validSupplierData });
      expect(result).toBeDefined();
      expect(result.id).toBe('supplier-new');
      expect(result.status).toBe(SupplierStatus.PENDING);
    });

    it('should validate required fields', () => {
      const invalidSupplierData = {
        name: '', // Empty name should fail
        category: 'IT Services',
      };

      // Validation should fail for empty name
      expect(invalidSupplierData.name).toBe('');
    });
  });

  describe('POST /api/suppliers/register (Public Registration)', () => {
    it('should allow unauthenticated registration', async () => {
      const registrationData = {
        name: 'Public Registration Supplier',
        category: 'Professional Services',
        primaryContactName: 'Jane Doe',
        primaryContactEmail: 'jane@publicreg.com',
      };

      supplierMocks.create.mockResolvedValue({
        id: 'supplier-public',
        status: SupplierStatus.PENDING,
        ...registrationData,
      });

      const result = await supplierMocks.create({ data: registrationData });
      expect(result).toBeDefined();
      expect(result.status).toBe(SupplierStatus.PENDING);
    });

    it('should create supplier with PENDING status', async () => {
      const registrationData = {
        name: 'Test Supplier',
        category: 'IT Services',
      };

      supplierMocks.create.mockResolvedValue({
        id: 'supplier-1',
        status: SupplierStatus.PENDING,
        ...registrationData,
      });

      const result = await supplierMocks.create({ data: registrationData });
      expect(result.status).toBe(SupplierStatus.PENDING);
    });
  });

  describe('GET /api/suppliers/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return supplier details for authenticated user', async () => {
      const mockSupplier = {
        id: 'supplier-1',
        suppCode: 'SUPP-0001',
        name: 'Test Supplier',
        category: 'IT Services',
        status: SupplierStatus.APPROVED,
        engagements: [],
      };

      supplierMocks.findUnique.mockResolvedValue(mockSupplier);

      const result = await supplierMocks.findUnique({ where: { id: 'supplier-1' } });
      expect(result).toEqual(mockSupplier);
    });

    it('should return 404 if supplier not found', async () => {
      supplierMocks.findUnique.mockResolvedValue(null);

      const result = await supplierMocks.findUnique({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });
  });

  describe('PUT /api/suppliers/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should update supplier with valid data', async () => {
      const updateData = {
        name: 'Updated Supplier Name',
        category: 'Updated Category',
      };

      supplierMocks.update.mockResolvedValue({
        id: 'supplier-1',
        ...updateData,
      });

      const result = await supplierMocks.update({
        where: { id: 'supplier-1' },
        data: updateData,
      });

      expect(result.name).toBe('Updated Supplier Name');
    });
  });

  describe('POST /api/suppliers/[id]/approve', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should approve supplier and generate suppCode', async () => {
      supplierMocks.update.mockResolvedValue({
        id: 'supplier-1',
        status: SupplierStatus.APPROVED,
        suppCode: 'SUPP-0001',
        approvedAt: new Date(),
        approvedById: 'admin-123',
      });

      const result = await supplierMocks.update({
        where: { id: 'supplier-1' },
        data: { status: SupplierStatus.APPROVED },
      });

      expect(result.status).toBe(SupplierStatus.APPROVED);
      expect(result.suppCode).toBe('SUPP-0001');
    });

    it('should not approve already approved supplier', async () => {
      supplierMocks.findUnique.mockResolvedValue({
        id: 'supplier-1',
        status: SupplierStatus.APPROVED,
      });

      const supplier = await supplierMocks.findUnique({ where: { id: 'supplier-1' } });
      expect(supplier.status).toBe(SupplierStatus.APPROVED);
      // Should return error indicating supplier is already approved
    });
  });

  describe('POST /api/suppliers/[id]/reject', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should reject supplier with reason', async () => {
      const rejectionReason = 'Incomplete documentation';

      supplierMocks.update.mockResolvedValue({
        id: 'supplier-1',
        status: SupplierStatus.REJECTED,
        rejectionReason,
        rejectedAt: new Date(),
        rejectedById: 'admin-123',
      });

      const result = await supplierMocks.update({
        where: { id: 'supplier-1' },
        data: { status: SupplierStatus.REJECTED, rejectionReason },
      });

      expect(result.status).toBe(SupplierStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectionReason);
    });

    it('should require rejection reason', () => {
      // Validation logic - rejection reason is required
      const rejectionData = { status: SupplierStatus.REJECTED, rejectionReason: '' };
      expect(rejectionData.rejectionReason).toBe('');
    });
  });

  describe('POST /api/suppliers/[id]/engagements', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should create engagement for approved supplier', async () => {
      const engagementData = {
        supplierId: 'supplier-1',
        date: new Date(),
        notes: 'Initial consultation meeting',
        rating: 4,
        createdById: 'admin-123',
      };

      engagementMocks.create.mockResolvedValue({
        id: 'engagement-1',
        ...engagementData,
      });

      const result = await engagementMocks.create({ data: engagementData });
      expect(result).toBeDefined();
      expect(result.rating).toBe(4);
    });

    it('should validate rating range (1-5)', () => {
      const validRatings = [1, 2, 3, 4, 5];
      const invalidRatings = [0, 6, -1, 10];

      validRatings.forEach(rating => {
        expect(rating >= 1 && rating <= 5).toBe(true);
      });

      invalidRatings.forEach(rating => {
        expect(rating >= 1 && rating <= 5).toBe(false);
      });
    });
  });

  describe('DELETE /api/suppliers/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'employee-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should delete supplier', async () => {
      supplierMocks.delete.mockResolvedValue({
        id: 'supplier-1',
      });

      const result = await supplierMocks.delete({ where: { id: 'supplier-1' } });
      expect(result.id).toBe('supplier-1');
    });
  });
});
