// Help & Support Categories and Navigation Structure
import type { HelpNavItem, QuickLink, GettingStartedStep, SupportContact, UserRole, PopularTopic } from './help-types';

// ============================================================================
// Category Definitions
// ============================================================================

export interface CategoryInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  bgColor: string;
  modules: ModuleInfo[];
}

export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  adminOnly: boolean;
  href: string;
}

// ============================================================================
// Operations Category
// ============================================================================

export const operationsCategory: CategoryInfo = {
  id: 'operations',
  name: 'Operations',
  description: 'Manage assets, subscriptions, and suppliers',
  icon: 'Package',
  color: 'text-blue-600',
  bgColor: 'bg-blue-50',
  modules: [
    {
      id: 'assets',
      name: 'Asset Management',
      description: 'Track company assets, assignments, maintenance, and depreciation',
      icon: 'Box',
      adminOnly: false,
      href: '/help/operations/assets',
    },
    {
      id: 'subscriptions',
      name: 'Subscription Tracking',
      description: 'Monitor SaaS services, renewals, and recurring costs',
      icon: 'CreditCard',
      adminOnly: false,
      href: '/help/operations/subscriptions',
    },
    {
      id: 'suppliers',
      name: 'Supplier Management',
      description: 'Manage vendors, contracts, and supplier relationships',
      icon: 'Truck',
      adminOnly: false,
      href: '/help/operations/suppliers',
    },
  ],
};

// ============================================================================
// HR Category
// ============================================================================

export const hrCategory: CategoryInfo = {
  id: 'hr',
  name: 'HR Management',
  description: 'Employee directory, leave management, and payroll',
  icon: 'Users',
  color: 'text-emerald-600',
  bgColor: 'bg-emerald-50',
  modules: [
    {
      id: 'employees',
      name: 'Employee Directory',
      description: 'Employee profiles, documents, and HR information',
      icon: 'UserCircle',
      adminOnly: true,
      href: '/help/hr/employees',
    },
    {
      id: 'leave',
      name: 'Leave Management',
      description: 'Leave requests, balances, approvals, and team calendar',
      icon: 'Calendar',
      adminOnly: false,
      href: '/help/hr/leave',
    },
    {
      id: 'payroll',
      name: 'Payroll Processing',
      description: 'Salary structures, payslips, loans, and gratuity calculations',
      icon: 'DollarSign',
      adminOnly: false,
      href: '/help/hr/payroll',
    },
  ],
};

// ============================================================================
// Procurement Category
// ============================================================================

export const procurementCategory: CategoryInfo = {
  id: 'procurement',
  name: 'Procurement',
  description: 'Internal procurement and purchase requests',
  icon: 'ShoppingCart',
  color: 'text-purple-600',
  bgColor: 'bg-purple-50',
  modules: [
    {
      id: 'purchase-requests',
      name: 'Purchase Requests',
      description: 'Internal procurement workflow and approval process',
      icon: 'ShoppingCart',
      adminOnly: false,
      href: '/help/procurement/purchase-requests',
    },
  ],
};

// ============================================================================
// System Category
// ============================================================================

export const systemCategory: CategoryInfo = {
  id: 'system',
  name: 'System',
  description: 'Organization settings and administration',
  icon: 'Settings',
  color: 'text-slate-600',
  bgColor: 'bg-slate-50',
  modules: [
    {
      id: 'settings',
      name: 'Organization Settings',
      description: 'Company settings, branding, and team management',
      icon: 'Building2',
      adminOnly: true,
      href: '/help/system/settings',
    },
    {
      id: 'users',
      name: 'User Management',
      description: 'Create users, manage roles, and access control',
      icon: 'UsersRound',
      adminOnly: true,
      href: '/help/system/users',
    },
    {
      id: 'documents',
      name: 'Company Documents',
      description: 'Track licenses, certifications, and compliance documents',
      icon: 'FileCheck',
      adminOnly: true,
      href: '/help/system/documents',
    },
    {
      id: 'approvals',
      name: 'Approval Workflows',
      description: 'Configure approval policies and workflows',
      icon: 'GitBranch',
      adminOnly: true,
      href: '/help/system/approvals',
    },
  ],
};

// ============================================================================
// All Categories
// ============================================================================

export const helpCategories: CategoryInfo[] = [
  operationsCategory,
  hrCategory,
  procurementCategory,
  systemCategory,
];

