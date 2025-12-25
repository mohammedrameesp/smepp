'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { adminSidebarConfig, filterSidebarByModules, type BadgeCounts } from '@/components/layout/sidebar-config';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  badgeCounts: BadgeCounts;
  enabledModules: string[];
}

export function AdminLayoutClient({ children, badgeCounts, enabledModules }: AdminLayoutClientProps) {
  // Filter sidebar based on enabled modules (passed from server)
  const filteredConfig = filterSidebarByModules(adminSidebarConfig, enabledModules);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar - hidden on mobile */}
      <Sidebar config={filteredConfig} badgeCounts={badgeCounts} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {children}
      </main>
    </div>
  );
}
