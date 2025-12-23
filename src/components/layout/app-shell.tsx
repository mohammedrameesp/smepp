'use client';

import { Sidebar } from './sidebar';
import { MobileSidebar } from './mobile-sidebar';
import type { SidebarConfig, BadgeCounts } from './sidebar-config';

interface AppShellProps {
  children: React.ReactNode;
  sidebarConfig: SidebarConfig;
  badgeCounts?: BadgeCounts;
}

export function AppShell({ children, sidebarConfig, badgeCounts = {} }: AppShellProps) {
  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar */}
      <Sidebar config={sidebarConfig} badgeCounts={badgeCounts} />

      {/* Main content area */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {children}
      </main>
    </div>
  );
}

// Export mobile sidebar for use in header
export { MobileSidebar };
