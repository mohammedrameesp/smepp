// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock environment variables for testing
// Note: NODE_ENV is typically set by Jest automatically to 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/damp_test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock NextAuth
jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma Client for unit tests
const createModelMock = () => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  findFirst: jest.fn(),
  create: jest.fn(),
  createMany: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    // Core models
    user: createModelMock(),
    asset: createModelMock(),
    assetHistory: createModelMock(),
    subscription: createModelMock(),
    subscriptionHistory: createModelMock(),
    supplier: createModelMock(),
    supplierEngagement: createModelMock(),
    accreditation: createModelMock(),
    accreditationProject: createModelMock(),
    accreditationHistory: createModelMock(),
    accreditationScan: createModelMock(),
    activityLog: createModelMock(),
    maintenanceRecord: createModelMock(),
    systemSettings: createModelMock(),
    appSetting: createModelMock(),
    // Task Management models
    board: createModelMock(),
    boardMember: createModelMock(),
    taskColumn: createModelMock(),
    task: createModelMock(),
    taskAssignee: createModelMock(),
    taskLabel: createModelMock(),
    taskLabelAssignment: createModelMock(),
    taskChecklistItem: createModelMock(),
    checklistItem: createModelMock(),
    taskComment: createModelMock(),
    taskAttachment: createModelMock(),
    taskHistory: createModelMock(),
    // Purchase Request models
    purchaseRequest: createModelMock(),
    purchaseRequestItem: createModelMock(),
    // HR models
    hRProfile: createModelMock(),
    profileChangeRequest: createModelMock(),
    // Leave Management models
    leaveType: createModelMock(),
    leaveBalance: createModelMock(),
    leaveRequest: createModelMock(),
    leaveRequestHistory: createModelMock(),
    // Auth models
    account: createModelMock(),
    session: createModelMock(),
    verificationToken: createModelMock(),
    // Transaction support
    $transaction: jest.fn((callback) => callback({
      user: createModelMock(),
      asset: createModelMock(),
      // Add other models as needed for transactions
    })),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error and console.warn in tests unless explicitly needed
  error: jest.fn(),
  warn: jest.fn(),
};
