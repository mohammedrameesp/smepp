'use client';

import { useState, useEffect } from 'react';
import { PanelLeftClose, PanelLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SidebarItem } from './sidebar-item';
import { SidebarGroup } from './sidebar-group';
import { getBadgeCount, type SidebarConfig, type BadgeCounts } from './sidebar-config';

interface SidebarProps {
  config: SidebarConfig;
  badgeCounts?: BadgeCounts;
}

export function Sidebar({ config, badgeCounts = {} }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('sidebar-collapsed');
      if (stored !== null) {
        setCollapsed(stored === 'true');
      }
    }
  }, []);

  // Persist collapsed state
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', String(collapsed));
    }
  }, [collapsed]);

  return (
    <aside
      className={cn(
        'hidden lg:flex flex-col h-[calc(100vh-4rem)] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Collapse toggle */}
      <div className="flex items-center justify-end p-2 border-b border-slate-200 dark:border-slate-800">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-1">
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
                collapsed={collapsed}
                badgeCounts={badgeCounts}
              />
            );
          }

          if (item.href) {
            return (
              <SidebarItem
                key={item.id}
                label={item.label}
                href={item.href}
                icon={item.icon}
                badge={getBadgeCount(badgeCounts, item.badgeKey)}
                collapsed={collapsed}
              />
            );
          }

          return null;
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <p className="text-xs text-slate-400 text-center">Durj</p>
        </div>
      )}
    </aside>
  );
}
