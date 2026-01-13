// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Polyfill Request/Response for Jest (Next.js server APIs)
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder as typeof global.TextDecoder;

// Mock Request if not available (for server-side code tests)
if (typeof Request === 'undefined') {
  global.Request = class Request {
    url: string;
    method: string;
    headers: Map<string, string>;
    body: unknown;
    constructor(input: string, init?: RequestInit) {
      this.url = input;
      this.method = init?.method || 'GET';
      this.headers = new Map(Object.entries(init?.headers || {}));
      this.body = init?.body;
    }
    json() { return Promise.resolve({}); }
    text() { return Promise.resolve(''); }
  } as unknown as typeof Request;
}

if (typeof Response === 'undefined') {
  global.Response = class Response {
    body: unknown;
    status: number;
    headers: Map<string, string>;
    constructor(body?: unknown, init?: ResponseInit) {
      this.body = body;
      this.status = init?.status || 200;
      this.headers = new Map(Object.entries(init?.headers || {}));
    }
    json() { return Promise.resolve(this.body); }
    text() { return Promise.resolve(String(this.body)); }
  } as unknown as typeof Response;
}

// Mock environment variables for testing
// Note: NODE_ENV is typically set by Jest automatically to 'test'
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://test:test@localhost:5432/damp_test';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock NextAuth - both imports
const mockGetServerSession = jest.fn();

jest.mock('next-auth', () => ({
  __esModule: true,
  default: jest.fn(),
  getServerSession: mockGetServerSession,
}));

jest.mock('next-auth/next', () => ({
  getServerSession: mockGetServerSession,
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

    // Team Member model
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
    appSetting: createModelMock(),

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
    $transaction: jest.fn((callback) => callback({
      user: createModelMock(),
      asset: createModelMock(),
      organization: createModelMock(),
      teamMember: createModelMock(),
      payrollRun: createModelMock(),
      payrollHistory: createModelMock(),
      payslip: createModelMock(),
    })),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $extends: jest.fn().mockReturnThis(),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  },
}));

// Global test utilities
global.console = {
  ...console,
  // Suppress console.error and console.warn in tests unless explicitly needed
  error: jest.fn(),
  warn: jest.fn(),
};
