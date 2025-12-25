'use client';

import { useSession } from 'next-auth/react';
import { Sidebar } from '@/components/layout/sidebar';
import { employeeSidebarConfig, filterSidebarByModules } from '@/components/layout/sidebar-config';

interface EmployeeLayoutClientProps {
  children: React.ReactNode;
}

export function EmployeeLayoutClient({ children }: EmployeeLayoutClientProps) {
  const { data: session } = useSession();

  // Filter sidebar based on enabled modules
  const enabledModules = session?.user?.enabledModules || ['assets', 'subscriptions', 'suppliers'];
  const filteredConfig = filterSidebarByModules(employeeSidebarConfig, enabledModules);

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Desktop sidebar - hidden on mobile */}
      <Sidebar config={filteredConfig} />

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
        {children}
      </main>
    </div>
  );
}