// ============================================================================
// Filter Functions
// ============================================================================

export function filterCategoriesByRole(
  categories: CategoryInfo[],
  role: UserRole,
  enabledModules: string[]
): CategoryInfo[] {
  return categories
    .map(category => ({
      ...category,
      modules: category.modules.filter(module => {
        // Check if module is enabled
        if (!enabledModules.includes(module.id)) return false;
        // Check if user has access (admin can see all, employee cannot see adminOnly)
        if (module.adminOnly && role !== 'ADMIN') return false;
        return true;
      }),
    }))
    .filter(category => category.modules.length > 0);
}

export function getModuleById(moduleId: string): ModuleInfo | undefined {
  for (const category of helpCategories) {
    const moduleItem = category.modules.find(m => m.id === moduleId);
    if (moduleItem) return moduleItem;
  }
  return undefined;
}

export function getCategoryById(categoryId: string): CategoryInfo | undefined {
  return helpCategories.find(c => c.id === categoryId);
}

export function getModuleByPath(
  categoryId: string,
  moduleId: string
): { category: CategoryInfo; module: ModuleInfo } | undefined {
  const category = getCategoryById(categoryId);
  if (!category) return undefined;
  const moduleItem = category.modules.find(m => m.id === moduleId);
  if (!moduleItem) return undefined;
  return { category, module: moduleItem };
}

// ============================================================================
// Navigation Structure
// ============================================================================

export function buildHelpNavigation(
  role: UserRole,
  enabledModules: string[]
): HelpNavItem[] {
  const filteredCategories = filterCategoriesByRole(
    helpCategories,
    role,
    enabledModules
  );

  return [
    {
      id: 'home',
      label: 'Help Home',
      href: '/help',
      icon: 'Home',
      roles: ['ADMIN', 'USER'],
    },
    {
      id: 'getting-started',
      label: 'Getting Started',
      href: '/help#getting-started',
      icon: 'Rocket',
      roles: ['ADMIN', 'USER'],
    },
    ...filteredCategories.map(category => ({
      id: category.id,
      label: category.name,
      href: `/help#${category.id}`,
      icon: category.icon,
      roles: ['ADMIN', 'USER'] as UserRole[],
      children: category.modules.map(module => ({
        id: `${category.id}-${module.id}`,
        label: module.name,
        href: module.href,
        icon: module.icon,
        roles: module.adminOnly ? ['ADMIN'] as UserRole[] : ['ADMIN', 'USER'] as UserRole[],
        moduleId: module.id,
      })),
    })),
  ];
}

// ============================================================================
// Quick Links
// ============================================================================

export const quickLinks: QuickLink[] = [
  {
    id: 'add-asset',
    title: 'Add New Asset',
    description: 'Learn how to add and track company assets',
    icon: 'Plus',
    url: '/help/operations/assets#add-asset',
    roles: ['ADMIN'],
    priority: 1,
  },
  {
    id: 'request-leave',
    title: 'Request Leave',
    description: 'Submit a new leave request',
    icon: 'Calendar',
    url: '/help/hr/leave#request-leave',
    roles: ['ADMIN', 'USER'],
    priority: 2,
  },
  {
    id: 'view-payslip',
    title: 'View Payslips',
    description: 'Access your salary payslips',
    icon: 'Receipt',
    url: '/help/hr/payroll#view-payslips',
    roles: ['ADMIN', 'USER'],
    priority: 3,
  },
  {
    id: 'submit-purchase',
    title: 'Submit Purchase Request',
    description: 'Create a new purchase request',
    icon: 'ShoppingCart',
    url: '/help/projects/purchase-requests#submit-request',
    roles: ['ADMIN', 'USER'],
    priority: 4,
  },
  {
    id: 'manage-team',
    title: 'Manage Team',
    description: 'Add and manage team members',
    icon: 'Users',
    url: '/help/system/users#manage-team',
    roles: ['ADMIN'],
    priority: 5,
  },
  {
    id: 'my-assets',
    title: 'My Assets',
    description: 'View assets assigned to you',
    icon: 'Box',
    url: '/help/operations/assets#my-assets',
    roles: ['USER'],
    priority: 6,
  },
];

// ============================================================================
// Getting Started Steps
// ============================================================================

