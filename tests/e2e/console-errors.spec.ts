/**
 * Console Error Detection Tests
 *
 * Visits all pages and fails if any console errors are detected.
 * This catches runtime errors that unit tests miss.
 */

import { test, expect, Page, ConsoleMessage } from '@playwright/test';

// Collect console errors during page navigation
interface PageError {
  page: string;
  errors: string[];
}

// Helper to setup console error tracking
function setupConsoleErrorTracking(page: Page): string[] {
  const errors: string[] = [];

  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore known non-critical errors
      if (
        text.includes('Failed to load resource: the server responded with a status of 404') ||
        text.includes('Failed to load resource: the server responded with a status of 401') || // API auth without real session
        text.includes('Failed to fetch') || // API errors from missing auth
        text.includes('[next-auth]') || // NextAuth session errors in dev mode
        text.includes('favicon.ico') ||
        text.includes('Download the React DevTools') ||
        text.includes('Warning: validateDOMNesting') || // React hydration warnings (non-critical)
        text.includes('[Fast Refresh]') // Next.js dev mode messages
      ) {
        return;
      }
      errors.push(text);
    }
  });

  // Also catch uncaught exceptions
  page.on('pageerror', (error) => {
    errors.push(`Uncaught: ${error.message}`);
  });

  return errors;
}

// Helper to visit a page and collect errors
async function visitPageAndCollectErrors(
  page: Page,
  url: string,
  errors: string[],
  options: { waitForSelector?: string } = {}
): Promise<void> {
  errors.length = 0; // Clear previous errors

  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    // Wait for page to stabilize
    await page.waitForTimeout(1000);

    // If specific selector provided, wait for it
    if (options.waitForSelector) {
      await page.waitForSelector(options.waitForSelector, { timeout: 5000 }).catch(() => {});
    }
  } catch {
    // Navigation timeout or error - still check for console errors
  }
}

// ============================================================================
// PUBLIC PAGES (No authentication required)
// ============================================================================

const PUBLIC_PAGES = [
  '/',
  '/login',
  '/forgot-password',
  '/get-started',
  '/cookies',
  '/privacy',
  '/terms',
  '/help',
  '/forbidden',
  '/pending',
  '/org-deleted',
];

test.describe('Console Errors - Public Pages', () => {
  test('should have no console errors on public pages', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);
    const pagesWithErrors: PageError[] = [];

    for (const url of PUBLIC_PAGES) {
      await visitPageAndCollectErrors(page, url, errors);

      if (errors.length > 0) {
        pagesWithErrors.push({ page: url, errors: [...errors] });
      }
    }

    if (pagesWithErrors.length > 0) {
      const report = pagesWithErrors
        .map(p => `\n${p.page}:\n  - ${p.errors.join('\n  - ')}`)
        .join('\n');

      expect.soft(pagesWithErrors.length, `Console errors found on pages:${report}`).toBe(0);
    }
  });
});

// ============================================================================
// ADMIN PAGES (Requires admin authentication)
// ============================================================================

const ADMIN_PAGES = [
  // Dashboard
  '/admin',
  '/admin/modules',

  // Operations - Assets
  '/admin/assets',
  '/admin/asset-requests',

  // Operations - Subscriptions
  '/admin/subscriptions',
  '/admin/subscriptions/new',

  // Operations - Suppliers
  '/admin/suppliers',

  // HR - Employees
  '/admin/employees',
  '/admin/employees/new',
  '/admin/employees/change-requests',
  '/admin/employees/document-expiry',

  // HR - Leave
  '/admin/leave',
  '/admin/leave/requests',
  '/admin/leave/requests/new',
  '/admin/leave/balances',
  '/admin/leave/calendar',
  '/admin/leave/types',

  // HR - Payroll
  '/admin/payroll',
  '/admin/payroll/runs',
  '/admin/payroll/runs/new',
  '/admin/payroll/payslips',
  '/admin/payroll/loans',
  '/admin/payroll/loans/new',
  '/admin/payroll/gratuity',
  '/admin/payroll/salary-structures',
  '/admin/payroll/salary-structures/new',

  // Projects
  '/admin/purchase-requests',

  // System
  '/admin/users',
  '/admin/users/new',
  '/admin/activity',
  '/admin/alerts',
  '/admin/notifications',
  '/admin/reports',
  '/admin/my-approvals',

  // Company Documents
  '/admin/company-documents',
  '/admin/company-documents/new',

  // Settings
  '/admin/settings',
  '/admin/settings/permissions',
  '/admin/settings/approvals',
  '/admin/settings/approvals/new',
  '/admin/settings/delegations',
  '/admin/settings/delegations/new',
  '/admin/settings/ai-usage',
  '/admin/settings/whatsapp',
];

