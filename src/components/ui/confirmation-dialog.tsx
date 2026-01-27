/**
 * @file confirmation-dialog.tsx
 * @description Confirmation dialog for destructive and important actions
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FormError } from './form-error';
import { SubmitButton, CancelButton } from './submit-button';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

export interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: React.ReactNode;
  variant?: 'default' | 'destructive' | 'warning';
  confirmLabel?: string;
  cancelLabel?: string;
  loadingText?: string;
  isLoading?: boolean;
  error?: string | null;
  requiresReason?: boolean;
  reasonLabel?: string;
  reasonPlaceholder?: string;
  onConfirm: (reason?: string) => void | Promise<void>;
}

/**
 * Confirmation dialog for important actions.
 * Supports optional reason/notes field for destructive actions.
 *
 * @example
 * ```tsx
 * // Simple confirmation
 * <ConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Delete Asset"
 *   description="Are you sure you want to delete this asset?"
 *   variant="destructive"
 *   onConfirm={handleDelete}
 * />
 *
 * // With required reason
 * <ConfirmationDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Cancel Leave Request"
 *   description="Please provide a reason for cancellation"
 *   requiresReason
 *   reasonLabel="Cancellation Reason"
 *   onConfirm={handleCancel}
 * />
 * ```
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  variant = 'default',
  confirmLabel,
  cancelLabel = 'Cancel',
  loadingText,
  isLoading,
  error,
  requiresReason,
  reasonLabel = 'Reason',
  reasonPlaceholder = 'Please provide a reason...',
  onConfirm,
}: ConfirmationDialogProps) {
  const [reason, setReason] = React.useState('');
  const [localError, setLocalError] = React.useState<string | null>(null);

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setReason('');
      setLocalError(null);
    }
  }, [open]);

  const handleConfirm = async () => {
    if (requiresReason && !reason.trim()) {
      setLocalError(`${reasonLabel} is required`);
      return;
    }
    setLocalError(null);
    await onConfirm(reason.trim() || undefined);
  };

  const buttonVariant = variant === 'destructive' ? 'destructive' : 'default';
  const defaultConfirmLabel = variant === 'destructive' ? 'Delete' : 'Confirm';
  const displayError = error || localError;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-start gap-3">
            {variant !== 'default' && (
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
                  variant === 'destructive' && 'bg-red-100',
                  variant === 'warning' && 'bg-amber-100'
                )}
              >
                <AlertTriangle
                  className={cn(
                    ICON_SIZES.md,
                    variant === 'destructive' && 'text-red-600',
                    variant === 'warning' && 'text-amber-600'
                  )}
                />
              </div>
            )}
            <div>
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription className="mt-1">{description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {requiresReason && (
            <div className="space-y-2">
              <Label htmlFor="reason">
                {reasonLabel} {requiresReason && '*'}
              </Label>
              <Textarea
                id="reason"
                placeholder={reasonPlaceholder}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (localError) setLocalError(null);
                }}
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          <FormError message={displayError} />
        </div>

        <DialogFooter>
          <CancelButton onClick={() => onOpenChange(false)} disabled={isLoading}>
            {cancelLabel}
          </CancelButton>
          <SubmitButton
            onClick={handleConfirm}
            isLoading={isLoading}
            loadingText={loadingText}
            variant={buttonVariant}
          >
            {confirmLabel || defaultConfirmLabel}
          </SubmitButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple yes/no confirmation (no reason field)
 */
export function SimpleConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  onConfirm,
  isLoading,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: React.ReactNode;
  onConfirm: () => void | Promise<void>;
  isLoading?: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      trigger={trigger}
      variant={variant}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      isLoading={isLoading}
      onConfirm={onConfirm}
    />
  );
}
