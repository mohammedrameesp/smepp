/**
 * @file employee-view-banner.tsx
 * @description Banner shown when an admin is viewing the employee portal
 * @module components/layout
 */

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Shield, Loader2 } from 'lucide-react';

interface EmployeeViewBannerProps {
  isVisible?: boolean;
}

/**
 * EmployeeViewBanner
 *
 * Shows a subtle banner when an admin is viewing the employee portal.
 * Provides context and a quick way to return to the admin dashboard.
 */
export function EmployeeViewBanner({ isVisible = false }: EmployeeViewBannerProps) {
  const [exiting, setExiting] = useState(false);

  if (!isVisible) {
    return null;
  }

  const handleReturnToAdmin = async () => {
    setExiting(true);
    try {
      await fetch('/api/view-mode', { method: 'DELETE' });
      window.location.href = '/admin';
    } catch (err) {
      console.error('Failed to return to admin:', err);
      setExiting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            <span>
              <span className="font-medium">Employee View</span>
              <span className="opacity-80 hidden sm:inline"> - You&apos;re viewing your personal employee portal</span>
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleReturnToAdmin}
            disabled={exiting}
            className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs font-medium"
          >
            {exiting ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Returning...
              </>
            ) : (
              'Return to Admin'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
