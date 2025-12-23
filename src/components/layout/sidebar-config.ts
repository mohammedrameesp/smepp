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
  type LucideIcon,
} from 'lucide-react';

export interface SidebarSubItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badgeKey?: string;
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
        { label: 'Employees', href: '/admin/employees', icon: User },
        { label: 'Document Expiry', href: '/admin/employees/document-expiry', icon: AlertTriangle },
        { label: 'Change Requests', href: '/admin/employees/change-requests', icon: FileText, badgeKey: 'pendingChangeRequests' },
        { label: 'Leave Requests', href: '/admin/leave/requests', icon: Calendar, badgeKey: 'pendingLeaveRequests' },
        { label: 'Leave Types', href: '/admin/leave/types', icon: List },
        { label: 'Leave Balances', href: '/admin/leave/balances', icon: Calculator },
        { label: 'Team Calendar', href: '/admin/leave/calendar', icon: CalendarDays },
        { label: 'Payroll Runs', href: '/admin/payroll/runs', icon: DollarSign },
        { label: 'Salary Structures', href: '/admin/payroll/salary-structures', icon: FileText },
        { label: 'Loans & Advances', href: '/admin/payroll/loans', icon: CreditCard },
        { label: 'Payslips', href: '/admin/payroll/payslips', icon: Receipt },
        { label: 'Gratuity', href: '/admin/payroll/gratuity', icon: Gift },
      ],
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: Package,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Assets', href: '/admin/assets', icon: Box },
        { label: 'Asset Requests', href: '/admin/asset-requests', icon: ArrowRightLeft, badgeKey: 'pendingAssetRequests' },
        { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard },
        { label: 'Suppliers', href: '/admin/suppliers', icon: Truck, badgeKey: 'pendingSuppliers' },
      ],
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderKanban,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Projects', href: '/admin/projects', icon: Briefcase },
        { label: 'Purchase Requests', href: '/admin/purchase-requests', icon: ShoppingCart, badgeKey: 'pendingPurchaseRequests' },
      ],
    },
    {
      id: 'system',
      label: 'System',
      icon: Settings,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Users', href: '/admin/users', icon: Users },
        { label: 'Company Documents', href: '/admin/company-documents', icon: FileCheck },
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
        { label: 'My Leave', href: '/employee/leave', icon: Palmtree },
        { label: 'New Request', href: '/employee/leave/new', icon: Plus },
        { label: 'My Payslips', href: '/employee/payroll/payslips', icon: Receipt },
        { label: 'Gratuity', href: '/employee/payroll/gratuity', icon: Gift },
      ],
    },
    {
      id: 'operations',
      label: 'Assets & Browse',
      icon: Package,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'My Holdings', href: '/employee/my-assets', icon: User },
        { label: 'Asset Requests', href: '/employee/asset-requests', icon: ArrowRightLeft, badgeKey: 'myPendingAssignments' },
        { label: 'All Assets', href: '/employee/assets', icon: Box },
        { label: 'Subscriptions', href: '/employee/subscriptions', icon: CreditCard },
        { label: 'Suppliers', href: '/employee/suppliers', icon: Truck },
      ],
    },
    {
      id: 'projects',
      label: 'Requests',
      icon: CheckSquare,
      collapsible: true,
      defaultOpen: false,
      items: [
        { label: 'Purchase Requests', href: '/employee/purchase-requests', icon: ShoppingCart },
        { label: 'New Request', href: '/employee/purchase-requests/new', icon: Plus },
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
