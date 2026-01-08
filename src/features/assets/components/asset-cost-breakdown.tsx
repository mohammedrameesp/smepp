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
 * - Memory leak prevention with proper cleanup
 * - Race condition protection with AbortController
 * - Type-safe API response validation
 * - Accessible progress bar with ARIA labels
 * - Retry functionality on error
 * - Utilization status indicators for colorblind users
 *
 * Props:
 * - assetId: ID of the asset to fetch utilization for
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

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, AlertCircle, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { z } from 'zod';

// Constants for utilization thresholds
const UTILIZATION_EXCELLENT = 70; // >= 70% is excellent (green)
const UTILIZATION_GOOD = 40; // >= 40% is good (yellow)
// < 40% is poor (red)

// Zod schema for type validation
const UtilizationSchema = z.object({
  totalOwnedDays: z.number().min(0),
  totalAssignedDays: z.number().min(0),
  utilizationPercentage: z.number().min(0).max(100),
});

type Utilization = z.infer<typeof UtilizationSchema>;

interface AssetUtilizationProps {
  assetId: string;
  isShared?: boolean;
}

// Helper to get utilization status
function getUtilizationStatus(percentage: number): {
  label: string;
  color: string;
  bgColor: string;
  icon: React.ReactNode;
} {
  if (percentage >= UTILIZATION_EXCELLENT) {
    return {
      label: 'Excellent',
      color: 'text-green-700',
      bgColor: 'bg-green-500',
      icon: <TrendingUp className="h-4 w-4" aria-hidden="true" />,
    };
  } else if (percentage >= UTILIZATION_GOOD) {
    return {
      label: 'Good',
      color: 'text-yellow-700',
      bgColor: 'bg-yellow-500',
      icon: <Minus className="h-4 w-4" aria-hidden="true" />,
    };
  } else {
    return {
      label: 'Poor',
      color: 'text-red-700',
      bgColor: 'bg-red-500',
      icon: <TrendingDown className="h-4 w-4" aria-hidden="true" />,
    };
  }
}

// Format number with locale
function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function AssetCostBreakdown({ assetId, isShared }: AssetUtilizationProps) {
  const [utilization, setUtilization] = useState<Utilization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    try {
      setIsLoading(true);
      setError(null);

      const utilizationResponse = await fetch(`/api/assets/${assetId}/utilization`, { signal });

      if (!utilizationResponse.ok) {
        throw new Error('Failed to fetch asset utilization data');
      }

      const utilizationData = await utilizationResponse.json();

      // Validate API response with Zod schema
      const validatedData = UtilizationSchema.parse(utilizationData);

      setUtilization(validatedData);
    } catch (err) {
      // Don't set error state if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Error fetching asset utilization:', err);
      setError(err instanceof Error ? err.message : 'Failed to load asset utilization');
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    // Don't fetch for shared assets - they're always available for use
    if (isShared) {
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    fetchData(abortController.signal);

    // Cleanup: abort fetch on unmount or dependency change
    return () => {
      abortController.abort();
    };
  }, [isShared, fetchData]);

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
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" aria-hidden="true" />
            Asset Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-red-600 text-center">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchData()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!utilization) {
    return null;
  }

  const status = getUtilizationStatus(utilization.utilizationPercentage);
  const idleDays = utilization.totalOwnedDays - utilization.totalAssignedDays;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" aria-hidden="true" />
          Asset Utilization
        </CardTitle>
        <CardDescription>
          How much this asset has been actively assigned vs. sitting idle
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Utilization Rate</span>
              <span className={`text-sm font-bold flex items-center gap-1 ${status.color}`}>
                {status.icon}
                {utilization.utilizationPercentage}% ({status.label})
              </span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={utilization.utilizationPercentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Asset utilization: ${utilization.utilizationPercentage}% - ${status.label}`}
              className="w-full bg-gray-200 rounded-full h-3"
            >
              <div
                className={`h-3 rounded-full transition-all duration-300 ${status.bgColor}`}
                style={{ width: `${utilization.utilizationPercentage}%` }}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4 mt-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-600">Total Owned</div>
              <div className="text-lg font-semibold">{formatNumber(utilization.totalOwnedDays)} days</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-sm text-green-700">Assigned</div>
              <div className="text-lg font-semibold text-green-900">{formatNumber(utilization.totalAssignedDays)} days</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-sm text-red-700">Idle</div>
              <div className="text-lg font-semibold text-red-900">
                {formatNumber(idleDays)} days
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
