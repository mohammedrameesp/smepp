/**
 * @file asset-cost-breakdown.tsx
 * @description Card component displaying asset utilization metrics and statistics
 * @module components/domains/operations/assets
 *
 * Features:
 * - Calculates and displays asset utilization percentage
 * - Shows total owned days, assigned days, and idle days
 * - Color-coded progress bar (green >= 70%, yellow >= 40%, red < 40%)
 * - Automatically hides for shared assets (always available)
 * - Loading and error states with appropriate UI feedback
 *
 * Props:
 * - assetId: ID of the asset to fetch utilization for
 * - purchaseDate: Asset purchase date (used for owned days calculation)
 * - isShared: If true, component renders nothing (shared assets always available)
 *
 * API Dependencies:
 * - GET /api/assets/[id]/utilization - Fetches utilization metrics
 *
 * Usage:
 * - Used on asset detail page (/admin/assets/[id])
 * - Helps track ROI by showing how much an asset is actually being used
 *
 * Access: Admin only
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity } from 'lucide-react';

interface Utilization {
  totalOwnedDays: number;
  totalAssignedDays: number;
  utilizationPercentage: number;
}

interface AssetUtilizationProps {
  assetId: string;
  purchaseDate?: Date | null;
  isShared?: boolean;
}

export function AssetCostBreakdown({ assetId, purchaseDate, isShared }: AssetUtilizationProps) {
  const [utilization, setUtilization] = useState<Utilization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Don't fetch for shared assets - they're always available for use
    if (isShared) {
      setIsLoading(false);
      return;
    }
    fetchData();
  }, [assetId, isShared]);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      const utilizationResponse = await fetch(`/api/assets/${assetId}/utilization`);

      if (!utilizationResponse.ok) {
        throw new Error('Failed to fetch asset utilization data');
      }

      const utilizationData = await utilizationResponse.json();

      setUtilization(utilizationData);
    } catch (err) {
      console.error('Error fetching asset utilization:', err);
      setError(err instanceof Error ? err.message : 'Failed to load asset utilization');
    } finally {
      setIsLoading(false);
    }
  };

  // Don't show utilization for shared assets - they're always available for use
  if (isShared) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Utilization</CardTitle>
          <CardDescription>Loading asset utilization...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            Loading...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Asset Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (!utilization) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Asset Utilization
        </CardTitle>
        <CardDescription>
          How much this asset has been actively assigned vs. sitting idle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm font-medium">Utilization Rate</span>
              <span className="text-sm font-bold">{utilization.utilizationPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full ${
                  utilization.utilizationPercentage >= 70 ? 'bg-green-500' :
                  utilization.utilizationPercentage >= 40 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${utilization.utilizationPercentage}%` }}
              ></div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Total Owned</div>
              <div className="text-lg font-semibold">{utilization.totalOwnedDays} days</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-green-700">Assigned</div>
              <div className="text-lg font-semibold text-green-900">{utilization.totalAssignedDays} days</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-sm text-red-700">Idle</div>
              <div className="text-lg font-semibold text-red-900">
                {utilization.totalOwnedDays - utilization.totalAssignedDays} days
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
