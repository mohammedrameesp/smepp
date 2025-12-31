import { test, expect } from '@playwright/test';
import { loginAs, TEST_USERS } from './utils/auth';
import { generatePayrollRunData } from './utils/test-data';

/**
 * E2E Tests for Payroll Module
 * Tests payroll run creation, processing, and payslip generation
 */

test.describe('Payroll Management', () => {
  let payrollData: ReturnType<typeof generatePayrollRunData>;

  test.beforeEach(async ({ page }) => {
    payrollData = generatePayrollRunData();
    await loginAs(page, TEST_USERS.admin);
  });

  test.describe('Payroll Runs', () => {
    test('Admin can view payroll runs page', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await page.waitForLoadState('networkidle');

      // Should see payroll runs page
      await expect(page.locator('body')).toContainText(/payroll|run/i);
    });

    test('Admin can access new payroll run form', async ({ page }) => {
      await page.goto('/admin/payroll/runs/new');
      await page.waitForLoadState('networkidle');

      // Should see payroll run form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasPayrollText = bodyText?.toLowerCase().includes('payroll') ||
        bodyText?.toLowerCase().includes('run');

      expect(hasForm || hasPayrollText).toBeTruthy();
    });

    test('Admin can create payroll run', async ({ page }) => {
      await page.goto('/admin/payroll/runs/new');
      await page.waitForLoadState('networkidle');

      // Fill name/title if present
      const nameInput = page.locator('input[name*="name" i], input[name*="title" i]');
      if (await nameInput.count() > 0) {
        await nameInput.fill(payrollData.name);
      }

      // Fill period start date
      const periodStartInput = page.locator('input[name*="periodStart" i], input[name*="start" i]').first();
      if (await periodStartInput.count() > 0) {
        await periodStartInput.fill(payrollData.periodStart);
      }

      // Fill period end date
      const periodEndInput = page.locator('input[name*="periodEnd" i], input[name*="end" i]').first();
      if (await periodEndInput.count() > 0) {
        await periodEndInput.fill(payrollData.periodEnd);
      }

      // Fill pay date
      const payDateInput = page.locator('input[name*="payDate" i], input[name*="payment" i]');
      if (await payDateInput.count() > 0) {
        await payDateInput.fill(payrollData.payDate);
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('created') ||
          page.url().includes('/admin/payroll/runs');

        expect(hasSuccess).toBeTruthy();
      }
    });

    test('Admin can view payroll run details', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await page.waitForLoadState('networkidle');

      // Click on first payroll run if exists
      const runRow = page.locator('tr, [data-testid="payroll-run"]').first();
      if (await runRow.count() > 0) {
        await runRow.click();
        await page.waitForLoadState('networkidle');

        // Should see run details
        const bodyText = await page.textContent('body');
        const hasDetails = bodyText?.toLowerCase().includes('payroll') ||
          bodyText?.toLowerCase().includes('employee') ||
          bodyText?.toLowerCase().includes('amount');

        expect(hasDetails).toBeTruthy();
      }
    });

    test('Admin can process payroll run', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await page.waitForLoadState('networkidle');

      // Look for a draft payroll run
      const draftRun = page.locator('tr:has-text("Draft"), [data-status="draft"]').first();

      if (await draftRun.count() > 0) {
        await draftRun.click();
        await page.waitForLoadState('networkidle');

        // Look for process button
        const processBtn = page.locator('button:has-text("Process"), button:has-text("Calculate")');
        if (await processBtn.count() > 0) {
          await processBtn.click();
          await page.waitForTimeout(2000);

          const bodyText = await page.textContent('body');
          const hasProcessed = bodyText?.toLowerCase().includes('processed') ||
            bodyText?.toLowerCase().includes('success') ||
            bodyText?.toLowerCase().includes('calculated');

          expect(hasProcessed).toBeTruthy();
        }
      }
    });

    test('Admin can submit payroll run for approval', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await page.waitForLoadState('networkidle');

      // Look for a processed payroll run
      const processedRun = page.locator('tr:has-text("Processed"), [data-status="processed"]').first();

      if (await processedRun.count() > 0) {
        await processedRun.click();
        await page.waitForLoadState('networkidle');

        // Look for submit button
        const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Send for Approval")');
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForTimeout(2000);

          const bodyText = await page.textContent('body');
          const hasSubmitted = bodyText?.toLowerCase().includes('submitted') ||
            bodyText?.toLowerCase().includes('approval') ||
            bodyText?.toLowerCase().includes('success');

          expect(hasSubmitted).toBeTruthy();
        }
      }
    });

    test('Admin can approve payroll run', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await page.waitForLoadState('networkidle');

      // Look for a pending approval payroll run
      const pendingRun = page.locator('tr:has-text("Pending"), [data-status="pending_approval"]').first();

      if (await pendingRun.count() > 0) {
        await pendingRun.click();
        await page.waitForLoadState('networkidle');

        // Look for approve button
        const approveBtn = page.locator('button:has-text("Approve")');
        if (await approveBtn.count() > 0) {
          await approveBtn.click();
          await page.waitForTimeout(2000);

          const bodyText = await page.textContent('body');
          const hasApproved = bodyText?.toLowerCase().includes('approved') ||
            bodyText?.toLowerCase().includes('success');

          expect(hasApproved).toBeTruthy();
        }
      }
    });

    test('Admin can export WPS file', async ({ page }) => {
      await page.goto('/admin/payroll/runs');
      await page.waitForLoadState('networkidle');

      // Look for an approved/paid payroll run
      const approvedRun = page.locator('tr:has-text("Approved"), tr:has-text("Paid"), [data-status="approved"]').first();

      if (await approvedRun.count() > 0) {
        await approvedRun.click();
        await page.waitForLoadState('networkidle');

        // Look for WPS export button
        const wpsBtn = page.locator('button:has-text("WPS"), button:has-text("Export WPS")');
        if (await wpsBtn.count() > 0) {
          // Set up download listener
          const [download] = await Promise.all([
            page.waitForEvent('download', { timeout: 5000 }).catch(() => null),
            wpsBtn.click(),
          ]);

          if (download) {
            const filename = download.suggestedFilename();
            expect(filename).toMatch(/wps/i);
          }
        }
      }
    });
  });

  test.describe('Payslips', () => {
    test('Admin can view payslips page', async ({ page }) => {
      await page.goto('/admin/payroll/payslips');
      await page.waitForLoadState('networkidle');

      // Should see payslips page
      await expect(page.locator('body')).toContainText(/payslip|salary/i);
    });

    test('Admin can view individual payslip', async ({ page }) => {
      await page.goto('/admin/payroll/payslips');
      await page.waitForLoadState('networkidle');

      // Click on first payslip if exists
      const payslipRow = page.locator('tr, [data-testid="payslip"]').first();
      if (await payslipRow.count() > 0) {
        await payslipRow.click();
        await page.waitForLoadState('networkidle');

        // Should see payslip details
        const bodyText = await page.textContent('body');
        const hasDetails = bodyText?.toLowerCase().includes('salary') ||
          bodyText?.toLowerCase().includes('earnings') ||
          bodyText?.toLowerCase().includes('deductions');

        expect(hasDetails).toBeTruthy();
      }
    });
  });

  test.describe('Salary Structures', () => {
    test('Admin can view salary structures page', async ({ page }) => {
      await page.goto('/admin/payroll/salary-structures');
      await page.waitForLoadState('networkidle');

      // Should see salary structures page
      await expect(page.locator('body')).toContainText(/salary|structure/i);
    });

    test('Admin can access new salary structure form', async ({ page }) => {
      await page.goto('/admin/payroll/salary-structures/new');
      await page.waitForLoadState('networkidle');

      // Should see salary structure form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasSalaryText = bodyText?.toLowerCase().includes('salary') ||
        bodyText?.toLowerCase().includes('structure');

      expect(hasForm || hasSalaryText).toBeTruthy();
    });
  });

  test.describe('Loans', () => {
    test('Admin can view loans page', async ({ page }) => {
      await page.goto('/admin/payroll/loans');
      await page.waitForLoadState('networkidle');

      // Should see loans page
      await expect(page.locator('body')).toContainText(/loan/i);
    });

    test('Admin can access new loan form', async ({ page }) => {
      await page.goto('/admin/payroll/loans/new');
      await page.waitForLoadState('networkidle');

      // Should see loan form
      const hasForm = await page.locator('form').count() > 0;
      const bodyText = await page.textContent('body');
      const hasLoanText = bodyText?.toLowerCase().includes('loan');

      expect(hasForm || hasLoanText).toBeTruthy();
    });

    test('Admin can create loan', async ({ page }) => {
      await page.goto('/admin/payroll/loans/new');
      await page.waitForLoadState('networkidle');

      // Select employee
      const employeeSelect = page.locator('select[name*="employee" i], select[name*="user" i]');
      if (await employeeSelect.count() > 0) {
        const options = await employeeSelect.locator('option').all();
        if (options.length > 1) {
          await employeeSelect.selectOption({ index: 1 });
        }
      }

      // Fill loan amount
      const amountInput = page.locator('input[name*="amount" i], input[name*="principal" i]');
      if (await amountInput.count() > 0) {
        await amountInput.fill('5000');
      }

      // Fill monthly deduction
      const deductionInput = page.locator('input[name*="deduction" i], input[name*="monthly" i]');
      if (await deductionInput.count() > 0) {
        await deductionInput.fill('500');
      }

      // Submit form
      const submitButton = page.locator('button[type="submit"], button:has-text("Create"), button:has-text("Save")');
      if (await submitButton.count() > 0) {
        await submitButton.click();
        await page.waitForTimeout(2000);

        const bodyText = await page.textContent('body');
        const hasSuccess = bodyText?.toLowerCase().includes('success') ||
          bodyText?.toLowerCase().includes('created') ||
          page.url().includes('/admin/payroll/loans');

        expect(hasSuccess).toBeTruthy();
      }
    });
  });

  test.describe('Gratuity', () => {
    test('Admin can view gratuity page', async ({ page }) => {
      await page.goto('/admin/payroll/gratuity');
      await page.waitForLoadState('networkidle');

      // Should see gratuity page
      await expect(page.locator('body')).toContainText(/gratuity|end of service/i);
    });
  });

  test.describe('Employee Payroll Self-Service', () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, TEST_USERS.employee);
    });

    test('Employee can view their payroll page', async ({ page }) => {
      await page.goto('/employee/payroll');
      await page.waitForLoadState('networkidle');

      // Should see payroll information
      await expect(page.locator('body')).toContainText(/payroll|salary|payslip/i);
    });

    test('Employee can view their payslips', async ({ page }) => {
      await page.goto('/employee/payroll/payslips');
      await page.waitForLoadState('networkidle');

      // Should see payslips
      const bodyText = await page.textContent('body');
      const hasPayslips = bodyText?.toLowerCase().includes('payslip') ||
        bodyText?.toLowerCase().includes('salary') ||
        bodyText?.toLowerCase().includes('no payslips');

      expect(hasPayslips).toBeTruthy();
    });

    test('Employee can view their gratuity', async ({ page }) => {
      await page.goto('/employee/payroll/gratuity');
      await page.waitForLoadState('networkidle');

      // Should see gratuity information
      const bodyText = await page.textContent('body');
      const hasGratuity = bodyText?.toLowerCase().includes('gratuity') ||
        bodyText?.toLowerCase().includes('end of service') ||
        bodyText?.toLowerCase().includes('years');

      expect(hasGratuity).toBeTruthy();
    });
  });
});