export const adminGettingStarted: GettingStartedStep[] = [
  {
    id: 'setup-org',
    title: 'Set Up Your Organization',
    description: 'Configure company settings, logo, and basic information',
    icon: 'Building2',
    url: '/help/system/settings#setup',
    roles: ['ADMIN'],
  },
  {
    id: 'invite-team',
    title: 'Invite Team Members',
    description: 'Add users and assign roles to your team',
    icon: 'UserPlus',
    url: '/help/system/users#invite',
    roles: ['ADMIN'],
  },
  {
    id: 'enable-modules',
    title: 'Enable Modules',
    description: 'Choose which modules to activate for your organization',
    icon: 'Blocks',
    url: '/help/system/settings#modules',
    roles: ['ADMIN'],
  },
  {
    id: 'add-assets',
    title: 'Add Your First Asset',
    description: 'Start tracking company assets',
    icon: 'Box',
    url: '/help/operations/assets#add-asset',
    roles: ['ADMIN'],
  },
  {
    id: 'configure-leave',
    title: 'Configure Leave Types',
    description: 'Set up leave policies for your organization',
    icon: 'Calendar',
    url: '/help/hr/leave#configure',
    roles: ['ADMIN'],
  },
];

export const employeeGettingStarted: GettingStartedStep[] = [
  {
    id: 'complete-profile',
    title: 'Complete Your Profile',
    description: 'Add your personal and contact information',
    icon: 'UserCircle',
    url: '/profile',
    roles: ['USER'],
  },
  {
    id: 'view-assets',
    title: 'View My Assets',
    description: 'See assets assigned to you',
    icon: 'Box',
    url: '/help/operations/assets#my-assets',
    roles: ['USER'],
  },
  {
    id: 'request-leave',
    title: 'Request Leave',
    description: 'Learn how to submit leave requests',
    icon: 'Calendar',
    url: '/help/hr/leave#request-leave',
    roles: ['USER'],
  },
  {
    id: 'check-payslip',
    title: 'View Payslips',
    description: 'Access your salary information',
    icon: 'Receipt',
    url: '/help/hr/payroll#view-payslips',
    roles: ['USER'],
  },
];

export function getGettingStartedSteps(role: UserRole): GettingStartedStep[] {
  return role === 'ADMIN' ? adminGettingStarted : employeeGettingStarted;
}

// ============================================================================
// Support Contact
// ============================================================================

// Note: Support contacts are tenant-specific. Each organization manages their own support channels.
// This array is kept empty as a placeholder for future tenant-specific support configuration.
export const supportContacts: SupportContact[] = [];

// ============================================================================
// Popular Topics
// ============================================================================

export const popularTopics: PopularTopic[] = [
  {
    id: 'leave-balance',
    title: 'How do I check my leave balance?',
    category: 'Leave Management',
    url: '/help/hr/leave#check-balance',
    roles: ['ADMIN', 'USER'],
  },
  {
    id: 'asset-request',
    title: 'How do I request a new asset?',
    category: 'Asset Management',
    url: '/help/operations/assets#request-asset',
    roles: ['USER'],
  },
  {
    id: 'approve-leave',
    title: 'How do I approve leave requests?',
    category: 'Leave Management',
    url: '/help/hr/leave#approve-leave',
    roles: ['ADMIN'],
  },
  {
    id: 'add-employee',
    title: 'How do I add a new employee?',
    category: 'Employee Directory',
    url: '/help/hr/employees#add-employee',
    roles: ['ADMIN'],
  },
  {
    id: 'purchase-request',
    title: 'How do I submit a purchase request?',
    category: 'Purchase Requests',
    url: '/help/projects/purchase-requests#submit-request',
    roles: ['ADMIN', 'USER'],
  },
  {
    id: 'run-payroll',
    title: 'How do I run payroll?',
    category: 'Payroll Processing',
    url: '/help/hr/payroll#run-payroll',
    roles: ['ADMIN'],
  },
  {
    id: 'view-payslip',
    title: 'How do I view my payslip?',
    category: 'Payroll Processing',
    url: '/help/hr/payroll#view-payslips',
    roles: ['ADMIN', 'USER'],
  },
  {
    id: 'track-document',
    title: 'How do I track document expiry?',
    category: 'Company Documents',
    url: '/help/system/documents#track-expiry',
    roles: ['ADMIN'],
  },
];

export function getPopularTopics(role: UserRole): PopularTopic[] {
  return popularTopics.filter(topic => topic.roles.includes(role));
}
