import { Page } from '@playwright/test';

/**
 * Authentication utilities for E2E tests
 *
 * NOTE: Since this app uses Azure AD OAuth, we cannot fully automate login in tests
 * without exposing real credentials. Instead, we use session storage to mock auth state.
 */

export interface TestUser {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYEE' | 'EMPLOYEE';
}

export const TEST_USERS = {
  admin: {
    id: 'test-admin-001',
    email: 'admin@damp.test',
    name: 'Test Admin',
    role: 'ADMIN' as const,
  },
  employee: {
    id: 'test-employee-001',
    email: 'employee@damp.test',
    name: 'Test Employee',
    role: 'EMPLOYEE' as const,
  },
  tempStaff: {
    id: 'test-temp-staff-001',
    email: 'tempstaff@damp.test',
    name: 'Test Temp Staff',
    role: 'EMPLOYEE' as const,
  },
};

/**
 * Mock authentication by setting session storage
 * This bypasses Azure AD OAuth for testing purposes
 */
export async function loginAs(page: Page, user: TestUser) {
  // Create a mock session that matches NextAuth session structure
  const mockSession = {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours from now
  };

  // Set the session in localStorage/sessionStorage
  await page.goto('/');
  await page.evaluate((session) => {
    // Store mock session
    sessionStorage.setItem('next-auth.session-token', JSON.stringify(session));
    localStorage.setItem('test-user-role', session.user.role);
  }, mockSession);

  // Navigate to appropriate dashboard based on role
  const dashboardUrl = user.role === 'ADMIN' ? '/admin' : '/employee';
  await page.goto(dashboardUrl);
}

/**
 * Logout by clearing session storage
 */
export async function logout(page: Page) {
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await page.goto('/');
}

/**
 * Check if user is logged in by checking for session
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  return await page.evaluate(() => {
    return !!sessionStorage.getItem('next-auth.session-token');
  });
}

/**
 * Get current user role from session
 */
export async function getCurrentUserRole(page: Page): Promise<string | null> {
  return await page.evaluate(() => {
    return localStorage.getItem('test-user-role');
  });
}
