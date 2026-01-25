/**
 * Permission Constants for Access Control System
 *
 * Permissions follow the pattern: module:action
 * e.g., "assets:view", "payroll:run", "leave:approve"
 *
 * OWNER and ADMIN roles have ALL permissions by default.
 * MANAGER and MEMBER roles get custom permissions per organization.
 */

export const PERMISSIONS = {
  // Assets Module
  ASSETS_VIEW: 'assets:view',
  ASSETS_CREATE: 'assets:create',
  ASSETS_EDIT: 'assets:edit',
  ASSETS_DELETE: 'assets:delete',
  ASSETS_ASSIGN: 'assets:assign',
  ASSETS_EXPORT: 'assets:export',
  ASSETS_DEPRECIATION: 'assets:depreciation',

  // Asset Requests
  ASSET_REQUESTS_VIEW: 'asset-requests:view',
  ASSET_REQUESTS_CREATE: 'asset-requests:create',
  ASSET_REQUESTS_APPROVE: 'asset-requests:approve',

  // Subscriptions Module
  SUBSCRIPTIONS_VIEW: 'subscriptions:view',
  SUBSCRIPTIONS_CREATE: 'subscriptions:create',
  SUBSCRIPTIONS_EDIT: 'subscriptions:edit',
  SUBSCRIPTIONS_DELETE: 'subscriptions:delete',
  SUBSCRIPTIONS_EXPORT: 'subscriptions:export',

  // Suppliers Module
  SUPPLIERS_VIEW: 'suppliers:view',
  SUPPLIERS_CREATE: 'suppliers:create',
  SUPPLIERS_EDIT: 'suppliers:edit',
  SUPPLIERS_DELETE: 'suppliers:delete',
  SUPPLIERS_EXPORT: 'suppliers:export',

  // Employees Module (HR)
  EMPLOYEES_VIEW: 'employees:view',
  EMPLOYEES_VIEW_SALARIES: 'employees:view-salaries',
  EMPLOYEES_CREATE: 'employees:create',
  EMPLOYEES_EDIT: 'employees:edit',
  EMPLOYEES_DELETE: 'employees:delete',
  EMPLOYEES_EXPORT: 'employees:export',

  // Leave Module
  LEAVE_VIEW: 'leave:view',
  LEAVE_REQUEST: 'leave:request',
  LEAVE_APPROVE: 'leave:approve',
  LEAVE_MANAGE_TYPES: 'leave:manage-types',
  LEAVE_MANAGE_BALANCES: 'leave:manage-balances',
  LEAVE_EXPORT: 'leave:export',

  // Payroll Module
  PAYROLL_VIEW: 'payroll:view',
  PAYROLL_VIEW_SALARIES: 'payroll:view-salaries',
  PAYROLL_RUN: 'payroll:run',
  PAYROLL_APPROVE: 'payroll:approve',
  PAYROLL_EXPORT: 'payroll:export',
  PAYROLL_MANAGE_STRUCTURES: 'payroll:manage-structures',
  PAYROLL_MANAGE_LOANS: 'payroll:manage-loans',

  // Purchase Requests Module
  PURCHASE_VIEW: 'purchase:view',
  PURCHASE_CREATE: 'purchase:create',
  PURCHASE_APPROVE: 'purchase:approve',
  PURCHASE_EXPORT: 'purchase:export',

  // Users/Team Module
  USERS_VIEW: 'users:view',
  USERS_INVITE: 'users:invite',
  USERS_EDIT: 'users:edit',
  USERS_DELETE: 'users:delete',
  USERS_CHANGE_ROLE: 'users:change-role',

  // Company Documents
  DOCUMENTS_VIEW: 'documents:view',
  DOCUMENTS_CREATE: 'documents:create',
  DOCUMENTS_EDIT: 'documents:edit',
  DOCUMENTS_DELETE: 'documents:delete',

  // Settings
  SETTINGS_VIEW: 'settings:view',
  SETTINGS_MANAGE: 'settings:manage',
  SETTINGS_BILLING: 'settings:billing',
  SETTINGS_MODULES: 'settings:modules',
  SETTINGS_PERMISSIONS: 'settings:permissions',

  // Reports
  REPORTS_VIEW: 'reports:view',
  REPORTS_EXPORT: 'reports:export',

  // Activity/Audit
  ACTIVITY_VIEW: 'activity:view',

  // Approvals
  APPROVALS_VIEW: 'approvals:view',
  APPROVALS_MANAGE_WORKFLOWS: 'approvals:manage-workflows',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/**
 * Permission groups organized by module for the settings UI
 */
export const PERMISSION_GROUPS: Record<string, { label: string; permissions: { key: string; label: string; description: string }[] }> = {
  assets: {
    label: 'Assets',
    permissions: [
      { key: 'assets:view', label: 'View Assets', description: 'View asset list and details' },
      { key: 'assets:create', label: 'Create Assets', description: 'Add new assets to inventory' },
      { key: 'assets:edit', label: 'Edit Assets', description: 'Modify asset information' },
      { key: 'assets:delete', label: 'Delete Assets', description: 'Remove assets from inventory' },
      { key: 'assets:assign', label: 'Assign Assets', description: 'Assign/unassign assets to employees' },
      { key: 'assets:export', label: 'Export Assets', description: 'Export asset data to CSV/Excel' },
      { key: 'assets:depreciation', label: 'Manage Depreciation', description: 'View and manage asset depreciation' },
    ],
  },
  'asset-requests': {
    label: 'Asset Requests',
    permissions: [
      { key: 'asset-requests:view', label: 'View Requests', description: 'View asset request list' },
      { key: 'asset-requests:create', label: 'Create Requests', description: 'Submit asset requests' },
      { key: 'asset-requests:approve', label: 'Approve Requests', description: 'Approve or reject asset requests' },
    ],
  },
  subscriptions: {
    label: 'Subscriptions',
    permissions: [
      { key: 'subscriptions:view', label: 'View Subscriptions', description: 'View subscription list and details' },
      { key: 'subscriptions:create', label: 'Create Subscriptions', description: 'Add new subscriptions' },
      { key: 'subscriptions:edit', label: 'Edit Subscriptions', description: 'Modify subscription information' },
      { key: 'subscriptions:delete', label: 'Delete Subscriptions', description: 'Remove subscriptions' },
      { key: 'subscriptions:export', label: 'Export Subscriptions', description: 'Export subscription data' },
    ],
  },
  suppliers: {
    label: 'Suppliers',
    permissions: [
      { key: 'suppliers:view', label: 'View Suppliers', description: 'View supplier list and details' },
      { key: 'suppliers:create', label: 'Create Suppliers', description: 'Add new suppliers' },
      { key: 'suppliers:edit', label: 'Edit Suppliers', description: 'Modify supplier information' },
      { key: 'suppliers:delete', label: 'Delete Suppliers', description: 'Remove suppliers' },
      { key: 'suppliers:export', label: 'Export Suppliers', description: 'Export supplier data' },
    ],
  },
  employees: {
    label: 'Employees',
    permissions: [
      { key: 'employees:view', label: 'View Employees', description: 'View employee list and profiles' },
      { key: 'employees:view-salaries', label: 'View Salaries', description: 'View employee salary information' },
      { key: 'employees:create', label: 'Create Employees', description: 'Add new employee profiles' },
      { key: 'employees:edit', label: 'Edit Employees', description: 'Modify employee information' },
      { key: 'employees:delete', label: 'Delete Employees', description: 'Remove employee profiles' },
      { key: 'employees:export', label: 'Export Employees', description: 'Export employee data' },
    ],
  },
  leave: {
    label: 'Leave Management',
    permissions: [
      { key: 'leave:view', label: 'View Leave', description: 'View leave requests and calendars' },
      { key: 'leave:request', label: 'Request Leave', description: 'Submit leave requests' },
      { key: 'leave:approve', label: 'Approve Leave', description: 'Approve or reject leave requests' },
      { key: 'leave:manage-types', label: 'Manage Leave Types', description: 'Configure leave types' },
      { key: 'leave:manage-balances', label: 'Manage Balances', description: 'Adjust employee leave balances' },
      { key: 'leave:export', label: 'Export Leave', description: 'Export leave data' },
    ],
  },
  payroll: {
    label: 'Payroll',
    permissions: [
      { key: 'payroll:view', label: 'View Payroll', description: 'View payroll runs and reports' },
      { key: 'payroll:view-salaries', label: 'View Salaries', description: 'View detailed salary information' },
      { key: 'payroll:run', label: 'Run Payroll', description: 'Create and process payroll runs' },
      { key: 'payroll:approve', label: 'Approve Payroll', description: 'Approve payroll runs for payment' },
      { key: 'payroll:export', label: 'Export Payroll', description: 'Export payroll data to WPS/bank files' },
      { key: 'payroll:manage-structures', label: 'Manage Structures', description: 'Configure salary structures' },
      { key: 'payroll:manage-loans', label: 'Manage Loans', description: 'Create and manage employee loans' },
    ],
  },
  purchase: {
    label: 'Spend Requests',
    permissions: [
      { key: 'purchase:view', label: 'View Requests', description: 'View purchase request list' },
      { key: 'purchase:create', label: 'Create Requests', description: 'Submit purchase requests' },
      { key: 'purchase:approve', label: 'Approve Requests', description: 'Approve or reject purchase requests' },
      { key: 'purchase:export', label: 'Export Requests', description: 'Export purchase request data' },
    ],
  },
  users: {
    label: 'Team Management',
    permissions: [
      { key: 'users:view', label: 'View Team', description: 'View team member list' },
      { key: 'users:invite', label: 'Invite Members', description: 'Send team invitations' },
      { key: 'users:edit', label: 'Edit Members', description: 'Modify team member information' },
      { key: 'users:delete', label: 'Remove Members', description: 'Remove team members' },
      { key: 'users:change-role', label: 'Change Roles', description: 'Change team member roles' },
    ],
  },
  documents: {
    label: 'Company Documents',
    permissions: [
      { key: 'documents:view', label: 'View Documents', description: 'View company documents' },
      { key: 'documents:create', label: 'Create Documents', description: 'Upload new documents' },
      { key: 'documents:edit', label: 'Edit Documents', description: 'Modify document information' },
      { key: 'documents:delete', label: 'Delete Documents', description: 'Remove documents' },
    ],
  },
  settings: {
    label: 'Settings',
    permissions: [
      { key: 'settings:view', label: 'View Settings', description: 'View organization settings' },
      { key: 'settings:manage', label: 'Manage Settings', description: 'Modify organization settings' },
      { key: 'settings:billing', label: 'Manage Billing', description: 'Access billing and subscription settings' },
      { key: 'settings:modules', label: 'Manage Modules', description: 'Enable/disable modules' },
      { key: 'settings:permissions', label: 'Manage Permissions', description: 'Configure role permissions' },
    ],
  },
  reports: {
    label: 'Reports',
    permissions: [
      { key: 'reports:view', label: 'View Reports', description: 'Access reports and analytics' },
      { key: 'reports:export', label: 'Export Reports', description: 'Export reports to PDF/Excel' },
    ],
  },
  activity: {
    label: 'Activity & Audit',
    permissions: [
      { key: 'activity:view', label: 'View Activity', description: 'View activity logs and audit trail' },
    ],
  },
  approvals: {
    label: 'Approvals',
    permissions: [
      { key: 'approvals:view', label: 'View Approvals', description: 'View pending approvals' },
      { key: 'approvals:manage-workflows', label: 'Manage Workflows', description: 'Configure approval workflows' },
    ],
  },
};

/**
 * Get all permission keys as a flat array
 */
export function getAllPermissions(): string[] {
  return Object.values(PERMISSIONS);
}

/**
 * Default permissions for MANAGER role in new organizations
 */
export const DEFAULT_MANAGER_PERMISSIONS: string[] = [
  // Assets - full access except delete
  'assets:view',
  'assets:create',
  'assets:edit',
  'assets:assign',
  'assets:export',
  'assets:depreciation',
  // Asset requests
  'asset-requests:view',
  'asset-requests:approve',
  // Subscriptions
  'subscriptions:view',
  'subscriptions:create',
  'subscriptions:edit',
  'subscriptions:export',
  // Suppliers
  'suppliers:view',
  'suppliers:create',
  'suppliers:edit',
  'suppliers:export',
  // Employees - view and manage (not salaries by default)
  'employees:view',
  'employees:create',
  'employees:edit',
  'employees:export',
  // Leave - full management
  'leave:view',
  'leave:request',
  'leave:approve',
  'leave:manage-balances',
  'leave:export',
  // Payroll - view only (run/approve requires explicit grant)
  'payroll:view',
  // Purchase requests
  'purchase:view',
  'purchase:create',
  'purchase:approve',
  'purchase:export',
  // Team - view and invite
  'users:view',
  'users:invite',
  // Documents
  'documents:view',
  'documents:create',
  'documents:edit',
  // Settings - view only
  'settings:view',
  // Reports
  'reports:view',
  'reports:export',
  // Activity
  'activity:view',
  // Approvals
  'approvals:view',
];

/**
 * Default permissions for MEMBER role in new organizations
 */
export const DEFAULT_MEMBER_PERMISSIONS: string[] = [
  // Assets - view only
  'assets:view',
  // Asset requests - can request
  'asset-requests:view',
  'asset-requests:create',
  // Subscriptions - view only
  'subscriptions:view',
  // Suppliers - view only
  'suppliers:view',
  // Employees - view only (own profile)
  'employees:view',
  // Leave - can request
  'leave:view',
  'leave:request',
  // Purchase requests - can create
  'purchase:view',
  'purchase:create',
  // Team - view only
  'users:view',
  // Documents - view only
  'documents:view',
  // Approvals - view own
  'approvals:view',
];

/**
 * Map module names to their permission prefixes
 */
export const MODULE_PERMISSION_MAP: Record<string, string[]> = {
  assets: ['assets', 'asset-requests'],
  subscriptions: ['subscriptions'],
  suppliers: ['suppliers'],
  employees: ['employees'],
  leave: ['leave'],
  payroll: ['payroll'],
  'spend-requests': ['purchase'],
  'company-documents': ['documents'],
};
