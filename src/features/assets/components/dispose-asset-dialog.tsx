/**
 * @file dispose-asset-dialog.tsx
 * @description Dialog for disposing assets with IFRS-compliant depreciation and gain/loss preview
 * @module components/domains/operations/assets
 *
 * Features:
 * - IFRS-compliant disposal with final depreciation calculation
 * - Real-time preview showing expected gain/loss
 * - Multiple disposal methods (Sold, Scrapped, Donated, Written Off, Traded In)
 * - Proceeds input with validation (required for "Sold" method)
 * - Date picker for disposal date
 * - Optional notes field
 * - Supports controlled (external) and uncontrolled dialog state
 * - Auto-hides for already disposed assets
 * - Memory leak prevention with proper cleanup
 * - Race condition protection with AbortController
 * - Type-safe API response validation
 * - Accessible form with ARIA labels
 * - Unsaved changes confirmation
 * - Character counter for notes
 *
 * Props:
 * - assetId: ID of the asset to dispose
 * - assetTag: Asset tag for display (optional)
 * - assetModel: Model name for confirmation dialog
 * - assetStatus: Current status (hides if DISPOSED)
 * - trigger: Custom trigger element (optional)
 * - isOpen: External control for dialog open state (optional)
 * - onOpenChange: External control callback (optional)
 * - purchaseDate: Asset purchase date for disposal date validation (optional)
 *
 * Preview Calculation:
 * - Current Net Book Value (NBV)
 * - Final depreciation amount (pro-rata)
 * - NBV at disposal date
 * - Expected gain/loss based on proceeds
 *
 * Disposal Methods:
 * - SOLD: Asset sold to third party (requires proceeds > 0)
 * - SCRAPPED: Physically destroyed/discarded
 * - DONATED: Given to charity/organization
 * - WRITTEN_OFF: Theft, loss, or obsolete
 * - TRADED_IN: Asset traded for new purchase
 *
 * API Dependencies:
 * - GET /api/assets/[id]/dispose?date={date}&proceeds={amount} - Preview calculation
 * - POST /api/assets/[id]/dispose - Execute disposal
 *
 * Usage:
 * - Used on asset detail page (/admin/assets/[id])
 * - Triggered from asset actions dropdown or direct button
 *
 * Access: Admin only
 */
'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { toInputDateString } from '@/lib/core/datetime';
import { toast } from 'sonner';
import {
  Trash2,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { ICON_SIZES } from '@/lib/constants';

// Constants
const PREVIEW_DEBOUNCE_MS = 300;
const MAX_PROCEEDS = 999999999.99;
const MAX_NOTES_LENGTH = 500;
const NOTES_WARNING_THRESHOLD = 450;

// Zod schemas for type validation
const DisposalPreviewSchema = z.object({
  currentNetBookValue: z.number(),
  finalDepreciationAmount: z.number(),
  netBookValueAtDisposal: z.number(),
  expectedGainLoss: z.number(),
  isGain: z.boolean(),
  daysOfDepreciation: z.number(),
});

type DisposalPreview = z.infer<typeof DisposalPreviewSchema>;

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
  /** Purchase date for validation (disposal date must be after this) */
  purchaseDate?: string | Date | null;
}

const DISPOSAL_METHODS = [
  { value: 'SOLD', label: 'Sold', description: 'Asset sold to a third party' },
  { value: 'SCRAPPED', label: 'Scrapped', description: 'Asset physically destroyed/discarded' },
  { value: 'DONATED', label: 'Donated', description: 'Asset given to charity/organization' },
  { value: 'WRITTEN_OFF', label: 'Written Off', description: 'Theft, loss, or obsolete' },
  { value: 'TRADED_IN', label: 'Traded In', description: 'Asset traded for new purchase' },
] as const;

// Initial form state
const getInitialFormState = () => ({
  disposalDate: toInputDateString(new Date()),
  disposalMethod: '',
  disposalProceeds: '0',
  disposalNotes: '',
});

