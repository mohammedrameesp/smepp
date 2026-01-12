/**
 * E2E Tests for Dashboard
 * Tests dashboard loading and basic navigation
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Dashboard', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth in dev mode

  test.describe('Dashboard Loading', () => {
    test('should load admin dashboard or redirect', async ({ page }) => {
      await page.goto('/admin');

      // Page should either show dashboard or redirect to login
      // We just want to ensure no uncaught errors
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(30000);
    });
  });

  test.describe('Dashboard Navigation', () => {
    test('should have navigation elements', async ({ page }) => {
      await page.goto('/admin');

      // Page should render with some navigation links
      const navLinks = page.locator('a[href*="/admin"]');
      const linkCount = await navLinks.count();
      expect(linkCount).toBeGreaterThan(0);
    });
  });

  test.describe('Modules Page', () => {
    test('should load modules page', async ({ page }) => {
      await page.goto('/admin/modules');

      // Page should load without errors
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });
});
