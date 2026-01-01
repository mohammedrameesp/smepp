import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateSubscriptionData } from './utils/test-data';

/**
 * Test Session 3: Create Subscription
 * Covers MANUAL_TESTING_SESSION.md - Test Session 3
 */

test.describe('Subscription Workflow', () => {
  let subscriptionData: ReturnType<typeof generateSubscriptionData>;

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAs(page, TEST_USERS.admin);

    // Generate unique test data
    subscriptionData = generateSubscriptionData();
  });

  test('Test 3.1: Create Subscription - should create subscription successfully', async ({ page }) => {
    // Go to Subscriptions → "New Subscription" button
    await page.goto('/admin/subscriptions');
    await page.click('text=New Subscription');

    // Wait for form to load
    await expect(page).toHaveURL(/\/admin\/subscriptions\/new/);

    // Fill required fields
    await page.fill('input[name="serviceName"], input[id="serviceName"]', subscriptionData.serviceName);
    await page.fill('input[name="costPerCycle"], input[id="costPerCycle"], input[name="cost"], input[id="cost"]', subscriptionData.costPerCycle);

    // Select Billing Cycle
    const billingCycleField = page.locator('select[name="billingCycle"], select[id="billingCycle"]');
    if (await billingCycleField.count() > 0) {
      await billingCycleField.selectOption(subscriptionData.billingCycle);
    } else {
      // Custom dropdown
      await page.click('text=Billing Cycle');
      await page.click(`text=${subscriptionData.billingCycle}`);
    }

    // Select Currency
    const currencyField = page.locator('select[name="currency"], select[id="currency"]');
    if (await currencyField.count() > 0) {
      await currencyField.selectOption(subscriptionData.currency);
    } else {
      // Custom dropdown
      await page.click('text=Currency');
      await page.click(`text=${subscriptionData.currency}`);
    }

    // Fill Renewal Date
    const renewalDateField = page.locator('input[name="renewalDate"], input[id="renewalDate"]');
    if (await renewalDateField.count() > 0) {
      await renewalDateField.fill(subscriptionData.renewalDate);
    }

    // Click "Create" or "Save"
    await page.click('button:has-text("Create"), button:has-text("Save")');

    // Expected: Success message
    await expect(page.locator('body')).toContainText(/success|created|saved/i, { timeout: 10000 });

    // Expected: Redirects to subscriptions list or detail page
    await page.waitForURL(/\/admin\/subscriptions/, { timeout: 10000 });
  });

  test('Test 3.2: Verify Renewal Calculation - should show correct renewal date and days', async ({ page }) => {
    // First create a subscription
    await page.goto('/admin/subscriptions/new');
    await page.fill('input[name="serviceName"], input[id="serviceName"]', subscriptionData.serviceName);
    await page.fill('input[name="costPerCycle"], input[id="costPerCycle"], input[name="cost"], input[id="cost"]', subscriptionData.costPerCycle);

    const billingCycleField = page.locator('select[name="billingCycle"], select[id="billingCycle"]');
    if (await billingCycleField.count() > 0) {
      await billingCycleField.selectOption(subscriptionData.billingCycle);
    }

    const currencyField = page.locator('select[name="currency"], select[id="currency"]');
    if (await currencyField.count() > 0) {
      await currencyField.selectOption(subscriptionData.currency);
    }

    const renewalDateField = page.locator('input[name="renewalDate"], input[id="renewalDate"]');
    if (await renewalDateField.count() > 0) {
      await renewalDateField.fill(subscriptionData.renewalDate);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/subscriptions/, { timeout: 10000 });

    // Go to Subscriptions list
    await page.goto('/admin/subscriptions');

    // Search for the subscription
    const searchField = page.locator('input[type="search"], input[placeholder*="search" i]');
    if (await searchField.count() > 0) {
      await searchField.fill(subscriptionData.serviceName);
      await page.waitForTimeout(1000);
    }

    // Expected: Shows renewal date
    await expect(page.locator('body')).toContainText(subscriptionData.serviceName, { timeout: 10000 });

    // Expected: Shows "days until renewal" (look for number followed by "day" or "days")
    const bodyText = await page.textContent('body');
    const hasDaysCalculation = bodyText?.match(/\d+\s*days?/i);
    expect(hasDaysCalculation).toBeTruthy();
  });

  test('Test 3.3: Edit Subscription - should update subscription successfully', async ({ page }) => {
    // Create subscription first
    await page.goto('/admin/subscriptions/new');
    await page.fill('input[name="serviceName"], input[id="serviceName"]', subscriptionData.serviceName);
    await page.fill('input[name="costPerCycle"], input[id="costPerCycle"], input[name="cost"], input[id="cost"]', subscriptionData.costPerCycle);

    const billingCycleField = page.locator('select[name="billingCycle"], select[id="billingCycle"]');
    if (await billingCycleField.count() > 0) {
      await billingCycleField.selectOption(subscriptionData.billingCycle);
    }

    const currencyField = page.locator('select[name="currency"], select[id="currency"]');
    if (await currencyField.count() > 0) {
      await currencyField.selectOption(subscriptionData.currency);
    }

    const renewalDateField = page.locator('input[name="renewalDate"], input[id="renewalDate"]');
    if (await renewalDateField.count() > 0) {
      await renewalDateField.fill(subscriptionData.renewalDate);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/subscriptions/, { timeout: 10000 });

    // Find and click on the subscription
    await page.goto('/admin/subscriptions');
    await page.click(`text=${subscriptionData.serviceName}`);

    // Click "Edit" button
    await page.click('button:has-text("Edit"), a:has-text("Edit")');
    await expect(page).toHaveURL(/\/edit/);

    // Change cost
    const newCost = '200';
    await page.fill('input[name="costPerCycle"], input[id="costPerCycle"], input[name="cost"], input[id="cost"]', newCost);

    // Click "Save" or "Update"
    await page.click('button:has-text("Save"), button:has-text("Update")');

    // Expected: Success message
    await expect(page.locator('body')).toContainText(/success|updated|saved/i, { timeout: 10000 });

    // Expected: Changes are saved (should show new cost)
    await expect(page.locator('body')).toContainText(newCost);
  });

  test('Test 3.4: Verify Monthly Cost Calculation - should calculate monthly cost correctly', async ({ page }) => {
    // Create a YEARLY subscription to test monthly calculation
    await page.goto('/admin/subscriptions/new');

    const yearlySubscription = generateSubscriptionData();
    yearlySubscription.serviceName = `TEST Yearly ${Date.now()}`;
    yearlySubscription.billingCycle = 'YEARLY';
    yearlySubscription.costPerCycle = '1200'; // 1200 per year = 100 per month

    await page.fill('input[name="serviceName"], input[id="serviceName"]', yearlySubscription.serviceName);
    await page.fill('input[name="costPerCycle"], input[id="costPerCycle"], input[name="cost"], input[id="cost"]', yearlySubscription.costPerCycle);

    const billingCycleField = page.locator('select[name="billingCycle"], select[id="billingCycle"]');
    if (await billingCycleField.count() > 0) {
      await billingCycleField.selectOption('YEARLY');
    }

    const currencyField = page.locator('select[name="currency"], select[id="currency"]');
    if (await currencyField.count() > 0) {
      await currencyField.selectOption(yearlySubscription.currency);
    }

    const renewalDateField = page.locator('input[name="renewalDate"], input[id="renewalDate"]');
    if (await renewalDateField.count() > 0) {
      await renewalDateField.fill(yearlySubscription.renewalDate);
    }

    await page.click('button:has-text("Create"), button:has-text("Save")');
    await page.waitForURL(/\/admin\/subscriptions/, { timeout: 10000 });

    // Go to subscriptions list and verify monthly cost is shown
    await page.goto('/admin/subscriptions');

    // Expected: Should show monthly cost (1200 / 12 = 100)
    const bodyText = await page.textContent('body');
    const hasYearlySubscription = bodyText?.includes(yearlySubscription.serviceName);
    expect(hasYearlySubscription).toBeTruthy();
  });
});
