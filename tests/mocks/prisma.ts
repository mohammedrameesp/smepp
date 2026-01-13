/**
 * Prisma Client Mock
 * Provides mock implementations for all Prisma models used in testing
 * Updated: Comprehensive coverage for all 70+ models in schema
 */

import { jest } from '@jest/globals';

// Create mock functions for each model
const createModelMock = () => ({
  findUnique: jest.fn(),
  findFirst: jest.fn(),
  findMany: jest.fn(),
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
  findUniqueOrThrow: jest.fn(),
  findFirstOrThrow: jest.fn(),
});

export const mockPrisma = {
  // Core User & Auth models
  user: createModelMock(),
  account: createModelMock(),
  session: createModelMock(),
  verificationToken: createModelMock(),

  // Organization models
  organization: createModelMock(),
  organizationInvitation: createModelMock(),
  organizationSetupProgress: createModelMock(),
  rolePermission: createModelMock(),

  // Team Member model (replaces OrganizationUser + HRProfile)
  teamMember: createModelMock(),

  // Asset Management models
  asset: createModelMock(),
  assetHistory: createModelMock(),
  assetCategory: createModelMock(),
  assetTypeMapping: createModelMock(),
  location: createModelMock(),
  maintenanceRecord: createModelMock(),
  depreciationCategory: createModelMock(),
  depreciationRecord: createModelMock(),

  // Asset Request models
  assetRequest: createModelMock(),
  assetRequestHistory: createModelMock(),

  // Subscription models
  subscription: createModelMock(),
  subscriptionHistory: createModelMock(),

  // Supplier models
  supplier: createModelMock(),
  supplierEngagement: createModelMock(),

  // Purchase Request models
  purchaseRequest: createModelMock(),
  purchaseRequestItem: createModelMock(),
  purchaseRequestHistory: createModelMock(),

  // Leave Management models
  leaveType: createModelMock(),
  leaveBalance: createModelMock(),
  leaveRequest: createModelMock(),
  leaveRequestHistory: createModelMock(),

  // Payroll models
  salaryStructure: createModelMock(),
  salaryStructureHistory: createModelMock(),
  payrollRun: createModelMock(),
  payrollHistory: createModelMock(),
  payslip: createModelMock(),
  payslipDeduction: createModelMock(),
  employeeLoan: createModelMock(),
  loanRepayment: createModelMock(),

  // Approval Workflow models
  approvalPolicy: createModelMock(),
  approvalLevel: createModelMock(),
  approvalStep: createModelMock(),

  // Company Document models
  companyDocumentType: createModelMock(),
  companyDocument: createModelMock(),

  // Notification model
  notification: createModelMock(),

  // Activity & Audit models
  activityLog: createModelMock(),
  profileChangeRequest: createModelMock(),

  // Settings models
  systemSettings: createModelMock(),

  // Chat/AI models
  chatConversation: createModelMock(),
  chatMessage: createModelMock(),
  aIChatUsage: createModelMock(),
  aIChatAuditLog: createModelMock(),

  // WhatsApp models
  whatsAppConfig: createModelMock(),
  whatsAppUserPhone: createModelMock(),
  whatsAppActionToken: createModelMock(),
  whatsAppMessageLog: createModelMock(),
  platformWhatsAppConfig: createModelMock(),

  // Feedback model
  feedback: createModelMock(),

  // Super Admin models
  revokedImpersonationToken: createModelMock(),

  // Legacy models (for backward compatibility)
  hRProfile: createModelMock(),
  accreditation: createModelMock(),
  accreditationProject: createModelMock(),
  accreditationHistory: createModelMock(),
  accreditationScan: createModelMock(),
  appSetting: createModelMock(),

  // Task Management models
  board: createModelMock(),
  boardMember: createModelMock(),
  taskColumn: createModelMock(),
  task: createModelMock(),
  taskAssignee: createModelMock(),
  taskLabel: createModelMock(),
  taskLabelAssignment: createModelMock(),
  taskChecklist: createModelMock(),
  taskChecklistItem: createModelMock(),
  checklistItem: createModelMock(),
  taskComment: createModelMock(),
  taskAttachment: createModelMock(),
  taskHistory: createModelMock(),

  // Transaction and connection methods
  $transaction: jest.fn((callback: (prisma: typeof mockPrisma) => unknown) => callback(mockPrisma)),
  $connect: jest.fn(),
  $disconnect: jest.fn(),
  $extends: jest.fn().mockReturnThis(),
  $queryRaw: jest.fn(),
  $executeRaw: jest.fn(),
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
