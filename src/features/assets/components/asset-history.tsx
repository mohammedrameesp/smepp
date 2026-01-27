/**
 * @file asset-history.tsx
 * @description Compact asset history timeline component showing lifecycle events
 * @module components/domains/operations/assets
 *
 * Features:
 * - Visual timeline with color-coded action icons
 * - Tracks: CREATED, ASSIGNED, UNASSIGNED, STATUS_CHANGED, LOCATION_CHANGED, UPDATED
 * - Shows who performed each action and when (relative time)
 * - Displays detailed notes for UPDATE actions
 * - Compact card design with vertical timeline connector
 * - Memory leak prevention with proper cleanup
 * - Race condition protection with AbortController
 * - Type-safe API response validation
 * - Accessible timeline with semantic HTML and ARIA labels
 * - Retry functionality on error
 *
 * Props:
 * - assetId: ID of the asset to fetch history for
 *
 * Action Colors:
 * - CREATED: green
 * - ASSIGNED: blue
 * - UNASSIGNED: orange
 * - STATUS_CHANGED: purple
 * - LOCATION_CHANGED: cyan
 * - UPDATED: gray
 *
 * API Dependencies:
 * - GET /api/assets/[id]/history - Fetches chronological history entries
 *
 * Usage:
 * - Used on asset detail page (/admin/assets/[id])
 * - Provides audit trail for asset lifecycle
 *
 * Access: Admin and Employee (employees see their assigned assets)
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatRelativeTime } from '@/lib/core/datetime';
import { User, MapPin, RefreshCw, Plus, Edit, UserMinus, AlertCircle } from 'lucide-react';
import { z } from 'zod';
import { ICON_SIZES } from '@/lib/constants';

// Zod schema for type validation
const MemberSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().email(),
});

const AssetHistoryEntrySchema = z.object({
  id: z.string(),
  action: z.string(),
  fromMember: MemberSchema.nullable().optional(),
  toMember: MemberSchema.nullable().optional(),
  performedBy: MemberSchema.nullable().optional(),
  fromStatus: z.string().nullable().optional(),
  toStatus: z.string().nullable().optional(),
  fromProject: z.string().nullable().optional(),
  toProject: z.string().nullable().optional(),
  fromLocation: z.string().nullable().optional(),
  toLocation: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  // Bi-temporal tracking
  effectiveDate: z.string().nullable().optional(), // When the event actually occurred
  createdAt: z.string(), // When it was recorded in the system
});

type AssetHistoryEntry = z.infer<typeof AssetHistoryEntrySchema>;

interface AssetHistoryProps {
  assetId: string;
}

// Constants for timeline styling
const TIMELINE_DOT_SIZE = 24; // w-6 h-6 = 24px
const TIMELINE_LINE_OFFSET = TIMELINE_DOT_SIZE / 2 - 1; // Center the line (11px)

function getActionIcon(action: string) {
  switch (action) {
    case 'CREATED':
      return <Plus className={ICON_SIZES.xs} />;
    case 'ASSIGNED':
      return <User className={ICON_SIZES.xs} />;
    case 'UNASSIGNED':
      return <UserMinus className={ICON_SIZES.xs} />;
    case 'STATUS_CHANGED':
      return <RefreshCw className={ICON_SIZES.xs} />;
    case 'LOCATION_CHANGED':
      return <MapPin className={ICON_SIZES.xs} />;
    case 'UPDATED':
      return <Edit className={ICON_SIZES.xs} />;
    default:
      return <Edit className={ICON_SIZES.xs} />;
  }
}

function getActionColor(action: string) {
  switch (action) {
    case 'CREATED':
      return 'bg-green-500';
    case 'ASSIGNED':
      return 'bg-blue-500';
    case 'UNASSIGNED':
      return 'bg-orange-500';
    case 'STATUS_CHANGED':
      return 'bg-purple-500';
    case 'LOCATION_CHANGED':
      return 'bg-cyan-500';
    case 'UPDATED':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'CREATED':
      return 'Asset created';
    case 'ASSIGNED':
      return 'Asset assigned';
    case 'UNASSIGNED':
      return 'Asset unassigned';
    case 'STATUS_CHANGED':
      return 'Status changed';
    case 'LOCATION_CHANGED':
      return 'Location changed';
    case 'UPDATED':
      return 'Asset updated';
    default:
      return action.replace(/_/g, ' ').toLowerCase();
  }
}

function formatMemberName(member: { name: string | null; email: string } | null | undefined): string {
  if (!member) return '';
  // Handle both null and empty string
  if (member.name && member.name.trim()) {
    return member.name.trim();
  }
  return member.email.split('@')[0];
}

function sanitizeText(text: string, maxLength: number = 100): string {
  // Sanitize and truncate text for safe display in title attributes
  return text.substring(0, maxLength).replace(/[<>"']/g, '');
}

function formatStatus(status: string | null | undefined): string {
  if (!status) return '';
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
}

function formatActionText(entry: AssetHistoryEntry): string {
  switch (entry.action) {
    case 'CREATED':
      return 'Created';
    case 'ASSIGNED':
      if (entry.toMember) {
        return `Assigned to ${formatMemberName(entry.toMember)}`;
      }
      return 'Assigned';
    case 'UNASSIGNED':
      if (entry.fromMember) {
        return `Returned from ${formatMemberName(entry.fromMember)}`;
      }
      return 'Returned';
    case 'STATUS_CHANGED':
      if (entry.fromStatus && entry.toStatus) {
        return `${formatStatus(entry.fromStatus)} → ${formatStatus(entry.toStatus)}`;
      }
      return 'Status changed';
    case 'LOCATION_CHANGED':
      if (entry.toLocation) {
        return `Moved to ${entry.toLocation}`;
      } else if (entry.fromLocation) {
        return `Removed from ${entry.fromLocation}`;
      }
      return 'Location changed';
    case 'UPDATED':
      return 'Updated';
    default:
      return entry.action.replace(/_/g, ' ').toLowerCase();
  }
}

export default function AssetHistory({ assetId }: AssetHistoryProps) {
  const [history, setHistory] = useState<AssetHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/assets/${assetId}/history`, {
        signal,
      });

      // Handle different HTTP status codes
      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view asset history');
          return;
        } else if (response.status === 403) {
          setError('You don\'t have permission to view this asset');
          return;
        } else if (response.status === 404) {
          setError('Asset not found');
          return;
        } else if (response.status >= 500) {
          setError('Server error. Please try again later');
          return;
        }

        // Try to get error message from response
        try {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to load asset history');
        } catch {
          setError('Failed to load asset history');
        }
        return;
      }

      const data = await response.json();

      // Validate response data with Zod
      try {
        const validatedData = z.array(AssetHistoryEntrySchema).parse(data);
        setHistory(validatedData);
      } catch (validationError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Asset history validation error:', validationError);
        }
        setError('Invalid data received from server');
      }
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError('Error loading asset history');

      // Only log in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Error fetching asset history:', err);
      }
    } finally {
      setLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    if (!assetId) return;

    const abortController = new AbortController();
    fetchHistory(abortController.signal);

    // Cleanup function to prevent memory leaks and race conditions
    return () => {
      abortController.abort();
    };
  }, [assetId, fetchHistory]);

  const handleRetry = useCallback(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Memoize note lines to avoid recreating arrays on every render
  const notesByEntryId = useMemo(() => {
    const map = new Map<string, string[]>();
    history.forEach((entry) => {
      if (entry.action === 'UPDATED' && entry.notes) {
        map.set(entry.id, entry.notes.split('\n').filter(Boolean));
      }
    });
    return map;
  }, [history]);

  // Safe date formatting with fallback
  const formatDate = useCallback((dateString: string): string => {
    try {
      return formatRelativeTime(dateString);
    } catch {
      return 'Unknown time';
    }
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3" aria-label="Loading history">
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="h-6 w-6 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className={`${ICON_SIZES.sm} text-red-600 flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <p className="text-red-600 mb-2">{error}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetry}
                className="h-8"
              >
                <RefreshCw className={`${ICON_SIZES.xs} mr-1`} />
                Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">History</CardTitle>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-6 text-sm text-gray-500">
            <p className="font-medium">No history yet</p>
            <p className="text-xs mt-1">
              History will appear when this asset is assigned, updated, or moved.
            </p>
          </div>
        ) : (
          <nav aria-label="Asset history timeline">
            <div className="relative">
              {/* Timeline line - using computed offset instead of magic number */}
              <div
                className="absolute top-2 bottom-2 w-px bg-gray-200"
                style={{ left: `${TIMELINE_LINE_OFFSET}px` }}
                aria-hidden="true"
              />

              {/* Use semantic ordered list for chronological timeline */}
              <ol className="space-y-3" role="list">
                {history.map((entry) => {
                  const noteLines = notesByEntryId.get(entry.id) || [];

                  return (
                    <li key={entry.id} className="flex items-start gap-3 relative">
                      {/* Timeline dot with icon */}
                      <div
                        className={`flex-shrink-0 w-6 h-6 rounded-full ${getActionColor(
                          entry.action
                        )} flex items-center justify-center text-white z-10`}
                        role="img"
                        aria-label={getActionLabel(entry.action)}
                        title={getActionLabel(entry.action)}
                      >
                        {getActionIcon(entry.action)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-sm font-medium text-gray-900 truncate">
                            {formatActionText(entry)}
                          </span>
                          <time
                            dateTime={entry.createdAt}
                            className="text-xs text-gray-400 whitespace-nowrap"
                          >
                            {formatDate(entry.createdAt)}
                          </time>
                        </div>

                        {/* Show detailed changes for UPDATED actions */}
                        {noteLines.length > 0 && (
                          <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                            {noteLines.map((change, i) => (
                              <div
                                key={`${entry.id}-note-${i}`}
                                className="truncate"
                                title={sanitizeText(change)}
                              >
                                {change}
                              </div>
                            ))}
                          </div>
                        )}

                        {entry.performedBy && (
                          <div className="text-xs text-gray-500">
                            by {formatMemberName(entry.performedBy)}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </nav>
        )}
      </CardContent>
    </Card>
  );
}