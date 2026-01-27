/**
 * @file mobile-bottom-nav.tsx
 * @description Mobile bottom navigation bar for small screen devices
 * @module components/layout
 */

'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Users, Box, Inbox, User } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { type BadgeCounts } from '@/components/layout/badge-types';
import { ICON_SIZES } from '@/lib/constants';

interface MobileBottomNavProps {
  badgeCounts?: BadgeCounts;
  enabledModules?: string[];
  isAdmin?: boolean;
  canApprove?: boolean;
  hasFinanceAccess?: boolean;
  hasHRAccess?: boolean;
  hasOperationsAccess?: boolean;
}

export function MobileBottomNav({
  badgeCounts = {},
  enabledModules = [],
  isAdmin = false,
  canApprove = false,
  hasFinanceAccess = false,
  hasHRAccess = false,
  hasOperationsAccess = false,
}: MobileBottomNavProps) {
  const pathname = usePathname();

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  // Check if user has access based on role or department access
  const hasAccess = (requiredAccess?: 'finance' | 'hr' | 'operations') => {
    if (isAdmin) return true;
    if (!requiredAccess) return true;
    if (requiredAccess === 'finance' && hasFinanceAccess) return true;
    if (requiredAccess === 'hr' && hasHRAccess) return true;
    if (requiredAccess === 'operations' && hasOperationsAccess) return true;
    return false;
  };

  // Users with isAdmin or canApprove flags can access approval workflows
  const isApprover = isAdmin || canApprove;
  const hasApprovalModules = isModuleEnabled('leave') || isModuleEnabled('assets') || isModuleEnabled('spend-requests');

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/admin',
      icon: Home,
      isActive: pathname === '/admin' || pathname === '/',
      show: true,
    },
    {
      id: 'team',
      label: 'Team',
      href: '/admin/employees',
      icon: Users,
      isActive: pathname?.startsWith('/admin/employees'),
      show: hasAccess('hr'), // Only HR access users see Team
    },
    {
      id: 'assets',
      label: 'Assets',
      href: '/admin/assets',
      icon: Box,
      isActive: pathname?.startsWith('/admin/assets'),
      show: isModuleEnabled('assets') && hasAccess('operations'),
    },
    {
      id: 'approvals',
      label: 'Approvals',
      href: '/admin/my-approvals',
      icon: Inbox,
      badge: badgeCounts.pendingApprovals,
      isActive: pathname === '/admin/my-approvals',
      show: isApprover && hasApprovalModules,
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: User,
      isActive: pathname === '/profile',
      show: true,
    },
  ].filter(item => item.show);

  // If we filtered out items due to modules, we might have fewer than 5
  // Always keep home, approvals, and profile; add what's available
  const displayItems = navItems.slice(0, 5);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-2 z-50">
      <div className="flex items-center justify-around">
        {displayItems.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={cn(
              'flex flex-col items-center gap-1 px-3 py-1 relative',
              item.isActive ? 'text-blue-600' : 'text-slate-400'
            )}
          >
            {item.isActive && (
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-blue-600 rounded-full" />
            )}
            <item.icon className={ICON_SIZES.md} />
            {item.badge && item.badge > 0 && (
              <span className="absolute -top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            )}
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
