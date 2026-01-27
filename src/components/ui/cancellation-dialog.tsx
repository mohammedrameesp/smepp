/**
 * @file cancellation-dialog.tsx
 * @description Reusable dialog for cancellation workflows
 * @module components/ui
 */

'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FormError } from '@/components/ui/form-error';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

export interface CancellationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Name of the entity being cancelled (e.g., "subscription") */
  entityName?: string;
  /** Whether to show the date picker */
  showDatePicker?: boolean;
  /** Label for the date field */
  dateLabel?: string;
  /** Default date value (ISO string format) */
  defaultDate?: string;
  /** Minimum selectable date */
  minDate?: string;
  /** Label for the reason field */
  reasonLabel?: string;
  /** Placeholder for the reason field */
  reasonPlaceholder?: string;
  /** Whether reason is required */
  reasonRequired?: boolean;
  /** Warning message to display (e.g., about data loss) */
  warningMessage?: string;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Callback when user confirms cancellation */
  onConfirm: (data: { date?: string; reason: string }) => void | Promise<void>;
  /** Additional className for the dialog content */
  className?: string;
  /** Label for the cancel button */
  cancelLabel?: string;
  /** Label for the confirm button */
  confirmLabel?: string;
}

/**
 * Cancellation dialog for cancel workflows.
 * Provides consistent UI for cancellation actions (subscriptions, requests, etc.)
 *
 * @example
 * ```tsx
 * // Simple cancellation
 * <CancellationDialog
 *   open={showCancel}
 *   onOpenChange={setShowCancel}
 *   entityName="leave request"
 *   reasonRequired
 *   onConfirm={async ({ reason }) => {
 *     await cancelRequest(requestId, reason);
 *   }}
 * />
 *
 * // Cancellation with date picker
 * <CancellationDialog
 *   open={showCancel}
 *   onOpenChange={setShowCancel}
 *   entityName="subscription"
 *   showDatePicker
 *   warningMessage="This will stop all services immediately."
 *   onConfirm={async ({ date, reason }) => {
 *     await cancelSubscription(subId, date, reason);
 *   }}
 * />
 * ```
 */
export function CancellationDialog({
  open,
  onOpenChange,
  title,
  description,
  entityName = 'item',
  showDatePicker = false,
  dateLabel = 'Cancellation Date',
  defaultDate,
  minDate,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Please provide a reason for cancellation...',
  reasonRequired = false,
  warningMessage,
  isLoading = false,
  error,
  onConfirm,
  className,
  cancelLabel = 'Keep Active',
  confirmLabel = 'Cancel',
}: CancellationDialogProps) {
  const [reason, setReason] = React.useState('');
  const [date, setDate] = React.useState(
    defaultDate ?? new Date().toISOString().split('T')[0]
  );

  const displayTitle = title ?? `Cancel ${entityName}`;
  const displayDescription =
    description ?? `Are you sure you want to cancel this ${entityName}? This action may not be reversible.`;

  const canSubmit = !reasonRequired || reason.trim().length > 0;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm({
      date: showDatePicker ? date : undefined,
      reason: reason.trim(),
    });
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setReason('');
      setDate(defaultDate ?? new Date().toISOString().split('T')[0]);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('sm:max-w-[425px]', className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <XCircle className={`${ICON_SIZES.md} text-red-600`} />
            </div>
            <div>
              <DialogTitle className="capitalize">{displayTitle}</DialogTitle>
              <DialogDescription>{displayDescription}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && <FormError message={error} />}

          {warningMessage && (
            <Alert variant="error">
              <AlertTriangle className={ICON_SIZES.sm} />
              <AlertDescription>{warningMessage}</AlertDescription>
            </Alert>
          )}

          {showDatePicker && (
            <div className="space-y-2">
              <Label htmlFor="cancellation-date">
                {dateLabel}
                <span className="text-destructive ml-1">*</span>
              </Label>
              <Input
                id="cancellation-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                min={minDate}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="cancellation-reason">
              {reasonLabel}
              {reasonRequired && <span className="text-destructive ml-1">*</span>}
              {!reasonRequired && (
                <span className="text-muted-foreground ml-1">(Optional)</span>
              )}
            </Label>
            <Textarea
              id="cancellation-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={reasonPlaceholder}
              rows={3}
              disabled={isLoading}
              className="resize-none"
            />
            {reasonRequired && reason.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">A reason is required</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirm}
            disabled={!canSubmit || isLoading}
          >
            {isLoading && <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />}
            {confirmLabel} {entityName}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Hook for managing cancellation dialog state
 */
export function useCancellationDialog() {
  const [isOpen, setIsOpen] = React.useState(false);

  const open = React.useCallback(() => setIsOpen(true), []);
  const close = React.useCallback(() => setIsOpen(false), []);

  return {
    isOpen,
    open,
    close,
    setIsOpen,
  };
}
