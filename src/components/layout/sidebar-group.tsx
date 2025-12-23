'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarItem } from './sidebar-item';
import type { SidebarSubItem } from './sidebar-config';
import type { LucideIcon } from 'lucide-react';
import { getBadgeCount, type BadgeCounts } from './sidebar-config';

interface SidebarGroupProps {
  id: string;
  label: string;
  icon: LucideIcon;
  items: SidebarSubItem[];
  defaultOpen?: boolean;
  collapsed?: boolean;
  badgeCounts?: BadgeCounts;
}

export function SidebarGroup({
  id,
  label,
  icon: Icon,
  items,
  defaultOpen = false,
  collapsed = false,
  badgeCounts = {},
}: SidebarGroupProps) {
  const pathname = usePathname();
  const storageKey = `sidebar-group-${id}`;

  // Check if any child item is active
  const isChildActive = items.some(
    (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
  );

  // Initialize state from localStorage or default
  const [isOpen, setIsOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) {
        return stored === 'true';
      }
    }
    return defaultOpen || isChildActive;
  });

  // Auto-expand when a child becomes active
  useEffect(() => {
    if (isChildActive && !isOpen) {
      setIsOpen(true);
    }
  }, [isChildActive, isOpen]);

  // Persist state to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, String(isOpen));
    }
  }, [isOpen, storageKey]);

  // Calculate total badges for the group
  const totalBadges = items.reduce((sum, item) => {
    const count = getBadgeCount(badgeCounts, item.badgeKey);
    if (count) {
      return sum + count;
    }
    return sum;
  }, 0);

  const handleToggle = () => {
    if (!collapsed) {
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="space-y-1">
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
          'hover:bg-slate-100 dark:hover:bg-slate-800',
          isChildActive
            ? 'text-slate-900 dark:text-slate-100 font-medium'
            : 'text-slate-600 dark:text-slate-400'
        )}
        title={collapsed ? label : undefined}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 text-left truncate">{label}</span>
            {totalBadges > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full h-5 min-w-5 px-1.5 flex items-center justify-center">
                {totalBadges > 99 ? '99+' : totalBadges}
              </span>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-200',
                isOpen ? 'rotate-180' : ''
              )}
            />
          </>
        )}
      </button>

      {!collapsed && isOpen && (
        <div className="ml-4 pl-3 border-l border-slate-200 dark:border-slate-700 space-y-1">
          {items.map((item) => (
            <SidebarItem
              key={item.href}
              label={item.label}
              href={item.href}
              icon={item.icon}
              badge={getBadgeCount(badgeCounts, item.badgeKey)}
              collapsed={collapsed}
            />
          ))}
        </div>
      )}
    </div>
  );
}
