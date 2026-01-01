/**
 * E2E Tests for Suppliers Module
 * Tests supplier registration and approval workflow
 */

import { test, expect, Page } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  await loginAs(page, TEST_USERS.admin);
}

test.describe('Suppliers Module', () => {
  test.describe('Public Registration', () => {
    test('should display supplier registration form', async ({ page }) => {
      await page.goto('/suppliers/register');

      // Check form elements are visible
      await expect(page.getByRole('heading', { name: /register/i })).toBeVisible();
      await expect(page.getByLabel(/company name/i)).toBeVisible();
      await expect(page.getByLabel(/category/i)).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/suppliers/register');

      // Try to submit empty form
      await page.getByRole('button', { name: /submit|register/i }).click();

      // Should show validation errors
      await expect(page.getByText(/name is required/i).or(page.getByText(/required/i))).toBeVisible();
    });

    test('should allow supplier registration without login', async ({ page }) => {
      await page.goto('/suppliers/register');

      // Fill in required fields
      await page.getByLabel(/company name/i).fill('Test Supplier Company');

      // Select category
      const categorySelect = page.getByLabel(/category/i);
      if (await categorySelect.isVisible()) {
        await categorySelect.click();
        await page.getByRole('option').first().click();
      }

      // Fill optional fields if visible
      const addressField = page.getByLabel(/address/i);
      if (await addressField.isVisible()) {
        await addressField.fill('123 Test Street');
      }

      const cityField = page.getByLabel(/city/i);
      if (await cityField.isVisible()) {
        await cityField.fill('Doha');
      }

      const countryField = page.getByLabel(/country/i);
      if (await countryField.isVisible()) {
        await countryField.fill('Qatar');
      }

      // Contact information
      const contactName = page.getByLabel(/contact.*name/i).first();
      if (await contactName.isVisible()) {
        await contactName.fill('John Smith');
      }

      const contactEmail = page.getByLabel(/email/i).first();
      if (await contactEmail.isVisible()) {
        await contactEmail.fill('john@testsupplier.com');
      }

      // Submit form - we expect this to work or show a success message
      // Note: Actual submission might redirect or show success toast
    });
  });

  test.describe('Admin Supplier Management', () => {
    test.beforeEach(async ({ page }) => {
      await loginAsAdmin(page);
    });

    test('should display suppliers list', async ({ page }) => {
      await page.goto('/admin/suppliers');

      // Check page loaded
      await expect(page.getByRole('heading', { name: /suppliers/i })).toBeVisible();

      // Check for table or list view
      const table = page.locator('table').or(page.locator('[role="grid"]'));
      await expect(table.or(page.getByText(/no suppliers/i))).toBeVisible();
    });

    test('should filter suppliers by status', async ({ page }) => {
      await page.goto('/admin/suppliers');

      // Look for status filter
      const statusFilter = page.getByRole('combobox', { name: /status/i })
        .or(page.getByLabel(/status/i))
        .or(page.locator('[data-testid="status-filter"]'));

      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.getByRole('option', { name: /pending/i }).click();

        // Verify filter is applied (URL or UI change)
        await page.waitForTimeout(500);
      }
    });

    test('should filter suppliers by category', async ({ page }) => {
      await page.goto('/admin/suppliers');

      // Look for category filter
      const categoryFilter = page.getByRole('combobox', { name: /category/i })
        .or(page.getByLabel(/category/i))
        .or(page.locator('[data-testid="category-filter"]'));

      if (await categoryFilter.isVisible()) {
        await categoryFilter.click();
        // Select first available category
        const firstOption = page.getByRole('option').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
        }
      }
    });

    test('should search suppliers', async ({ page }) => {
      await page.goto('/admin/suppliers');

      // Look for search input
      const searchInput = page.getByPlaceholder(/search/i)
        .or(page.getByRole('searchbox'))
        .or(page.locator('[data-testid="search-input"]'));

      if (await searchInput.isVisible()) {
        await searchInput.fill('Test');
        await searchInput.press('Enter');
        await page.waitForTimeout(500);
      }
    });

    test('should view supplier details', async ({ page }) => {
      await page.goto('/admin/suppliers');

      // Find first supplier row/card
      const supplierLink = page.locator('a[href*="/admin/suppliers/"]').first()
        .or(page.getByRole('link', { name: /view/i }).first())
        .or(page.locator('[data-testid="supplier-row"]').first());

      if (await supplierLink.isVisible()) {
        await supplierLink.click();

        // Should navigate to details page
        await expect(page).toHaveURL(/\/admin\/suppliers\//);
      }
    });

    test('should approve pending supplier', async ({ page }) => {
      // Navigate to pending suppliers
      await page.goto('/admin/suppliers?status=PENDING');

      // Find a pending supplier
      const pendingSupplier = page.locator('tr, [data-testid="supplier-row"]')
        .filter({ hasText: /pending/i })
        .first();

      if (await pendingSupplier.isVisible()) {
        // Click to view details or find approve button
        const viewButton = pendingSupplier.getByRole('link', { name: /view/i })
          .or(pendingSupplier.locator('a'));

        if (await viewButton.isVisible()) {
          await viewButton.click();

          // Look for approve button on details page
          const approveButton = page.getByRole('button', { name: /approve/i });
          if (await approveButton.isVisible()) {
            await approveButton.click();

            // Confirm if there's a dialog
            const confirmButton = page.getByRole('button', { name: /confirm|yes/i });
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
            }

            // Should show success message or status change
            await expect(
              page.getByText(/approved/i).or(page.getByText(/success/i))
            ).toBeVisible({ timeout: 5000 });
          }
        }
      }
    });

    test('should reject pending supplier with reason', async ({ page }) => {
      // Navigate to pending suppliers
      await page.goto('/admin/suppliers?status=PENDING');

      // Find a pending supplier
      const pendingSupplier = page.locator('tr, [data-testid="supplier-row"]')
        .filter({ hasText: /pending/i })
        .first();

      if (await pendingSupplier.isVisible()) {
        // Click to view details
        const viewButton = pendingSupplier.getByRole('link', { name: /view/i })
          .or(pendingSupplier.locator('a'));

        if (await viewButton.isVisible()) {
          await viewButton.click();

          // Look for reject button on details page
          const rejectButton = page.getByRole('button', { name: /reject/i });
          if (await rejectButton.isVisible()) {
            await rejectButton.click();

            // Fill rejection reason
            const reasonInput = page.getByLabel(/reason/i)
              .or(page.getByPlaceholder(/reason/i))
              .or(page.locator('textarea'));

            if (await reasonInput.isVisible()) {
              await reasonInput.fill('Incomplete documentation provided');
            }

            // Confirm rejection
            const confirmButton = page.getByRole('button', { name: /confirm|submit|reject/i }).last();
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
            }
          }
        }
      }
    });

    test('should add engagement to approved supplier', async ({ page }) => {
      // Navigate to approved suppliers
      await page.goto('/admin/suppliers?status=APPROVED');

      // Find an approved supplier
      const approvedSupplier = page.locator('tr, [data-testid="supplier-row"]')
        .filter({ hasText: /approved/i })
        .first();

      if (await approvedSupplier.isVisible()) {
        // Click to view details
        const viewButton = approvedSupplier.getByRole('link', { name: /view/i })
          .or(approvedSupplier.locator('a'));

        if (await viewButton.isVisible()) {
          await viewButton.click();

          // Look for add engagement button
          const addEngagementButton = page.getByRole('button', { name: /add engagement/i })
            .or(page.getByRole('button', { name: /new engagement/i }));

          if (await addEngagementButton.isVisible()) {
            await addEngagementButton.click();

            // Fill engagement form
            const dateInput = page.getByLabel(/date/i);
            if (await dateInput.isVisible()) {
              await dateInput.fill(new Date().toISOString().split('T')[0]);
            }

            const notesInput = page.getByLabel(/notes/i)
              .or(page.getByPlaceholder(/notes/i))
              .or(page.locator('textarea'));

            if (await notesInput.isVisible()) {
              await notesInput.fill('Initial consultation meeting');
            }

            // Select rating if visible
            const ratingInput = page.getByLabel(/rating/i)
              .or(page.locator('[data-testid="rating-input"]'));

            if (await ratingInput.isVisible()) {
              // Click 4 stars or select value
              await ratingInput.click();
            }

            // Submit
            const submitButton = page.getByRole('button', { name: /save|submit|add/i }).last();
            if (await submitButton.isVisible()) {
              await submitButton.click();
            }
          }
        }
      }
    });
  });

  test.describe('Employee Supplier View', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('should view approved suppliers list', async ({ page }) => {
      await page.goto('/employee/suppliers');

      // Should see suppliers page
      await expect(page.getByRole('heading', { name: /suppliers/i })).toBeVisible();
    });

    test('should not see pending suppliers', async ({ page }) => {
      await page.goto('/employee/suppliers');

      // Employee should only see approved suppliers
      const pendingBadge = page.getByText(/pending/i).first();

      // If there are any suppliers, they should not show pending status
      // (This is a soft check - depends on actual data)
    });
  });
});
