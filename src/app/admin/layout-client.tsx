'use client';

import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/layout/sidebar';
import { adminSidebarConfig, filterSidebarByModules, type BadgeCounts } from '@/components/layout/sidebar-config';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  badgeCounts: BadgeCounts;
}

export function AdminLayoutClient({ children, badgeCounts }: AdminLayoutClientProps) {
  const { data: session } = useSession();

  // Filter sidebar based on enabled modules
  const enabledModules = session?.user?.enabledModules || ['assets', 'subscriptions', 'suppliers'];
  const filteredConfig = filterSidebarByModules(adminSidebarConfig, enabledModules);

  // Debug logging - remove after testing
  if (typeof window !== 'undefined') {
    console.log('[AdminLayout] Session enabledModules:', session?.user?.enabledModules);
    console.log('[AdminLayout] Using enabledModules:', enabledModules);
    console.log('[AdminLayout] Filtered items count:', filteredConfig.items.length);
  }

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
