'use client';

import { SubscriptionHistory, SubscriptionHistoryAction, SubscriptionStatus } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate, formatDateTime } from '@/lib/date-format';

interface HistoryTimelineProps {
  history: (SubscriptionHistory & {
    performer?: { name?: string | null; email: string } | null;
  })[];
  purchaseDate?: Date | null;
  cancelledAt?: Date | null;
  reactivatedAt?: Date | null;
}

export function HistoryTimeline({ history, purchaseDate, cancelledAt, reactivatedAt }: HistoryTimelineProps) {
  const getActionBadge = (action: SubscriptionHistoryAction) => {
    switch (action) {
      case 'REACTIVATED':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Reactivated</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      case 'RENEWED':
        return <Badge variant="default">Renewed</Badge>;
      case 'REASSIGNED':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">Reassigned</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  const getStatusBadge = (status?: SubscriptionStatus | null) => {
    if (!status) return null;

    switch (status) {
      case 'ACTIVE':
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Active</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Sort history by creation date (newest first)
  const sortedHistory = [...history].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subscription History</CardTitle>
        <CardDescription>
          Complete timeline of all status changes and lifecycle events
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* History Events */}
          {sortedHistory.map((entry, index) => (
            <div key={entry.id} className="flex gap-4 pb-4 border-b last:border-b-0">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  entry.action === 'REACTIVATED' ? 'bg-green-500' :
                  entry.action === 'CANCELLED' ? 'bg-red-500' :
                  entry.action === 'REASSIGNED' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
                {(index < sortedHistory.length - 1 || purchaseDate) && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  {getActionBadge(entry.action)}
                  <span className="text-sm text-gray-500">
                    {formatDateTime(entry.createdAt)}
                  </span>
                </div>

                {/* Status Transition */}
                {entry.oldStatus && entry.newStatus && (
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-gray-600">Status:</span>
                    {getStatusBadge(entry.oldStatus)}
                    <span className="text-gray-400">→</span>
                    {getStatusBadge(entry.newStatus)}
                  </div>
                )}

                {/* Cancellation Date */}
                {entry.action === 'CANCELLED' && cancelledAt && (
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Cancelled On:</strong> {formatDate(cancelledAt)}
                  </div>
                )}

                {/* Reactivation Date */}
                {entry.action === 'REACTIVATED' && reactivatedAt && (
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Reactivated On:</strong> {formatDate(reactivatedAt)}
                  </div>
                )}

                {/* Renewal Date Changes */}
                {entry.action === 'REACTIVATED' && entry.newRenewalDate && (
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>New Renewal Date:</strong> {formatDate(entry.newRenewalDate)}
                  </div>
                )}

                {/* Assignment Date for Reassignments and Initial Assignments */}
                {(entry.action === 'REASSIGNED' || entry.action === 'CREATED') && entry.assignmentDate && (
                  <div className="text-sm text-gray-600 mb-1">
                    <strong>Assignment Date:</strong> {formatDate(entry.assignmentDate)}
                  </div>
                )}

                {/* Notes */}
                {entry.notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                    <strong>Notes:</strong> {entry.notes}
                  </div>
                )}

                {/* Performer */}
                {entry.performer && (
                  <div className="text-xs text-gray-500 mt-1">
                    By: <span className={entry.performer.name ? '' : 'font-mono'}>{entry.performer.name || entry.performer.email}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Purchase/Creation Event - Show at the bottom (oldest) */}
          {purchaseDate && (
            <div className="flex gap-4 pb-4 border-b-0">
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-500 mt-1"></div>
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="default">Created</Badge>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(purchaseDate)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Subscription purchased and activated</p>
              </div>
            </div>
          )}

          {sortedHistory.length === 0 && !purchaseDate && (
            <div className="text-center py-8 text-gray-500">
              No history events recorded
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
