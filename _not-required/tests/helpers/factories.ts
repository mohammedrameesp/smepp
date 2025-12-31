/**
 * Test Data Factories
 * Provides factory functions for creating mock data matching Prisma schema
 */

import {
  Role,
  AssetStatus,
  AcquisitionType,
  BillingCycle,
  SubscriptionStatus,
  SupplierStatus,
  LeaveStatus,
  LeaveRequestType,
} from '@prisma/client';

// Counter for generating unique IDs
let idCounter = 0;
const generateId = (prefix: string = 'test'): string => {
  idCounter++;
  return `${prefix}-${Date.now()}-${idCounter}`;
};

// Reset counter between test suites
export const resetIdCounter = (): void => {
  idCounter = 0;
};

/**
 * Create a mock User
 */
export interface MockUser {
  id: string;
  name: string | null;
  email: string;
  emailVerified: Date | null;
  image: string | null;
  role: Role;
  isSystemAccount: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: generateId('user'),
  name: 'Test User',
  email: `test-${Date.now()}@example.com`,
  emailVerified: new Date(),
  image: null,
  role: Role.EMPLOYEE,
  isSystemAccount: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Asset
 */
export interface MockAsset {
  id: string;
  assetTag: string | null;
  type: string;
  category: string | null;
  brand: string | null;
  model: string;
  serial: string | null;
  configuration: string | null;
  purchaseDate: Date | null;
  warrantyExpiry: Date | null;
  supplier: string | null;
  invoiceNumber: string | null;
  assignedUserId: string | null;
  assignmentDate: string | null;
  status: AssetStatus;
  acquisitionType: AcquisitionType;
  transferNotes: string | null;
  price: number | null;
  priceCurrency: string | null;
  priceQAR: number | null;
  notes: string | null;
  location: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockAsset = (overrides: Partial<MockAsset> = {}): MockAsset => ({
  id: generateId('asset'),
  assetTag: `AST-${String(idCounter).padStart(4, '0')}`,
  type: 'Laptop',
  category: 'IT Equipment',
  brand: 'Dell',
  model: 'XPS 15',
  serial: `SN${Date.now()}`,
  configuration: '16GB RAM, 512GB SSD',
  purchaseDate: new Date('2024-01-15'),
  warrantyExpiry: new Date('2027-01-15'),
  supplier: 'Tech Supplier Inc.',
  invoiceNumber: `INV-${Date.now()}`,
  assignedUserId: null,
  assignmentDate: null,
  status: AssetStatus.SPARE,
  acquisitionType: AcquisitionType.NEW_PURCHASE,
  transferNotes: null,
  price: 1500,
  priceCurrency: 'USD',
  priceQAR: 5460,
  notes: null,
  location: 'Main Office',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Subscription
 */
export interface MockSubscription {
  id: string;
  serviceName: string;
  category: string | null;
  accountId: string | null;
  purchaseDate: Date | null;
  renewalDate: Date | null;
  billingCycle: BillingCycle;
  costPerCycle: number | null;
  costCurrency: string | null;
  costQAR: number | null;
  vendor: string | null;
  status: SubscriptionStatus;
  assignedUserId: string | null;
  autoRenew: boolean;
  paymentMethod: string | null;
  notes: string | null;
  lastActiveRenewalDate: Date | null;
  cancelledAt: Date | null;
  reactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockSubscription = (overrides: Partial<MockSubscription> = {}): MockSubscription => ({
  id: generateId('sub'),
  serviceName: 'Adobe Creative Cloud',
  category: 'Software',
  accountId: `ACC-${Date.now()}`,
  purchaseDate: new Date('2024-01-01'),
  renewalDate: new Date('2025-01-01'),
  billingCycle: BillingCycle.YEARLY,
  costPerCycle: 599.99,
  costCurrency: 'USD',
  costQAR: 2184,
  vendor: 'Adobe Inc.',
  status: SubscriptionStatus.ACTIVE,
  assignedUserId: null,
  autoRenew: true,
  paymentMethod: 'Credit Card',
  notes: null,
  lastActiveRenewalDate: null,
  cancelledAt: null,
  reactivatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Supplier
 */
export interface MockSupplier {
  id: string;
  suppCode: string | null;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  establishmentYear: number | null;
  primaryContactName: string | null;
  primaryContactTitle: string | null;
  primaryContactEmail: string | null;
  primaryContactMobile: string | null;
  secondaryContactName: string | null;
  secondaryContactTitle: string | null;
  secondaryContactEmail: string | null;
  secondaryContactMobile: string | null;
  paymentTerms: string | null;
  additionalInfo: string | null;
  status: SupplierStatus;
  rejectionReason: string | null;
  approvedAt: Date | null;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockSupplier = (overrides: Partial<MockSupplier> = {}): MockSupplier => ({
  id: generateId('supplier'),
  suppCode: null,
  name: 'Test Supplier Company',
  category: 'IT Services',
  address: '123 Business Street',
  city: 'Doha',
  country: 'Qatar',
  website: 'https://testsupplier.com',
  establishmentYear: 2015,
  primaryContactName: 'John Smith',
  primaryContactTitle: 'Sales Manager',
  primaryContactEmail: 'john@testsupplier.com',
  primaryContactMobile: '+97412345678',
  secondaryContactName: null,
  secondaryContactTitle: null,
  secondaryContactEmail: null,
  secondaryContactMobile: null,
  paymentTerms: 'Net 30',
  additionalInfo: null,
  status: SupplierStatus.PENDING,
  rejectionReason: null,
  approvedAt: null,
  approvedById: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Activity Log
 */
export interface MockActivityLog {
  id: string;
  actorUserId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: Record<string, unknown> | null;
  at: Date;
}

export const createMockActivityLog = (overrides: Partial<MockActivityLog> = {}): MockActivityLog => ({
  id: generateId('activity'),
  actorUserId: generateId('user'),
  action: 'ASSET_CREATED',
  entityType: 'Asset',
  entityId: generateId('asset'),
  payload: { model: 'MacBook Pro' },
  at: new Date(),
  ...overrides,
});

/**
 * Create a mock Supplier Engagement
 */
export interface MockSupplierEngagement {
  id: string;
  supplierId: string;
  date: Date;
  notes: string;
  rating: number | null;
  createdById: string;
  createdAt: Date;
}

export const createMockSupplierEngagement = (
  overrides: Partial<MockSupplierEngagement> = {}
): MockSupplierEngagement => ({
  id: generateId('engagement'),
  supplierId: generateId('supplier'),
  date: new Date(),
  notes: 'Initial meeting to discuss requirements',
  rating: 4,
  createdById: generateId('user'),
  createdAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Maintenance Record
 */
export interface MockMaintenanceRecord {
  id: string;
  assetId: string;
  maintenanceDate: Date;
  notes: string | null;
  performedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockMaintenanceRecord = (
  overrides: Partial<MockMaintenanceRecord> = {}
): MockMaintenanceRecord => ({
  id: generateId('maintenance'),
  assetId: generateId('asset'),
  maintenanceDate: new Date(),
  notes: 'Annual maintenance check',
  performedBy: 'IT Support',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Leave Type
 */
export interface MockLeaveType {
  id: string;
  name: string;
  description: string | null;
  color: string;
  defaultDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
  maxConsecutiveDays: number | null;
  minNoticeDays: number;
  allowCarryForward: boolean;
  maxCarryForwardDays: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockLeaveType = (
  overrides: Partial<MockLeaveType> = {}
): MockLeaveType => ({
  id: generateId('leave-type'),
  name: 'Annual Leave',
  description: 'Paid annual vacation leave',
  color: '#3B82F6',
  defaultDays: 30,
  requiresApproval: true,
  requiresDocument: false,
  isPaid: true,
  isActive: true,
  maxConsecutiveDays: 15,
  minNoticeDays: 7,
  allowCarryForward: true,
  maxCarryForwardDays: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Leave Balance
 */
export interface MockLeaveBalance {
  id: string;
  userId: string;
  leaveTypeId: string;
  year: number;
  entitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
  adjustmentNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockLeaveBalance = (
  overrides: Partial<MockLeaveBalance> = {}
): MockLeaveBalance => ({
  id: generateId('leave-balance'),
  userId: generateId('user'),
  leaveTypeId: generateId('leave-type'),
  year: new Date().getFullYear(),
  entitlement: 30,
  used: 5,
  pending: 2,
  carriedForward: 3,
  adjustment: 0,
  adjustmentNotes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create a mock Leave Request
 */
export interface MockLeaveRequest {
  id: string;
  requestNumber: string;
  userId: string;
  leaveTypeId: string;
  startDate: Date;
  endDate: Date;
  requestType: LeaveRequestType;
  totalDays: number;
  reason: string | null;
  status: LeaveStatus;
  documentUrl: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  rejectedById: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  cancelledById: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const createMockLeaveRequest = (
  overrides: Partial<MockLeaveRequest> = {}
): MockLeaveRequest => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() + 7);
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 4);

  return {
    id: generateId('leave-request'),
    requestNumber: `LR-${String(idCounter).padStart(5, '0')}`,
    userId: generateId('user'),
    leaveTypeId: generateId('leave-type'),
    startDate,
    endDate,
    requestType: LeaveRequestType.FULL_DAY,
    totalDays: 5,
    reason: 'Annual vacation',
    status: LeaveStatus.PENDING,
    documentUrl: null,
    emergencyContact: null,
    emergencyPhone: null,
    approvedById: null,
    approvedAt: null,
    rejectedById: null,
    rejectedAt: null,
    rejectionReason: null,
    cancelledById: null,
    cancelledAt: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
};

/**
 * Create a mock Leave Request History
 */
export interface MockLeaveRequestHistory {
  id: string;
  leaveRequestId: string;
  action: string;
  actorId: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}

export const createMockLeaveRequestHistory = (
  overrides: Partial<MockLeaveRequestHistory> = {}
): MockLeaveRequestHistory => ({
  id: generateId('leave-history'),
  leaveRequestId: generateId('leave-request'),
  action: 'CREATED',
  actorId: generateId('user'),
  details: null,
  createdAt: new Date(),
  ...overrides,
});
