/**
 * E2E Tests for Admin Module Pages
 * Tests that all main admin module pages load correctly
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Module Pages', () => {
  // Note: DEV_AUTH_ENABLED=true bypasses auth in dev mode

  test.describe('Assets Module', () => {
    test('should load assets page', async ({ page }) => {
      await page.goto('/admin/assets');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load asset requests page', async ({ page }) => {
      await page.goto('/admin/asset-requests');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Subscriptions Module', () => {
    test('should load subscriptions page', async ({ page }) => {
      await page.goto('/admin/subscriptions');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load new subscription page', async ({ page }) => {
      await page.goto('/admin/subscriptions/new');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Suppliers Module', () => {
    test('should load suppliers page', async ({ page }) => {
      await page.goto('/admin/suppliers');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Employees Module', () => {
    test('should load employees page', async ({ page }) => {
      await page.goto('/admin/employees');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load new employee page', async ({ page }) => {
      await page.goto('/admin/employees/new');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load change requests page', async ({ page }) => {
      await page.goto('/admin/employees/change-requests');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load document expiry page', async ({ page }) => {
      await page.goto('/admin/employees/document-expiry');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Leave Module', () => {
    test('should load leave page', async ({ page }) => {
      await page.goto('/admin/leave');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load leave requests page', async ({ page }) => {
      await page.goto('/admin/leave/requests');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load leave balances page', async ({ page }) => {
      await page.goto('/admin/leave/balances');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load leave calendar page', async ({ page }) => {
      await page.goto('/admin/leave/calendar');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load leave types page', async ({ page }) => {
      await page.goto('/admin/leave/types');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('Payroll Module', () => {
    test('should load payroll page', async ({ page }) => {
      await page.goto('/admin/payroll');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load payroll runs page', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load payslips page', async ({ page }) => {
      await page.goto('/admin/payroll/payslips');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load loans page', async ({ page }) => {
      await page.goto('/admin/payroll/loans');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load gratuity page', async ({ page }) => {
      await page.goto('/admin/payroll/gratuity');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load salary structures page', async ({ page }) => {
      await page.goto('/admin/payroll/salary-structures');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });

  test.describe('System Pages', () => {
    test('should load activity page', async ({ page }) => {
      await page.goto('/admin/activity');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load alerts page', async ({ page }) => {
      await page.goto('/admin/alerts');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load notifications page', async ({ page }) => {
      await page.goto('/admin/notifications');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load reports page', async ({ page }) => {
      await page.goto('/admin/reports');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load my-approvals page', async ({ page }) => {
      await page.goto('/admin/my-approvals');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load company documents page', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await expect(page.locator('body')).not.toBeEmpty();
    });

    test('should load purchase requests page', async ({ page }) => {
      await page.goto('/admin/purchase-requests');
      await expect(page.locator('body')).not.toBeEmpty();
    });
  });
});
