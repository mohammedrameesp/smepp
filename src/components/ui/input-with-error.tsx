/**
 * @file input-with-error.tsx
 * @description Enhanced input component with error icon and message for accessibility
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { AlertCircle } from 'lucide-react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/core/utils';

interface InputWithErrorProps extends React.ComponentProps<'input'> {
  label?: string;
  error?: string;
  description?: string;
}

const InputWithError = React.forwardRef<HTMLInputElement, InputWithErrorProps>(
  ({ label, error, description, className, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    const descriptionId = `${inputId}-description`;

    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={inputId} className={cn(error && 'text-destructive')}>
            {label}
          </Label>
        )}

        <div className="relative">
          <Input
            ref={ref}
            id={inputId}
            aria-invalid={!!error}
            aria-describedby={cn(
              error && errorId,
              description && descriptionId
            )}
            className={cn(
              error && 'pr-10 border-destructive focus-visible:ring-destructive/20',
              className
            )}
            {...props}
          />

          {/* A11Y-002: Error icon for non-color indication */}
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <AlertCircle
                className="h-4 w-4 text-destructive"
                aria-hidden="true"
              />
            </div>
          )}
        </div>

        {description && !error && (
          <p id={descriptionId} className="text-sm text-muted-foreground">
            {description}
          </p>
        )}

        {/* Error message with icon for additional clarity */}
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm text-destructive flex items-center gap-1.5"
          >
            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
      </div>
    );
  }
);

InputWithError.displayName = 'InputWithError';

export { InputWithError };
