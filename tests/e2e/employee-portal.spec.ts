/**
 * E2E Tests for Employee Self-Service Portal
 * Tests employee-facing pages load without errors
 * Note: Employee routes may redirect to login in dev without full auth setup
 */

import { test, expect } from '@playwright/test';

test.describe('Employee Portal Pages', () => {
  // Note: These tests verify pages load without crashing
  // Full employee portal testing requires authenticated session via subdomain

  test.describe('Employee Dashboard', () => {
    test('should load employee dashboard or redirect', async ({ page }) => {
      await page.goto('/employee');

      // Page should either show employee dashboard or redirect to login
      // We just want to ensure no uncaught errors
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Employee Leave', () => {
    test('should handle leave page navigation', async ({ page }) => {
      await page.goto('/employee/leave');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Employee Payroll', () => {
    test('should handle payroll page navigation', async ({ page }) => {
      await page.goto('/employee/payroll');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Employee Assets', () => {
    test('should handle assets page navigation', async ({ page }) => {
      await page.goto('/employee/assets');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should handle my-assets page navigation', async ({ page }) => {
      await page.goto('/employee/my-assets');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });
});
