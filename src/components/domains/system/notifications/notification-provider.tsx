'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { useSession } from 'next-auth/react';

interface NotificationContextType {
  unreadCount: number;
  refreshCount: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  refreshCount: async () => {},
});

const POLL_INTERVAL = 30000; // 30 seconds

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchCount = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
      }
    } catch (error) {
      console.error('Failed to fetch notification count:', error);
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated') {
      setUnreadCount(0);
      return;
    }

    // Initial fetch
    fetchCount();

    // Set up polling
    const interval = setInterval(fetchCount, POLL_INTERVAL);

    // Pause polling when tab is hidden
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, we'll resume on next visible
      } else {
        // Tab is visible again, fetch immediately
        fetchCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [status, fetchCount]);

  return (
    <NotificationContext.Provider
      value={{ unreadCount, refreshCount: fetchCount }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      'useNotifications must be used within a NotificationProvider'
    );
  }
  return context;
}
