/**
 * @file providers.tsx
 * @description Application providers wrapper for session, notifications, and toasts
 * @module components
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { NotificationProvider } from '@/features/notifications/components';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        {children}
        <Toaster position="top-right" richColors />
      </NotificationProvider>
    </SessionProvider>
  );
}