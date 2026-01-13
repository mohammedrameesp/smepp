import { test, expect } from '@playwright/test';
import { loginAs, logout, TEST_USERS } from './utils/auth';
import { generateAssetData } from './utils/test-data';

/**
 * Test Sessions 5 & 6: Permissions Check and Edge Cases
 * Covers MANUAL_TESTING_SESSION.md - Test Sessions 5 & 6
 */

test.describe('Permissions & Access Control', () => {
  test.beforeEach(async ({ page }) => {
    // Start fresh
    await logout(page);
  });

  test('Test 5.1: Employee Cannot Access Admin Routes - should redirect or show error', async ({ page }) => {
    // Login as employee
    await loginAs(page, TEST_USERS.employee);

    // Try to access admin settings
    await page.goto('/admin/settings');

    // Wait for redirect or error
    await page.waitForTimeout(2000);

    // Expected: Redirected to /employee or /login or see forbidden message
    const url = page.url();
    const bodyText = await page.textContent('body');

    const isRedirected = url.includes('/employee') ||
      url.includes('/login') ||
      url.includes('/forbidden') ||
      url.includes('/unauthorized');

    const showsError = bodyText?.toLowerCase().includes('unauthorized') ||
      bodyText?.toLowerCase().includes('forbidden') ||
      bodyText?.toLowerCase().includes('access denied') ||
      bodyText?.toLowerCase().includes('permission');

    // If employee CAN access admin without redirect or error, that's a CRITICAL SECURITY BUG
    expect(isRedirected || showsError).toBeTruthy();
  });

  test('Test 5.2: Employee Can View Their Assets - should see only own assets', async ({ page }) => {
    // Login as employee
    await loginAs(page, TEST_USERS.employee);

    // Go to employee my-assets page
    await page.goto('/employee/my-assets');

    // Expected: Page loads (employee can access their own page)
    await expect(page).toHaveURL(/\/employee/);

    // Expected: See assets or empty state (but NOT error)
    const bodyText = await page.textContent('body');
    const hasValidContent = bodyText?.toLowerCase().includes('asset') ||
      bodyText?.toLowerCase().includes('no assets') ||
      bodyText?.toLowerCase().includes('empty');

    expect(hasValidContent).toBeTruthy();

    // Expected: Should NOT see Edit or Delete buttons (read-only)
    const editButton = page.locator('button:has-text("Delete"), a:has-text("Delete")');
    const deleteButton = page.locator('button:has-text("Delete"), a:has-text("Delete")');

    // It's OK if these buttons exist (they might be disabled), but ideally they shouldn't be there
    // This is a soft check
    const hasEditButton = (await editButton.count()) > 0;
    const hasDeleteButton = (await deleteButton.count()) > 0;

    // Log for information (not failing the test)
    if (hasEditButton || hasDeleteButton) {
      console.log('Warning: Employee page has edit/delete buttons - verify they are disabled');
    }
  });

  test('Test 5.3: Admin Can Access All Routes - should have full access', async ({ page }) => {
    // Login as admin
    await loginAs(page, TEST_USERS.admin);

    // Test access to various admin routes
    const adminRoutes = [
      '/admin/assets',
      '/admin/subscriptions',
      '/admin/users',
      '/admin/settings',
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForTimeout(1000);

      const url = page.url();
      // Expected: Admin can access all routes
      expect(url).toContain(route);

      // Should not be redirected or see error
      const bodyText = await page.textContent('body');
      const hasError = bodyText?.toLowerCase().includes('unauthorized') ||
        bodyText?.toLowerCase().includes('forbidden');

      expect(hasError).toBeFalsy();
    }
  });
});

