/**
 * @file notification-provider.tsx
 * @description Context provider for managing notification state with smart polling
 * @module components/domains/system/notifications
 *
 * Smart Polling Features:
 * - Polls every 30s when tab is active
 * - Stops polling when tab is hidden
 * - Resumes and fetches immediately on tab focus
 * - Exponential backoff on errors (30s → 60s → 120s → max 5min)
 * - Resets backoff on successful fetch
 * - Provides last updated timestamp
 */
'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useSession } from 'next-auth/react';

interface NotificationContextType {
  unreadCount: number;
  lastUpdated: Date | null;
  isPolling: boolean;
  refreshTrigger: number;
  refreshCount: () => Promise<void>;
  refreshNotifications: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  lastUpdated: null,
  isPolling: true,
  refreshTrigger: 0,
  refreshCount: async () => {},
  refreshNotifications: () => {},
});

const BASE_POLL_INTERVAL = 30000; // 30 seconds
const MAX_POLL_INTERVAL = 300000; // 5 minutes max backoff
const BACKOFF_MULTIPLIER = 2;

export function NotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isPolling, setIsPolling] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Refs for managing polling state
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const currentIntervalMs = useRef(BASE_POLL_INTERVAL);
  const consecutiveErrors = useRef(0);
  const isTabVisible = useRef(true);

  const fetchCount = useCallback(async () => {
    if (status !== 'authenticated') return;

    try {
      const res = await fetch('/api/notifications/unread-count');
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.count);
        setLastUpdated(new Date());
        // Reset backoff on success
        consecutiveErrors.current = 0;
        currentIntervalMs.current = BASE_POLL_INTERVAL;
      } else {
        throw new Error('Failed to fetch');
      }
    } catch {
      // Apply exponential backoff on error
      consecutiveErrors.current += 1;
      currentIntervalMs.current = Math.min(
        BASE_POLL_INTERVAL * Math.pow(BACKOFF_MULTIPLIER, consecutiveErrors.current),
        MAX_POLL_INTERVAL
      );
    }
  }, [status]);

  // Function to trigger notification list refresh in dropdown
  const refreshNotifications = useCallback(() => {
    setRefreshTrigger((v) => v + 1);
    fetchCount();
  }, [fetchCount]);

  // Start polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setIsPolling(true);
    intervalRef.current = setInterval(() => {
      if (isTabVisible.current) {
        fetchCount();
      }
    }, currentIntervalMs.current);
  }, [fetchCount]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  useEffect(() => {
    if (status !== 'authenticated') {
      setUnreadCount(0);
      setLastUpdated(null);
      stopPolling();
      return;
    }

    // Initial fetch
    fetchCount();

    // Start polling
    startPolling();

    // Handle visibility change - stop polling when hidden, resume when visible
    const handleVisibilityChange = () => {
      if (document.hidden) {
        isTabVisible.current = false;
        stopPolling();
      } else {
        isTabVisible.current = true;
        // Fetch immediately and restart polling
        fetchCount();
        startPolling();
      }
    };

    // Handle window focus - refresh immediately
    const handleFocus = () => {
      if (!document.hidden) {
        fetchCount();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [status, fetchCount, startPolling, stopPolling]);

  // Re-setup polling when interval changes due to backoff
  useEffect(() => {
    if (status === 'authenticated' && isTabVisible.current && consecutiveErrors.current > 0) {
      startPolling();
    }
  }, [currentIntervalMs.current, status, startPolling]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        lastUpdated,
        isPolling,
        refreshTrigger,
        refreshCount: fetchCount,
        refreshNotifications,
      }}
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
