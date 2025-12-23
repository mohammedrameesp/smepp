/**
 * NextAuth Mock
 * Provides mock sessions for different user roles
 */

import { Role } from '@prisma/client';
import { jest } from '@jest/globals';

// Session types matching NextAuth
export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  image?: string | null;
}

export interface MockSession {
  user: MockUser;
  expires: string;
}

// Pre-configured mock users for different roles
export const mockUsers: Record<string, MockUser> = {
  admin: {
    id: 'admin-user-123',
    email: 'admin@example.com',
    name: 'Admin User',
    role: Role.ADMIN,
    image: null,
  },
  employee: {
    id: 'employee-user-456',
    email: 'employee@example.com',
    name: 'Employee User',
    role: Role.EMPLOYEE,
    image: null,
  },
  tempStaff: {
    id: 'temp-staff-user-101',
    email: 'temp@example.com',
    name: 'Temp Staff User',
    role: Role.TEMP_STAFF,
    image: null,
  },
};

// Create a session with expiry
export const createMockSession = (
  user: MockUser,
  expiresInMs: number = 86400000 // 24 hours default
): MockSession => ({
  user,
  expires: new Date(Date.now() + expiresInMs).toISOString(),
});

// Pre-configured sessions
export const mockSessions: Record<string, MockSession> = {
  admin: createMockSession(mockUsers.admin),
  employee: createMockSession(mockUsers.employee),
  tempStaff: createMockSession(mockUsers.tempStaff),
};

// Helper to create a custom session
export const createCustomSession = (
  overrides: Partial<MockUser> & { role: Role },
  expiresInMs?: number
): MockSession => {
  const user: MockUser = {
    id: overrides.id || `user-${Date.now()}`,
    email: overrides.email || `user-${Date.now()}@example.com`,
    name: overrides.name || 'Test User',
    role: overrides.role,
    image: overrides.image || null,
  };
  return createMockSession(user, expiresInMs);
};

// Mock getServerSession function
export const mockGetServerSession = jest.fn();

// Helper to set up session for tests
export const setMockSession = (session: MockSession | null): void => {
  // @ts-expect-error - Jest mock types in Jest 30 are overly strict
  mockGetServerSession.mockResolvedValue(session);
};

// Helper to set up admin session
export const setAdminSession = (): void => {
  setMockSession(mockSessions.admin);
};

// Helper to set up employee session
export const setEmployeeSession = (): void => {
  setMockSession(mockSessions.employee);
};

// Helper to set up no session (unauthenticated)
export const setNoSession = (): void => {
  setMockSession(null);
};

// Reset mock
export const resetAuthMock = (): void => {
  mockGetServerSession.mockReset();
};

// Mock useSession hook result
export const createUseSessionResult = (
  session: MockSession | null,
  status: 'authenticated' | 'unauthenticated' | 'loading' = session ? 'authenticated' : 'unauthenticated'
) => ({
  data: session,
  status,
  update: jest.fn(),
});

// Mock signIn and signOut
export const mockSignIn = jest.fn();
export const mockSignOut = jest.fn();
