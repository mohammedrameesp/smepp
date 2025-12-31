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
import { cn } from '@/lib/utils';
import { type BadgeCounts } from '@/components/layout/sidebar-config';

interface MobileBottomNavProps {
  badgeCounts?: BadgeCounts;
  enabledModules?: string[];
}

export function MobileBottomNav({ badgeCounts = {}, enabledModules = [] }: MobileBottomNavProps) {
  const pathname = usePathname();

  const isModuleEnabled = (moduleId: string) => enabledModules.includes(moduleId);

  const navItems = [
    {
      id: 'home',
      label: 'Home',
      href: '/admin',
      icon: Home,
      isActive: pathname === '/admin' || pathname === '/',
    },
    {
      id: 'team',
      label: 'Team',
      href: '/admin/employees',
      icon: Users,
      moduleId: 'employees',
      isActive: pathname?.startsWith('/admin/employees'),
    },
    {
      id: 'assets',
      label: 'Assets',
      href: '/admin/assets',
      icon: Box,
      moduleId: 'assets',
      isActive: pathname?.startsWith('/admin/assets'),
    },
    {
      id: 'approvals',
      label: 'Approvals',
      href: '/admin/my-approvals',
      icon: Inbox,
      badge: badgeCounts.pendingApprovals,
      isActive: pathname === '/admin/my-approvals',
    },
    {
      id: 'profile',
      label: 'Profile',
      href: '/profile',
      icon: User,
      isActive: pathname === '/profile',
    },
  ].filter(item => !item.moduleId || isModuleEnabled(item.moduleId));

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
            <item.icon className="h-5 w-5" />
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
