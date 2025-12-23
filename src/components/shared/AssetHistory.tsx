'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/date-format';

interface AssetHistoryEntry {
  id: string;
  action: string;
  fromUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  toUser?: {
    id: string;
    name: string;
    email: string;
  } | null;
  performer?: {
    id: string;
    name: string;
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

function getActionBadgeVariant(action: string) {
  switch (action) {
    case 'CREATED':
      return 'default';
    case 'ASSIGNED':
      return 'default';
    case 'UNASSIGNED':
      return 'secondary';
    case 'STATUS_CHANGED':
      return 'outline';
    case 'PROJECT_CHANGED':
      return 'outline';
    case 'LOCATION_CHANGED':
      return 'outline';
    case 'UPDATED':
      return 'secondary';
    default:
      return 'secondary';
  }
}

function formatActionText(entry: AssetHistoryEntry): string {
  switch (entry.action) {
    case 'CREATED':
      return 'Asset created';
    case 'ASSIGNED':
      if (entry.fromUser && entry.toUser) {
        return `Reassigned from ${entry.fromUser.name || entry.fromUser.email} to ${entry.toUser.name || entry.toUser.email}`;
      } else if (entry.toUser) {
        return `Assigned to ${entry.toUser.name || entry.toUser.email}`;
      }
      return 'Assigned';
    case 'UNASSIGNED':
      if (entry.fromUser) {
        return `Unassigned from ${entry.fromUser.name || entry.fromUser.email}`;
      }
      return 'Unassigned';
    case 'STATUS_CHANGED':
      if (entry.fromStatus && entry.toStatus) {
        return `Status changed from ${entry.fromStatus} to ${entry.toStatus}`;
      }
      return 'Status changed';
    case 'PROJECT_CHANGED':
      return 'Project changed';
    case 'LOCATION_CHANGED':
      if (entry.fromLocation && entry.toLocation) {
        return `Location changed from ${entry.fromLocation} to ${entry.toLocation}`;
      } else if (entry.toLocation) {
        return `Location set to ${entry.toLocation}`;
      } else if (entry.fromLocation) {
        return `Location removed (was ${entry.fromLocation})`;
      }
      return 'Location changed';
    case 'UPDATED':
      return 'Asset updated';
    default:
      return entry.action;
  }
}

function formatDate(dateString: string): string {
  return formatDateTime(dateString);
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
        <CardHeader>
          <CardTitle>Asset History</CardTitle>
          <CardDescription>Loading timeline...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset History</CardTitle>
          <CardDescription>Error loading timeline</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset History & Timeline</CardTitle>
        <CardDescription>
          Complete timeline of all changes: assignments, status updates, location changes, and more
        </CardDescription>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No history records found for this asset
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">
                  <Badge variant={getActionBadgeVariant(entry.action)}>
                    {entry.action.replace('_', ' ')}
                  </Badge>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900">
                    {formatActionText(entry)}
                  </div>
                  {entry.notes && (
                    <div className="text-sm mt-2 space-y-2">
                      {entry.notes.split('\n').map((line, idx) => {
                        // Check if line contains before/after format: "Field: before → after"
                        const arrowMatch = line.match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
                        if (arrowMatch) {
                          const [, label, before, after] = arrowMatch;
                          return (
                            <div key={idx} className="bg-gray-50 p-2 rounded border border-gray-200">
                              <div className="text-xs font-medium text-gray-500 mb-1">{label.trim()}</div>
                              <div className="flex items-center gap-2 text-xs">
                                <span className="text-red-600">{before.trim()}</span>
                                <span className="text-gray-400">→</span>
                                <span className="text-green-600">{after.trim()}</span>
                              </div>
                            </div>
                          );
                        }
                        // Otherwise show as simple text
                        return <div key={idx} className="text-gray-600">{line}</div>;
                      })}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-sm text-gray-500">
                      {formatDate(entry.createdAt)}
                    </div>
                    {entry.performer && (
                      <div className="text-sm text-gray-500">
                        by <span className={entry.performer.name ? '' : 'font-mono'}>{entry.performer.name || entry.performer.email}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}