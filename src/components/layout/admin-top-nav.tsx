'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Users,
  Package,
  Settings,
  ChevronDown,
  Search,
  Bell,
  User,
  CreditCard,
  LogOut,
  HelpCircle,
  Box,
  Truck,
  Calendar,
  DollarSign,
  FileText,
  BarChart3,
  Building2,
  Blocks,
  Activity,
  Sliders,
  ClipboardCheck,
  UserCheck,
  GitBranch,
  UsersRound,
  ShoppingCart,
  Briefcase,
  ArrowRightLeft,
  Receipt,
  Gift,
  Calculator,
  List,
  CalendarDays,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { NotificationBell } from '@/components/domains/system/notifications';
import { type BadgeCounts, getBadgeCount } from '@/components/layout/sidebar-config';
import { cn } from '@/lib/utils';

interface AdminTopNavProps {
  badgeCounts?: BadgeCounts;
  enabledModules?: string[];
  onOpenCommandPalette?: () => void;
}

// Subscription tier badge colors
const tierColors: Record<string, string> = {
  FREE: 'bg-emerald-100 text-emerald-700',
  STARTER: 'bg-blue-100 text-blue-700',
  PROFESSIONAL: 'bg-purple-100 text-purple-700',
  ENTERPRISE: 'bg-amber-100 text-amber-700',
};

export function AdminTopNav({ badgeCounts = {}, enabledModules = [], onOpenCommandPalette }: AdminTopNavProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  // Navigation items for the main nav
  // Note: Employees, Assets, Subscriptions are accessible via stats row on dashboard
  const mainNavItems = [
    { label: 'Documents', href: '/admin/company-documents', moduleId: null }, // Always available, first item
    { label: 'Leave', href: '/admin/leave/requests', moduleId: 'leave' },
  ].filter(item => item.moduleId === null || isModuleEnabled(item.moduleId));

  // More dropdown items (grouped)
  const moreItems = {
    hr: [
      { label: 'Payroll Runs', href: '/admin/payroll/runs', icon: DollarSign, moduleId: 'payroll' },
      { label: 'Salary Structures', href: '/admin/payroll/salary-structures', icon: FileText, moduleId: 'payroll' },
      { label: 'Loans & Advances', href: '/admin/payroll/loans', icon: CreditCard, moduleId: 'payroll' },
      { label: 'Payslips', href: '/admin/payroll/payslips', icon: Receipt, moduleId: 'payroll' },
      { label: 'Gratuity', href: '/admin/payroll/gratuity', icon: Gift, moduleId: 'payroll' },
    ].filter(item => isModuleEnabled(item.moduleId)),
    operations: [
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, moduleId: 'subscriptions' },
      { label: 'Suppliers', href: '/admin/suppliers', icon: Truck, moduleId: 'suppliers', badgeKey: 'pendingSuppliers' },
    ].filter(item => isModuleEnabled(item.moduleId)),
    projects: [
      { label: 'Projects', href: '/admin/projects', icon: Briefcase, moduleId: 'projects' },
      { label: 'Purchase Requests', href: '/admin/purchase-requests', icon: ShoppingCart, moduleId: 'purchase-requests', badgeKey: 'pendingPurchaseRequests' },
    ].filter(item => isModuleEnabled(item.moduleId)),
  };

  const hasMoreItems = moreItems.hr.length > 0 || moreItems.operations.length > 0 || moreItems.projects.length > 0;

  const subscriptionTier = session?.user?.subscriptionTier || 'FREE';

  return (
    <header className="sticky top-0 z-50 px-4 py-3">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white/85 backdrop-blur-xl rounded-2xl border border-slate-200/50 shadow-sm px-5 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Logo + Org Name + Tier Badge */}
            <div className="flex items-center gap-6">
              <Link href="/admin" className="flex items-center gap-2.5">
                {session?.user?.organizationLogoUrl ? (
                  <img
                    src={session.user.organizationLogoUrl}
                    alt={session.user.organizationName || 'Organization'}
                    className="h-9 w-auto max-w-[100px] object-contain"
                  />
                ) : (
                  <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center">
                    <span className="text-white text-sm font-bold">S+</span>
                  </div>
                )}
                <div className="hidden sm:flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    {session?.user?.organizationName || 'Organization'}
                  </span>
                  <span className={cn(
                    'text-[10px] px-2 py-0.5 rounded-full font-medium uppercase',
                    tierColors[subscriptionTier] || tierColors.FREE
                  )}>
                    {subscriptionTier}
                  </span>
                </div>
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
                        ? 'text-slate-900 bg-slate-100'
                        : 'text-slate-500 hover:text-slate-900'
                    )}
                  >
                    {item.label}
                  </Link>
                ))}

                {/* My Approvals with badge */}
                <Link
                  href="/admin/my-approvals"
                  className={cn(
                    'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors flex items-center gap-1.5',
                    pathname === '/admin/my-approvals'
                      ? 'text-slate-900 bg-slate-100'
                      : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  Approvals
                  {(badgeCounts.pendingApprovals || 0) > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                      {badgeCounts.pendingApprovals}
                    </span>
                  )}
                </Link>

                {/* More Dropdown */}
                {hasMoreItems && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 flex items-center gap-1 outline-none">
                      More
                      <ChevronDown className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
                      {moreItems.hr.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-slate-400 font-normal">Payroll</DropdownMenuLabel>
                          {moreItems.hr.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                                <item.icon className="h-4 w-4 text-slate-400" />
                                {item.label}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {moreItems.operations.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-slate-400 font-normal">Operations</DropdownMenuLabel>
                          {moreItems.operations.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                                <item.icon className="h-4 w-4 text-slate-400" />
                                {item.label}
                                {item.badgeKey && getBadgeCount(badgeCounts, item.badgeKey) ? (
                                  <span className="ml-auto bg-rose-100 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-full">
                                    {getBadgeCount(badgeCounts, item.badgeKey)}
                                  </span>
                                ) : null}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      {moreItems.projects.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-slate-400 font-normal">Projects</DropdownMenuLabel>
                          {moreItems.projects.map((item) => (
                            <DropdownMenuItem key={item.href} asChild>
                              <Link href={item.href} className="flex items-center gap-2 cursor-pointer">
                                <item.icon className="h-4 w-4 text-slate-400" />
                                {item.label}
                                {item.badgeKey && getBadgeCount(badgeCounts, item.badgeKey) ? (
                                  <span className="ml-auto bg-rose-100 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-full">
                                    {getBadgeCount(badgeCounts, item.badgeKey)}
                                  </span>
                                ) : null}
                              </Link>
                            </DropdownMenuItem>
                          ))}
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </nav>
            </div>

            {/* Right: Search + Notifications + User */}
            <div className="flex items-center gap-2">
              {/* Search/Command Palette trigger */}
              <button
                onClick={onOpenCommandPalette}
                className="h-9 px-3 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-500 flex items-center gap-2 transition-colors"
              >
                <Search className="h-4 w-4" />
                <span className="hidden sm:inline">Search</span>
                <kbd className="hidden md:inline text-xs bg-slate-200 px-1.5 py-0.5 rounded">⌘K</kbd>
              </button>

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger className="w-9 h-9 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center cursor-pointer outline-none">
                  <span className="text-white text-xs font-medium">
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
                    onClick={() => signOut()}
                    className="flex items-center gap-2 cursor-pointer text-rose-600 focus:text-rose-600 focus:bg-rose-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
