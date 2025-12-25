import {
  Users,
  Package,
  FolderKanban,
  Settings,
  Home,
  User,
  AlertTriangle,
  Calendar,
  List,
  Calculator,
  CalendarDays,
  DollarSign,
  FileText,
  CreditCard,
  Receipt,
  Gift,
  Box,
  Truck,
  ShoppingCart,
  BarChart3,
  Activity,
  Sliders,
  Palmtree,
  Plus,
  CheckSquare,
  Briefcase,
  ArrowRightLeft,
  FileCheck,
  Bell,
  ClipboardCheck,
  GitBranch,
  UserCheck,
  UsersRound,
  Building2,
  Blocks,
  type LucideIcon,
} from 'lucide-react';

export interface SidebarSubItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
  moduleId?: string; // Module ID for filtering (e.g., 'assets', 'employees', 'leave')
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: LucideIcon;
  href?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  items?: SidebarSubItem[];
  badgeKey?: string;
  moduleId?: string; // Module ID for filtering
}

export interface SidebarConfig {
  items: SidebarItem[];
}

export const adminSidebarConfig: SidebarConfig = {
  items: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/',
    },
    {
      id: 'my-approvals',
      label: 'My Approvals',
      icon: ClipboardCheck,
      href: '/admin/my-approvals',
      badgeKey: 'pendingApprovals',
    },
    {
      id: 'hr',
      label: 'HR Management',
      icon: Users,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Employees', href: '/admin/employees', icon: User, moduleId: 'employees' },
        { label: 'Document Expiry', href: '/admin/employees/document-expiry', icon: AlertTriangle, moduleId: 'employees' },
        { label: 'Change Requests', href: '/admin/employees/change-requests', icon: FileText, badgeKey: 'pendingChangeRequests', moduleId: 'employees' },
        { label: 'Leave Requests', href: '/admin/leave/requests', icon: Calendar, badgeKey: 'pendingLeaveRequests', moduleId: 'leave' },
        { label: 'Leave Types', href: '/admin/leave/types', icon: List, moduleId: 'leave' },
        { label: 'Leave Balances', href: '/admin/leave/balances', icon: Calculator, moduleId: 'leave' },
        { label: 'Team Calendar', href: '/admin/leave/calendar', icon: CalendarDays, moduleId: 'leave' },
        { label: 'Payroll Runs', href: '/admin/payroll/runs', icon: DollarSign, moduleId: 'payroll' },
        { label: 'Salary Structures', href: '/admin/payroll/salary-structures', icon: FileText, moduleId: 'payroll' },
        { label: 'Loans & Advances', href: '/admin/payroll/loans', icon: CreditCard, moduleId: 'payroll' },
        { label: 'Payslips', href: '/admin/payroll/payslips', icon: Receipt, moduleId: 'payroll' },
        { label: 'Gratuity', href: '/admin/payroll/gratuity', icon: Gift, moduleId: 'payroll' },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Package,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Assets', href: '/admin/assets', icon: Box, moduleId: 'assets' },
        { label: 'Asset Requests', href: '/admin/asset-requests', icon: ArrowRightLeft, badgeKey: 'pendingAssetRequests', moduleId: 'assets' },
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, moduleId: 'subscriptions' },
        { label: 'Suppliers', href: '/admin/suppliers', icon: Truck, badgeKey: 'pendingSuppliers', moduleId: 'suppliers' },
      ],
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Projects', href: '/admin/projects', icon: Briefcase, moduleId: 'projects' },
        { label: 'Purchase Requests', href: '/admin/purchase-requests', icon: ShoppingCart, badgeKey: 'pendingPurchaseRequests', moduleId: 'purchase-requests' },
      ],
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Organization', href: '/admin/organization', icon: Building2 },
        { label: 'Team', href: '/admin/team', icon: UsersRound },
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Modules', href: '/admin/modules', icon: Blocks },
        { label: 'Company Documents', href: '/admin/company-documents', icon: FileCheck, moduleId: 'documents' },
        { label: 'Approval Policies', href: '/admin/settings/approvals', icon: GitBranch },
        { label: 'Delegations', href: '/admin/settings/delegations', icon: UserCheck },
        { label: 'Notifications', href: '/admin/notifications', icon: Bell },
        { label: 'Reports', href: '/admin/reports', icon: BarChart3 },
        { label: 'Activity Log', href: '/admin/activity', icon: Activity },
        { label: 'Settings', href: '/admin/settings', icon: Sliders },
      ],
    },
  ],
};

