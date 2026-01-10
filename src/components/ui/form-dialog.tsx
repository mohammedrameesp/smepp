/**
 * @file form-dialog.tsx
 * @description Reusable form dialog wrapper component
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
import { Button } from '@/components/ui/button';
import { FormError } from './form-error';
import { SubmitButton, CancelButton } from './submit-button';
import { cn } from '@/lib/core/utils';

export interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  isSubmitting?: boolean;
  error?: string | null;
  onSubmit: () => void | Promise<void>;
  submitLabel?: string;
  cancelLabel?: string;
  loadingText?: string;
  submitVariant?: 'default' | 'destructive';
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
  hideFooter?: boolean;
  footerContent?: React.ReactNode;
}

const maxWidthClasses = {
  sm: 'sm:max-w-[425px]',
  md: 'sm:max-w-[500px]',
  lg: 'sm:max-w-[600px]',
  xl: 'sm:max-w-[700px]',
};

/**
 * Reusable form dialog with standard structure.
 * Includes title, description, error display, and action buttons.
 *
 * @example
 * ```tsx
 * <FormDialog
 *   open={open}
 *   onOpenChange={setOpen}
 *   title="Request Asset"
 *   description="Submit a request for this asset"
 *   isSubmitting={isSubmitting}
 *   error={error}
 *   onSubmit={handleSubmit}
 *   submitLabel="Submit Request"
 *   trigger={<Button>Request</Button>}
 * >
 *   <InfoDisplay items={[...]} />
 *   <Textarea value={reason} onChange={...} />
 * </FormDialog>
 * ```
 */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  isSubmitting,
  error,
  onSubmit,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loadingText,
  submitVariant = 'default',
  children,
  maxWidth = 'md',
  hideFooter = false,
  footerContent,
}: FormDialogProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn(maxWidthClasses[maxWidth])}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>

          <div className="space-y-4 py-4">
            {children}
            <FormError message={error} />
          </div>

          {!hideFooter && (
            <DialogFooter>
              {footerContent || (
                <>
                  <CancelButton
                    onClick={() => onOpenChange(false)}
                    disabled={isSubmitting}
                  >
                    {cancelLabel}
                  </CancelButton>
                  <SubmitButton
                    type="submit"
                    isLoading={isSubmitting}
                    loadingText={loadingText}
                    variant={submitVariant}
                  >
                    {submitLabel}
                  </SubmitButton>
                </>
              )}
            </DialogFooter>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Simple dialog without form (for info display)
 */
export function InfoDialog({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  closeLabel = 'Close',
  maxWidth = 'md',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  trigger?: React.ReactNode;
  children: React.ReactNode;
  closeLabel?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className={cn(maxWidthClasses[maxWidth])}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <div className="py-4">{children}</div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {closeLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
