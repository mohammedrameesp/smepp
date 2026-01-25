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
 * Generate test data for Spend Requests
 */
export function generateSpendRequestData() {
  const timestamp = Date.now();
  const neededByDate = new Date();
  neededByDate.setDate(neededByDate.getDate() + 14); // Needed in 14 days

  return {
    title: `TEST Spend Request ${timestamp}`,
    description: 'Test spend request for E2E testing',
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

export function generateSpendRequestItemData() {
  const timestamp = Date.now();
  return {
    description: `Test Item ${timestamp}`,
    quantity: 1,
    unitPrice: 100,
    category: 'IT Equipment',
  };
}

/**
 * Generate test data for Leave Requests
 */
export function generateLeaveRequestData() {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7); // Start in 7 days
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 2); // 3 days total

  return {
    leaveType: 'Annual Leave',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    reason: 'E2E Test - Vacation time',
  };
}

/**
 * Generate test data for Employees
 */
export function generateEmployeeData() {
  const timestamp = Date.now();
  return {
    name: `Test Employee ${timestamp}`,
    email: `employee${timestamp}@test.local`,
    employeeId: `EMP-${timestamp}`,
    designation: 'Software Developer',
    department: 'IT',
    dateOfJoining: formatDate(new Date()),
  };
}

/**
 * Generate test data for Payroll Run
 */
export function generatePayrollRunData() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  return {
    name: `${year}-${String(month).padStart(2, '0')} Payroll Run`,
    periodStart: `${year}-${String(month).padStart(2, '0')}-01`,
    periodEnd: `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`,
    payDate: formatDate(new Date(year, month, 5)), // 5th of next month
  };
}

/**
 * Generate test data for Company Documents
 */
export function generateCompanyDocumentData() {
  const timestamp = Date.now();
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Expires in 1 year

  return {
    name: `Test Document ${timestamp}`,
    documentType: 'Trade License',
    documentNumber: `DOC-${timestamp}`,
    issueDate: formatDate(new Date()),
    expiryDate: formatDate(expiryDate),
  };
}

/**
 * Generate test data for Projects
 */
export function generateProjectData() {
  const timestamp = Date.now();
  const startDate = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 3); // 3 months project

  return {
    name: `Test Project ${timestamp}`,
    code: `PRJ-${timestamp}`,
    clientName: 'Test Client',
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    budget: '50000',
  };
}
