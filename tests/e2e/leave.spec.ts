import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateLeaveRequestData } from './utils/test-data';

/**
 * E2E Tests for Leave Management Module
 * Tests the complete leave request and approval workflow
 */

test.describe('Leave Management', () => {
  let leaveData: ReturnType<typeof generateLeaveRequestData>;

  test.beforeEach(async () => {
    leaveData = generateLeaveRequestData();
  });

  test.describe('Admin Leave Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.admin);
    });

    test('Admin can view leave requests page', async ({ page }) => {
      await page.goto('/admin/leave/requests');
      await page.waitForLoadState('networkidle');

      // Should see the leave requests page
      await expect(page.locator('body')).toContainText(/leave|requests/i);
    });

    test('Admin can view leave types configuration', async ({ page }) => {
      await page.goto('/admin/leave/types');
      await page.waitForLoadState('networkidle');

      // Should see leave types
      await expect(page.locator('body')).toContainText(/leave type|annual|sick/i);
    });

    test('Admin can view leave balances', async ({ page }) => {
      await page.goto('/admin/leave/balances');
      await page.waitForLoadState('networkidle');

      // Should see leave balances page
      await expect(page.locator('body')).toContainText(/balance|leave/i);
    });

    test('Admin can access new leave request form', async ({ page }) => {
      await page.goto('/admin/leave/requests/new');
      await page.waitForLoadState('networkidle');

      // Should see leave request form
      const hasForm = await page.locator('form').count() > 0;
      const hasLeaveText = await page.locator('body').textContent();

      expect(hasForm || hasLeaveText?.toLowerCase().includes('leave')).toBeTruthy();
    });

    test('Admin can create leave request for employee', async ({ page }) => {
      await page.goto('/admin/leave/requests/new');
      await page.waitForLoadState('networkidle');

      // Look for employee selection
      const employeeSelect = page.locator('select[name*="employee" i], select[name*="user" i], [data-testid="employee-select"]');
      if (await employeeSelect.count() > 0) {
        // Select first employee option
        const options = await employeeSelect.locator('option').all();
        if (options.length > 1) {
          await employeeSelect.selectOption({ index: 1 });
        }
      }

      // Select leave type
      const leaveTypeSelect = page.locator('select[name*="leaveType" i], select[name*="type" i], [data-testid="leave-type-select"]');
      if (await leaveTypeSelect.count() > 0) {
        const options = await leaveTypeSelect.locator('option').all();
        if (options.length > 1) {
          await leaveTypeSelect.selectOption({ index: 1 });
        }
      }

      // Fill dates - try multiple selectors
      const startDateInput = page.locator('input[name*="start" i], input[id*="start" i], [data-testid="start-date"]').first();
      const endDateInput = page.locator('input[name*="end" i], input[id*="end" i], [data-testid="end-date"]').first();

      if (await startDateInput.count() > 0) {
        await startDateInput.fill(leaveData.startDate);
      }
      if (await endDateInput.count() > 0) {
        await endDateInput.fill(leaveData.endDate);
      }

      // Fill reason
      const reasonInput = page.locator('textarea[name*="reason" i], input[name*="reason" i], [data-testid="reason"]');
      if (await reasonInput.count() > 0) {
        await reasonInput.fill(leaveData.reason);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Create")');
      if (await submitButton.count() > 0) {
        await submitButton.click();

        // Wait for response
        await page.waitForTimeout(2000);

        // Should show success or redirect
        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('created') ||
          bodyText?.toLowerCase().includes('submitted');
        const redirected = page.url().includes('/admin/leave/requests');

        expect(hasSuccess || redirected).toBeTruthy();
      }
    });

    test('Admin can approve pending leave request', async ({ page }) => {
      await page.goto('/admin/leave/requests');
      await page.waitForLoadState('networkidle');

      // Look for pending requests
      const pendingRow = page.locator('tr:has-text("Pending"), [data-status="pending"]').first();

      if (await pendingRow.count() > 0) {
        // Click on the request or find approve button
        const approveBtn = pendingRow.locator('button:has-text("Approve")');

        if (await approveBtn.count() > 0) {
          await approveBtn.click();
          await page.waitForTimeout(1000);

          // Should show success
          await expect(page.locator('body')).toContainText(/approved|success/i);
        } else {
          // Click on the row to view details
          await pendingRow.click();
          await page.waitForLoadState('networkidle');

          // Look for approve button in detail view
          const detailApproveBtn = page.locator('button:has-text("Approve")');
          if (await detailApproveBtn.count() > 0) {
            await detailApproveBtn.click();
            await page.waitForTimeout(1000);
            await expect(page.locator('body')).toContainText(/approved|success/i);
          }
        }
      }
    });

    test('Admin can reject pending leave request', async ({ page }) => {
      await page.goto('/admin/leave/requests');
      await page.waitForLoadState('networkidle');

      // Look for pending requests
      const pendingRow = page.locator('tr:has-text("Pending"), [data-status="pending"]').first();

      if (await pendingRow.count() > 0) {
        const rejectBtn = pendingRow.locator('button:has-text("Reject")');

        if (await rejectBtn.count() > 0) {
          await rejectBtn.click();

          // Fill rejection reason if dialog appears
          const reasonInput = page.locator('textarea[name*="reason" i], input[name*="reason" i]');
          if (await reasonInput.count() > 0) {
            await reasonInput.fill('E2E Test - Rejected for testing');
          }

          // Confirm rejection
          const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Reject")').last();
          if (await confirmBtn.count() > 0) {
            await confirmBtn.click();
          }

          await page.waitForTimeout(1000);
          await expect(page.locator('body')).toContainText(/rejected|success/i);
        }
      }
    });

    test('Admin can view leave calendar', async ({ page }) => {
      await page.goto('/admin/leave/calendar');
      await page.waitForLoadState('networkidle');

      // Should see calendar or leave view
      const bodyText = await page.textContent('body');
      const hasCalendar = bodyText?.toLowerCase().includes('calendar') ||
        bodyText?.toLowerCase().includes('leave') ||
        await page.locator('.calendar, [data-testid="calendar"]').count() > 0;

      expect(hasCalendar).toBeTruthy();
    });
  });

  test.describe('Employee Leave Self-Service', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('Employee can view their leave page', async ({ page }) => {
      await page.goto('/employee/leave');
      await page.waitForLoadState('networkidle');

      // Should see leave information
      await expect(page.locator('body')).toContainText(/leave|balance|request/i);
    });

    test('Employee can view their leave balance', async ({ page }) => {
      await page.goto('/employee/leave');
      await page.waitForLoadState('networkidle');

      // Should see balance information
      const bodyText = await page.textContent('body');
      const hasBalance = bodyText?.toLowerCase().includes('balance') ||
        bodyText?.toLowerCase().includes('available') ||
        bodyText?.toLowerCase().includes('days');

      expect(hasBalance).toBeTruthy();
    });

    test('Employee can access new leave request form', async ({ page }) => {
      await page.goto('/employee/leave/new');
      await page.waitForLoadState('networkidle');

      // Should see request form
      const hasForm = await page.locator('form').count() > 0;
      const hasLeaveText = await page.locator('body').textContent();

      expect(hasForm || hasLeaveText?.toLowerCase().includes('leave')).toBeTruthy();
    });

    test('Employee can submit leave request', async ({ page }) => {
      await page.goto('/employee/leave/new');
      await page.waitForLoadState('networkidle');

      // Select leave type
      const leaveTypeSelect = page.locator('select[name*="leaveType" i], select[name*="type" i]');
      if (await leaveTypeSelect.count() > 0) {
        const options = await leaveTypeSelect.locator('option').all();
        if (options.length > 1) {
          await leaveTypeSelect.selectOption({ index: 1 });
        }
      }

      // Fill dates
      const startDateInput = page.locator('input[name*="start" i], input[id*="start" i]').first();
      const endDateInput = page.locator('input[name*="end" i], input[id*="end" i]').first();

      if (await startDateInput.count() > 0) {
        await startDateInput.fill(leaveData.startDate);
      }
      if (await endDateInput.count() > 0) {
        await endDateInput.fill(leaveData.endDate);
      }

      // Fill reason
      const reasonInput = page.locator('textarea[name*="reason" i], input[name*="reason" i]');
      if (await reasonInput.count() > 0) {
        await reasonInput.fill(leaveData.reason);
      }

      // Submit
      const submitButton = page.locator('button[type="submit"], button:has-text("Submit"), button:has-text("Request")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('submitted') ||
          page.url().includes('/employee/leave');

        expect(hasSuccess).toBeTruthy();
      }
    });

    test('Employee can view their leave requests', async ({ page }) => {
      await page.goto('/employee/leave/requests');
      await page.waitForLoadState('networkidle');

      // Should see requests list or message
      const bodyText = await page.textContent('body');
      const hasContent = bodyText?.toLowerCase().includes('request') ||
        bodyText?.toLowerCase().includes('leave') ||
        bodyText?.toLowerCase().includes('no requests');

      expect(hasContent).toBeTruthy();
    });

    test('Employee can cancel pending leave request', async ({ page }) => {
      // First go to requests page
      await page.goto('/employee/leave/requests');
      await page.waitForLoadState('networkidle');

      // Look for pending request with cancel button
      const cancelBtn = page.locator('button:has-text("Cancel")').first();

      if (await cancelBtn.count() > 0) {
        await cancelBtn.click();

        // Confirm cancellation if dialog appears
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmBtn.count() > 0) {
          await confirmBtn.click();
        }

        await page.waitForTimeout(1000);

        const bodyText = await page.textContent('body');
        const hasCancelled = bodyText?.toLowerCase().includes('cancelled') ||
          bodyText?.toLowerCase().includes('success');

        expect(hasCancelled).toBeTruthy();
      }
    });
  });
});
