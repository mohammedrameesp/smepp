/**
 * @file AssetHistory.tsx
 * @description Compact asset history timeline component
 * @module components
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatRelativeTime } from '@/lib/date-format';
import { User, MapPin, RefreshCw, Plus, Edit, UserMinus } from 'lucide-react';

interface AssetHistoryEntry {
  id: string;
  action: string;
  fromMember?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  toMember?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  performedBy?: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  fromStatus?: string | null;
  toStatus?: string | null;
  fromProject?: string | null;
  toProject?: string | null;
  fromLocation?: string | null;
  toLocation?: string | null;
  notes?: string | null;
  createdAt: string;
}

interface AssetHistoryProps {
  assetId: string;
}

function getActionIcon(action: string) {
  switch (action) {
    case 'CREATED':
      return <Plus className="h-3 w-3" />;
    case 'ASSIGNED':
      return <User className="h-3 w-3" />;
    case 'UNASSIGNED':
      return <UserMinus className="h-3 w-3" />;
    case 'STATUS_CHANGED':
      return <RefreshCw className="h-3 w-3" />;
    case 'LOCATION_CHANGED':
      return <MapPin className="h-3 w-3" />;
    case 'UPDATED':
      return <Edit className="h-3 w-3" />;
    default:
      return <Edit className="h-3 w-3" />;
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

function formatMemberName(member: { name: string | null; email: string } | null | undefined): string {
  if (!member) return '';
  return member.name || member.email.split('@')[0];
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

  useEffect(() => {
    async function fetchHistory() {
      try {
        const response = await fetch(`/api/assets/${assetId}/history`);
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        } else {
          setError('Failed to load asset history');
        }
      } catch (err) {
        setError('Error loading asset history');
        console.error('Error fetching asset history:', err);
      } finally {
        setLoading(false);
      }
    }

    if (assetId) {
      fetchHistory();
    }
  }, [assetId]);

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
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
          <div className="text-sm text-red-600">{error}</div>
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
          <div className="text-center py-4 text-sm text-gray-500">
            No history yet
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-gray-200" />

            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 relative">
                  {/* Timeline dot with icon */}
                  <div className={`flex-shrink-0 w-6 h-6 rounded-full ${getActionColor(entry.action)} flex items-center justify-center text-white z-10`}>
                    {getActionIcon(entry.action)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">
                        {formatActionText(entry)}
                      </span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatRelativeTime(entry.createdAt)}
                      </span>
                    </div>
                    {/* Show detailed changes for UPDATED actions */}
                    {entry.action === 'UPDATED' && entry.notes && (
                      <div className="mt-1 text-xs text-gray-600 space-y-0.5">
                        {entry.notes.split('\n').map((change, i) => (
                          <div key={i} className="truncate" title={change}>
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
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}