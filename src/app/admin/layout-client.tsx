'use client';

import * as React from 'react';
import { Suspense } from 'react';
import { type BadgeCounts } from '@/components/layout/badge-types';
import { ImpersonationHandler, ImpersonationBanner } from '@/components/impersonation';
import { AdminTopNav } from '@/components/layout/admin-top-nav';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { CommandPalette } from '@/components/layout/command-palette';
import { ChatWidget } from '@/components/chat/chat-widget';

interface AdminLayoutClientProps {
  children: React.ReactNode;
  badgeCounts: BadgeCounts;
  enabledModules: string[];
  aiChatEnabled: boolean;
}

export function AdminLayoutClient({ children, badgeCounts, enabledModules, aiChatEnabled }: AdminLayoutClientProps) {
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
      <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 pb-20 md:pb-0">
        {children}
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav badgeCounts={badgeCounts} enabledModules={enabledModules} />

      {/* AI Chat Widget - only shown if enabled for organization */}
      {aiChatEnabled && <ChatWidget />}
    </>
  );
}
