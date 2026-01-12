/**
 * E2E Tests for User Management
 * Tests user pages loading and basic functionality
 */

import { test, expect } from '@playwright/test';

test.describe('User Management', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth in dev mode

  test.describe('Users List Page', () => {
    test('should load users page', async ({ page }) => {
      await page.goto('/admin/users');

      // Page should load without errors
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('New User Page', () => {
    test('should load new user page', async ({ page }) => {
      await page.goto('/admin/users/new');

      // Page should load without errors
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });
});
