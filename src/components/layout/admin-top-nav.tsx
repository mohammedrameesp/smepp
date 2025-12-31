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
  ChevronDown,
  Search,
  User,
  CreditCard,
  LogOut,
  HelpCircle,
  Truck,
  BarChart3,
  Building2,
  Activity,
  ShoppingCart,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationBell } from '@/components/domains/system/notifications';
import { type BadgeCounts, getBadgeCount } from '@/components/layout/badge-types';
import { cn } from '@/lib/utils';

interface AdminTopNavProps {
  badgeCounts?: BadgeCounts;
  enabledModules?: string[];
  onOpenCommandPalette?: () => void;
}

export function AdminTopNav({ badgeCounts = {}, enabledModules = [], onOpenCommandPalette }: AdminTopNavProps) {
  const { data: session } = useSession();
  const pathname = usePathname();

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  // Navigation items for the main nav
  // Note: Employees, Assets, Subscriptions are accessible via stats row on dashboard
  const mainNavItems = [
    { label: 'Company Documents', href: '/admin/company-documents', moduleId: null }, // Always available, first item
    { label: 'Leave', href: '/admin/leave', moduleId: 'leave' },
    { label: 'Payroll', href: '/admin/payroll', moduleId: 'payroll' },
  ].filter(item => item.moduleId === null || isModuleEnabled(item.moduleId));

  // More dropdown items (grouped)
  const moreItems = {
    operations: [
      { label: 'Subscriptions', href: '/admin/subscriptions', icon: CreditCard, moduleId: 'subscriptions' },
      { label: 'Suppliers', href: '/admin/suppliers', icon: Truck, moduleId: 'suppliers', badgeKey: 'pendingSuppliers' },
    ].filter(item => isModuleEnabled(item.moduleId)),
    procurement: [
      { label: 'Purchase Requests', href: '/admin/purchase-requests', icon: ShoppingCart, moduleId: 'purchase-requests', badgeKey: 'pendingPurchaseRequests' },
    ].filter(item => isModuleEnabled(item.moduleId)),
  };

  const hasMoreItems = moreItems.operations.length > 0 || moreItems.procurement.length > 0;


  return (
    <header className="sticky top-0 z-50 bg-slate-800 border-b border-slate-700">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Logo + Org Name */}
          <div className="flex items-center gap-6">
            <Link href="/admin" className="flex items-center gap-3">
              {session?.user?.organizationLogoUrl ? (
                <img src={session.user.organizationLogoUrl} alt={session.user.organizationName || 'Organization'} className="h-7 w-auto max-w-[120px] object-contain" />
              ) : (
                <img src="/sme-wordmark-white.png" alt="Durj" className="h-7 w-auto" />
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

                {/* My Approvals with badge */}
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

                {/* More Dropdown */}
                {hasMoreItems && (
                  <DropdownMenu>
                    <DropdownMenuTrigger className="px-3 py-1.5 text-sm font-medium text-slate-300 hover:text-white flex items-center gap-1 outline-none">
                      More
                      <ChevronDown className="h-3 w-3" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-56">
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
                      {moreItems.procurement.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-slate-400 font-normal">Procurement</DropdownMenuLabel>
                          {moreItems.procurement.map((item) => (
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

              {/* Notifications */}
              <NotificationBell />

              {/* User Menu */}
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
                    onClick={() => signOut({ callbackUrl: '/login' })}
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
      </header>
    );
}
