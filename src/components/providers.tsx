/**
 * @file providers.tsx
 * @description Application providers wrapper for session, notifications, and toasts
 * @module components
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { Toaster } from 'sonner';
import { NotificationProvider } from '@/features/notifications/components';
import { PermissionRefresh } from '@/components/auth/permission-refresh';
import { ApiErrorProvider } from '@/components/providers/api-error-provider';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationProvider>
        <ApiErrorProvider />
        <PermissionRefresh />
        {children}
        <Toaster position="top-right" richColors />
      </NotificationProvider>
    </SessionProvider>
  );
}