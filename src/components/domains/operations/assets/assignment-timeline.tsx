/**
 * @file assignment-timeline.tsx
 * @description Timeline component showing complete asset assignment history
 * @module components/domains/operations/assets
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Calendar, Clock } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/date-format';

interface AssignmentPeriod {
  userId: string;
  userName: string | null;
  userEmail: string;
  projectId: string | null;
  projectName: string | null;
  startDate: string;
  endDate: string | null;
  days: number;
  notes?: string;
}

interface AssignmentTimelineProps {
  assetId: string;
  periods: AssignmentPeriod[];
  purchaseDate?: Date | null;
}

export function AssignmentTimeline({ assetId, periods, purchaseDate }: AssignmentTimelineProps) {
  // Sort periods by start date (newest first)
  const sortedPeriods = [...periods].sort((a, b) =>
    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
  );

  const formatDuration = (days: number) => {
    if (days < 30) {
      return `${days} days`;
    } else if (days < 365) {
      const months = Math.floor(days / 30);
      const remainingDays = days % 30;
      return remainingDays > 0
        ? `${months} month${months > 1 ? 's' : ''}, ${remainingDays} days`
        : `${months} month${months > 1 ? 's' : ''}`;
    } else {
      const years = Math.floor(days / 365);
      const months = Math.floor((days % 365) / 30);
      return `${years} year${years > 1 ? 's' : ''}${months > 0 ? `, ${months} month${months > 1 ? 's' : ''}` : ''}`;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assignment History</CardTitle>
        <CardDescription>
          Complete timeline of all user assignments and usage periods
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Assignment Periods */}
          {sortedPeriods.map((period, index) => (
            <div key={index} className="flex gap-4 pb-4 border-b last:border-b-0">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 rounded-full mt-1 ${
                  period.endDate ? 'bg-gray-400' : 'bg-green-500'
                }`}></div>
                {(index < sortedPeriods.length - 1 || purchaseDate) && (
                  <div className="w-0.5 h-full bg-gray-200 mt-1"></div>
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-2 mb-2">
                  {period.endDate ? (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-300">
                      Completed Assignment
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                      Currently Assigned
                    </Badge>
                  )}
                  <span className="text-sm text-gray-500">
                    {formatDate(period.startDate)}
                    {period.endDate && ` - ${formatDate(period.endDate)}`}
                  </span>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <div>
                    <div className="text-sm font-medium">
                      {period.userName || 'Unknown User'}
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                {period.projectName && (
                  <div className="text-sm text-gray-600 mb-2">
                    <strong>Project:</strong> {period.projectName}
                  </div>
                )}

                {/* Duration */}
                <div className="flex items-center gap-4 mb-2 text-sm">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-gray-600">
                      <strong>Duration:</strong> {formatDuration(period.days)}
                    </span>
                  </div>
                </div>

                {/* Notes */}
                {period.notes && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded mt-2">
                    <strong>Notes:</strong> {period.notes}
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
                  <Badge variant="default">Acquired</Badge>
                  <span className="text-sm text-gray-500">
                    {formatDateTime(purchaseDate)}
                  </span>
                </div>
                <p className="text-sm text-gray-600">Asset purchased and added to inventory</p>
              </div>
            </div>
          )}

          {sortedPeriods.length === 0 && !purchaseDate && (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No assignment history recorded</p>
              <p className="text-sm mt-1">This asset has not been assigned to any user yet</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
