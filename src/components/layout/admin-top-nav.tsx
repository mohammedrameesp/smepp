/**
 * @file admin-top-nav.tsx
 * @description Admin dashboard top navigation bar with user menu and notifications
 * @module components/layout
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Settings,
  Search,
  User,
  LogOut,
  HelpCircle,
  BarChart3,
  Building2,
  Activity,
  Users,
  ShieldCheck,
  Briefcase,
  UserCog,
  CircleDollarSign,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/features/notifications/components';
import { FeedbackTrigger } from '@/components/feedback/feedback-trigger';
import { ClientOnly } from '@/components/ui/client-only';
import { type BadgeCounts } from '@/components/layout/badge-types';
import { cn } from '@/lib/core/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// Fallback avatar button shown during SSR to prevent layout shift
function UserAvatarFallback({ initials }: { initials: string }) {
  return (
    <div
      className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-slate-700"
      aria-label="User menu"
    >
      <span className="text-white text-xs font-medium" aria-hidden="true">
        {initials}
      </span>
    </div>
  );
}

interface AdminTopNavProps {
  badgeCounts?: BadgeCounts;
  enabledModules?: string[];
  onOpenCommandPalette?: () => void;
  isAdmin?: boolean;
  hasFinanceAccess?: boolean;
  hasHRAccess?: boolean;
  hasOperationsAccess?: boolean;
  canApprove?: boolean;
}

// Roles that can access approval workflows
const APPROVER_ROLES = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR'];

// Access role derivation for display in user menu
type AccessRole = 'Admin' | 'HR' | 'Finance' | 'Operations' | 'Manager' | 'Member';

function deriveAccessRole(flags: {
  isAdmin?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  hasOperationsAccess?: boolean;
  canApprove?: boolean;
}): AccessRole {
  if (flags.isAdmin) return 'Admin';
  if (flags.hasHRAccess) return 'HR';
  if (flags.hasFinanceAccess) return 'Finance';
  if (flags.hasOperationsAccess) return 'Operations';
  if (flags.canApprove) return 'Manager';
  return 'Member';
}

const ACCESS_ROLE_STYLES: Record<AccessRole, { bg: string; text: string; icon: typeof ShieldCheck }> = {
  Admin: { bg: 'bg-red-100', text: 'text-red-700', icon: ShieldCheck },
  HR: { bg: 'bg-green-100', text: 'text-green-700', icon: UserCog },
  Finance: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: CircleDollarSign },
  Operations: { bg: 'bg-blue-100', text: 'text-blue-700', icon: Briefcase },
  Manager: { bg: 'bg-purple-100', text: 'text-purple-700', icon: Users },
  Member: { bg: 'bg-gray-100', text: 'text-gray-600', icon: User },
};

// Separate component for access role badge to ensure it renders
function AccessRoleBadge({
  isAdmin,
  hasHRAccess,
  hasFinanceAccess,
  hasOperationsAccess,
  canApprove,
}: {
  isAdmin?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  hasOperationsAccess?: boolean;
  canApprove?: boolean;
}) {
  const accessRole = deriveAccessRole({
    isAdmin,
    hasHRAccess,
    hasFinanceAccess,
    hasOperationsAccess,
    canApprove,
  });
  const style = ACCESS_ROLE_STYLES[accessRole];
  const Icon = style.icon;

  return (
    <Badge variant="secondary" className={`mt-1.5 gap-1 text-xs ${style.bg} ${style.text}`}>
      <Icon className="h-3 w-3" />
      {accessRole}
    </Badge>
  );
}

export function AdminTopNav({
  badgeCounts = {},
  enabledModules = [],
  onOpenCommandPalette,
  isAdmin = false,
  hasFinanceAccess = false,
  hasHRAccess = false,
  hasOperationsAccess = false,
  canApprove = false,
}: AdminTopNavProps) {
  const { data: session, status } = useSession();
  const isSessionLoading = status === 'loading';
  const pathname = usePathname();
  const [isSwitching, setIsSwitching] = React.useState(false);

  const handleSwitchToEmployeeView = async () => {
    setIsSwitching(true);
    try {
      await fetch('/api/view-mode', { method: 'POST' });
      window.location.href = '/employee';
    } catch (error) {
      console.error('Failed to switch to employee view:', error);
      setIsSwitching(false);
    }
  };

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  // Check if user has access based on role or specific department access
  const hasAccess = (requiredAccess?: 'finance' | 'hr' | 'operations') => {
    if (isAdmin) return true; // Admins see everything
    if (!requiredAccess) return true; // No specific access required
    if (requiredAccess === 'finance' && hasFinanceAccess) return true;
    if (requiredAccess === 'hr' && hasHRAccess) return true;
    if (requiredAccess === 'operations' && hasOperationsAccess) return true;
    return false;
  };

  // Can approve if admin or manager with canApprove permission
  const isApprover = isAdmin || canApprove;

  // Navigation items for the main nav - filtered by module AND department access
  const mainNavItems = [
    { label: 'Company Documents', href: '/admin/company-documents', moduleId: 'documents', requiredAccess: undefined },
    { label: 'Payroll', href: '/admin/payroll', moduleId: 'payroll', requiredAccess: 'finance' as const },
  ].filter(item => isModuleEnabled(item.moduleId) && hasAccess(item.requiredAccess));



  return (
    <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Org Name */}
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              {isSessionLoading ? (
                /* Show placeholder while session loads to prevent logo flash */
                <div className="h-9 w-28 bg-slate-700 rounded animate-pulse" />
              ) : session?.user?.organizationLogoUrl ? (
                <>
                  <img
                    src={session.user.organizationLogoUrlInverse || session.user.organizationLogoUrl}
                    alt={session.user.organizationName || 'Organization'}
                    className="h-9 w-auto max-w-[160px] object-contain"
                    style={!session.user.organizationLogoUrlInverse ? { filter: 'brightness(0) invert(1)' } : undefined}
                  />
                  <span className="text-slate-500 hidden sm:inline">|</span>
                  <span className="text-sm font-medium text-slate-200 hidden sm:inline">
                    {session?.user?.organizationName || 'Organization'}
                  </span>
                </>
              ) : (
                <span className="text-lg font-bold text-white">
                  {session?.user?.organizationName || 'Durj'}
                </span>
              )}
            </Link>

              {/* Navigation */}
              <nav className="hidden md:flex items-center">
                {mainNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                      pathname?.startsWith(item.href)
                        ? 'text-white bg-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* My Approvals with badge - show if user is approver AND any approval-related module is enabled */}
                {isApprover && (isModuleEnabled('leave') || isModuleEnabled('assets') || isModuleEnabled('spend-requests')) && (
                  <Link
                    href="/admin/my-approvals"
                    className={cn(
                      'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
                      pathname === '/admin/my-approvals'
                        ? 'text-white bg-slate-700'
                        : 'text-slate-300 hover:text-white hover:bg-slate-700'
                    )}
                  >
                    Approvals
                    {(badgeCounts.pendingApprovals || 0) > 0 && (
                      <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                        {badgeCounts.pendingApprovals}
                      </span>
                    )}
                  </Link>
                )}

              </nav>
            </div>

            {/* Right: Search + Notifications + User */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-600">
              {/* Search/Command Palette trigger */}
              <button
                onClick={onOpenCommandPalette}
                className="h-9 px-3 bg-slate-700 hover:bg-slate-600 border border-slate-600 rounded-lg text-sm text-slate-300 flex items-center gap-2 transition-colors"
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search...</span>
                <kbd className="hidden md:inline text-xs bg-slate-600 text-slate-400 px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>

              {/* Switch to Employee View - only for employees */}
              {session?.user?.isEmployee && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSwitchToEmployeeView}
                  disabled={isSwitching}
                  className="text-emerald-400 hover:text-emerald-300 hover:bg-slate-700"
                >
                  <Users className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">{isSwitching ? 'Switching...' : 'My Portal'}</span>
                </Button>
              )}

              {/* Feedback */}
              <FeedbackTrigger />

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              <ClientOnly
                fallback={
                  <UserAvatarFallback
                    initials={session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                  />
                }
              >
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center cursor-pointer outline-none ring-2 ring-slate-700"
                    aria-label="User menu"
                  >
                    <span className="text-white text-xs font-medium" aria-hidden="true">
                      {session?.user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'}
                    </span>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="font-medium text-slate-900 text-sm">{session?.user?.name || 'User'}</p>
                      <p className="text-xs text-slate-500">{session?.user?.email}</p>
                      <AccessRoleBadge
                        isAdmin={isAdmin}
                        hasHRAccess={hasHRAccess}
                        hasFinanceAccess={hasFinanceAccess}
                        hasOperationsAccess={hasOperationsAccess}
                        canApprove={canApprove}
                      />
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                        <User className="h-4 w-4 text-slate-400" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/settings" className="flex items-center gap-2 cursor-pointer">
                        <Settings className="h-4 w-4 text-slate-400" />
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/organization" className="flex items-center gap-2 cursor-pointer">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        Organization
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href="/admin/reports" className="flex items-center gap-2 cursor-pointer">
                        <BarChart3 className="h-4 w-4 text-slate-400" />
                        Reports
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/activity" className="flex items-center gap-2 cursor-pointer">
                        <Activity className="h-4 w-4 text-slate-400" />
                        Activity Log
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/help" className="flex items-center gap-2 cursor-pointer">
                        <HelpCircle className="h-4 w-4 text-slate-400" />
                        Help & Support
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => signOut({ callbackUrl: '/login?signedOut=true' })}
                      className="flex items-center gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ClientOnly>
            </div>
          </div>
        </div>
      </header>
    );
}
