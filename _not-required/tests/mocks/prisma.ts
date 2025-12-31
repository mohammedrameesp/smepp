/**
 * Prisma Client Mock
 * Provides mock implementations for all Prisma models used in testing
 */

import { jest } from '@jest/globals';

// Create mock functions for each model
const createModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updateMany: jest.fn(),
  upsert: jest.fn(),
  delete: jest.fn(),
  deleteMany: jest.fn(),
  count: jest.fn(),
  aggregate: jest.fn(),
  groupBy: jest.fn(),
});

export const mockPrisma = {
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
  account: createModelMock(),
  session: createModelMock(),
  verificationToken: createModelMock(),
  // Task Management models
  board: createModelMock(),
  boardMember: createModelMock(),
  taskColumn: createModelMock(),
  task: createModelMock(),
  taskAssignee: createModelMock(),
  taskLabel: createModelMock(),
  taskChecklist: createModelMock(),
  checklistItem: createModelMock(),
  taskComment: createModelMock(),
  taskAttachment: createModelMock(),
  taskHistory: createModelMock(),
  // Purchase Request models
  purchaseRequest: createModelMock(),
  purchaseRequestItem: createModelMock(),
  // HR Profile models
  hRProfile: createModelMock(),
  profileChangeRequest: createModelMock(),
  // Leave Management models
  leaveType: createModelMock(),
  leaveBalance: createModelMock(),
  leaveRequest: createModelMock(),
  leaveRequestHistory: createModelMock(),
  $transaction: jest.fn((callback: any) => callback(mockPrisma)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
};

// Reset all mocks utility
export const resetPrismaMocks = () => {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          (fn as jest.Mock).mockReset();
        }
      });
    }
  });
};

// Helper to set up common mock responses
export const setupMockResponse = <T>(
  mockFn: jest.Mock,
  response: T
): void => {
  // @ts-expect-error - Jest mock types in Jest 30 are overly strict
  mockFn.mockResolvedValue(response);
};

// Helper to set up mock rejection
export const setupMockRejection = (
  mockFn: jest.Mock,
  error: Error
): void => {
  // @ts-expect-error - Jest mock types in Jest 30 are overly strict
  mockFn.mockRejectedValue(error);
};

// Type for the mock Prisma client
export type MockPrismaClient = typeof mockPrisma;
