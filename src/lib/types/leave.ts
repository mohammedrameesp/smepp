import { LeaveStatus, LeaveRequestType, LeaveCategory } from '@prisma/client';

// ============ Leave Type ============

export interface LeaveType {
  id: string;
  name: string;
  color: string;
  description?: string | null;
  defaultDays: number;
  isPaid?: boolean;
  requiresDocument?: boolean;
  minNoticeDays?: number;
  maxConsecutiveDays?: number | null;
  accrualBased?: boolean;
  category?: LeaveCategory;
  isActive?: boolean;
  genderRestriction?: string | null;
  minimumServiceMonths?: number;
  isOnceInEmployment?: boolean;
}

export interface LeaveTypeFormData {
  name: string;
  description?: string;
  color: string;
  defaultDays: number;
  isPaid: boolean;
  requiresDocument: boolean;
  minNoticeDays: number;
  maxConsecutiveDays?: number | null;
  accrualBased: boolean;
  category: LeaveCategory;
  isActive: boolean;
}

// ============ Leave Balance ============

export interface LeaveBalance {
  id: string;
  leaveTypeId: string;
  memberId?: string;
  year?: number;
  entitlement: number;
  used: number;
  pending: number;
  carriedForward: number;
  adjustment: number;
  adjustmentNotes?: string | null;
  leaveType: {
    id: string;
    name: string;
    color: string;
    isPaid?: boolean;
    accrualBased?: boolean;
  };
  member?: {
    id: string;
    name: string | null;
    email: string;
  };
  // Computed field for accrual-based leave
  accrued?: number;
}

export interface LeaveBalanceAdjustment {
  adjustment: number;
  notes?: string;
}

// ============ Leave Request ============

export interface LeaveRequest {
  id: string;
  requestNumber: string;
  startDate: string;
  endDate: string;
  requestType: LeaveRequestType;
  totalDays: number | string;
  reason?: string | null;
  documentUrl?: string | null;
  status: LeaveStatus;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  approverNotes?: string | null;
  rejectionReason?: string | null;
  cancellationReason?: string | null;
  approvedAt?: string | null;
  rejectedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  member: {
    id: string;
    name: string | null;
    email: string;
  };
  leaveType: {
    id: string;
    name: string;
    color: string;
    requiresDocument?: boolean;
    accrualBased?: boolean;
  };
  approver?: {
    id: string;
    name: string | null;
    email?: string;
  } | null;
}

export interface LeaveRequestWithHistory extends LeaveRequest {
  history: LeaveRequestHistoryEntry[];
}

export interface LeaveRequestHistoryEntry {
  id: string;
  action: string;
  oldStatus?: LeaveStatus | null;
  newStatus?: LeaveStatus | null;
  notes?: string | null;
  changes?: Record<string, unknown> | null;
  createdAt: string;
  performedBy: {
    id: string;
    name: string | null;
  };
}

export interface CreateLeaveRequestData {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  requestType: LeaveRequestType;
  reason?: string;
  documentUrl?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
  adminOverrideNotice?: boolean;
}

export interface UpdateLeaveRequestData {
  startDate?: string;
  endDate?: string;
  requestType?: LeaveRequestType;
  reason?: string;
  documentUrl?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

// ============ API Response Types ============

export interface LeaveRequestsResponse {
  requests: LeaveRequest[];
  pagination: PaginationInfo;
}

export interface LeaveBalancesResponse {
  balances: LeaveBalance[];
  pagination: PaginationInfo;
}

export interface LeaveTypesResponse {
  leaveTypes: LeaveType[];
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

// ============ Query/Filter Types ============

export interface LeaveRequestFilters {
  q?: string;
  status?: LeaveStatus;
  memberId?: string;
  leaveTypeId?: string;
  year?: number;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface LeaveBalanceFilters {
  memberId?: string;
  leaveTypeId?: string;
  year?: number;
  page?: number;
  pageSize?: number;
}

// ============ Component Props Types ============

export interface LeaveRequestFormProps {
  leaveTypes: LeaveType[];
  balances: LeaveBalance[];
  onSuccess?: () => void;
  isAdmin?: boolean;
}

export interface ApprovalStep {
  id: string;
  levelOrder: number;
  requiredRole: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SKIPPED';
  approverId: string | null;
  approver: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  actionAt: string | null;
  notes: string | null;
}

export interface ApprovalSummary {
  totalSteps: number;
  completedSteps: number;
  currentStep: number | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED';
  canCurrentUserApprove?: boolean;
  /** True if user would be approving at a higher level than the current pending step */
  isUserOverride?: boolean;
}

export interface LeaveApprovalActionsProps {
  requestId: string;
  onApproved?: () => void;
  onRejected?: () => void;
  approvalChain?: ApprovalStep[] | null;
  approvalSummary?: ApprovalSummary | null;
}

export interface CancelLeaveDialogProps {
  requestId: string;
  requestNumber: string;
  onCancelled?: () => void;
}

export interface AdjustBalanceDialogProps {
  balance: LeaveBalance;
  onAdjusted?: () => void;
}

export interface LeaveBalanceCardProps {
  balance: LeaveBalance;
  accrued?: number;
  showUser?: boolean;
  onAdjust?: () => void;
}

export interface LeaveTypeCardProps {
  leaveType: LeaveType;
  onEdit?: () => void;
  onDelete?: () => void;
}

export interface LeaveRequestsTableProps {
  initialRequests?: LeaveRequest[];
  showMember?: boolean;
  memberId?: string;
  status?: LeaveStatus;
}
