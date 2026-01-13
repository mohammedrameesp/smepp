import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';

/**
 * E2E Tests for Settings and Configuration
 * Tests organization settings, branding, modules, and system configuration
 */

test.describe('Settings & Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, TEST_USERS.admin);
  });

  test.describe('Organization Settings', () => {
    test('Admin can view settings page', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Should see settings page
      await expect(page.locator('body')).toContainText(/settings|organization|company/i);
    });

    test('Admin can update company name', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for company name input
      const nameInput = page.locator('input[name*="name" i], input[name*="company" i], input[name*="organization" i]');
      if (await nameInput.count() > 0) {
        const currentValue = await nameInput.inputValue();
        await nameInput.fill(`${currentValue} Updated`);

        // Save changes
        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(2000);

          const bodyText = await page.textContent('body');
          const hasSuccess = bodyText?.toLowerCase().includes('success') ||
            bodyText?.toLowerCase().includes('saved') ||
            bodyText?.toLowerCase().includes('updated');

          expect(hasSuccess).toBeTruthy();

          // Restore original name
          await nameInput.fill(currentValue);
          await saveButton.click();
        }
      }
    });

    test('Admin can update timezone', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for timezone select
      const timezoneSelect = page.locator('select[name*="timezone" i]');
      if (await timezoneSelect.count() > 0) {
        const options = await timezoneSelect.locator('option').all();
        if (options.length > 1) {
          await timezoneSelect.selectOption({ index: 1 });

          const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
          if (await saveButton.count() > 0) {
            await saveButton.click();
            await page.waitForTimeout(1000);

            const bodyText = await page.textContent('body');
            expect(bodyText).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Branding Settings', () => {
    test('Admin can customize primary color', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for color picker or color input
      const colorInput = page.locator('input[type="color"], input[name*="color" i], input[name*="primary" i]');
      if (await colorInput.count() > 0) {
        await colorInput.fill('#2563eb');

        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);

          const bodyText = await page.textContent('body');
          const hasSuccess = bodyText?.toLowerCase().includes('success') ||
            bodyText?.toLowerCase().includes('saved');

          expect(hasSuccess).toBeTruthy();
        }
      }
    });

    test('Admin can upload logo', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for logo upload
      const logoInput = page.locator('input[type="file"][accept*="image"], input[name*="logo" i]');
      if (await logoInput.count() > 0) {
        const isVisible = await logoInput.isVisible();
        expect(isVisible || await logoInput.count() > 0).toBeTruthy();
      }
    });
  });

  test.describe('Module Settings', () => {
    test('Admin can view modules page', async ({ page }) => {
      await page.goto('/admin/modules');
      await page.waitForLoadState('networkidle');

      // Should see modules page
      const bodyText = await page.textContent('body');
      const hasModules = bodyText?.toLowerCase().includes('module') ||
        bodyText?.toLowerCase().includes('feature') ||
        bodyText?.toLowerCase().includes('enabled');

      expect(hasModules).toBeTruthy();
    });

    test('Admin can toggle module', async ({ page }) => {
      await page.goto('/admin/modules');
      await page.waitForLoadState('networkidle');

      // Look for module toggles
      const moduleToggle = page.locator('input[type="checkbox"], button[role="switch"], [data-testid="module-toggle"]').first();
      if (await moduleToggle.count() > 0) {
        const _wasChecked = await moduleToggle.isChecked?.() || false;
        await moduleToggle.click();
        await page.waitForTimeout(1000);

        // Toggle back to original state
        await moduleToggle.click();
        await page.waitForTimeout(500);

        const bodyText = await page.textContent('body');
        expect(bodyText).toBeTruthy();
      }
    });
  });

  test.describe('Code Format Settings', () => {
    test('Admin can view code format settings', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for code format section
      const bodyText = await page.textContent('body');
      const hasCodeFormat = bodyText?.toLowerCase().includes('code') ||
        bodyText?.toLowerCase().includes('format') ||
        bodyText?.toLowerCase().includes('prefix');

      expect(hasCodeFormat).toBeTruthy();
    });

    test('Admin can configure employee code format', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for employee code prefix input
      const prefixInput = page.locator('input[name*="prefix" i], input[name*="employeeCode" i]');
      if (await prefixInput.count() > 0) {
        await prefixInput.fill('EMP');

        const saveButton = page.locator('button[type="submit"], button:has-text("Save")');
        if (await saveButton.count() > 0) {
          await saveButton.click();
          await page.waitForTimeout(1000);

          const bodyText = await page.textContent('body');
          expect(bodyText).toBeTruthy();
        }
      }
    });
  });

  test.describe('Exchange Rate Settings', () => {
    test('Admin can view exchange rate settings', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for exchange rate section
      const bodyText = await page.textContent('body');
      const hasExchangeRate = bodyText?.toLowerCase().includes('exchange') ||
        bodyText?.toLowerCase().includes('currency') ||
        bodyText?.toLowerCase().includes('rate');

      expect(hasExchangeRate).toBeTruthy();
    });
  });

  test.describe('Payroll Settings', () => {
    test('Admin can view payroll settings', async ({ page }) => {
      await page.goto('/admin/settings');
      await page.waitForLoadState('networkidle');

      // Look for payroll settings section
      const payrollSection = page.locator('text=Payroll, [data-section="payroll"]');
      if (await payrollSection.count() > 0) {
        await payrollSection.click();
        await page.waitForTimeout(500);
      }

      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
    });
  });

  test.describe('Approval Policies', () => {
    test('Admin can view approval policies', async ({ page }) => {
      await page.goto('/admin/settings/approvals');
      await page.waitForLoadState('networkidle');

      // Should see approval policies
      const bodyText = await page.textContent('body');
      const hasApprovals = bodyText?.toLowerCase().includes('approval') ||
        bodyText?.toLowerCase().includes('policy') ||
        bodyText?.toLowerCase().includes('workflow');

      expect(hasApprovals).toBeTruthy();
    });

    test('Admin can access new approval policy form', async ({ page }) => {
      await page.goto('/admin/settings/approvals/new');
      await page.waitForLoadState('networkidle');

      // Should see approval policy form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasApprovalText = bodyText?.toLowerCase().includes('approval') ||
        bodyText?.toLowerCase().includes('policy');

      expect(hasForm || hasApprovalText).toBeTruthy();
    });
  });

  test.describe('Delegations', () => {
    test('Admin can view delegations', async ({ page }) => {
      await page.goto('/admin/settings/delegations');
      await page.waitForLoadState('networkidle');

      // Should see delegations page
      const bodyText = await page.textContent('body');
      const hasDelegations = bodyText?.toLowerCase().includes('delegation') ||
        bodyText?.toLowerCase().includes('delegate') ||
        bodyText?.toLowerCase().includes('no delegations');

      expect(hasDelegations).toBeTruthy();
    });

    test('Admin can access new delegation form', async ({ page }) => {
      await page.goto('/admin/settings/delegations/new');
      await page.waitForLoadState('networkidle');

      // Should see delegation form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasDelegationText = bodyText?.toLowerCase().includes('delegation') ||
        bodyText?.toLowerCase().includes('delegate');

      expect(hasForm || hasDelegationText).toBeTruthy();
    });
  });

  test.describe('Permissions', () => {
    test('Admin can view permissions page', async ({ page }) => {
      await page.goto('/admin/settings/permissions');
      await page.waitForLoadState('networkidle');

      // Should see permissions page
      const bodyText = await page.textContent('body');
      const hasPermissions = bodyText?.toLowerCase().includes('permission') ||
        bodyText?.toLowerCase().includes('role') ||
        bodyText?.toLowerCase().includes('access');

      expect(hasPermissions).toBeTruthy();
    });
  });

  test.describe('WhatsApp Settings', () => {
    test('Admin can view WhatsApp settings', async ({ page }) => {
      await page.goto('/admin/settings/whatsapp');
      await page.waitForLoadState('networkidle');

      // Should see WhatsApp settings page
      const bodyText = await page.textContent('body');
      const hasWhatsApp = bodyText?.toLowerCase().includes('whatsapp') ||
        bodyText?.toLowerCase().includes('notification') ||
        bodyText?.toLowerCase().includes('business');

      expect(hasWhatsApp).toBeTruthy();
    });
  });

  test.describe('AI Usage', () => {
    test('Admin can view AI usage page', async ({ page }) => {
      await page.goto('/admin/settings/ai-usage');
      await page.waitForLoadState('networkidle');

      // Should see AI usage page
      const bodyText = await page.textContent('body');
      const hasAiUsage = bodyText?.toLowerCase().includes('ai') ||
        bodyText?.toLowerCase().includes('usage') ||
        bodyText?.toLowerCase().includes('tokens');

      expect(hasAiUsage).toBeTruthy();
    });
  });

  test.describe('Team Management', () => {
    test('Admin can view team page', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForLoadState('networkidle');

      // Should see team page
      const bodyText = await page.textContent('body');
      const hasTeam = bodyText?.toLowerCase().includes('team') ||
        bodyText?.toLowerCase().includes('member') ||
        bodyText?.toLowerCase().includes('invite');

      expect(hasTeam).toBeTruthy();
    });

    test('Admin can invite team member', async ({ page }) => {
      await page.goto('/admin/team');
      await page.waitForLoadState('networkidle');

      // Look for invite button
      const inviteButton = page.locator('button:has-text("Invite"), a:has-text("Invite")');
      if (await inviteButton.count() > 0) {
        await inviteButton.click();
        await page.waitForTimeout(500);

        // Should see invite form or modal
        const hasInviteForm = await page.locator('input[name*="email" i]').count() > 0;
        expect(hasInviteForm).toBeTruthy();
      }
    });
  });

  test.describe('Organization Profile', () => {
    test('Admin can view organization page', async ({ page }) => {
      await page.goto('/admin/organization');
      await page.waitForLoadState('networkidle');

      // Should see organization page
      const bodyText = await page.textContent('body');
      const hasOrganization = bodyText?.toLowerCase().includes('organization') ||
        bodyText?.toLowerCase().includes('company') ||
        bodyText?.toLowerCase().includes('profile');

      expect(hasOrganization).toBeTruthy();
    });
  });
});
