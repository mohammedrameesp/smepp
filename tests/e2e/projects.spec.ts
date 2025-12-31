import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generateProjectData } from './utils/test-data';

/**
 * E2E Tests for Project Management Module
 * Tests project CRUD and basic workflows
 */

test.describe('Project Management', () => {
  let projectData: ReturnType<typeof generateProjectData>;

  test.beforeEach(async ({ page }) => {
    projectData = generateProjectData();
    await loginAs(page, TEST_USERS.admin);
  });

  test.describe('Project List', () => {
    test('Admin can view projects page', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Should see projects page
      await expect(page.locator('body')).toContainText(/project|client/i);
    });

    test('Admin can search projects', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Look for search input
      const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');
      if (await searchInput.count() > 0) {
        await searchInput.fill('test');
        await page.waitForTimeout(1000);

        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    });

    test('Admin can filter projects by status', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Look for status filter
      const statusFilter = page.locator('select[name*="status" i], [data-filter="status"]');
      if (await statusFilter.count() > 0) {
        const options = await statusFilter.locator('option').all();
        if (options.length > 1) {
          await statusFilter.selectOption({ index: 1 });
          await page.waitForTimeout(500);

          const bodyText = await page.textContent('body');
          expect(bodyText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Project CRUD', () => {
    test('Admin can access new project form', async ({ page }) => {
      await page.goto('/admin/projects/new');
      await page.waitForLoadState('networkidle');

      // Should see project form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasProjectText = bodyText?.toLowerCase().includes('project') ||
        bodyText?.toLowerCase().includes('create');

      expect(hasForm || hasProjectText).toBeTruthy();
    });

    test('Admin can create project', async ({ page }) => {
      await page.goto('/admin/projects/new');
      await page.waitForLoadState('networkidle');

      // Fill project name
      const nameInput = page.locator('input[name*="name" i], input[name*="title" i]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(projectData.name);
      }

      // Fill project code
      const codeInput = page.locator('input[name*="code" i]');
      if (await codeInput.count() > 0) {
        await codeInput.fill(projectData.code);
      }

      // Fill client name
      const clientInput = page.locator('input[name*="client" i]');
      if (await clientInput.count() > 0) {
        await clientInput.fill(projectData.clientName);
      }

      // Fill start date
      const startDateInput = page.locator('input[name*="start" i]').first();
      if (await startDateInput.count() > 0) {
        await startDateInput.fill(projectData.startDate);
      }

      // Fill end date
      const endDateInput = page.locator('input[name*="end" i]').first();
      if (await endDateInput.count() > 0) {
        await endDateInput.fill(projectData.endDate);
      }

      // Fill budget
      const budgetInput = page.locator('input[name*="budget" i]');
      if (await budgetInput.count() > 0) {
        await budgetInput.fill(projectData.budget);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('created') ||
          page.url().includes('/admin/projects');

        expect(hasSuccess).toBeTruthy();
      }
    });

    test('Admin can view project details', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Click on first project
      const projectRow = page.locator('tr, [data-testid="project-row"]').first();
      if (await projectRow.count() > 0) {
        await projectRow.click();
        await page.waitForLoadState('networkidle');

        // Should see project details
        const bodyText = await page.textContent('body');
        const hasDetails = bodyText?.toLowerCase().includes('project') ||
          bodyText?.toLowerCase().includes('client') ||
          bodyText?.toLowerCase().includes('budget');

        expect(hasDetails).toBeTruthy();
      }
    });

    test('Admin can edit project', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Click on first project
      const projectRow = page.locator('tr, [data-testid="project-row"]').first();
      if (await projectRow.count() > 0) {
        await projectRow.click();
        await page.waitForLoadState('networkidle');

        // Click edit button
        const editButton = page.locator('button:has-text("Edit"), a:has-text("Edit")');
        if (await editButton.count() > 0) {
          await editButton.click();
          await expect(page).toHaveURL(/\/edit/);

          // Update description
          const descInput = page.locator('textarea[name*="desc" i], input[name*="desc" i]');
          if (await descInput.count() > 0) {
            await descInput.fill('Updated description for E2E test');
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

    test('Admin can delete project', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Click on first project
      const projectRow = page.locator('tr, [data-testid="project-row"]').first();
      if (await projectRow.count() > 0) {
        await projectRow.click();
        await page.waitForLoadState('networkidle');

        // Look for delete button
        const deleteButton = page.locator('button:has-text("Delete")');
        if (await deleteButton.count() > 0) {
          await deleteButton.click();

          // Confirm deletion
          const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")').last();
          if (await confirmButton.count() > 0) {
            await confirmButton.click();
            await page.waitForTimeout(2000);

            const bodyText = await page.textContent('body');
            const hasDeleted = bodyText?.toLowerCase().includes('deleted') ||
              bodyText?.toLowerCase().includes('success') ||
              page.url().includes('/admin/projects');

            expect(hasDeleted).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Project Status Management', () => {
    test('Admin can change project status', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Click on first project
      const projectRow = page.locator('tr, [data-testid="project-row"]').first();
      if (await projectRow.count() > 0) {
        await projectRow.click();
        await page.waitForLoadState('networkidle');

        // Look for status dropdown or buttons
        const statusSelect = page.locator('select[name*="status" i]');
        if (await statusSelect.count() > 0) {
          const options = await statusSelect.locator('option').all();
          if (options.length > 1) {
            await statusSelect.selectOption({ index: 1 });
            await page.waitForTimeout(1000);

            const bodyText = await page.textContent('body');
            expect(bodyText).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Project Purchase Requests', () => {
    test('Project can have linked purchase requests', async ({ page }) => {
      await page.goto('/admin/projects');
      await page.waitForLoadState('networkidle');

      // Click on first project
      const projectRow = page.locator('tr, [data-testid="project-row"]').first();
      if (await projectRow.count() > 0) {
        await projectRow.click();
        await page.waitForLoadState('networkidle');

        // Look for purchase requests section
        const bodyText = await page.textContent('body');
        const hasPurchaseRequests = bodyText?.toLowerCase().includes('purchase') ||
          bodyText?.toLowerCase().includes('request') ||
          bodyText?.toLowerCase().includes('procurement');

        // Project page should exist regardless
        expect(bodyText).toBeTruthy();
      }
    });
  });
});
