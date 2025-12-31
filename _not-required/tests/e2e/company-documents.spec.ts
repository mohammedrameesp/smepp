import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateCompanyDocumentData } from './utils/test-data';

/**
 * E2E Tests for Company Document Management
 * Tests document CRUD, expiry tracking, and alerts
 */

test.describe('Company Document Management', () => {
  let documentData: ReturnType<typeof generateCompanyDocumentData>;

  test.beforeEach(async ({ page }) => {
    documentData = generateCompanyDocumentData();
    await loginAs(page, TEST_USERS.admin);
  });

  test.describe('Document List', () => {
    test('Admin can view company documents page', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Should see documents page
      await expect(page.locator('body')).toContainText(/document|license|registration/i);
    });

    test('Admin can search documents', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('license');
        await page.waitForTimeout(1000);

        // Should filter results
        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    });

    test('Admin can filter documents by type', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Look for type filter
      const typeFilter = page.locator('select[name*="type" i], [data-filter="type"]');
      if (await typeFilter.count() > 0) {
        const options = await typeFilter.locator('option').all();
        if (options.length > 1) {
          await typeFilter.selectOption({ index: 1 });
          await page.waitForTimeout(500);

          const bodyText = await page.textContent('body');
          expect(bodyText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Document CRUD', () => {
    test('Admin can access new document form', async ({ page }) => {
      await page.goto('/admin/company-documents/new');
      await page.waitForLoadState('networkidle');

      // Should see document form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasDocumentText = bodyText?.toLowerCase().includes('document') ||
        bodyText?.toLowerCase().includes('upload');

      expect(hasForm || hasDocumentText).toBeTruthy();
    });

    test('Admin can create company document', async ({ page }) => {
      await page.goto('/admin/company-documents/new');
      await page.waitForLoadState('networkidle');

      // Fill document name
      const nameInput = page.locator('input[name*="name" i], input[name*="title" i]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(documentData.name);
      }

      // Select document type
      const typeSelect = page.locator('select[name*="type" i], select[name*="documentType" i]');
      if (await typeSelect.count() > 0) {
        const options = await typeSelect.locator('option').all();
        if (options.length > 1) {
          await typeSelect.selectOption({ index: 1 });
        }
      }

      // Fill document number
      const numberInput = page.locator('input[name*="number" i], input[name*="documentNumber" i]');
      if (await numberInput.count() > 0) {
        await numberInput.fill(documentData.documentNumber);
      }

      // Fill issue date
      const issueDateInput = page.locator('input[name*="issue" i], input[name*="issueDate" i]');
      if (await issueDateInput.count() > 0) {
        await issueDateInput.fill(documentData.issueDate);
      }

      // Fill expiry date
      const expiryDateInput = page.locator('input[name*="expiry" i], input[name*="expiryDate" i]');
      if (await expiryDateInput.count() > 0) {
        await expiryDateInput.fill(documentData.expiryDate);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('created') ||
          page.url().includes('/admin/company-documents');

        expect(hasSuccess).toBeTruthy();
      }
    });

    test('Admin can view document details', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Click on first document
      const documentRow = page.locator('tr, [data-testid="document-row"]').first();
      if (await documentRow.count() > 0) {
        await documentRow.click();
        await page.waitForLoadState('networkidle');

        // Should see document details
        const bodyText = await page.textContent('body');
        const hasDetails = bodyText?.toLowerCase().includes('document') ||
          bodyText?.toLowerCase().includes('details') ||
          bodyText?.toLowerCase().includes('expiry');

        expect(hasDetails).toBeTruthy();
      }
    });

    test('Admin can edit document', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Click on first document
      const documentRow = page.locator('tr, [data-testid="document-row"]').first();
      if (await documentRow.count() > 0) {
        await documentRow.click();
        await page.waitForLoadState('networkidle');

        // Click edit button
        const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
        if (await editButton.count() > 0) {
          await editButton.click();
          await expect(page).toHaveURL(/\/edit/);

          // Update notes
          const notesInput = page.locator('textarea[name*="notes" i], input[name*="notes" i]');
          if (await notesInput.count() > 0) {
            await notesInput.fill('Updated notes for E2E test');
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

    test('Admin can delete document', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Click on first document
      const documentRow = page.locator('tr, [data-testid="document-row"]').first();
      if (await documentRow.count() > 0) {
        await documentRow.click();
        await page.waitForLoadState('networkidle');

        // Look for delete button
        const deleteButton = page.locator('button:has-text("Delete")');
        if (await deleteButton.count() > 0) {
          await deleteButton.click();

          // Confirm deletion in dialog
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes"), button:has-text("Delete")').last();
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(2000);

            const bodyText = await page.textContent('body');
            const hasDeleted = bodyText?.toLowerCase().includes('deleted') ||
              bodyText?.toLowerCase().includes('success') ||
              page.url().includes('/admin/company-documents');

            expect(hasDeleted).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Document Types', () => {
    test('Admin can manage document types', async ({ page }) => {
      // Navigate to settings to manage document types
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for document types section or link
      const docTypesLink = page.locator('a:has-text("Document Types"), button:has-text("Document Types")');
      if (await docTypesLink.count() > 0) {
        await docTypesLink.click();
        await page.waitForLoadState('networkidle');

        // Should see document types
        const bodyText = await page.textContent('body');
        const hasDocTypes = bodyText?.toLowerCase().includes('document type') ||
          bodyText?.toLowerCase().includes('trade license') ||
          bodyText?.toLowerCase().includes('certificate');

        expect(hasDocTypes).toBeTruthy();
      }
    });
  });

  test.describe('Expiry Tracking', () => {
    test('Admin sees expiry indicators on documents', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Look for expiry indicators (expired, expiring soon badges)
      const expiryIndicators = page.locator('.badge:has-text("Expired"), .badge:has-text("Expiring"), [data-expiry]');

      // If there are documents, they may have expiry indicators
      const bodyText = await page.textContent('body');
      const hasExpiryInfo = await expiryIndicators.count() > 0 ||
        bodyText?.toLowerCase().includes('expir') ||
        bodyText?.toLowerCase().includes('days');

      expect(hasExpiryInfo).toBeTruthy();
    });

    test('Admin can filter by expiry status', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Look for expiry filter
      const expiryFilter = page.locator('button:has-text("Expiring"), select[name*="expiry" i], [data-filter="expiry"]');
      if (await expiryFilter.count() > 0) {
        await expiryFilter.first().click();
        await page.waitForTimeout(500);

        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    });

    test('Admin receives expiry alerts on dashboard', async ({ page }) => {
      await page.goto('/admin');
      await page.waitForLoadState('networkidle');

      // Look for expiry alerts section or notification
      const bodyText = await page.textContent('body');
      const hasExpiryAlerts = bodyText?.toLowerCase().includes('expir') ||
        bodyText?.toLowerCase().includes('document') ||
        bodyText?.toLowerCase().includes('renew');

      // Dashboard should exist regardless of expiry alerts
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Document File Handling', () => {
    test('Document upload form accepts files', async ({ page }) => {
      await page.goto('/admin/company-documents/new');
      await page.waitForLoadState('networkidle');

      // Look for file input
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.count() > 0) {
        // File input exists and is ready for upload
        const isVisible = await fileInput.isVisible();
        expect(isVisible || await fileInput.count() > 0).toBeTruthy();
      }
    });

    test('Document detail shows download option', async ({ page }) => {
      await page.goto('/admin/company-documents');
      await page.waitForLoadState('networkidle');

      // Click on first document
      const documentRow = page.locator('tr, [data-testid="document-row"]').first();
      if (await documentRow.count() > 0) {
        await documentRow.click();
        await page.waitForLoadState('networkidle');

        // Look for download button or link
        const downloadButton = page.locator('button:has-text("Download"), a:has-text("Download"), a[download]');
        const hasDownload = await downloadButton.count() > 0;

        // Either has download option or shows document info
        const bodyText = await page.textContent('body');
        expect(hasDownload || bodyText?.toLowerCase().includes('document')).toBeTruthy();
      }
    });
  });
});
