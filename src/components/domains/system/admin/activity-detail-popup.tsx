'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-format';

interface Activity {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  payload: any;
  at: Date;
  actorUser: {
    name: string | null;
    email: string;
  } | null;
}

interface Props {
  activities: Activity[];
}

export function ActivityDetailPopup({ activities }: Props) {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  const getActionIcon = (action: string) => {
    if (action.includes('CREATE')) return '➕';
    if (action.includes('UPDATE')) return '✏️';
    if (action.includes('DELETE')) return '🗑️';
    if (action.includes('ASSIGN')) return '👤';
    return '📝';
  };

  const getActionColor = (action: string) => {
    if (action.includes('CREATE')) return 'bg-green-500';
    if (action.includes('UPDATE')) return 'bg-blue-500';
    if (action.includes('DELETE')) return 'bg-red-500';
    if (action.includes('ASSIGN')) return 'bg-purple-500';
    return 'bg-gray-500';
  };

  const formatActionName = (action: string) => {
    return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getReadableDetails = (activity: Activity) => {
    if (!activity.payload) return null;

    try {
      const data = typeof activity.payload === 'string' ? JSON.parse(activity.payload) : activity.payload;

      // Create human-readable description
      const details: Array<{ label: string; value: string; oldValue?: string }> = [];

      // Handle new format with changes array (for ASSET_UPDATED)
      if (data.changes && Array.isArray(data.changes) && data.changes.length > 0) {
        // Parse each change entry: "Field: oldValue → newValue"
        data.changes.forEach((change: string) => {
          const arrowMatch = change.match(/^(.+?):\s*(.+?)\s*→\s*(.+)$/);
          if (arrowMatch) {
            const [, label, oldValue, newValue] = arrowMatch;
            details.push({
              label: label.trim(),
              value: newValue.trim(),
              oldValue: oldValue.trim()
            });
          } else {
            // Fallback: if no arrow, just show as simple detail
            const colonMatch = change.match(/^(.+?):\s*(.+)$/);
            if (colonMatch) {
              const [, label, value] = colonMatch;
              details.push({ label: label.trim(), value: value.trim() });
            }
          }
        });
      }

      if (data.assetName) details.push({ label: 'Asset', value: data.assetName });
      if (data.assetType) details.push({ label: 'Type', value: data.assetType });
      if (data.assetModel) details.push({ label: 'Model', value: data.assetModel });
      if (data.subscriptionName) details.push({ label: 'Subscription', value: data.subscriptionName });
      if (data.userName) details.push({ label: 'User', value: data.userName });
      if (data.projectName) details.push({ label: 'Project', value: data.projectName });

      // Handle assignment changes
      if (data.fromUser && data.toUser) {
        details.push({
          label: 'User Assignment',
          value: data.toUser,
          oldValue: data.fromUser
        });
      } else if (data.fromUser) {
        details.push({ label: 'Unassigned From', value: data.fromUser });
      } else if (data.toUser) {
        details.push({ label: 'Assigned To', value: data.toUser });
      }

      // Handle status changes
      if (data.oldStatus && data.newStatus) {
        details.push({
          label: 'Status',
          value: data.newStatus,
          oldValue: data.oldStatus
        });
      } else if (data.status) {
        details.push({ label: 'Status', value: data.status });
      }

      // Handle project changes
      if (data.oldProject && data.newProject) {
        details.push({
          label: 'Project',
          value: data.newProject,
          oldValue: data.oldProject
        });
      } else if (data.oldProject) {
        details.push({ label: 'Removed From Project', value: data.oldProject });
      } else if (data.newProject) {
        details.push({ label: 'Added To Project', value: data.newProject });
      }

      if (data.amount) details.push({ label: 'Amount', value: data.amount });

      return details.length > 0 ? details : null;
    } catch (e) {
      return null;
    }
  };

  return (
    <>
      <div className="space-y-2">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-200"
            onClick={() => setSelectedActivity(activity)}
          >
            <div className={`w-8 h-8 ${getActionColor(activity.action)} rounded-full flex items-center justify-center flex-shrink-0`}>
              <span className="text-lg">{getActionIcon(activity.action)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {formatActionName(activity.action)}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {activity.actorUser?.name || activity.actorUser?.email || 'System'} • {formatDate(activity.at)}
              </div>
            </div>
            <svg
              className="w-5 h-5 text-gray-400 flex-shrink-0"
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </div>
        ))}
      </div>

      <AlertDialog open={!!selectedActivity} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <AlertDialogContent className="max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3 pb-2 border-b">
              <div className={`w-12 h-12 ${getActionColor(selectedActivity?.action || '')} rounded-full flex items-center justify-center flex-shrink-0`}>
                <span className="text-2xl">{getActionIcon(selectedActivity?.action || '')}</span>
              </div>
              <div>
                <div className="text-lg font-semibold">
                  {selectedActivity && formatActionName(selectedActivity.action)}
                </div>
                <div className="text-sm font-normal text-gray-500">
                  {selectedActivity && formatDate(selectedActivity.at)}
                </div>
              </div>
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-4 pt-4">
                {/* Who performed the action */}
                <div>
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    Performed By
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm font-medium text-gray-900">
                      {selectedActivity?.actorUser?.name || 'System User'}
                    </div>
                  </div>
                </div>

                {/* What was affected */}
                {selectedActivity?.entityType && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Affected Item
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <Badge variant="secondary" className="text-sm">
                        {selectedActivity.entityType}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Details */}
                {selectedActivity && getReadableDetails(selectedActivity) && (
                  <div>
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Details
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                      {getReadableDetails(selectedActivity)!.map((detail, index) => (
                        <div key={index}>
                          {detail.oldValue ? (
                            // Show before/after for changes
                            <div className="space-y-1">
                              <div className="text-xs font-medium text-gray-500">{detail.label}</div>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 bg-red-50 border border-red-200 rounded px-3 py-2">
                                  <div className="text-xs text-red-600 font-medium mb-0.5">Before</div>
                                  <div className="text-sm text-red-900">{detail.oldValue}</div>
                                </div>
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" strokeWidth="2" stroke="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 5l7 7-7 7" />
                                </svg>
                                <div className="flex-1 bg-green-50 border border-green-200 rounded px-3 py-2">
                                  <div className="text-xs text-green-600 font-medium mb-0.5">After</div>
                                  <div className="text-sm text-green-900">{detail.value}</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            // Show simple detail
                            <div className="flex items-start gap-2">
                              <span className="text-gray-400 mt-0.5">•</span>
                              <div>
                                <span className="text-sm font-medium text-gray-600">{detail.label}:</span>
                                <span className="text-sm text-gray-900 ml-2">{detail.value}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Close Button */}
                <div className="flex justify-end pt-4 border-t">
                  <button
                    onClick={() => setSelectedActivity(null)}
                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
