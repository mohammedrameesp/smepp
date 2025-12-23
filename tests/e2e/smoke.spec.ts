/**
 * Smoke Tests
 * Quick verification that all main pages load correctly
 */

import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';

// Helper function to login as admin
async function loginAsAdmin(page: any) {
  await loginAs(page, TEST_USERS.admin);
}

test.describe('Smoke Tests - Page Loading', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.describe('Admin Pages', () => {
    test('should load admin dashboard', async ({ page }) => {
      await page.goto('/admin');

      // Should not redirect to login
      await expect(page).not.toHaveURL(/\/login/);

      // Should have some content
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load assets page', async ({ page }) => {
      await page.goto('/admin/assets');

      await expect(page.getByRole('heading', { name: /assets/i })).toBeVisible();

      // Should have table or grid
      const content = page.locator('table, [role="grid"], [data-testid="assets-list"]');
      await expect(content.or(page.getByText(/no assets/i))).toBeVisible();
    });

    test('should load subscriptions page', async ({ page }) => {
      await page.goto('/admin/subscriptions');

      await expect(page.getByRole('heading', { name: /subscriptions/i })).toBeVisible();

      const content = page.locator('table, [role="grid"], [data-testid="subscriptions-list"]');
      await expect(content.or(page.getByText(/no subscriptions/i))).toBeVisible();
    });

    test('should load suppliers page', async ({ page }) => {
      await page.goto('/admin/suppliers');

      await expect(page.getByRole('heading', { name: /suppliers/i })).toBeVisible();

      const content = page.locator('table, [role="grid"], [data-testid="suppliers-list"]');
      await expect(content.or(page.getByText(/no suppliers/i))).toBeVisible();
    });

    test('should load users page', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByRole('heading', { name: /users/i })).toBeVisible();

      const content = page.locator('table, [role="grid"], [data-testid="users-list"]');
      await expect(content.or(page.getByText(/no users/i))).toBeVisible();
    });

    test('should load accreditation page', async ({ page }) => {
      await page.goto('/admin/accreditation');

      // Should load without error
      await expect(page).not.toHaveURL(/\/login/);
      await expect(page).not.toHaveURL(/\/forbidden/);

      // Should have accreditation-related content
      const heading = page.getByRole('heading', { name: /accreditation/i });
      await expect(heading.or(page.getByText(/project/i))).toBeVisible();
    });

    test('should load settings page', async ({ page }) => {
      await page.goto('/admin/settings');

      // Should have settings heading or content
      const heading = page.getByRole('heading', { name: /settings/i });
      await expect(heading.or(page.getByText(/branding/i)).or(page.getByText(/configuration/i))).toBeVisible();
    });

    test('should load activity page', async ({ page }) => {
      await page.goto('/admin/activity');

      // Should have activity log content
      const heading = page.getByRole('heading', { name: /activity/i });
      await expect(heading.or(page.getByText(/log/i)).or(page.locator('table'))).toBeVisible();
    });
  });

  test.describe('Navigation', () => {
    test('should navigate using sidebar', async ({ page }) => {
      await page.goto('/admin');

      // Find and click sidebar links
      const sidebarLinks = [
        { name: /assets/i, url: '/admin/assets' },
        { name: /subscriptions/i, url: '/admin/subscriptions' },
        { name: /suppliers/i, url: '/admin/suppliers' },
        { name: /users/i, url: '/admin/users' },
      ];

      for (const link of sidebarLinks) {
        const navLink = page.getByRole('link', { name: link.name });
        if (await navLink.isVisible()) {
          await navLink.click();
          await expect(page).toHaveURL(new RegExp(link.url));
          // Go back to admin for next iteration
          await page.goto('/admin');
        }
      }
    });
  });

  test.describe('API Health', () => {
    test('should return healthy status from health endpoint', async ({ page }) => {
      const response = await page.goto('/api/health');

      expect(response?.status()).toBe(200);
    });
  });

  test.describe('Error Handling', () => {
    test('should show 404 for non-existent page', async ({ page }) => {
      const response = await page.goto('/admin/non-existent-page-12345');

      // Should either show 404 page or redirect
      const is404 = response?.status() === 404 ||
                    await page.getByText(/not found/i).isVisible() ||
                    await page.getByText(/404/i).isVisible();

      expect(is404).toBeTruthy();
    });

    test('should redirect unauthenticated users to login', async ({ page, context }) => {
      // Clear cookies to simulate logged out state
      await context.clearCookies();

      await page.goto('/admin/assets');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Responsive Design', () => {
    test('should be usable on mobile viewport', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });

      await page.goto('/admin/assets');

      // Page should still be functional
      await expect(page.getByRole('heading', { name: /assets/i })).toBeVisible();

      // Mobile menu should be accessible if present
      const menuButton = page.getByRole('button', { name: /menu/i })
        .or(page.locator('[data-testid="mobile-menu"]'))
        .or(page.locator('button[aria-label*="menu"]'));

      if (await menuButton.isVisible()) {
        await menuButton.click();
        // Menu should open
        await expect(page.getByRole('navigation').or(page.locator('[role="menu"]'))).toBeVisible();
      }
    });

    test('should be usable on tablet viewport', async ({ page }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });

      await page.goto('/admin/assets');

      // Page should still be functional
      await expect(page.getByRole('heading', { name: /assets/i })).toBeVisible();
    });
  });
});

test.describe('Public Pages', () => {
  test('should load login page', async ({ page }) => {
    await page.goto('/login');

    // Should have login form or SSO button
    const loginContent = page.getByRole('button', { name: /sign in|login|continue/i })
      .or(page.getByText(/sign in/i))
      .or(page.getByText(/azure/i));

    await expect(loginContent).toBeVisible();
  });

  test('should load supplier registration page', async ({ page }) => {
    await page.goto('/suppliers/register');

    // Should have registration form
    await expect(page.getByRole('heading', { name: /register|supplier/i })).toBeVisible();
  });

  test('should load verification page format', async ({ page }) => {
    // Try to access a verification page (will show invalid token message)
    await page.goto('/verify/test-token');

    // Should either show verification page or invalid token message
    const content = page.getByText(/verification/i)
      .or(page.getByText(/invalid/i))
      .or(page.getByText(/not found/i))
      .or(page.getByText(/accreditation/i));

    await expect(content).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load dashboard within acceptable time', async ({ page }) => {
    await loginAsAdmin(page);

    const startTime = Date.now();
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });

  test('should load assets list within acceptable time', async ({ page }) => {
    await loginAsAdmin(page);

    const startTime = Date.now();
    await page.goto('/admin/assets');
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});
