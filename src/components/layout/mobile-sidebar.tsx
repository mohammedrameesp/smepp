'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarItem } from './sidebar-item';
import { SidebarGroup } from './sidebar-group';
import { getBadgeCount, type SidebarConfig, type BadgeCounts } from './sidebar-config';

interface MobileSidebarProps {
  config: SidebarConfig;
  badgeCounts?: BadgeCounts;
}

export function MobileSidebar({ config, badgeCounts = {} }: MobileSidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="lg:hidden h-9 w-9 p-0"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out drawer */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-72 bg-white dark:bg-slate-900 z-50 transform transition-transform duration-300 ease-in-out lg:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <img src="/logo.png" alt="Logo" className="h-8 w-auto" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
            className="h-8 w-8 p-0"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {config.items.map((item) => {
            if (item.collapsible && item.items) {
              return (
                <SidebarGroup
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  icon={item.icon}
                  items={item.items}
                  defaultOpen={item.defaultOpen}
                  collapsed={false}
                  badgeCounts={badgeCounts}
                />
              );
            }

            if (item.href) {
              return (
                <div key={item.id} onClick={() => setIsOpen(false)}>
                  <SidebarItem
                    label={item.label}
                    href={item.href}
                    icon={item.icon}
                    badge={getBadgeCount(badgeCounts, item.badgeKey)}
                    collapsed={false}
                  />
                </div>
              );
            }

            return null;
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 text-center">Durj</p>
        </div>
      </aside>
    </>
  );
}