test.describe('Console Errors - Admin Pages', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth, so no login needed in dev

  test('should have no console errors on admin pages', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);
    const pagesWithErrors: PageError[] = [];

    for (const url of ADMIN_PAGES) {
      await visitPageAndCollectErrors(page, url, errors);

      if (errors.length > 0) {
        pagesWithErrors.push({ page: url, errors: [...errors] });
      }
    }

    if (pagesWithErrors.length > 0) {
      const report = pagesWithErrors
        .map(p => `\n${p.page}:\n  - ${p.errors.join('\n  - ')}`)
        .join('\n');

      expect.soft(pagesWithErrors.length, `Console errors found on admin pages:${report}`).toBe(0);
    }
  });
});

// ============================================================================
// EMPLOYEE PAGES (Requires employee authentication)
// ============================================================================

const EMPLOYEE_PAGES = [
  // Dashboard
  '/employee',

  // Operations
  '/employee/my-assets',
  '/employee/assets',
  '/employee/asset-requests',
  '/employee/subscriptions',
  '/employee/suppliers',

  // HR - Leave
  '/employee/leave',
  '/employee/leave/new',
  '/employee/leave/requests',

  // HR - Payroll
  '/employee/payroll',
  '/employee/payroll/payslips',
  '/employee/payroll/gratuity',

  // Projects
  '/employee/purchase-requests',
];

test.describe('Console Errors - Employee Pages', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth, so no login needed in dev

  test('should have no console errors on employee pages', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);
    const pagesWithErrors: PageError[] = [];

    for (const url of EMPLOYEE_PAGES) {
      await visitPageAndCollectErrors(page, url, errors);

      if (errors.length > 0) {
        pagesWithErrors.push({ page: url, errors: [...errors] });
      }
    }

    if (pagesWithErrors.length > 0) {
      const report = pagesWithErrors
        .map(p => `\n${p.page}:\n  - ${p.errors.join('\n  - ')}`)
        .join('\n');

      expect.soft(pagesWithErrors.length, `Console errors found on employee pages:${report}`).toBe(0);
    }
  });
});

// ============================================================================
// COMPREHENSIVE SINGLE TEST (Alternative - runs all pages in one test)
// ============================================================================

test.describe('Console Errors - Full Site Scan', () => {
  test('full site console error scan', async ({ page }) => {
    const errors = setupConsoleErrorTracking(page);
    const allPagesWithErrors: PageError[] = [];

    // Test public pages
    console.log('Scanning public pages...');
    for (const url of PUBLIC_PAGES) {
      await visitPageAndCollectErrors(page, url, errors);
      if (errors.length > 0) {
        allPagesWithErrors.push({ page: `[PUBLIC] ${url}`, errors: [...errors] });
      }
    }

    // Test admin pages (DEV_AUTH_ENABLED=true bypasses auth)
    console.log('Scanning admin pages...');
    for (const url of ADMIN_PAGES) {
      await visitPageAndCollectErrors(page, url, errors);
      if (errors.length > 0) {
        allPagesWithErrors.push({ page: `[ADMIN] ${url}`, errors: [...errors] });
      }
    }

    // Test employee pages (DEV_AUTH_ENABLED=true bypasses auth)
    console.log('Scanning employee pages...');
    for (const url of EMPLOYEE_PAGES) {
      await visitPageAndCollectErrors(page, url, errors);
      if (errors.length > 0) {
        allPagesWithErrors.push({ page: `[EMPLOYEE] ${url}`, errors: [...errors] });
      }
    }

    // Generate report
    if (allPagesWithErrors.length > 0) {
      console.log('\n========== CONSOLE ERROR REPORT ==========');
      for (const p of allPagesWithErrors) {
        console.log(`\n${p.page}:`);
        for (const err of p.errors) {
          console.log(`  ❌ ${err}`);
        }
      }
      console.log('\n==========================================');

      expect.soft(
        allPagesWithErrors.length,
        `Found console errors on ${allPagesWithErrors.length} pages`
      ).toBe(0);
    } else {
      console.log('\n✅ No console errors found on any pages!');
    }
  });
});
