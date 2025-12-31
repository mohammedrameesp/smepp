/**
 * @file user-asset-history.tsx
 * @description Displays user's asset assignment history including current and past assignments
 * @module components/domains/system/users
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Clock, Calendar } from 'lucide-react';
import { formatDate as formatDateUtil } from '@/lib/date-format';

interface AssignmentPeriod {
  userId: string;
  userName: string | null;
  userEmail: string;
  projectId: string | null;
  projectName: string | null;
  startDate: Date;
  endDate: Date | null;
  days: number;
  notes?: string;
}

interface Asset {
  id: string;
  model: string;
  type: string;
  assetTag: string | null;
  status: string;
  userPeriods: AssignmentPeriod[];
  totalDays: number;
  currentPeriod?: AssignmentPeriod | null;
  isCurrentlyAssigned: boolean;
}

interface UserAssetHistoryProps {
  assets: Asset[];
  viewMode?: 'admin' | 'employee';
}

export function UserAssetHistory({ assets, viewMode = 'admin' }: UserAssetHistoryProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'IN_USE':
        return <Badge className="bg-green-100 text-green-800 border-green-300">In Use</Badge>;
      case 'SPARE':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Spare</Badge>;
      case 'REPAIR':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Repair</Badge>;
      case 'DISPOSED':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Disposed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (date: Date) => {
    return formatDateUtil(date);
  };

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

  const currentAssets = assets.filter(a => a.isCurrentlyAssigned);
  const pastAssets = assets.filter(a => !a.isCurrentlyAssigned);

  return (
    <div className="space-y-6">
      {/* Currently Assigned Assets */}
      <Card>
        <CardHeader>
          <CardTitle>Currently Assigned Assets ({currentAssets.length})</CardTitle>
          <CardDescription>
            Assets currently in use by this user
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentAssets.length > 0 ? (
            <div className="space-y-4">
              {currentAssets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">{asset.model}</h3>
                        {getStatusBadge(asset.status)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {asset.assetTag && <span className="font-mono mr-2">{asset.assetTag}</span>}
                        {asset.type}
                      </div>
                    </div>
                    <Link href={viewMode === 'admin' ? `/admin/assets/${asset.id}` : `/employee/assets/${asset.id}`}>
                      <Button variant="outline" size="sm">View Details</Button>
                    </Link>
                  </div>

                  {/* Current Assignment Info */}
                  {asset.currentPeriod && (
                    <div className="bg-green-50 border border-green-200 rounded p-3 mt-3">
                      <div>
                        <div className="text-sm text-green-700 font-medium mb-1">Current Assignment</div>
                        <div className="text-sm text-gray-700">
                          <Clock className="h-3 w-3 inline mr-1" />
                          Started: {formatDate(asset.currentPeriod.startDate)}
                        </div>
                        <div className="text-sm text-gray-700">
                          Duration: {formatDuration(asset.currentPeriod.days)}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Total Usage Summary */}
                  <div className="grid md:grid-cols-2 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-600">Total Time with Asset</div>
                      <div className="font-semibold">{formatDuration(asset.totalDays)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Assignment Periods</div>
                      <div className="font-semibold">{asset.userPeriods.length}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No assets currently assigned to this user
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Assignments */}
      {pastAssets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Asset Assignments ({pastAssets.length})</CardTitle>
            <CardDescription>
              Assets previously assigned to this user
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastAssets.map((asset) => (
                <div key={asset.id} className="border rounded-lg p-4 bg-gray-50">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{asset.model}</h3>
                        {getStatusBadge(asset.status)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {asset.assetTag && <span className="font-mono mr-2">{asset.assetTag}</span>}
                        {asset.type}
                      </div>
                    </div>
                    <Link href={viewMode === 'admin' ? `/admin/assets/${asset.id}` : `/employee/assets/${asset.id}`}>
                      <Button variant="outline" size="sm">View History</Button>
                    </Link>
                  </div>

                  {/* Assignment History Summary */}
                  <div className="mt-3">
                    <div className="text-xs text-gray-600 mb-2">Assignment History:</div>
                    {[...asset.userPeriods].reverse().map((period, index) => (
                      <div key={index} className="text-sm text-gray-700 mb-1">
                        <Calendar className="h-3 w-3 inline mr-1" />
                        {formatDate(period.startDate)} - {period.endDate ? formatDate(period.endDate) : 'Present'}
                        {' '}({formatDuration(period.days)})
                      </div>
                    ))}
                  </div>

                  {/* Total Summary */}
                  <div className="grid md:grid-cols-2 gap-4 mt-3 pt-3 border-t">
                    <div>
                      <div className="text-xs text-gray-600">Total Time with Asset</div>
                      <div className="font-semibold">{formatDuration(asset.totalDays)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600">Assignment Periods</div>
                      <div className="font-semibold">{asset.userPeriods.length}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