// Format currency with proper locale
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-QA', {
    style: 'currency',
    currency: 'QAR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function DisposeAssetDialog({
  assetId,
  assetTag,
  assetModel,
  assetStatus,
  trigger,
  isOpen: externalOpen,
  onOpenChange: externalOnOpenChange,
  purchaseDate,
}: DisposeAssetDialogProps) {
  const router = useRouter();
  const [internalOpen, setInternalOpen] = useState(false);

  // Use external control if provided, otherwise use internal state
  const isControlled = externalOpen !== undefined;
  const open = isControlled ? externalOpen : internalOpen;

  // Memoize the callback to avoid recreation
  const stableOnOpenChange = useMemo(
    () => externalOnOpenChange || (() => {}),
    [externalOnOpenChange]
  );
  const setOpen = isControlled ? stableOnOpenChange : setInternalOpen;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showConfirmClose, setShowConfirmClose] = useState(false);

  // Form state
  const [disposalDate, setDisposalDate] = useState(toInputDateString(new Date()));
  const [disposalMethod, setDisposalMethod] = useState<string>('');
  const [disposalProceeds, setDisposalProceeds] = useState<string>('0');
  const [disposalNotes, setDisposalNotes] = useState('');

  // Preview state
  const [preview, setPreview] = useState<DisposalPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Track form changes for unsaved changes warning
  const initialState = useRef(getInitialFormState());
  const hasChanges = useMemo(() => {
    return (
      disposalDate !== initialState.current.disposalDate ||
      disposalMethod !== initialState.current.disposalMethod ||
      disposalProceeds !== initialState.current.disposalProceeds ||
      disposalNotes !== initialState.current.disposalNotes
    );
  }, [disposalDate, disposalMethod, disposalProceeds, disposalNotes]);

  // Reset form when assetId changes (prevent state persistence bug)
  useEffect(() => {
    const initial = getInitialFormState();
    setDisposalDate(initial.disposalDate);
    setDisposalMethod(initial.disposalMethod);
    setDisposalProceeds(initial.disposalProceeds);
    setDisposalNotes(initial.disposalNotes);
    setPreview(null);
    setPreviewError(null);
    initialState.current = initial;
  }, [assetId]);

  // Validation
  const proceedsValue = useMemo(() => {
    const parsed = parseFloat(disposalProceeds);
    if (isNaN(parsed) || parsed < 0) return 0;
    if (parsed > MAX_PROCEEDS) return MAX_PROCEEDS;
    return parsed;
  }, [disposalProceeds]);

  const proceedsError = useMemo(() => {
    const parsed = parseFloat(disposalProceeds);
    if (disposalProceeds && isNaN(parsed)) {
      return 'Please enter a valid number';
    }
    if (parsed < 0) {
      return 'Proceeds cannot be negative';
    }
    if (parsed > MAX_PROCEEDS) {
      return `Maximum proceeds is ${formatCurrency(MAX_PROCEEDS)}`;
    }
    return null;
  }, [disposalProceeds]);

  const isSoldWithoutProceeds = disposalMethod === 'SOLD' && proceedsValue <= 0;

  const dateError = useMemo(() => {
    if (!disposalDate) return null;

    const selectedDate = new Date(disposalDate);
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (selectedDate > today) {
      return 'Disposal date cannot be in the future';
    }

    if (purchaseDate) {
      const purchase = new Date(purchaseDate);
      purchase.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);

      if (selectedDate < purchase) {
        return 'Disposal date cannot be before purchase date';
      }
    }

    return null;
  }, [disposalDate, purchaseDate]);

  const canSubmit = disposalDate && disposalMethod && !isSoldWithoutProceeds && !proceedsError && !dateError;

  // Fetch preview when date or proceeds change (with proper cleanup)
  useEffect(() => {
    if (!open || !disposalDate) {
      setPreview(null);
      setPreviewError(null);
      return;
    }

    const abortController = new AbortController();
    let isMounted = true;

    const fetchPreview = async () => {
      if (!isMounted) return;

      setIsLoadingPreview(true);
      setPreviewError(null);

      try {
        const response = await fetch(
          `/api/assets/${assetId}/dispose?date=${disposalDate}&proceeds=${proceedsValue}`,
          { signal: abortController.signal }
        );

        if (!isMounted) return;

        if (!response.ok) {
          if (response.status === 401) {
            setPreviewError('Please log in to view preview');
          } else if (response.status === 403) {
            setPreviewError('You don\'t have permission to view this asset');
          } else if (response.status === 404) {
            setPreviewError('Asset not found');
          } else {
            try {
              const error = await response.json();
              setPreviewError(error.error || 'Unable to calculate preview');
            } catch {
              setPreviewError('Unable to calculate preview');
            }
          }
          setPreview(null);
          return;
        }

        const data = await response.json();

        if (!isMounted) return;

        // Validate response with Zod
        try {
          const validatedPreview = DisposalPreviewSchema.parse(data.preview);
          setPreview(validatedPreview);
        } catch (validationError) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Preview validation error:', validationError);
          }
          setPreviewError('Invalid preview data received');
          setPreview(null);
        }
      } catch (err) {
        if (!isMounted) return;

        // Ignore abort errors
        if (err instanceof Error && err.name === 'AbortError') {
          return;
        }

        setPreviewError('Failed to fetch disposal preview');
        setPreview(null);

        if (process.env.NODE_ENV === 'development') {
          console.error('Preview fetch error:', err);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPreview(false);
        }
      }
    };

    // Debounce preview fetch
    const timeoutId = setTimeout(fetchPreview, PREVIEW_DEBOUNCE_MS);

    // Cleanup function
    return () => {
      isMounted = false;
      abortController.abort();
      clearTimeout(timeoutId);
    };
  }, [assetId, disposalDate, proceedsValue, open]);

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

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Please log in to dispose this asset', { duration: 5000 });
        } else if (response.status === 403) {
          toast.error('You don\'t have permission to dispose this asset', { duration: 5000 });
        } else if (response.status === 404) {
          toast.error('Asset not found', { duration: 5000 });
        } else if (response.status === 409) {
          const error = await response.json();
          toast.error(error.error || 'This asset has already been disposed', { duration: 8000 });
        } else if (response.status === 422) {
          const error = await response.json();
          toast.error(error.error || 'Invalid disposal data', { duration: 8000 });
        } else if (response.status >= 500) {
          toast.error('Server error. Please try again later', { duration: 10000 });
        } else {
          const error = await response.json();
          toast.error(error.error || 'Failed to dispose asset', { duration: 10000 });
        }
        return;
      }

      const result = await response.json();
      toast.success(result.message || 'Asset disposed successfully', { duration: 4000 });

      // Reset form and close dialog
      resetForm();
      setOpen(false);
      router.refresh();
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Dispose error:', err);
      }
      toast.error('An error occurred while disposing the asset', { duration: 10000 });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = useCallback(() => {
    const initial = getInitialFormState();
    setDisposalDate(initial.disposalDate);
    setDisposalMethod(initial.disposalMethod);
    setDisposalProceeds(initial.disposalProceeds);
    setDisposalNotes(initial.disposalNotes);
    setPreview(null);
    setPreviewError(null);
    initialState.current = initial;
  }, []);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && hasChanges && !isLoading) {
        // Show confirmation if user has unsaved changes
        setShowConfirmClose(true);
        return;
      }

      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    },
    [hasChanges, isLoading, setOpen, resetForm]
  );

  const handleConfirmClose = useCallback(() => {
    setShowConfirmClose(false);
    resetForm();
    setOpen(false);
  }, [setOpen, resetForm]);

  const handleCancelClose = useCallback(() => {
    setShowConfirmClose(false);
  }, []);

  // Character counter for notes
  const notesRemaining = MAX_NOTES_LENGTH - disposalNotes.length;
  const notesWarning = notesRemaining <= (MAX_NOTES_LENGTH - NOTES_WARNING_THRESHOLD);

  // Don't render for already disposed assets
  if (assetStatus === 'DISPOSED') {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {/* Only render trigger when not externally controlled */}
        {!isControlled && (
          <DialogTrigger asChild>
            {trigger || (
              <Button
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                aria-label="Dispose asset"
              >
                <Trash2 className={`${ICON_SIZES.sm} mr-2`} />
                Dispose Asset
              </Button>
            )}
          </DialogTrigger>
        )}

        <DialogContent
          className="sm:max-w-[450px] max-h-[90vh] overflow-hidden flex flex-col"
          aria-describedby="dispose-dialog-description"
        >
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className={`${ICON_SIZES.md} text-red-500`} aria-hidden="true" />
              Dispose Asset
            </DialogTitle>
            <DialogDescription id="dispose-dialog-description">
              Dispose <strong>{assetTag || assetModel}</strong>. This will calculate final depreciation.
            </DialogDescription>
          </DialogHeader>

          <form
            className="space-y-3 py-3 overflow-y-auto flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              handleDispose();
            }}
            aria-label="Asset disposal form"
          >
            <Alert variant="error" className="py-2" role="alert">
              <AlertTriangle className={ICON_SIZES.sm} aria-hidden="true" />
              <AlertDescription className="text-xs">
                Disposing an asset is permanent and removes it from active inventory.
              </AlertDescription>
            </Alert>

            {/* Disposal Date */}
            <div className="space-y-1.5">
              <Label htmlFor="disposalDate" className="text-sm">
                Disposal Date *
              </Label>
              <DatePicker
                id="disposalDate"
                value={disposalDate}
                onChange={(value) => setDisposalDate(value)}
                maxDate={new Date()}
                placeholder="Select date"
                required
                aria-required="true"
                aria-invalid={!!dateError}
                aria-describedby={dateError ? 'date-error' : undefined}
                disabled={isLoading}
              />
              {dateError && (
                <p id="date-error" className="text-xs text-red-500" role="alert">
                  {dateError}
                </p>
              )}
            </div>

            {/* Disposal Method */}
            <div className="space-y-1.5">
              <Label htmlFor="disposalMethod" className="text-sm">
                Disposal Method *
              </Label>
              <Select
                value={disposalMethod}
                onValueChange={setDisposalMethod}
                disabled={isLoading}
              >
                <SelectTrigger
                  id="disposalMethod"
                  aria-required="true"
                  aria-label="Select disposal method"
                >
                  <SelectValue placeholder="Select method..." />
                </SelectTrigger>
                <SelectContent>
                  {DISPOSAL_METHODS.map((method) => (
                    <SelectItem key={method.value} value={method.value} className="text-left">
                      <div className="text-left">
                        <div className="font-medium">{method.label}</div>
                        <div className="text-xs text-muted-foreground">{method.description}</div>
                      </div>
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
                <span className="absolute left-3 top-2.5 text-xs font-medium text-muted-foreground" aria-hidden="true">QAR</span>
                <Input
                  id="disposalProceeds"
                  type="number"
                  min="0"
                  max={MAX_PROCEEDS}
                  step="0.01"
                  value={disposalProceeds}
                  onChange={(e) => setDisposalProceeds(e.target.value)}
                  className="pl-12"
                  placeholder="0.00"
                  aria-required={disposalMethod === 'SOLD'}
                  aria-invalid={!!proceedsError || isSoldWithoutProceeds}
                  aria-describedby={
                    proceedsError || isSoldWithoutProceeds ? 'proceeds-error' : undefined
                  }
                  disabled={isLoading}
                />
              </div>
              {(isSoldWithoutProceeds || proceedsError) && (
                <p id="proceeds-error" className="text-xs text-red-500" role="alert">
                  {proceedsError || 'Required for "Sold" method'}
                </p>
              )}
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="disposalNotes" className="text-sm">
                  Notes (Optional)
                </Label>
                <span
                  className={`text-xs ${
                    notesWarning ? 'text-orange-600 font-medium' : 'text-muted-foreground'
                  }`}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {notesRemaining} characters remaining
                </span>
              </div>
              <Textarea
                id="disposalNotes"
                value={disposalNotes}
                onChange={(e) => setDisposalNotes(e.target.value)}
                placeholder="E.g., Sold to vendor XYZ..."
                rows={2}
                maxLength={MAX_NOTES_LENGTH}
                className="resize-none"
                aria-describedby="notes-counter"
                disabled={isLoading}
              />
            </div>

            {/* Preview Section */}
            <div
              className="border rounded-lg p-3 bg-slate-50 space-y-2"
              role="region"
              aria-label="Disposal preview"
            >
              <h4 className="font-medium text-xs text-muted-foreground uppercase tracking-wide">
                Preview
              </h4>

              <div aria-live="polite" aria-atomic="true">
                {isLoadingPreview ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className={`${ICON_SIZES.xs} animate-spin`} aria-hidden="true" />
                    Calculating preview...
                  </div>
                ) : previewError ? (
                  <p className="text-xs text-red-500" role="alert">
                    {previewError}
                  </p>
                ) : preview ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-muted-foreground">Current NBV</p>
                      <p className="font-medium">{formatCurrency(preview.currentNetBookValue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">NBV at Disposal</p>
                      <p className="font-medium">{formatCurrency(preview.netBookValueAtDisposal)}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-muted-foreground">
                        Expected {preview.isGain ? 'Gain' : 'Loss'}
                      </p>
                      <p
                        className={`font-medium flex items-center gap-1 ${
                          preview.isGain ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {preview.isGain ? (
                          <TrendingUp className={ICON_SIZES.xs} aria-hidden="true" />
                        ) : (
                          <TrendingDown className={ICON_SIZES.xs} aria-hidden="true" />
                        )}
                        {formatCurrency(Math.abs(preview.expectedGainLoss))}
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
          </form>

          <DialogFooter className="flex-shrink-0 border-t pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              onClick={handleDispose}
              disabled={isLoading || !canSubmit}
              aria-label={isLoading ? 'Disposing asset...' : 'Confirm disposal'}
            >
              {isLoading ? (
                <>
                  <Loader2 className={`${ICON_SIZES.sm} mr-2 animate-spin`} aria-hidden="true" />
                  Disposing...
                </>
              ) : (
                'Confirm Disposal'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved changes confirmation dialog */}
      <AlertDialog open={showConfirmClose} onOpenChange={setShowConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes to the disposal form. Are you sure you want to close this dialog?
              All changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose}>Continue Editing</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmClose} className="bg-red-600 hover:bg-red-700">
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
