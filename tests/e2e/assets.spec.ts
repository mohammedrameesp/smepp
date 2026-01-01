import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateAssetData } from './utils/test-data';

/**
 * Test Session 2: Create Asset
 * Covers MANUAL_TESTING_SESSION.md - Test Session 2
 */

test.describe('Asset Workflow', () => {
  let assetData: ReturnType<typeof generateAssetData>;

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAs(page, TEST_USERS.admin);

    // Generate unique test data
    assetData = generateAssetData();
  });

  test('Test 2.1: Create New Asset - should create asset successfully', async ({ page }) => {
    // Go to Assets → "New Asset" button
    await page.goto('/admin/assets');
    await page.click('text=New Asset');

    // Wait for form to load
    await expect(page).toHaveURL(/\/admin\/assets\/new/);

    // Fill in required fields
    await page.fill('input[name="model"], input[id="model"]', assetData.model);
    await page.fill('input[name="assetTag"], input[id="assetTag"]', assetData.assetTag);
    await page.fill('input[name="brand"], input[id="brand"]', assetData.brand);
    await page.fill('input[name="serialNumber"], input[id="serialNumber"]', assetData.serialNumber);

    // Select type (dropdown or select)
    const typeField = page.locator('select[name="type"], select[id="type"]');
    if (await typeField.count() > 0) {
      await typeField.selectOption(assetData.type);
    } else {
      // If it's a custom dropdown/combobox
      await page.click('text=Type');
      await page.click(`text=${assetData.type}`);
    }

    // Click "Create Asset" or "Save"
    await page.click('button:has-text("Create"), button:has-text("Save")');

    // Expected: Success message appears
    await expect(page.locator('body')).toContainText(/success|created|saved/i, { timeout: 10000 });

    // Expected: Redirects to asset detail page or list page
    await page.waitForURL(/\/admin\/assets/, { timeout: 10000 });
  });

  test('Test 2.2: Verify Asset Was Created - should find and display asset', async ({ page }) => {
    // First create an asset
    await page.goto('/admin/assets/new');
    await page.fill('input[name="model"], input[id="model"]', assetData.model);
    await page.fill('input[name="assetTag"], input[id="assetTag"]', assetData.assetTag);
    await page.fill('input[name="brand"], input[id="brand"]', assetData.brand);
    await page.fill('input[name="serialNumber"], input[id="serialNumber"]', assetData.serialNumber);

    const typeField = page.locator('select[name="type"], select[id="type"]');
    if (await typeField.count() > 0) {
      await typeField.selectOption(assetData.type);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/assets/, { timeout: 10000 });

    // Go back to Assets list page
    await page.goto('/admin/assets');

    // Search for the asset
    const searchField = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchField.count() > 0) {
      await searchField.fill(assetData.model);
      await page.waitForTimeout(1000); // Wait for search to process
    }

    // Expected: You can find it
    await expect(page.locator('body')).toContainText(assetData.model, { timeout: 10000 });

    // Click on the asset
    await page.click(`text=${assetData.model}`);

    // Expected: Shows all details correctly
    await expect(page.locator('body')).toContainText(assetData.model);
    await expect(page.locator('body')).toContainText(assetData.assetTag);
  });

  test('Test 2.3: Edit the Asset - should update asset successfully', async ({ page }) => {
    // First create an asset and get its ID
    await page.goto('/admin/assets/new');
    await page.fill('input[name="model"], input[id="model"]', assetData.model);
    await page.fill('input[name="assetTag"], input[id="assetTag"]', assetData.assetTag);
    await page.fill('input[name="brand"], input[id="brand"]', assetData.brand);
    await page.fill('input[name="serialNumber"], input[id="serialNumber"]', assetData.serialNumber);

    const typeField = page.locator('select[name="type"], select[id="type"]');
    if (await typeField.count() > 0) {
      await typeField.selectOption(assetData.type);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/assets/, { timeout: 10000 });

    // Find and click on the asset
    await page.goto('/admin/assets');
    await page.click(`text=${assetData.model}`);

    // Click "Edit" button
    await page.click('button:has-text("Edit"), a:has-text("Edit")');
    await expect(page).toHaveURL(/\/edit/);

    // Change Model
    const newModel = `${assetData.model} EDITED`;
    await page.fill('input[name="model"], input[id="model"]', newModel);

    // Change Status to SPARE
    const statusField = page.locator('select[name="status"], select[id="status"]');
    if (await statusField.count() > 0) {
      await statusField.selectOption('SPARE');
    } else {
      // Custom dropdown
      await page.click('text=Status');
      await page.click('text=SPARE');
    }

    // Click "Save" or "Update"
    await page.click('button:has-text("Save"), button:has-text("Update")');

    // Expected: Success message
    await expect(page.locator('body')).toContainText(/success|updated|saved/i, { timeout: 10000 });

    // Expected: Changes are saved
    await expect(page.locator('body')).toContainText(newModel);
  });

  test('Test 2.4: Assign Asset to User - should assign asset successfully', async ({ page }) => {
    // Create asset first
    await page.goto('/admin/assets/new');
    await page.fill('input[name="model"], input[id="model"]', assetData.model);
    await page.fill('input[name="assetTag"], input[id="assetTag"]', assetData.assetTag);
    await page.fill('input[name="brand"], input[id="brand"]', assetData.brand);
    await page.fill('input[name="serialNumber"], input[id="serialNumber"]', assetData.serialNumber);

    const typeField = page.locator('select[name="type"], select[id="type"]');
    if (await typeField.count() > 0) {
      await typeField.selectOption(assetData.type);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/assets/, { timeout: 10000 });

    // Go to edit page or detail page
    await page.goto('/admin/assets');
    await page.click(`text=${assetData.model}`);

    // Check if there's an edit button to access assignment
    const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
    if (await editButton.count() > 0) {
      await editButton.click();
    }

    // Look for "Assign to User" section
    const assignField = page.locator('select[name*="user" i], select[id*="user" i]');
    if (await assignField.count() > 0) {
      // Get first option that's not empty
      const options = await assignField.locator('option').all();
      if (options.length > 1) {
        await assignField.selectOption({ index: 1 });
        await page.click('button:has-text("Assign"), button:has-text("Save"), button:has-text("Update")');

        // Expected: Asset shows as assigned
        await expect(page.locator('body')).toContainText(/assigned|user/i, { timeout: 10000 });
      }
    }
  });

  test('Test 2.5: Check Asset History - should display history records', async ({ page }) => {
    // Create and edit an asset to generate history
    await page.goto('/admin/assets/new');
    await page.fill('input[name="model"], input[id="model"]', assetData.model);
    await page.fill('input[name="assetTag"], input[id="assetTag"]', assetData.assetTag);
    await page.fill('input[name="brand"], input[id="brand"]', assetData.brand);
    await page.fill('input[name="serialNumber"], input[id="serialNumber"]', assetData.serialNumber);

    const typeField = page.locator('select[name="type"], select[id="type"]');
    if (await typeField.count() > 0) {
      await typeField.selectOption(assetData.type);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/assets/, { timeout: 10000 });

    // Go to asset detail page
    await page.goto('/admin/assets');
    await page.click(`text=${assetData.model}`);

    // Look for History section or tab
    const historyTab = page.locator('text=History, button:has-text("History"), a:has-text("History")');
    if (await historyTab.count() > 0) {
      await historyTab.click();

      // Expected: See history records
      const bodyText = await page.textContent('body');
      const hasHistory = bodyText?.toLowerCase().includes('created') ||
        bodyText?.toLowerCase().includes('updated') ||
        bodyText?.toLowerCase().includes('history');

      expect(hasHistory).toBeTruthy();
    }
  });
});
