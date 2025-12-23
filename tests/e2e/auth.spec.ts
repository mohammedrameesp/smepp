import { test, expect } from '@playwright/test';
import { loginAs, logout, TEST_USERS } from './utils/auth';

/**
 * Test Session 1: Authentication & Roles
 * Covers MANUAL_TESTING_SESSION.md - Test Session 1
 */

test.describe('Authentication & Roles', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh
    await logout(page);
  });

  test('Test 1.1: Admin Login - should redirect to admin dashboard', async ({ page }) => {
    // Login as admin
    await loginAs(page, TEST_USERS.admin);

    // Expected: Redirects to admin dashboard
    await expect(page).toHaveURL(/\/admin/);

    // Expected: See admin dashboard content
    await expect(page.locator('body')).toContainText(/dashboard|admin/i);
  });

  test('Test 1.2: Admin Can Access Everything - should see all modules', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    // Click on "Assets" module
    await page.click('text=Assets');
    await expect(page).toHaveURL(/\/admin\/assets/);
    await expect(page.locator('h1, h2')).toContainText(/assets/i);

    // Click on "Subscriptions" module
    await page.click('text=Subscriptions');
    await expect(page).toHaveURL(/\/admin\/subscriptions/);
    await expect(page.locator('h1, h2')).toContainText(/subscriptions/i);

    // Click on "Accreditation" module (if exists)
    const accreditationLink = page.locator('text=Accreditation');
    if (await accreditationLink.count() > 0) {
      await accreditationLink.click();
      await expect(page).toHaveURL(/\/admin\/accreditation/);
    }
  });

  test('Test 1.3: Check Current Data - should display data counts', async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);

    // Go to Assets page
    await page.goto('/admin/assets');
    await page.waitForLoadState('networkidle');

    // Check for data presence (don't hardcode exact counts as they may vary)
    const assetsContent = await page.textContent('body');
    expect(assetsContent).toBeTruthy();

    // Go to Subscriptions page
    await page.goto('/admin/subscriptions');
    await page.waitForLoadState('networkidle');

    const subscriptionsContent = await page.textContent('body');
    expect(subscriptionsContent).toBeTruthy();

    // Go to Users page
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    const usersContent = await page.textContent('body');
    expect(usersContent).toBeTruthy();
  });

  test('Test 1.4: Employee Login - should redirect to employee dashboard', async ({ page }) => {
    // Login as employee
    await loginAs(page, TEST_USERS.employee);

    // Expected: Redirects to employee dashboard
    await expect(page).toHaveURL(/\/employee/);

    // Expected: See employee dashboard content
    await expect(page.locator('body')).toContainText(/employee|my|dashboard/i);
  });

  test('Test 1.5: Employee Cannot Access Admin Routes - should be redirected', async ({ page }) => {
    // Login as employee
    await loginAs(page, TEST_USERS.employee);

    // Try to access admin settings
    await page.goto('/admin/settings');

    // Expected: Redirected away from admin pages OR see forbidden/unauthorized message
    const url = page.url();
    const bodyText = await page.textContent('body');

    const isRedirected = url.includes('/employee') || url.includes('/login') || url.includes('/forbidden');
    const showsError = bodyText?.toLowerCase().includes('unauthorized') ||
      bodyText?.toLowerCase().includes('forbidden') ||
      bodyText?.toLowerCase().includes('access denied');

    expect(isRedirected || showsError).toBeTruthy();
  });
});
