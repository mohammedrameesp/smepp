/**
 * @file submit-button.tsx
 * @description Button with loading state for form submissions
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

export interface SubmitButtonProps extends React.ComponentProps<typeof Button> {
  isLoading?: boolean;
  loadingText?: string;
}

/**
 * Button with loading spinner for form submissions.
 * Automatically disables when loading and shows spinner.
 *
 * @example
 * ```tsx
 * <SubmitButton isLoading={isSubmitting}>
 *   Save Changes
 * </SubmitButton>
 *
 * <SubmitButton isLoading={isSubmitting} loadingText="Saving...">
 *   Save
 * </SubmitButton>
 * ```
 */
export function SubmitButton({
  isLoading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      disabled={isLoading || disabled}
      className={className}
      {...props}
    >
      {isLoading && <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}

/**
 * Destructive submit button variant
 */
export function DestructiveSubmitButton({
  isLoading,
  loadingText,
  children,
  disabled,
  className,
  ...props
}: SubmitButtonProps) {
  return (
    <Button
      variant="destructive"
      disabled={isLoading || disabled}
      className={className}
      {...props}
    >
      {isLoading && <Loader2 className={`mr-2 ${ICON_SIZES.sm} animate-spin`} />}
      {isLoading && loadingText ? loadingText : children}
    </Button>
  );
}

/**
 * Cancel button (commonly paired with SubmitButton)
 */
export function CancelButton({
  onClick,
  disabled,
  children = 'Cancel',
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      {children}
    </Button>
  );
}

/**
 * Button group for form actions (Cancel + Submit)
 */
export function FormButtons({
  onCancel,
  isLoading,
  submitLabel = 'Submit',
  cancelLabel = 'Cancel',
  loadingText,
  disabled,
  className,
}: {
  onCancel: () => void;
  isLoading?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  loadingText?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex justify-end gap-2', className)}>
      <CancelButton onClick={onCancel} disabled={isLoading}>
        {cancelLabel}
      </CancelButton>
      <SubmitButton isLoading={isLoading} loadingText={loadingText} disabled={disabled}>
        {submitLabel}
      </SubmitButton>
    </div>
  );
}
