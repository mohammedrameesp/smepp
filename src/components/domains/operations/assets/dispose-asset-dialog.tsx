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
  /** External control: whether the dialog is open */
  isOpen?: boolean;
  /** External control: callback when open state changes */
  onOpenChange?: (open: boolean) => void;
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
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
}: DisposeAssetDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled ? (externalOnOpenChange || (() => {})) : setInternalOpen;
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
      {/* Only render trigger when not externally controlled */}
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger || (
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Dispose Asset
            </Button>
          )}
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-red-500" />
            Dispose Asset
          </DialogTitle>
          <DialogDescription>
            Dispose <strong>{assetTag || assetModel}</strong>. This will calculate final depreciation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-3 overflow-y-auto flex-1">
          <Alert variant="error" className="py-2">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Disposing an asset is permanent and removes it from active inventory.
            </AlertDescription>
          </Alert>

          {/* Disposal Date */}
          <div className="space-y-1.5">
            <Label htmlFor="disposalDate" className="text-sm">Disposal Date *</Label>
            <DatePicker
              id="disposalDate"
              value={disposalDate}
              onChange={(value) => setDisposalDate(value)}
              maxDate={new Date()}
              placeholder="Select date"
              required
            />
          </div>

          {/* Disposal Method */}
          <div className="space-y-1.5">
            <Label htmlFor="disposalMethod" className="text-sm">Disposal Method *</Label>
            <Select value={disposalMethod} onValueChange={setDisposalMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select method..." />
              </SelectTrigger>
              <SelectContent>
                {DISPOSAL_METHODS.map((method) => (
                  <SelectItem key={method.value} value={method.value}>
                    {method.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Disposal Proceeds */}
          <div className="space-y-1.5">
            <Label htmlFor="disposalProceeds" className="text-sm">
              Proceeds (QAR) {disposalMethod === 'SOLD' && '*'}
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
              <p className="text-xs text-red-500">Required for "Sold" method</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="disposalNotes" className="text-sm">Notes (Optional)</Label>
            <Textarea
              id="disposalNotes"
              value={disposalNotes}
              onChange={(e) => setDisposalNotes(e.target.value)}
              placeholder="E.g., Sold to vendor XYZ..."
              rows={2}
              maxLength={500}
              className="resize-none"
            />
          </div>

          {/* Preview Section */}
          <div className="border rounded-lg p-3 bg-slate-50 space-y-2">
            <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">Preview</h4>

            {isLoadingPreview ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                Calculating...
              </div>
            ) : previewError ? (
              <p className="text-xs text-red-500">{previewError}</p>
            ) : preview ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Current NBV</p>
                  <p className="font-medium">QAR {preview.currentNetBookValue.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NBV at Disposal</p>
                  <p className="font-medium">QAR {preview.netBookValueAtDisposal.toFixed(2)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Expected {preview.isGain ? 'Gain' : 'Loss'}</p>
                  <p className={`font-medium flex items-center gap-1 ${preview.isGain ? 'text-green-600' : 'text-red-600'}`}>
                    {preview.isGain ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    QAR {Math.abs(preview.expectedGainLoss).toFixed(2)}
                    {preview.finalDepreciationAmount > 0 && (
                      <span className="text-muted-foreground ml-1">
                        (incl. {preview.daysOfDepreciation}d depreciation)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Enter details to see preview</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3">
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
