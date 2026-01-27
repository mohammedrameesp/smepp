/**
 * @file leave-request-history.tsx
 * @description Timeline component displaying leave request action history
 * @module components/domains/hr
 */
'use client';

import { LeaveStatus } from '@prisma/client';
import { Clock, CheckCircle, XCircle, Ban, Edit, FileText } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface HistoryEntry {
  id: string;
  action: string;
  oldStatus?: LeaveStatus | null;
  newStatus?: LeaveStatus | null;
  notes?: string | null;
  changes?: Record<string, unknown> | null;
  createdAt: string;
  performedBy: {
    id: string;
    name: string | null;
  };
}

interface LeaveRequestHistoryProps {
  history: HistoryEntry[];
}

function getActionIcon(action: string) {
  switch (action) {
    case 'CREATED':
      return <FileText className={`${ICON_SIZES.sm} text-blue-500`} />;
    case 'APPROVED':
      return <CheckCircle className={`${ICON_SIZES.sm} text-green-500`} />;
    case 'REJECTED':
      return <XCircle className={`${ICON_SIZES.sm} text-red-500`} />;
    case 'CANCELLED':
      return <Ban className={`${ICON_SIZES.sm} text-gray-500`} />;
    case 'UPDATED':
      return <Edit className={`${ICON_SIZES.sm} text-amber-500`} />;
    default:
      return <Clock className={`${ICON_SIZES.sm} text-gray-400`} />;
  }
}

function getActionText(action: string): string {
  switch (action) {
    case 'CREATED':
      return 'Request submitted';
    case 'APPROVED':
      return 'Request approved';
    case 'REJECTED':
      return 'Request rejected';
    case 'CANCELLED':
      return 'Request cancelled';
    case 'UPDATED':
      return 'Request updated';
    default:
      return action;
  }
}

export function LeaveRequestHistory({ history }: LeaveRequestHistoryProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-gray-500 text-center py-4">
        No history available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry, index) => (
        <div key={entry.id} className="flex gap-4">
          {/* Timeline line */}
          <div className="flex flex-col items-center">
            <div className="p-1.5 bg-gray-100 rounded-full">
              {getActionIcon(entry.action)}
            </div>
            {index < history.length - 1 && (
              <div className="w-px h-full bg-gray-200 my-1" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{getActionText(entry.action)}</p>
                <p className="text-xs text-gray-500">
                  by {entry.performedBy.name || 'Unknown'}
                </p>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(entry.createdAt).toLocaleString('en-GB', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            {entry.notes && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
                {entry.notes}
              </div>
            )}

            {entry.changes && Object.keys(entry.changes).length > 0 && (
              <div className="mt-2 text-xs text-gray-500">
                Changed fields: {Object.keys(entry.changes).join(', ')}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
