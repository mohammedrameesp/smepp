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
}

// Roles that can access approval workflows
const APPROVER_ROLES = ['ADMIN', 'MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR'];

export function AdminTopNav({ badgeCounts = {}, enabledModules = [], onOpenCommandPalette }: AdminTopNavProps) {
  const { data: session } = useSession();
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
  const isApprover = session?.user?.isAdmin === true;

  // Navigation items for the main nav
  // Note: Employees, Assets, Subscriptions are accessible via stats row on dashboard
  // Note: Leave is accessed via Employees module or direct URL
  const mainNavItems = [
    { label: 'Company Documents', href: '/admin/company-documents', moduleId: 'documents' },
    { label: 'Payroll', href: '/admin/payroll', moduleId: 'payroll' },
  ].filter(item => isModuleEnabled(item.moduleId));



  return (
    <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Org Name */}
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              {session?.user?.organizationLogoUrl ? (
                <img
                  src={session.user.organizationLogoUrlInverse || session.user.organizationLogoUrl}
                  alt={session.user.organizationName || 'Organization'}
                  className="h-8 w-auto max-w-[140px] object-contain"
                  style={!session.user.organizationLogoUrlInverse ? { filter: 'brightness(0) invert(1)' } : undefined}
                />
              ) : (
                <img src="/sme-wordmark-white.png" alt="Durj" className="h-8 w-auto" />
              )}
              <span className="text-slate-500 hidden sm:inline">|</span>
              <span className="text-sm font-medium text-slate-200 hidden sm:inline">
                {session?.user?.organizationName || 'Organization'}
              </span>
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
                {isApprover && (isModuleEnabled('leave') || isModuleEnabled('assets') || isModuleEnabled('purchase-requests')) && (
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
