'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { TrendingDown, Calculator, Settings, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';

interface DepreciationCategory {
  id: string;
  name: string;
  code: string;
  annualRate: number;
  usefulLifeYears: number;
  description: string | null;
}

interface AssetDepreciationData {
  id: string;
  assetTag: string | null;
  model: string;
  acquisitionCost: number;
  salvageValue: number;
  accumulatedDepreciation: number;
  netBookValue: number;
  lastDepreciationDate: string | null;
  isFullyDepreciated: boolean;
  depreciationCategory: DepreciationCategory | null;
}

interface DepreciationCardProps {
  assetId: string;
  onUpdate?: () => void;
}

export function DepreciationCard({ assetId, onUpdate }: DepreciationCardProps) {
  const { data: session } = useSession();
  const [asset, setAsset] = useState<AssetDepreciationData | null>(null);
  const [categories, setCategories] = useState<DepreciationCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Assign category dialog state
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [salvageValue, setSalvageValue] = useState<string>('0');
  const [isAssigning, setIsAssigning] = useState(false);

  // Calculate depreciation state
  const [isCalculating, setIsCalculating] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch asset depreciation data and categories in parallel
      const [depResponse, catResponse] = await Promise.all([
        fetch(`/api/assets/${assetId}/depreciation`),
        fetch('/api/depreciation/categories'),
      ]);

      if (!depResponse.ok) {
        throw new Error('Failed to fetch depreciation data');
      }

      const depData = await depResponse.json();
      setAsset(depData.asset);

      if (catResponse.ok) {
        const catData = await catResponse.json();
        setCategories(catData.categories || []);
      }
    } catch (err) {
      console.error('Error fetching depreciation data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load depreciation data');
    } finally {
      setIsLoading(false);
    }
  }, [assetId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAssignCategory = async () => {
    if (!selectedCategoryId) {
      toast.error('Please select a depreciation category');
      return;
    }

    try {
      setIsAssigning(true);

      const response = await fetch(`/api/assets/${assetId}/depreciation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_category',
          depreciationCategoryId: selectedCategoryId,
          salvageValue: parseFloat(salvageValue) || 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to assign category');
      }

      toast.success('Depreciation category assigned successfully');
      setIsAssignDialogOpen(false);
      fetchData();
      onUpdate?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to assign category');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCalculateDepreciation = async () => {
    try {
      setIsCalculating(true);

      const response = await fetch(`/api/assets/${assetId}/depreciation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate depreciation');
      }

      if (data.skipped) {
        toast.info(data.message || 'Depreciation calculation skipped');
      } else {
        toast.success('Depreciation calculated successfully');
        fetchData();
        onUpdate?.();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to calculate depreciation');
    } finally {
      setIsCalculating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Depreciation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading depreciation data...
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
            <TrendingDown className="h-5 w-5" />
            Depreciation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!asset) return null;

  const hasCategory = !!asset.depreciationCategory;
  const percentDepreciated =
    asset.acquisitionCost > 0
      ? Math.min(100, (asset.accumulatedDepreciation / (asset.acquisitionCost - asset.salvageValue)) * 100)
      : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5" />
              Depreciation
            </CardTitle>
            <CardDescription>
              {hasCategory
                ? `${asset.depreciationCategory!.name} - ${asset.depreciationCategory!.annualRate}% per year`
                : 'No depreciation category assigned'}
            </CardDescription>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-1" />
                    {hasCategory ? 'Change' : 'Configure'}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configure Depreciation</DialogTitle>
                    <DialogDescription>
                      Assign a depreciation category to this asset. This will reset any existing depreciation records.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="category">Depreciation Category</Label>
                      <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name} ({cat.annualRate}% / {cat.usefulLifeYears} years)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="salvage">Salvage Value (QAR)</Label>
                      <Input
                        id="salvage"
                        type="number"
                        min="0"
                        value={salvageValue}
                        onChange={(e) => setSalvageValue(e.target.value)}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">
                        The estimated value at the end of useful life
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAssignCategory} disabled={isAssigning}>
                      {isAssigning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {hasCategory ? 'Update Category' : 'Assign Category'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              {hasCategory && !asset.isFullyDepreciated && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleCalculateDepreciation}
                  disabled={isCalculating}
                >
                  {isCalculating ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Calculator className="h-4 w-4 mr-1" />
                  )}
                  Calculate
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!hasCategory ? (
          <div className="text-center py-8 text-muted-foreground">
            <TrendingDown className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No depreciation configured for this asset.</p>
            {isAdmin && (
              <p className="text-sm mt-1">
                Click &quot;Configure&quot; to assign a depreciation category.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status indicator */}
            <div className="flex items-center gap-2">
              {asset.isFullyDepreciated ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <span className="text-green-600 font-medium">Fully Depreciated</span>
                </>
              ) : (
                <>
                  <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
                  <span className="text-muted-foreground">Active Depreciation</span>
                </>
              )}
            </div>

            {/* Progress bar */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Depreciation Progress</span>
                <span className="text-sm font-bold">{percentDepreciated.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all duration-500 ${
                    asset.isFullyDepreciated
                      ? 'bg-green-500'
                      : percentDepreciated >= 80
                        ? 'bg-orange-500'
                        : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(100, percentDepreciated)}%` }}
                />
              </div>
            </div>

            {/* Values grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-muted-foreground">Acquisition Cost</div>
                <div className="text-lg font-semibold">
                  {asset.acquisitionCost.toLocaleString()} QAR
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded">
                <div className="text-xs text-muted-foreground">Salvage Value</div>
                <div className="text-lg font-semibold">{asset.salvageValue.toLocaleString()} QAR</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded">
                <div className="text-xs text-red-700 dark:text-red-400">Accumulated</div>
                <div className="text-lg font-semibold text-red-900 dark:text-red-300">
                  {asset.accumulatedDepreciation.toLocaleString()} QAR
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded">
                <div className="text-xs text-green-700 dark:text-green-400">Net Book Value</div>
                <div className="text-lg font-semibold text-green-900 dark:text-green-300">
                  {asset.netBookValue.toLocaleString()} QAR
                </div>
              </div>
            </div>

            {/* Last depreciation date */}
            {asset.lastDepreciationDate && (
              <div className="text-sm text-muted-foreground pt-2 border-t">
                Last calculated:{' '}
                {new Date(asset.lastDepreciationDate).toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
