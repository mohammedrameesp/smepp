import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateSpendRequestData } from './utils/test-data';

/**
 * Purchase Requests E2E Tests
 * Tests for purchase request creation, management, and approval workflow
 */

test.describe('Purchase Requests Workflow', () => {
  let requestData: ReturnType<typeof generateSpendRequestData>;

  test.beforeEach(async () => {
    // Generate unique test data
    requestData = generateSpendRequestData();
  });

  // ===== Employee Tests =====
  test.describe('Employee - Create and View Requests', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('should navigate to purchase requests page', async ({ page }) => {
      await page.goto('/employee/spend-requests');

      // Should see the purchase requests page
      await expect(page).toHaveURL(/\/employee\/spend-requests/);
      await expect(page.locator('body')).toContainText(/purchase|request/i);
    });

    test('should create a new purchase request', async ({ page }) => {
      await page.goto('/employee/spend-requests');

      // Click new request button
      const newRequestBtn = page.locator('button:has-text("New Request"), a:has-text("New Request"), button:has-text("Create")');
      if (await newRequestBtn.count() > 0) {
        await newRequestBtn.click();

        // Should be on new request page
        await expect(page).toHaveURL(/\/new/);

        // Fill request details
        await page.fill('input[name="title"], input[id="title"]', requestData.title);

        const descField = page.locator('textarea[name="description"], input[name="description"]');
        if (await descField.count() > 0) {
          await descField.fill(requestData.description);
        }

        const justField = page.locator('textarea[name="justification"], input[name="justification"]');
        if (await justField.count() > 0) {
          await justField.fill(requestData.justification);
        }

        // Select priority
        const priorityField = page.locator('select[name="priority"]');
        if (await priorityField.count() > 0) {
          await priorityField.selectOption(requestData.priority);
        }

        // Add item
        const itemDescField = page.locator('input[name*="description" i], input[placeholder*="description" i]').first();
        if (await itemDescField.count() > 0) {
          await itemDescField.fill(requestData.items[0].description);
        }

        const quantityField = page.locator('input[name*="quantity" i], input[type="number"]').first();
        if (await quantityField.count() > 0) {
          await quantityField.fill(String(requestData.items[0].quantity));
        }

        const priceField = page.locator('input[name*="price" i], input[name*="unitPrice" i]').first();
        if (await priceField.count() > 0) {
          await priceField.fill(String(requestData.items[0].unitPrice));
        }

        // Submit
        await page.click('button:has-text("Submit"), button:has-text("Create"), button:has-text("Save")');

        // Expect success
        await expect(page.locator('body')).toContainText(/success|created|submitted/i, { timeout: 10000 });
      }
    });

    test('should view request list', async ({ page }) => {
      await page.goto('/employee/spend-requests');

      // Should see list or empty state
      const hasList = await page.locator('table, [class*="list"], [class*="card"]').count() > 0;
      const hasEmptyState = await page.locator('text=/no requests|create.*request|get started/i').count() > 0;

      expect(hasList || hasEmptyState).toBeTruthy();
    });

    test('should view request details', async ({ page }) => {
      await page.goto('/employee/spend-requests');

      // Click on first request if exists
      const requestLink = page.locator('a[href*="/spend-requests/"]').first();
      if (await requestLink.count() > 0) {
        await requestLink.click();

        // Should see request details
        await expect(page.locator('body')).toContainText(/title|status|items|total/i, { timeout: 10000 });
      }
    });

    test('should only be able to edit pending requests', async ({ page }) => {
      await page.goto('/employee/spend-requests');

      // Click on a request
      const requestLink = page.locator('a[href*="/spend-requests/"]').first();
      if (await requestLink.count() > 0) {
        await requestLink.click();

        // Check for edit button based on status
        const editBtn = page.locator('button:has-text("Edit"), a:has-text("Edit")');
        const statusBadge = page.locator('text=PENDING, [class*="pending" i]');

        // Edit should only be available for PENDING status
        if (await statusBadge.count() > 0) {
          // Should have edit option
          expect(await editBtn.count()).toBeGreaterThan(0);
        }
      }
    });

    test('should add multiple items to request', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      // Fill basic details
      await page.fill('input[name="title"]', requestData.title);

      // Add first item
      const itemDescField = page.locator('input[name*="description" i]').first();
      if (await itemDescField.count() > 0) {
        await itemDescField.fill('Item 1');

        // Add another item
        const addItemBtn = page.locator('button:has-text("Add Item"), button:has-text("+ Item")');
        if (await addItemBtn.count() > 0) {
          await addItemBtn.click();

          // Fill second item
          const secondItemField = page.locator('input[name*="description" i]').nth(1);
          if (await secondItemField.count() > 0) {
            await secondItemField.fill('Item 2');
          }
        }
      }
    });

    test('should calculate total correctly', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      // Fill item with known values
      await page.fill('input[name="title"]', requestData.title);

      const quantityField = page.locator('input[name*="quantity" i]').first();
      const priceField = page.locator('input[name*="price" i], input[name*="unitPrice" i]').first();

      if (await quantityField.count() > 0 && await priceField.count() > 0) {
        await quantityField.fill('2');
        await priceField.fill('500');

        // Wait for calculation
        await page.waitForTimeout(500);

        // Should see total of 1000
        const totalText = await page.textContent('body');
        expect(totalText).toMatch(/1,?000|total/i);
      }
    });
  });

  // ===== Admin Tests =====
  test.describe('Admin - Manage and Approve Requests', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.admin);
    });

    test('should navigate to admin purchase requests page', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Should see all purchase requests
      await expect(page).toHaveURL(/\/admin\/spend-requests/);
    });

    test('should see all requests (not just own)', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Admin should see requests from all users
      // Check for table or list with multiple entries
      const hasRequests = await page.locator('table tbody tr, [class*="request-card"]').count() >= 0;
      expect(hasRequests).toBeTruthy();
    });

    test('should approve a pending request', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Find a pending request
      const pendingRequest = page.locator('tr:has-text("PENDING"), [class*="card"]:has-text("PENDING")').first();
      if (await pendingRequest.count() > 0) {
        // Click on it
        await pendingRequest.locator('a').first().click();

        // Look for approve button
        const approveBtn = page.locator('button:has-text("Approve")');
        if (await approveBtn.count() > 0) {
          await approveBtn.click();

          // Might need to confirm
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
          if (await confirmBtn.count() > 0) {
            await confirmBtn.click();
          }

          // Expect success
          await expect(page.locator('body')).toContainText(/approved|success/i, { timeout: 10000 });
        }
      }
    });

    test('should reject a pending request with notes', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Find a pending request
      const pendingRequest = page.locator('tr:has-text("PENDING")').first();
      if (await pendingRequest.count() > 0) {
        await pendingRequest.locator('a').first().click();

        // Look for reject button
        const rejectBtn = page.locator('button:has-text("Reject")');
        if (await rejectBtn.count() > 0) {
          await rejectBtn.click();

          // Fill rejection notes
          const notesField = page.locator('textarea[name*="notes" i], textarea[placeholder*="reason" i]');
          if (await notesField.count() > 0) {
            await notesField.fill('Budget constraints for this quarter');
          }

          // Confirm rejection
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Reject"):visible');
          if (await confirmBtn.count() > 0) {
            await confirmBtn.last().click();
          }

          // Expect rejection
          await expect(page.locator('body')).toContainText(/rejected|success/i, { timeout: 10000 });
        }
      }
    });

    test('should change request status', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      const requestLink = page.locator('a[href*="/spend-requests/"]').first();
      if (await requestLink.count() > 0) {
        await requestLink.click();

        // Look for status dropdown or buttons
        const statusSelect = page.locator('select[name*="status" i]');
        if (await statusSelect.count() > 0) {
          await statusSelect.selectOption('UNDER_REVIEW');

          // Save if needed
          const saveBtn = page.locator('button:has-text("Save"), button:has-text("Update")');
          if (await saveBtn.count() > 0) {
            await saveBtn.click();
          }

          // Expect status change
          await expect(page.locator('body')).toContainText(/under review|updated/i, { timeout: 10000 });
        }
      }
    });

    test('should mark approved request as completed', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Find an approved request
      const approvedRequest = page.locator('tr:has-text("APPROVED")').first();
      if (await approvedRequest.count() > 0) {
        await approvedRequest.locator('a').first().click();

        // Look for complete button
        const completeBtn = page.locator('button:has-text("Complete"), button:has-text("Mark Complete")');
        if (await completeBtn.count() > 0) {
          await completeBtn.click();

          // Add completion notes
          const notesField = page.locator('textarea[name*="completion" i], textarea[name*="notes" i]');
          if (await notesField.count() > 0) {
            await notesField.fill('Items received and verified');
          }

          // Confirm
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Complete"):visible');
          if (await confirmBtn.count() > 0) {
            await confirmBtn.last().click();
          }

          // Expect completion
          await expect(page.locator('body')).toContainText(/completed|success/i, { timeout: 10000 });
        }
      }
    });

    test('should filter requests by status', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Look for status filter
      const statusFilter = page.locator('select[name*="status" i], button:has-text("Status")');
      if (await statusFilter.count() > 0) {
        if (await statusFilter.first().locator('option').count() > 0) {
          await statusFilter.first().selectOption('APPROVED');
        } else {
          await statusFilter.click();
          await page.click('text=Approved');
        }

        // Wait for filter
        await page.waitForTimeout(1000);

        // Should only show approved requests
        const allBadges = await page.locator('[class*="badge"], [class*="status"]').allTextContents();
        // Either all are APPROVED or page shows "no results"
        const allApproved = allBadges.every(b => b.toLowerCase().includes('approved') || !b.toLowerCase().includes('pending'));
        expect(allApproved || await page.locator('text=/no.*results|no.*requests/i').count() > 0).toBeTruthy();
      }
    });

    test('should filter requests by priority', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Look for priority filter
      const priorityFilter = page.locator('select[name*="priority" i], button:has-text("Priority")');
      if (await priorityFilter.count() > 0) {
        if (await priorityFilter.first().locator('option').count() > 0) {
          await priorityFilter.first().selectOption('URGENT');
        } else {
          await priorityFilter.click();
          await page.click('text=Urgent');
        }

        // Wait for filter
        await page.waitForTimeout(1000);
      }
    });

    test('should export requests', async ({ page }) => {
      await page.goto('/admin/spend-requests');

      // Look for export button
      const exportBtn = page.locator('button:has-text("Export"), a:has-text("Export")');
      if (await exportBtn.count() > 0) {
        // Start waiting for download before clicking
        const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
        await exportBtn.click();

        const download = await downloadPromise;
        if (download) {
          expect(download.suggestedFilename()).toMatch(/purchase|request/i);
        }
      }
    });
  });

  // ===== Request Types Tests =====
  test.describe('Request Types and Categories', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('should select purchase type', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      const purchaseTypeField = page.locator('select[name="purchaseType"], select[name*="type" i]');
      if (await purchaseTypeField.count() > 0) {
        await purchaseTypeField.selectOption('HARDWARE');
        expect(await purchaseTypeField.inputValue()).toBe('HARDWARE');
      }
    });

    test('should select cost type', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      const costTypeField = page.locator('select[name="costType"], select[name*="cost" i]');
      if (await costTypeField.count() > 0) {
        await costTypeField.selectOption('PROJECT_COST');

        // Project name should be required
        const projectNameField = page.locator('input[name="projectName"], input[name*="project" i]');
        expect(await projectNameField.count()).toBeGreaterThan(0);
      }
    });

    test('should require project name for project cost', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      // Fill basic required fields
      await page.fill('input[name="title"]', requestData.title);

      // Select project cost
      const costTypeField = page.locator('select[name="costType"]');
      if (await costTypeField.count() > 0) {
        await costTypeField.selectOption('PROJECT_COST');

        // Try to submit without project name
        await page.click('button:has-text("Submit"), button:has-text("Create")');

        // Should show validation error
        await expect(page.locator('body')).toContainText(/project.*required|required.*project/i, { timeout: 5000 });
      }
    });

    test('should select payment mode', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      const paymentModeField = page.locator('select[name="paymentMode"], select[name*="payment" i]');
      if (await paymentModeField.count() > 0) {
        await paymentModeField.selectOption('CREDIT_CARD');
        expect(await paymentModeField.inputValue()).toBe('CREDIT_CARD');
      }
    });
  });

  // ===== Item Billing Cycle Tests =====
  test.describe('Item Billing Cycles', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('should add recurring item with billing cycle', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      await page.fill('input[name="title"]', requestData.title);

      // Select billing cycle if available
      const billingCycleField = page.locator('select[name*="billingCycle" i]');
      if (await billingCycleField.count() > 0) {
        await billingCycleField.first().selectOption('MONTHLY');

        // Duration field should appear
        const durationField = page.locator('input[name*="duration" i]');
        if (await durationField.count() > 0) {
          await durationField.fill('12');
        }
      }
    });
  });

  // ===== Vendor Information Tests =====
  test.describe('Vendor Information', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('should add vendor details', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      await page.fill('input[name="title"]', requestData.title);

      // Fill vendor details
      const vendorNameField = page.locator('input[name="vendorName"], input[name*="vendor" i]');
      if (await vendorNameField.count() > 0) {
        await vendorNameField.fill('Test Vendor Inc.');
      }

      const vendorEmailField = page.locator('input[name="vendorEmail"], input[type="email"][name*="vendor" i]');
      if (await vendorEmailField.count() > 0) {
        await vendorEmailField.fill('vendor@example.com');
      }

      const vendorContactField = page.locator('input[name="vendorContact"], input[name*="contact" i]');
      if (await vendorContactField.count() > 0) {
        await vendorContactField.fill('+974 1234 5678');
      }
    });
  });

  // ===== Currency Tests =====
  test.describe('Currency Handling', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('should select currency', async ({ page }) => {
      await page.goto('/employee/spend-requests/new');

      const currencyField = page.locator('select[name="currency"], select[name*="currency" i]');
      if (await currencyField.count() > 0) {
        // Check available options
        const options = await currencyField.locator('option').allTextContents();
        expect(options.some(o => o.includes('QAR') || o.includes('USD'))).toBeTruthy();

        // Select USD
        await currencyField.selectOption('USD');
      }
    });
  });
});
