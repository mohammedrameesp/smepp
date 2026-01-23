/**
 * @file currency-input.tsx
 * @description Specialized input for currency/numeric values with arrow key prevention
 * @module components/ui
 *
 * Features:
 * - Prevents arrow key increment/decrement (common UX issue with number inputs)
 * - Blocks mouse wheel scrolling on focused number inputs
 * - Optional currency formatting display
 */

'use client';

import * as React from 'react';
import { Input } from './input';
import { cn } from '@/lib/core/utils';

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'type'> {
  /**
   * Currency code for display (e.g., 'QAR', 'USD')
   * If provided, shows currency prefix
   */
  currency?: string;
  /**
   * Allow decimal values (default: true)
   */
  allowDecimals?: boolean;
  /**
   * Whether to prevent arrow key changes (default: true)
   */
  preventArrowKeys?: boolean;
  /**
   * Whether to prevent scroll wheel changes (default: true)
   */
  preventScroll?: boolean;
}

/**
 * Currency input component with built-in arrow key and scroll prevention
 *
 * @example
 * // Basic usage
 * <CurrencyInput value={amount} onChange={(e) => setAmount(e.target.value)} />
 *
 * @example
 * // With currency prefix
 * <CurrencyInput currency="QAR" value={amount} onChange={handleChange} />
 *
 * @example
 * // Integer only (no decimals)
 * <CurrencyInput allowDecimals={false} value={quantity} onChange={handleChange} />
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      className,
      currency,
      allowDecimals = true,
      preventArrowKeys = true,
      preventScroll = true,
      onKeyDown,
      onWheel,
      ...props
    },
    ref
  ) => {
    const handleKeyDown = React.useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Prevent arrow key increment/decrement
        if (preventArrowKeys && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
          e.preventDefault();
        }
        // Call original handler if provided
        onKeyDown?.(e);
      },
      [preventArrowKeys, onKeyDown]
    );

    const handleWheel = React.useCallback(
      (e: React.WheelEvent<HTMLInputElement>) => {
        // Prevent scroll wheel changes when focused
        if (preventScroll) {
          e.currentTarget.blur();
        }
        // Call original handler if provided
        onWheel?.(e);
      },
      [preventScroll, onWheel]
    );

    const inputElement = (
      <Input
        ref={ref}
        type="number"
        step={allowDecimals ? '0.01' : '1'}
        className={cn(
          // Hide number input spinners
          '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none',
          currency && 'pl-12', // Add padding for currency prefix
          className
        )}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        {...props}
      />
    );

    if (currency) {
      return (
        <div className="relative">
          <span className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm">
            {currency}
          </span>
          {inputElement}
        </div>
      );
    }

    return inputElement;
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export { CurrencyInput };
export type { CurrencyInputProps };
