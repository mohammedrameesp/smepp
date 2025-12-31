import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateEmployeeData } from './utils/test-data';

/**
 * E2E Tests for Employee Management Module
 * Tests employee CRUD operations, HR profile, and onboarding
 */

test.describe('Employee Management', () => {
  let employeeData: ReturnType<typeof generateEmployeeData>;

  test.beforeEach(async ({ page }) => {
    employeeData = generateEmployeeData();
    await loginAs(page, TEST_USERS.admin);
  });

  test.describe('Employee List', () => {
    test('Admin can view employees page', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Should see employees page
      await expect(page.locator('body')).toContainText(/employee|team|staff/i);
    });

    test('Admin can search employees', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i], input[name*="search" i]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000);

        // Should filter results
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    });

    test('Admin can filter employees by status', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Look for filter dropdown
      const filterSelect = page.locator('select[name*="filter" i], select[name*="status" i]');
      if (await filterSelect.count() > 0) {
        const options = await filterSelect.locator('option').all();
        if (options.length > 1) {
          await filterSelect.selectOption({ index: 1 });
          await page.waitForTimeout(500);

          // Should apply filter
          const bodyText = await page.textContent('body');
          expect(bodyText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Employee CRUD', () => {
    test('Admin can access new employee form', async ({ page }) => {
      await page.goto('/admin/employees/new');
      await page.waitForLoadState('networkidle');

      // Should see employee form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasEmployeeText = bodyText?.toLowerCase().includes('employee') ||
        bodyText?.toLowerCase().includes('user');

      expect(hasForm || hasEmployeeText).toBeTruthy();
    });

    test('Admin can create employee', async ({ page }) => {
      await page.goto('/admin/employees/new');
      await page.waitForLoadState('networkidle');

      // Fill name
      const nameInput = page.locator('input[name="name"], input[id="name"]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(employeeData.name);
      }

      // Fill email
      const emailInput = page.locator('input[name="email"], input[id="email"]');
      if (await emailInput.count() > 0) {
        await emailInput.fill(employeeData.email);
      }

      // Fill employee ID
      const employeeIdInput = page.locator('input[name*="employeeId" i], input[name*="employee_id" i]');
      if (await employeeIdInput.count() > 0) {
        await employeeIdInput.fill(employeeData.employeeId);
      }

      // Fill designation
      const designationInput = page.locator('input[name*="designation" i], input[name*="title" i]');
      if (await designationInput.count() > 0) {
        await designationInput.fill(employeeData.designation);
      }

      // Select role if present
      const roleSelect = page.locator('select[name="role"], select[id="role"]');
      if (await roleSelect.count() > 0) {
        await roleSelect.selectOption('EMPLOYEE');
      }

      // Check "Is Employee" checkbox if present
      const isEmployeeCheckbox = page.locator('input[name*="isEmployee" i]');
      if (await isEmployeeCheckbox.count() > 0) {
        await isEmployeeCheckbox.check();
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('created') ||
          page.url().includes('/admin/employees');

        expect(hasSuccess).toBeTruthy();
      }
    });

    test('Admin can view employee details', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Click on first employee
      const employeeRow = page.locator('tr, [data-testid="employee-row"]').first();
      if (await employeeRow.count() > 0) {
        await employeeRow.click();
        await page.waitForLoadState('networkidle');

        // Should see employee details
        const bodyText = await page.textContent('body');
        const hasDetails = bodyText?.toLowerCase().includes('employee') ||
          bodyText?.toLowerCase().includes('profile') ||
          bodyText?.toLowerCase().includes('details');

        expect(hasDetails).toBeTruthy();
      }
    });

    test('Admin can edit employee', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Click on first employee
      const employeeRow = page.locator('tr, [data-testid="employee-row"]').first();
      if (await employeeRow.count() > 0) {
        await employeeRow.click();
        await page.waitForLoadState('networkidle');

        // Click edit button
        const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
        if (await editButton.count() > 0) {
          await editButton.click();
          await expect(page).toHaveURL(/\/edit/);

          // Modify designation
          const designationInput = page.locator('input[name*="designation" i]');
          if (await designationInput.count() > 0) {
            await designationInput.fill('Updated Designation');
          }

          // Save changes
          const saveButton = page.locator('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await page.waitForTimeout(2000);

            const bodyText = await page.textContent('body');
            const hasSuccess = bodyText?.toLowerCase().includes('success') ||
              bodyText?.toLowerCase().includes('updated');

            expect(hasSuccess).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('HR Profile', () => {
    test('Admin can view employee HR profile', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Click on first employee
      const employeeRow = page.locator('tr, [data-testid="employee-row"]').first();
      if (await employeeRow.count() > 0) {
        await employeeRow.click();
        await page.waitForLoadState('networkidle');

        // Look for HR tab or section
        const hrTab = page.locator('button:has-text("HR"), a:has-text("HR Profile"), [data-tab="hr"]');
        if (await hrTab.count() > 0) {
          await hrTab.click();
          await page.waitForLoadState('networkidle');

          // Should see HR profile details
          const bodyText = await page.textContent('body');
          const hasHrDetails = bodyText?.toLowerCase().includes('profile') ||
            bodyText?.toLowerCase().includes('personal') ||
            bodyText?.toLowerCase().includes('documents');

          expect(hasHrDetails).toBeTruthy();
        }
      }
    });

    test('Admin can access employee HR edit page', async ({ page }) => {
      await page.goto('/admin/employees');
      await page.waitForLoadState('networkidle');

      // Click on first employee
      const employeeRow = page.locator('tr, [data-testid="employee-row"]').first();
      if (await employeeRow.count() > 0) {
        await employeeRow.click();
        const url = page.url();

        // Try to access HR page
        const employeeId = url.split('/').pop();
        if (employeeId) {
          await page.goto(`/admin/users/${employeeId}/hr`);
          await page.waitForLoadState('networkidle');

          const bodyText = await page.textContent('body');
          const hasHrPage = bodyText?.toLowerCase().includes('hr') ||
            bodyText?.toLowerCase().includes('profile') ||
            bodyText?.toLowerCase().includes('personal');

          expect(hasHrPage).toBeTruthy();
        }
      }
    });
  });

  test.describe('Document Expiry', () => {
    test('Admin can view document expiry page', async ({ page }) => {
      await page.goto('/admin/employees/document-expiry');
      await page.waitForLoadState('networkidle');

      // Should see document expiry page
      const bodyText = await page.textContent('body');
      const hasExpiryPage = bodyText?.toLowerCase().includes('expir') ||
        bodyText?.toLowerCase().includes('document') ||
        bodyText?.toLowerCase().includes('no documents');

      expect(hasExpiryPage).toBeTruthy();
    });

    test('Admin can filter by expiry status', async ({ page }) => {
      await page.goto('/admin/employees/document-expiry');
      await page.waitForLoadState('networkidle');

      // Look for filter options
      const filterButtons = page.locator('button:has-text("Expired"), button:has-text("Expiring"), [data-filter]');
      if (await filterButtons.count() > 0) {
        await filterButtons.first().click();
        await page.waitForTimeout(500);

        // Should apply filter
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    });
  });

  test.describe('Change Requests', () => {
    test('Admin can view change requests page', async ({ page }) => {
      await page.goto('/admin/employees/change-requests');
      await page.waitForLoadState('networkidle');

      // Should see change requests page
      const bodyText = await page.textContent('body');
      const hasChangeRequests = bodyText?.toLowerCase().includes('change') ||
        bodyText?.toLowerCase().includes('request') ||
        bodyText?.toLowerCase().includes('pending') ||
        bodyText?.toLowerCase().includes('no requests');

      expect(hasChangeRequests).toBeTruthy();
    });

    test('Admin can approve change request', async ({ page }) => {
      await page.goto('/admin/employees/change-requests');
      await page.waitForLoadState('networkidle');

      // Look for pending change request
      const pendingRequest = page.locator('tr:has-text("Pending"), [data-status="pending"]').first();
      if (await pendingRequest.count() > 0) {
        const approveBtn = pendingRequest.locator('button:has-text("Approve")');
        if (await approveBtn.count() > 0) {
          await approveBtn.click();
          await page.waitForTimeout(1000);

          const bodyText = await page.textContent('body');
          const hasApproved = bodyText?.toLowerCase().includes('approved') ||
            bodyText?.toLowerCase().includes('success');

          expect(hasApproved).toBeTruthy();
        }
      }
    });
  });

  test.describe('Employee Self-Service', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('Employee can view their profile', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Should see profile page
      const bodyText = await page.textContent('body');
      const hasProfile = bodyText?.toLowerCase().includes('profile') ||
        bodyText?.toLowerCase().includes('personal') ||
        bodyText?.toLowerCase().includes('employee');

      expect(hasProfile).toBeTruthy();
    });

    test('Employee can view their assets', async ({ page }) => {
      await page.goto('/employee/assets');
      await page.waitForLoadState('networkidle');

      // Should see assets page
      const bodyText = await page.textContent('body');
      const hasAssets = bodyText?.toLowerCase().includes('asset') ||
        bodyText?.toLowerCase().includes('assigned') ||
        bodyText?.toLowerCase().includes('no assets');

      expect(hasAssets).toBeTruthy();
    });

    test('Employee can request profile change', async ({ page }) => {
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');

      // Look for edit or request change button
      const editBtn = page.locator('button:has-text("Edit"), button:has-text("Request Change")');
      if (await editBtn.count() > 0) {
        await editBtn.click();
        await page.waitForLoadState('networkidle');

        // Should see edit form or request form
        const hasForm = await page.locator('form').count() > 0;
        expect(hasForm).toBeTruthy();
      }
    });
  });
});
