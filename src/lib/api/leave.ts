import type {
  LeaveRequest,
  LeaveRequestWithHistory,
  LeaveRequestsResponse,
  LeaveBalancesResponse,
  LeaveTypesResponse,
  LeaveRequestFilters,
  LeaveBalanceFilters,
  CreateLeaveRequestData,
  UpdateLeaveRequestData,
  LeaveBalanceAdjustment,
} from '@/lib/types/leave';

/**
 * API Error class for leave module
 */
export class LeaveApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'LeaveApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * Handle API response and throw error if not ok
 */
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new LeaveApiError(
      errorData.error || `Request failed with status ${response.status}`,
      response.status,
      errorData.details
    );
  }
  return response.json();
}

/**
 * Build URL search params from filters object
 */
function buildSearchParams(filters: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });
  return params;
}

// ============ Leave Requests API ============

/**
 * Fetch leave requests with optional filters
 */
export async function fetchLeaveRequests(filters: LeaveRequestFilters = {}): Promise<LeaveRequestsResponse> {
  const params = buildSearchParams({
    q: filters.q,
    status: filters.status,
    memberId: filters.memberId,
    leaveTypeId: filters.leaveTypeId,
    year: filters.year,
    startDate: filters.startDate,
    endDate: filters.endDate,
    p: filters.page,
    ps: filters.pageSize,
    sort: filters.sort,
    order: filters.order,
  });

  const response = await fetch(`/api/leave/requests?${params}`);
  return handleResponse<LeaveRequestsResponse>(response);
}

/**
 * Fetch a single leave request by ID
 */
export async function fetchLeaveRequest(id: string): Promise<LeaveRequestWithHistory> {
  const response = await fetch(`/api/leave/requests/${id}`);
  return handleResponse<LeaveRequestWithHistory>(response);
}

/**
 * Create a new leave request
 */
export async function createLeaveRequest(data: CreateLeaveRequestData): Promise<LeaveRequest> {
  const response = await fetch('/api/leave/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<LeaveRequest>(response);
}

/**
 * Update an existing leave request
 */
export async function updateLeaveRequest(id: string, data: UpdateLeaveRequestData): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave/requests/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse<LeaveRequest>(response);
}

/**
 * Delete a leave request
 */
export async function deleteLeaveRequest(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/leave/requests/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(response);
}

/**
 * Approve a leave request
 */
export async function approveLeaveRequest(id: string, notes?: string): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave/requests/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
  });
  return handleResponse<LeaveRequest>(response);
}

/**
 * Reject a leave request
 */
export async function rejectLeaveRequest(id: string, reason: string): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave/requests/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<LeaveRequest>(response);
}

/**
 * Cancel a leave request
 */
export async function cancelLeaveRequest(id: string, reason?: string): Promise<LeaveRequest> {
  const response = await fetch(`/api/leave/requests/${id}/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reason }),
  });
  return handleResponse<LeaveRequest>(response);
}

// ============ Leave Balances API ============

/**
 * Fetch leave balances with optional filters
 */
export async function fetchLeaveBalances(filters: LeaveBalanceFilters = {}): Promise<LeaveBalancesResponse> {
  const params = buildSearchParams({
    memberId: filters.memberId,
    leaveTypeId: filters.leaveTypeId,
    year: filters.year,
    p: filters.page,
    ps: filters.pageSize,
  });

  const response = await fetch(`/api/leave/balances?${params}`);
  return handleResponse<LeaveBalancesResponse>(response);
}

/**
 * Adjust a leave balance
 */
export async function adjustLeaveBalance(id: string, data: LeaveBalanceAdjustment): Promise<unknown> {
  const response = await fetch(`/api/leave/balances/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

// ============ Leave Types API ============

/**
 * Fetch all leave types
 */
export async function fetchLeaveTypes(activeOnly = false): Promise<LeaveTypesResponse> {
  const params = activeOnly ? '?active=true' : '';
  const response = await fetch(`/api/leave/types${params}`);
  return handleResponse<LeaveTypesResponse>(response);
}

/**
 * Fetch a single leave type
 */
export async function fetchLeaveType(id: string): Promise<unknown> {
  const response = await fetch(`/api/leave/types/${id}`);
  return handleResponse(response);
}

/**
 * Create a new leave type
 */
export async function createLeaveType(data: unknown): Promise<unknown> {
  const response = await fetch('/api/leave/types', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Update a leave type
 */
export async function updateLeaveType(id: string, data: unknown): Promise<unknown> {
  const response = await fetch(`/api/leave/types/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(response);
}

/**
 * Delete a leave type
 */
export async function deleteLeaveType(id: string): Promise<{ success: boolean }> {
  const response = await fetch(`/api/leave/types/${id}`, {
    method: 'DELETE',
  });
  return handleResponse<{ success: boolean }>(response);
}
