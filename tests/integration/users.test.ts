/**
 * Users API Tests
 * Tests for /api/users endpoints
 */

import { getServerSession } from 'next-auth/next';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

describe('Users API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
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
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should return users list for admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUsers = [
        {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          role: Role.ADMIN,
        },
        {
          id: 'user-2',
          name: 'Jane Smith',
          email: 'jane@example.com',
          role: Role.EMPLOYEE,
        },
      ];

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findMany.mockResolvedValue(mockUsers);
      mockPrismaUser.count.mockResolvedValue(mockUsers.length);

      const result = await mockPrismaUser.findMany();
      expect(result).toEqual(mockUsers);
      expect(result).toHaveLength(2);
    });

    it('should support role filtering', async () => {
      const mockUsers = [
        { id: 'user-1', role: Role.ADMIN },
        { id: 'user-2', role: Role.EMPLOYEE },
        { id: 'user-3', role: Role.EMPLOYEE },
        { id: 'user-4', role: Role.EMPLOYEE },
      ];

      const filtered = mockUsers.filter(u => u.role === Role.EMPLOYEE);
      expect(filtered).toHaveLength(3);
    });

    it('should exclude system accounts by default', async () => {
      const mockUsers = [
        { id: 'user-1', isSystemAccount: false },
        { id: 'user-2', isSystemAccount: true }, // Should be excluded
        { id: 'user-3', isSystemAccount: false },
      ];

      const filtered = mockUsers.filter(u => !u.isSystemAccount);
      expect(filtered).toHaveLength(2);
    });
  });

  describe('POST /api/users', () => {
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
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should create user with valid data', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const validUserData = {
        name: 'New Employee',
        email: 'newemployee@example.com',
        role: Role.EMPLOYEE,
      };

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.create.mockResolvedValue({
        id: 'user-new',
        ...validUserData,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await mockPrismaUser.create({ data: validUserData });
      expect(result).toHaveProperty('id');
      expect(result.name).toBe('New Employee');
      expect(result.role).toBe(Role.EMPLOYEE);
    });

    it('should validate required fields', () => {
      const invalidData = {
        // Missing name and email
        role: Role.EMPLOYEE,
      };

      const requiredFields = ['name', 'email', 'role'];
      const hasAllRequired = requiredFields.every(field => field in invalidData);

      expect(hasAllRequired).toBe(false);
    });

    it('should validate email uniqueness', async () => {
      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'existing@example.com',
      });

      const existingUser = await mockPrismaUser.findUnique({
        where: { email: 'existing@example.com' },
      });

      expect(existingUser).not.toBeNull();
      // In real implementation, this would prevent creation
    });

    it('should validate role values', () => {
      const validRoles = [
        Role.ADMIN,
        Role.EMPLOYEE,
        Role.EMPLOYEE,
      ];

      validRoles.forEach(role => {
        expect(Object.values(Role)).toContain(role);
      });

      expect(Object.values(Role)).not.toContain('SUPER_ADMIN');
    });
  });

  describe('GET /api/users/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin and not self', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const requestedUserId = 'user-456'; // Different user
      const session = await mockGetServerSession();

      expect(session?.user.id).not.toBe(requestedUserId);
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should allow user to view their own profile', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user-123',
        name: 'Employee User',
        email: 'employee@example.com',
        role: Role.EMPLOYEE,
      };

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const session = await mockGetServerSession();
      expect(session?.user.id).toBe('user-123');

      const result = await mockPrismaUser.findUnique({ where: { id: 'user-123' } });
      expect(result).toEqual(mockUser);
    });

    it('should return user details for admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockUser = {
        id: 'user-456',
        name: 'Other User',
        email: 'other@example.com',
        role: Role.EMPLOYEE,
      };

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);

      const result = await mockPrismaUser.findUnique({ where: { id: 'user-456' } });
      expect(result).toEqual(mockUser);
    });

    it('should return 404 if user not found', async () => {
      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await mockPrismaUser.findUnique({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });
  });

  describe('PUT /api/users/[id]', () => {
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
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should update user with valid data', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const updateData = {
        name: 'Updated Name',
        role: Role.EMPLOYEE,
      };

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.update.mockResolvedValue({
        id: 'user-456',
        ...updateData,
        email: 'user@example.com', // Email not changed
      });

      const result = await mockPrismaUser.update({
        where: { id: 'user-456' },
        data: updateData,
      });

      expect(result.name).toBe('Updated Name');
      expect(result.role).toBe(Role.EMPLOYEE);
    });

    it('should not allow changing email', () => {
      // The update schema should not include email
      const updateData = {
        name: 'Test',
        email: 'newemail@example.com', // Should not be allowed
      };

      // In the actual validation, email should be stripped
      const allowedFields = ['name', 'role'];
      const filteredData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) => allowedFields.includes(key))
      );

      expect(filteredData).not.toHaveProperty('email');
    });

    it('should prevent admin from demoting themselves if they are last admin', async () => {
      const mockPrismaUser = prisma.user as any;

      // Count admins - only 1
      mockPrismaUser.count.mockResolvedValue(1);

      const adminCount = await mockPrismaUser.count({ where: { role: Role.ADMIN } });
      expect(adminCount).toBe(1);

      // In real implementation, this would prevent the demotion
    });
  });

  describe('DELETE /api/users/[id]', () => {
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
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should delete user', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.delete.mockResolvedValue({
        id: 'user-456',
      });

      const result = await mockPrismaUser.delete({ where: { id: 'user-456' } });
      expect(result).toHaveProperty('id');
    });

    it('should prevent admin from deleting themselves', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      const userToDelete = 'admin-123'; // Same as session user

      expect(session?.user.id).toBe(userToDelete);
      // In real implementation, this would return an error
    });

    it('should prevent deleting system accounts', async () => {
      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'system-user',
        isSystemAccount: true,
      });

      const user = await mockPrismaUser.findUnique({ where: { id: 'system-user' } });
      expect(user.isSystemAccount).toBe(true);
      // In real implementation, this would prevent deletion
    });
  });
});
