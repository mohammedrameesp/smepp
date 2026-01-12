/**
 * E2E Tests for Organization Settings
 * Tests organization profile and settings pages
 */

import { test, expect } from '@playwright/test';

test.describe('Organization Settings', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth in dev mode

  test.describe('Organization Page', () => {
    test('should load organization page', async ({ page }) => {
      await page.goto('/admin/organization');

      // Page should load without errors
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });
});

test.describe('Settings Page', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth in dev mode

  test('should load settings page', async ({ page }) => {
    await page.goto('/admin/settings');

    // Page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should load permissions settings page', async ({ page }) => {
    await page.goto('/admin/settings/permissions');

    // Page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should load approvals settings page', async ({ page }) => {
    await page.goto('/admin/settings/approvals');

    // Page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should load delegations settings page', async ({ page }) => {
    await page.goto('/admin/settings/delegations');

    // Page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should load AI usage settings page', async ({ page }) => {
    await page.goto('/admin/settings/ai-usage');

    // Page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });

  test('should load WhatsApp settings page', async ({ page }) => {
    await page.goto('/admin/settings/whatsapp');

    // Page should load without errors
    await expect(page.locator('body')).not.toBeEmpty();
  });
});
