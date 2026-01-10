/**
 * @file approval-dialog.tsx
 * @description Reusable dialog for approve/reject workflows
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
import { FormError } from '@/components/ui/form-error';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';

export interface ApprovalDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** The mode determines styling and default labels */
  mode: 'approve' | 'reject';
  /** Dialog title (defaults based on mode and entityName) */
  title?: string;
  /** Dialog description */
  description?: string;
  /** Name of the entity being approved/rejected (e.g., "leave request") */
  entityName?: string;
  /** Label for the confirm button when approving */
  approveLabel?: string;
  /** Label for the confirm button when rejecting */
  rejectLabel?: string;
  /** Label for the notes/reason field */
  notesLabel?: string;
  /** Placeholder for the notes field */
  notesPlaceholder?: string;
  /** Whether notes are required (always true for reject mode by default) */
  notesRequired?: boolean;
  /** Whether the dialog is in a loading state */
  isLoading?: boolean;
  /** Error message to display */
  error?: string | null;
  /** Callback when user confirms the action */
  onConfirm: (notes: string) => void | Promise<void>;
  /** Additional className for the dialog content */
  className?: string;
}

/**
 * Approval dialog for approve/reject workflows.
 * Provides consistent UI for approval actions across the application.
 *
 * @example
 * ```tsx
 * // Approve mode
 * <ApprovalDialog
 *   open={showApprove}
 *   onOpenChange={setShowApprove}
 *   mode="approve"
 *   entityName="leave request"
 *   onConfirm={async (notes) => {
 *     await approveRequest(requestId, notes);
 *   }}
 * />
 *
 * // Reject mode (notes required by default)
 * <ApprovalDialog
 *   open={showReject}
 *   onOpenChange={setShowReject}
 *   mode="reject"
 *   entityName="leave request"
 *   onConfirm={async (reason) => {
 *     await rejectRequest(requestId, reason);
 *   }}
 * />
 * ```
 */
export function ApprovalDialog({
  open,
  onOpenChange,
  mode,
  title,
  description,
  entityName = 'request',
  approveLabel = 'Approve',
  rejectLabel = 'Reject',
  notesLabel,
  notesPlaceholder,
  notesRequired,
  isLoading = false,
  error,
  onConfirm,
  className,
}: ApprovalDialogProps) {
  const [notes, setNotes] = React.useState('');

  // Default notes required for reject mode
  const isNotesRequired = notesRequired ?? mode === 'reject';

  // Default labels based on mode
  const defaultNotesLabel = mode === 'approve' ? 'Notes (Optional)' : 'Reason';
  const defaultNotesPlaceholder =
    mode === 'approve'
      ? 'Add any notes for the requester...'
      : 'Please provide a reason for rejection...';

  const defaultTitle =
    mode === 'approve' ? `Approve ${entityName}` : `Reject ${entityName}`;
  const defaultDescription =
    mode === 'approve'
      ? `Are you sure you want to approve this ${entityName}?`
      : `Please provide a reason for rejecting this ${entityName}.`;

  const displayTitle = title ?? defaultTitle;
  const displayDescription = description ?? defaultDescription;
  const displayNotesLabel = notesLabel ?? defaultNotesLabel;
  const displayPlaceholder = notesPlaceholder ?? defaultNotesPlaceholder;
  const confirmLabel = mode === 'approve' ? approveLabel : rejectLabel;

  const canSubmit = !isNotesRequired || notes.trim().length > 0;

  const handleConfirm = async () => {
    if (!canSubmit) return;
    await onConfirm(notes.trim());
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setNotes('');
    }
    onOpenChange(newOpen);
  };

  const Icon = mode === 'approve' ? CheckCircle : XCircle;
  const iconColor = mode === 'approve' ? 'text-green-600' : 'text-red-600';
  const buttonVariant = mode === 'approve' ? 'default' : 'destructive';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className={cn('sm:max-w-[425px]', className)}>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                mode === 'approve' ? 'bg-green-100' : 'bg-red-100'
              )}
            >
              <Icon className={cn('h-5 w-5', iconColor)} />
            </div>
            <div>
              <DialogTitle className="capitalize">{displayTitle}</DialogTitle>
              <DialogDescription>{displayDescription}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && <FormError message={error} />}

          <div className="space-y-2">
            <Label htmlFor="approval-notes">
              {displayNotesLabel}
              {isNotesRequired && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Textarea
              id="approval-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={displayPlaceholder}
              rows={3}
              disabled={isLoading}
              className="resize-none"
            />
            {isNotesRequired && notes.trim().length === 0 && (
              <p className="text-xs text-muted-foreground">
                {mode === 'reject' ? 'A reason is required' : 'This field is required'}
              </p>
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
            Cancel
          </Button>
          <Button
            type="button"
            variant={buttonVariant}
            onClick={handleConfirm}
            disabled={!canSubmit || isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Convenience wrapper for paired approve/reject dialogs.
 * Manages both dialogs with a single state.
 */
export function useApprovalDialog() {
  const [state, setState] = React.useState<{
    mode: 'approve' | 'reject' | null;
    isOpen: boolean;
  }>({
    mode: null,
    isOpen: false,
  });

  const openApprove = React.useCallback(() => {
    setState({ mode: 'approve', isOpen: true });
  }, []);

  const openReject = React.useCallback(() => {
    setState({ mode: 'reject', isOpen: true });
  }, []);

  const close = React.useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const setOpen = React.useCallback((open: boolean) => {
    setState((prev) => ({ ...prev, isOpen: open }));
  }, []);

  return {
    mode: state.mode,
    isOpen: state.isOpen,
    openApprove,
    openReject,
    close,
    setOpen,
  };
}
