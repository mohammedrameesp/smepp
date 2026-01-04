/**
 * @file dispose-asset-dialog.tsx
 * @description Dialog for disposing assets with IFRS-compliant depreciation and gain/loss preview
 * @module components/domains/operations/assets
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { toInputDateString } from '@/lib/date-format';
import { toast } from 'sonner';
import {
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
  DollarSign,
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface DisposalPreview {
  currentNetBookValue: number;
  finalDepreciationAmount: number;
  netBookValueAtDisposal: number;
  expectedGainLoss: number;
  isGain: boolean;
  daysOfDepreciation: number;
}

interface DisposeAssetDialogProps {
  assetId: string;
  assetTag?: string | null;
  assetModel: string;
  assetStatus: string;
  trigger?: React.ReactNode;
}

const DISPOSAL_METHODS = [
  { value: 'SOLD', label: 'Sold', description: 'Asset sold to a third party' },
  { value: 'SCRAPPED', label: 'Scrapped', description: 'Asset physically destroyed/discarded' },
  { value: 'DONATED', label: 'Donated', description: 'Asset given to charity/organization' },
  { value: 'WRITTEN_OFF', label: 'Written Off', description: 'Theft, loss, or obsolete' },
  { value: 'TRADED_IN', label: 'Traded In', description: 'Asset traded for new purchase' },
];

export function DisposeAssetDialog({
  assetId,
  assetTag,
  assetModel,
  assetStatus,
  trigger,
}: DisposeAssetDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Form state
  const [disposalDate, setDisposalDate] = useState(toInputDateString(new Date()));
  const [disposalMethod, setDisposalMethod] = useState<string>('');
  const [disposalProceeds, setDisposalProceeds] = useState<string>('0');
  const [disposalNotes, setDisposalNotes] = useState('');

  // Preview state
  const [preview, setPreview] = useState<DisposalPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Validation
  const proceedsValue = parseFloat(disposalProceeds) || 0;
  const isSoldWithoutProceeds = disposalMethod === 'SOLD' && proceedsValue <= 0;
  const canSubmit = disposalDate && disposalMethod && !isSoldWithoutProceeds;

  // Fetch preview when date or proceeds change
  const fetchPreview = useCallback(async () => {
    if (!open) return;

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch(
        `/api/assets/${assetId}/dispose?date=${disposalDate}&proceeds=${proceedsValue}`
      );

      if (response.ok) {
        const data = await response.json();
        setPreview(data.preview);
      } else {
        const error = await response.json();
        setPreviewError(error.error || 'Unable to calculate preview');
        setPreview(null);
      }
    } catch {
      setPreviewError('Failed to fetch disposal preview');
      setPreview(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [assetId, disposalDate, proceedsValue, open]);

  useEffect(() => {
    const timeoutId = setTimeout(fetchPreview, 300);
    return () => clearTimeout(timeoutId);
  }, [fetchPreview]);

  const handleDispose = async () => {
    if (!canSubmit) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/assets/${assetId}/dispose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposalDate,
          disposalMethod,
          disposalProceeds: proceedsValue,
          disposalNotes: disposalNotes || undefined,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message || 'Asset disposed successfully');
        setOpen(false);
        router.refresh();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to dispose asset', { duration: 10000 });
      }
    } catch {
      toast.error('An error occurred while disposing the asset', { duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form on close
      setDisposalDate(toInputDateString(new Date()));
      setDisposalMethod('');
      setDisposalProceeds('0');
      setDisposalNotes('');
      setPreview(null);
      setPreviewError(null);
    }
  };

  // Don't render for already disposed assets
  if (assetStatus === 'DISPOSED') {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Dispose Asset
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Dispose Asset
          </DialogTitle>
          <DialogDescription>
            Dispose <strong>{assetTag || assetModel}</strong>. This action will calculate final depreciation and record gain/loss.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="error">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Warning:</strong> Disposing an asset is permanent. The asset will be marked as disposed and removed from active inventory.
            </AlertDescription>
          </Alert>

          {/* Disposal Date */}
          <div className="space-y-2">
            <Label htmlFor="disposalDate">Disposal Date *</Label>
            <DatePicker
              id="disposalDate"
              value={disposalDate}
              onChange={(value) => setDisposalDate(value)}
              maxDate={new Date()}
              placeholder="Select disposal date"
              required
            />
            <p className="text-xs text-muted-foreground">
              When was the asset disposed? Cannot be in the future.
            </p>
          </div>

          {/* Disposal Method */}
          <div className="space-y-2">
            <Label htmlFor="disposalMethod">Disposal Method *</Label>
            <Select value={disposalMethod} onValueChange={setDisposalMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select disposal method..." />
              </SelectTrigger>
              <SelectContent>
                {DISPOSAL_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    <div className="flex flex-col">
                      <span>{method.label}</span>
                      <span className="text-xs text-muted-foreground">{method.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disposal Proceeds */}
          <div className="space-y-2">
            <Label htmlFor="disposalProceeds">
              Disposal Proceeds (QAR) {disposalMethod === 'SOLD' && '*'}
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="disposalProceeds"
                type="number"
                min="0"
                step="0.01"
                value={disposalProceeds}
                onChange={(e) => setDisposalProceeds(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
            {isSoldWithoutProceeds && (
              <p className="text-xs text-red-500">
                Proceeds are required when disposal method is "Sold"
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              {disposalMethod === 'SOLD' || disposalMethod === 'TRADED_IN'
                ? 'Amount received from the sale/trade'
                : 'Usually 0 for scrapped/donated/written-off assets'}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="disposalNotes">Notes (Optional)</Label>
            <Textarea
              id="disposalNotes"
              value={disposalNotes}
              onChange={(e) => setDisposalNotes(e.target.value)}
              placeholder="E.g., Sold to vendor XYZ, Buyer reference #123..."
              rows={2}
              maxLength={500}
            />
          </div>

          {/* Preview Section */}
          <div className="border rounded-lg p-4 bg-slate-50 space-y-3">
            <h4 className="font-medium text-sm">Disposal Preview</h4>

            {isLoadingPreview ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating...
              </div>
            ) : previewError ? (
              <p className="text-sm text-red-500">{previewError}</p>
            ) : preview ? (
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Current NBV</p>
                  <p className="font-medium">QAR {preview.currentNetBookValue.toFixed(2)}</p>
                </div>
                {preview.finalDepreciationAmount > 0 && (
                  <div>
                    <p className="text-muted-foreground">Final Depreciation</p>
                    <p className="font-medium">
                      QAR {preview.finalDepreciationAmount.toFixed(2)}
                      <span className="text-xs text-muted-foreground ml-1">
                        ({preview.daysOfDepreciation} days)
                      </span>
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">NBV at Disposal</p>
                  <p className="font-medium">QAR {preview.netBookValueAtDisposal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expected {preview.isGain ? 'Gain' : 'Loss'}</p>
                  <p className={`font-medium flex items-center gap-1 ${preview.isGain ? 'text-green-600' : 'text-red-600'}`}>
                    {preview.isGain ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                    QAR {Math.abs(preview.expectedGainLoss).toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Enter disposal details to see preview
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDispose}
            disabled={isLoading || !canSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Disposing...
              </>
            ) : (
              'Confirm Disposal'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
