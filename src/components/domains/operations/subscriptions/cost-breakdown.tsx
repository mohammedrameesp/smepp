/**
 * @file cost-breakdown.tsx
 * @description Card component showing subscription cost breakdown by active periods
 * @module components/domains/operations/subscriptions
 */
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatDate } from '@/lib/date-format';

interface ActivePeriod {
  startDate: string;
  endDate: string | null;
  renewalDate: string;
  months: number;
  cost: number;
}

interface CostBreakdown {
  totalCost: number;
  currency: string;
  billingCycle: string;
  activePeriods: ActivePeriod[];
}

interface CostBreakdownProps {
  subscriptionId: string;
}

export function CostBreakdown({ subscriptionId }: CostBreakdownProps) {
  const [costData, setCostData] = useState<CostBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCostData();
  }, [subscriptionId]);

  const fetchCostData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/subscriptions/${subscriptionId}/cost`);

      if (!response.ok) {
        throw new Error('Failed to fetch cost data');
      }

      const data = await response.json();
      setCostData(data);
    } catch (err) {
      console.error('Error fetching cost data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load cost data');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cost Breakdown</CardTitle>
          <CardDescription>Loading cost information...</CardDescription>
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
          <CardTitle>Cost Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="error">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!costData) {
    return null;
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'QAR' ? 'QAR' : 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
        <CardDescription>
          Total cost calculated based on active periods only
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Total Cost */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-700 mb-1">Total Cost (Active Periods Only)</div>
            <div className="text-3xl font-bold text-blue-900">
              {formatCurrency(costData.totalCost, costData.currency)}
            </div>
          </div>

          {/* Active Periods */}
          <div>
            <h4 className="font-semibold mb-3">Active Periods</h4>
            {costData.activePeriods.length > 0 ? (
              <div className="space-y-3">
                {costData.activePeriods.map((period, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-medium text-sm">
                          Period {index + 1}
                          {!period.endDate && (
                            <Badge variant="outline" className="ml-2 bg-green-50 text-green-700 border-green-300">
                              Currently Active
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          <strong>Start:</strong> {formatDate(period.startDate)}
                          {period.endDate && (
                            <>
                              {' • '}
                              <strong>End:</strong> {formatDate(period.endDate)}
                            </>
                          )}
                        </div>
                        {costData.billingCycle !== 'ONE_TIME' && (
                          <div className="text-sm text-gray-600">
                            <strong>Renewal Date:</strong> {formatDate(period.renewalDate)}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          {formatCurrency(period.cost, costData.currency)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {period.months.toFixed(1)} months
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                No active periods recorded
              </div>
            )}
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> This cost calculation only includes periods when the subscription was active.
              Cancelled periods are excluded from the total cost.
            </AlertDescription>
          </Alert>
        </div>
      </CardContent>
    </Card>
  );
}
