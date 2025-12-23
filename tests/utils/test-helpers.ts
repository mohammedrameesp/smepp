import { Role } from '@prisma/client';

/**
 * Test Helper Utilities
 * Provides reusable functions for testing
 */

export const createMockSession = (role: Role = Role.ADMIN, userId: string = 'test-user-123') => {
  return {
    user: {
      id: userId,
      email: `${role.toLowerCase()}@example.com`,
      role: role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
};

export const createMockAsset = (overrides: any = {}) => {
  return {
    id: 'asset-test-123',
    assetTag: 'AST-TEST-001',
    type: 'Laptop',
    model: 'MacBook Pro',
    brand: 'Apple',
    serial: 'SN123456',
    status: 'AVAILABLE',
    acquisitionType: 'PURCHASED',
    price: 2000,
    priceCurrency: 'USD',
    priceQAR: 7200,
    assignedUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createMockSubscription = (overrides: any = {}) => {
  return {
    id: 'sub-test-123',
    name: 'Adobe Creative Cloud',
    category: 'SOFTWARE',
    status: 'ACTIVE',
    billingCycle: 'MONTHLY',
    costPerCycle: 54.99,
    costCurrency: 'USD',
    renewalDate: new Date('2025-12-01'),
    purchaseDate: new Date('2024-12-01'),
    autoRenew: true,
    assignedUserId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createMockUser = (overrides: any = {}) => {
  return {
    id: 'user-test-123',
    name: 'Test User',
    email: 'test@example.com',
    emailVerified: new Date(),
    image: null,
    role: Role.EMPLOYEE,
    isSystemAccount: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

export const createMockRequest = (options: {
  method?: string;
  url?: string;
  body?: any;
  headers?: Record<string, string>;
  ip?: string;
} = {}) => {
  const {
    method = 'GET',
    url = 'http://localhost:3000/api/test',
    body = null,
    headers = {},
    ip = '192.168.1.1',
  } = options;

  const reqHeaders = new Headers(headers);
  if (ip) {
    reqHeaders.set('x-forwarded-for', ip);
  }

  return {
    method,
    url,
    headers: reqHeaders,
    ip,
    json: async () => body,
    formData: async () => new FormData(),
    text: async () => JSON.stringify(body),
  };
};

export const createMockResponse = () => {
  return {
    json: jest.fn((data: any) => Promise.resolve(data)),
    status: jest.fn((code: number) => ({
      json: jest.fn((data: any) => Promise.resolve({ status: code, data })),
    })),
  };
};

// Security testing helpers
export const testUnauthorizedAccess = async (
  handler: () => Promise<unknown>,
  mockGetServerSession: jest.Mock
) => {
  mockGetServerSession.mockResolvedValue(null);
  const result = await handler();
  return result;
};

export const testForbiddenAccess = async (
  handler: () => Promise<unknown>,
  mockGetServerSession: jest.Mock,
  role: Role = Role.EMPLOYEE
) => {
  const session = createMockSession(role);
  mockGetServerSession.mockResolvedValue(session);
  const result = await handler();
  return result;
};

// Data validation helpers
export const validateRequiredFields = (data: any, requiredFields: string[]): boolean => {
  return requiredFields.every(field => field in data && data[field] !== null && data[field] !== undefined);
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Date helpers
export const isDateInFuture = (date: Date): boolean => {
  return new Date(date) > new Date();
};

export const isDateInPast = (date: Date): boolean => {
  return new Date(date) < new Date();
};

export const daysBetween = (date1: Date, date2: Date): number => {
  const diff = Math.abs(new Date(date2).getTime() - new Date(date1).getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

// Authorization helpers
export const canAccessResource = (
  userRole: Role,
  userId: string,
  resourceOwnerId: string | null
): boolean => {
  if (userRole === Role.ADMIN) return true;
  return userId === resourceOwnerId;
};

export const isAdmin = (role: Role): boolean => {
  return role === Role.ADMIN;
};

export const isEmployee = (role: Role): boolean => {
  return role === Role.EMPLOYEE;
};

// Test data generators
export const generateRandomString = (length: number = 10): string => {
  return Math.random().toString(36).substring(2, 2 + length);
};

export const generateRandomNumber = (min: number = 0, max: number = 1000): number => {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export const generateRandomEmail = (): string => {
  return `test-${generateRandomString()}@example.com`;
};

// Wait helper for async tests
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Mock data arrays
export const mockRoles = [Role.ADMIN, Role.EMPLOYEE, Role.TEMP_STAFF];

export const mockAssetStatuses = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED'];

export const mockSubscriptionStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];

export const mockBillingCycles = ['MONTHLY', 'YEARLY'];
