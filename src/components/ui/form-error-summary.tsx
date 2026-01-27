/**
 * @file form-error-summary.tsx
 * @description Form-level error summary component for displaying validation errors
 * @module components/ui
 */

'use client';

import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface FormError {
  field: string;
  message: string;
}

interface FormErrorSummaryProps {
  errors: FormError[];
  className?: string;
  title?: string;
}

export function FormErrorSummary({
  errors,
  className,
  title = 'Please fix the following errors:',
}: FormErrorSummaryProps) {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      aria-live="polite"
      className={cn(
        'rounded-lg border border-red-200 bg-red-50 p-4',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className={`${ICON_SIZES.md} text-red-500 mt-0.5 flex-shrink-0`} aria-hidden="true" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">{title}</h3>
          <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
            {errors.map((error, index) => (
              <li key={`${error.field}-${index}`}>
                <span className="font-medium">{error.field}:</span> {error.message}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/**
 * Helper to convert Zod errors to FormError array
 */
export function zodErrorsToFormErrors(
  zodErrors: Record<string, string[] | undefined>
): FormError[] {
  const errors: FormError[] = [];

  for (const [field, messages] of Object.entries(zodErrors)) {
    if (messages && messages.length > 0) {
      errors.push({
        field: formatFieldName(field),
        message: messages[0],
      });
    }
  }

  return errors;
}

/**
 * Format field name for display (camelCase to Title Case)
 */
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}
