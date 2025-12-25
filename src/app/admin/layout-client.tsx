'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { type BadgeCounts } from '@/components/layout/sidebar-config';
import { ImpersonationHandler, ImpersonationBanner } from '@/components/impersonation';
import { AdminTopNav } from '@/components/layout/admin-top-nav';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { CommandPalette } from '@/components/layout/command-palette';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  badgeCounts: BadgeCounts;
  enabledModules: string[];
}

export function AdminLayoutClient({ children, badgeCounts, enabledModules }: AdminLayoutClientProps) {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false);

  // Keyboard shortcut for command palette (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Impersonation banner - shows at top when super admin is impersonating */}
      <ImpersonationBanner />

      {/* Handle impersonation token from URL */}
      <Suspense fallback={null}>
        <ImpersonationHandler />
      </Suspense>

      {/* Top Navigation Header */}
      <AdminTopNav
        badgeCounts={badgeCounts}
        enabledModules={enabledModules}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      />

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        enabledModules={enabledModules}
      />

      {/* Main content - full width, no sidebar */}
      <main className="min-h-[calc(100vh-5rem)] bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav badgeCounts={badgeCounts} enabledModules={enabledModules} />
    </>
  );
}