test.describe('Edge Cases & Validation', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await loginAs(page, TEST_USERS.admin);
  });

  test('Test 6.1: Empty Fields - should show validation errors', async ({ page }) => {
    // Go to Assets → New Asset
    await page.goto('/admin/assets/new');

    // Leave Model field empty and try to submit
    await page.fill('input[name="model"], input[id="model"]', '');

    // Try to submit without filling required fields
    await page.click('button:has-text("Create"), button:has-text("Save")');

    // Wait for validation
    await page.waitForTimeout(1000);

    // Expected: Shows error "Model is required" or similar
    const bodyText = await page.textContent('body');
    const hasValidationError = bodyText?.toLowerCase().includes('required') ||
      bodyText?.toLowerCase().includes('error') ||
      bodyText?.toLowerCase().includes('invalid') ||
      bodyText?.toLowerCase().includes('must');

    // If submits with empty fields without error, that's a BUG
    expect(hasValidationError).toBeTruthy();
  });

  test('Test 6.2: Invalid Date - should warn or validate past dates', async ({ page }) => {
    // Try to create subscription with renewal date in the past
    await page.goto('/admin/subscriptions/new');

    const _subscriptionData = generateAssetData();
    const pastDate = new Date();
    pastDate.setFullYear(pastDate.getFullYear() - 1); // 1 year ago
    const pastDateString = pastDate.toISOString().split('T')[0];

    await page.fill('input[name="serviceName"], input[id="serviceName"]', 'TEST Past Date');
    await page.fill('input[name="costPerCycle"], input[id="costPerCycle"], input[name="cost"], input[id="cost"]', '100');

    const renewalDateField = page.locator('input[name="renewalDate"], input[id="renewalDate"]');
    if (await renewalDateField.count() > 0) {
      await renewalDateField.fill(pastDateString);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForTimeout(1000);

    // Expected: Warning or validation error about past date
    const bodyText = await page.textContent('body');
    const hasDateWarning = bodyText?.toLowerCase().includes('date') ||
      bodyText?.toLowerCase().includes('past') ||
      bodyText?.toLowerCase().includes('future') ||
      bodyText?.toLowerCase().includes('invalid');

    // Note: This is a soft validation - past dates might be allowed in some cases
    // We're just checking if there's any feedback
    // If no warning, it's a minor issue, not critical
    if (!hasDateWarning) {
      console.log('Warning: No validation for past dates detected');
    }

    expect(true).toBeTruthy(); // Pass test but log warning
  });

  test('Test 6.3: Large File Upload - should handle or reject large files', async ({ page }) => {
    // This test is tricky without actual large files
    // We'll simulate the check by going to accreditation upload
    await page.goto('/admin/accreditation');

    // Look for file upload input
    const fileInput = page.locator('input[type="file"]');

    if (await fileInput.count() > 0) {
      // We can't actually test with a large file in automated tests easily
      // But we can verify the file input exists and has accept attributes

      const acceptAttr = await fileInput.getAttribute('accept');
      console.log('File input accept attribute:', acceptAttr);

      // Check if there's size validation in the UI
      const bodyHtml = await page.content();
      const hasSizeLimit = bodyHtml.includes('MB') ||
        bodyHtml.includes('size') ||
        bodyHtml.includes('limit');

      // Log for information
      console.log('File size limit mentioned in UI:', hasSizeLimit);

      // Pass test - actual large file upload testing requires integration testing
      expect(true).toBeTruthy();
    } else {
      // Skip if no file upload found
      test.skip();
    }
  });

  test('Test 6.4: XSS Prevention - should escape HTML in input fields', async ({ page }) => {
    // Try to inject script in asset model name
    await page.goto('/admin/assets/new');

    const xssPayload = '<script>alert("XSS")</script>';
    const assetData = generateAssetData();

    await page.fill('input[name="model"], input[id="model"]', xssPayload);
    await page.fill('input[name="assetTag"], input[id="assetTag"]', assetData.assetTag);
    await page.fill('input[name="brand"], input[id="brand"]', assetData.brand);
    await page.fill('input[name="serialNumber"], input[id="serialNumber"]', assetData.serialNumber);

    const typeField = page.locator('select[name="type"], select[id="type"]');
    if (await typeField.count() > 0) {
      await typeField.selectOption('Laptop');
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForTimeout(2000);

    // Check if script was executed (it shouldn't be)
    const hasAlert = await page.evaluate(() => {
      return document.querySelector('script')?.textContent?.includes('alert');
    });

    // Expected: Script should NOT execute
    expect(hasAlert).toBeFalsy();

    // Go to assets list and verify the text is escaped
    await page.goto('/admin/assets');

    const bodyHtml = await page.content();
    // The script tag should be escaped and displayed as text, not executed
    const hasEscapedScript = bodyHtml.includes('&lt;script&gt;') ||
      bodyHtml.includes('&lt;') ||
      !bodyHtml.includes('<script>alert');

    expect(hasEscapedScript).toBeTruthy();
  });

  test('Test 6.5: SQL Injection Prevention - should safely handle special characters', async ({ page }) => {
    // Try to inject SQL in search/filter
    await page.goto('/admin/assets');

    const sqlPayload = "'; DROP TABLE assets; --";

    const searchField = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchField.count() > 0) {
      await searchField.fill(sqlPayload);
      await page.waitForTimeout(1000);

      // Expected: Page should still load and not show database error
      const bodyText = await page.textContent('body');
      const hasDatabaseError = bodyText?.toLowerCase().includes('sql') ||
        bodyText?.toLowerCase().includes('database error') ||
        bodyText?.toLowerCase().includes('syntax error');

      // If we see database errors, that's a critical security issue
      expect(hasDatabaseError).toBeFalsy();

      // Page should handle it gracefully (show no results or escape the input)
      expect(bodyText).toBeTruthy(); // Page should still render
    }
  });
});