// Filter sidebar config based on enabled modules
export function filterSidebarByModules(
  config: SidebarConfig,
  enabledModules: string[]
): SidebarConfig {
  return {
    items: config.items
      .map((item) => {
        // If item has moduleId and it's not enabled, exclude it
        if (item.moduleId && !enabledModules.includes(item.moduleId)) {
          return null;
        }

        // If item has sub-items, filter those too
        if (item.items) {
          const filteredItems = item.items.filter(
            (subItem) => !subItem.moduleId || enabledModules.includes(subItem.moduleId)
          );

          // If no sub-items left after filtering, exclude the whole group
          if (filteredItems.length === 0) {
            return null;
          }

          return { ...item, items: filteredItems };
        }

        return item;
      })
      .filter((item): item is SidebarItem => item !== null),
  };
}

export const employeeSidebarConfig: SidebarConfig = {
  items: [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      href: '/employee',
    },
    {
      id: 'hr',
      label: 'HR & Leave',
      icon: Calendar,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'My Leave', href: '/employee/leave', icon: Palmtree, moduleId: 'leave' },
        { label: 'New Request', href: '/employee/leave/new', icon: Plus, moduleId: 'leave' },
        { label: 'My Payslips', href: '/employee/payroll/payslips', icon: Receipt, moduleId: 'payroll' },
        { label: 'Gratuity', href: '/employee/payroll/gratuity', icon: Gift, moduleId: 'payroll' },
      ],
    },
    {
      id: 'operations',
      label: 'Assets & Browse',
      icon: Package,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'My Holdings', href: '/employee/my-assets', icon: User, moduleId: 'assets' },
        { label: 'Asset Requests', href: '/employee/asset-requests', icon: ArrowRightLeft, badgeKey: 'myPendingAssignments', moduleId: 'assets' },
        { label: 'All Assets', href: '/employee/assets', icon: Box, moduleId: 'assets' },
        { label: 'Subscriptions', href: '/employee/subscriptions', icon: CreditCard, moduleId: 'subscriptions' },
        { label: 'Suppliers', href: '/employee/suppliers', icon: Truck, moduleId: 'suppliers' },
      ],
    },
    {
      id: 'projects',
      label: 'Requests',
      icon: CheckSquare,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Purchase Requests', href: '/employee/purchase-requests', icon: ShoppingCart, moduleId: 'purchase-requests' },
        { label: 'New Request', href: '/employee/purchase-requests/new', icon: Plus, moduleId: 'purchase-requests' },
      ],
    },
  ],
};

// Badge keys mapping for pending counts
export const badgeKeys = [
  'pendingChangeRequests',
  'pendingLeaveRequests',
  'pendingSuppliers',
  'pendingPurchaseRequests',
  'pendingAssetRequests',
  'myPendingAssignments',
  'pendingApprovals',
] as const;

export type BadgeKey = typeof badgeKeys[number];

export type BadgeCounts = Partial<Record<BadgeKey, number>>;

// Helper to safely get badge count
export function getBadgeCount(badgeCounts: BadgeCounts, key?: string): number | undefined {
  if (!key) return undefined;
  if (badgeKeys.includes(key as BadgeKey)) {
    return badgeCounts[key as BadgeKey];
  }
  return undefined;
}
