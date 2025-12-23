/**
 * Test data generators for E2E tests
 */

export function generateAssetData() {
  const timestamp = Date.now();
  return {
    model: `TEST Laptop ${timestamp}`,
    type: 'Laptop',
    assetTag: `TEST-${timestamp}`,
    brand: 'Dell',
    serialNumber: `SN${timestamp}`,
    status: 'ACTIVE',
  };
}

export function generateSubscriptionData() {
  const timestamp = Date.now();
  const renewalDate = new Date();
  renewalDate.setDate(renewalDate.getDate() + 30); // 30 days from now

  return {
    serviceName: `TEST Subscription ${timestamp}`,
    billingCycle: 'MONTHLY',
    costPerCycle: '100',
    currency: 'QAR',
    renewalDate: renewalDate.toISOString().split('T')[0], // YYYY-MM-DD format
  };
}

export function generateUserData() {
  const timestamp = Date.now();
  return {
    name: `Test User ${timestamp}`,
    email: `test${timestamp}@example.com`,
    role: 'EMPLOYEE',
  };
}

/**
 * Wait for a specific amount of time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format date to YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Get date N days from now
 */
export function getDateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

/**
 * Generate test data for Board/Task Management
 */
export function generateBoardData() {
  const timestamp = Date.now();
  return {
    title: `TEST Board ${timestamp}`,
    description: 'A test board for E2E testing',
  };
}

export function generateTaskData() {
  const timestamp = Date.now();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days

  return {
    title: `TEST Task ${timestamp}`,
    description: 'A test task for E2E testing',
    priority: 'MEDIUM',
    dueDate: formatDate(dueDate),
  };
}

export function generateColumnData() {
  const timestamp = Date.now();
  return {
    title: `Column ${timestamp}`,
  };
}

/**
 * Generate test data for Purchase Requests
 */
export function generatePurchaseRequestData() {
  const timestamp = Date.now();
  const neededByDate = new Date();
  neededByDate.setDate(neededByDate.getDate() + 14); // Needed in 14 days

  return {
    title: `TEST Purchase Request ${timestamp}`,
    description: 'Test purchase request for E2E testing',
    justification: 'Required for testing purposes',
    priority: 'MEDIUM',
    neededByDate: formatDate(neededByDate),
    purchaseType: 'OTHER',
    costType: 'OPERATING_COST',
    paymentMode: 'BANK_TRANSFER',
    items: [
      {
        description: `Test Item ${timestamp}`,
        quantity: 2,
        unitPrice: 500,
      },
    ],
  };
}

export function generatePurchaseRequestItemData() {
  const timestamp = Date.now();
  return {
    description: `Test Item ${timestamp}`,
    quantity: 1,
    unitPrice: 100,
    category: 'IT Equipment',
  };
}
