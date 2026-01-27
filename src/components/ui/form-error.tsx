/**
 * @file form-error.tsx
 * @description Inline error message display for forms and dialogs
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { AlertCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

export interface FormErrorProps {
  message: string | null | undefined;
  className?: string;
  variant?: 'inline' | 'banner';
  icon?: 'alert' | 'x' | 'none';
}

/**
 * Inline error message component for forms and dialogs.
 * Renders nothing if message is null/undefined/empty.
 *
 * @example
 * ```tsx
 * <FormError message={error} />
 * <FormError message="Invalid input" variant="banner" />
 * ```
 */
export function FormError({
  message,
  className,
  variant = 'inline',
  icon = 'alert',
}: FormErrorProps) {
  if (!message) return null;

  const IconComponent = icon === 'alert' ? AlertCircle : icon === 'x' ? XCircle : null;

  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200',
          className
        )}
        role="alert"
      >
        {IconComponent && <IconComponent className={`${ICON_SIZES.sm} flex-shrink-0`} />}
        <span>{message}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg',
        className
      )}
      role="alert"
    >
      {IconComponent && <IconComponent className={`${ICON_SIZES.sm} flex-shrink-0`} />}
      <span>{message}</span>
    </div>
  );
}

/**
 * Field-level error message (smaller, no background)
 */
export function FieldError({
  message,
  className,
}: {
  message: string | null | undefined;
  className?: string;
}) {
  if (!message) return null;

  return (
    <p className={cn('text-sm text-red-500', className)} role="alert">
      {message}
    </p>
  );
}
