/**
 * @file date-picker.tsx
 * @description Date picker component with calendar popup and direct text input
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CalendarIcon, X } from 'lucide-react';

export interface DatePickerProps {
  id?: string;
  value?: string; // Expected in yyyy-mm-dd format (ISO)
  onChange?: (value: string) => void; // Returns yyyy-mm-dd format (ISO)
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
  maxDate?: Date; // Maximum selectable date
  minDate?: Date; // Minimum selectable date
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Date picker component with calendar popup that allows both typing and selection
 * Internally works with yyyy-mm-dd format for compatibility with existing code
 */
export function DatePicker({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder = 'DD/MM/YYYY',
  required,
  maxDate,
  minDate,
}: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  });

  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      // Parse yyyy-mm-dd: create Date using year, month-1, day directly
      // This ensures the date is interpreted in local timezone without shifts
      const [y, m, d] = value.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0); // Use noon to avoid DST issues
      if (!isNaN(dateObj.getTime())) {
        setDate(dateObj);
        setInputValue(formatDisplayDate(dateObj));
      }
    } else if (!value) {
      setDate(undefined);
      setInputValue('');
    }
  }, [value]);

  const formatDisplayDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatDisplayDateShort = (date: Date): string => {
    const day = date.getDate();
    const month = MONTH_NAMES[date.getMonth()];
    const year = date.getFullYear();
    return `${day} ${month} ${year}`;
  };

  const parseInputDate = (input: string): Date | null => {
    // Try different formats
    const cleaned = input.trim();

    // DD/MM/YYYY or DD-MM-YYYY
    let match = cleaned.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }

    // YYYY-MM-DD
    match = cleaned.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
    if (match) {
      const [, y, m, d] = match;
      const date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
      if (!isNaN(date.getTime())) return date;
    }

    // DD MMM YYYY (e.g., "15 Jan 2025")
    match = cleaned.match(/^(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})$/i);
    if (match) {
      const [, d, m, y] = match;
      const monthIndex = MONTH_NAMES.findIndex(mn => mn.toLowerCase() === m.toLowerCase());
      if (monthIndex >= 0) {
        const date = new Date(parseInt(y), monthIndex, parseInt(d), 12, 0, 0);
        if (!isNaN(date.getTime())) return date;
      }
    }

    return null;
  };

  const handleSelect = (selectedDate: Date | undefined) => {
    if (!selectedDate) {
      setDate(undefined);
      setInputValue('');
      onChange?.('');
      setOpen(false);
      return;
    }

    setDate(selectedDate);
    setInputValue(formatDisplayDate(selectedDate));

    // Extract year, month, day directly from the selected date object
    const y = selectedDate.getFullYear();
    const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const d = String(selectedDate.getDate()).padStart(2, '0');
    const dateString = `${y}-${m}-${d}`;

    onChange?.(dateString);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Auto-format: add "/" immediately after DD and MM
    // Remove any non-digit characters
    const digitsOnly = input.replace(/[^\d]/g, '');

    let formatted = '';
    for (let i = 0; i < digitsOnly.length && i < 8; i++) {
      formatted += digitsOnly[i];
      // Add "/" after 2nd digit (day) and 4th digit (month)
      if ((i === 1 || i === 3) && i < digitsOnly.length - 1) {
        formatted += '/';
      }
    }
    // Also add "/" if we just typed the 2nd or 4th digit
    if (digitsOnly.length === 2 || digitsOnly.length === 4) {
      formatted += '/';
    }

    setInputValue(formatted);
  };

  const handleInputBlur = () => {
    if (!inputValue.trim()) {
      setDate(undefined);
      onChange?.('');
      return;
    }

    const parsed = parseInputDate(inputValue);
    if (parsed) {
      // Validate against min/max
      if (maxDate && parsed > maxDate) {
        setInputValue(date ? formatDisplayDate(date) : '');
        return;
      }
      if (minDate && parsed < minDate) {
        setInputValue(date ? formatDisplayDate(date) : '');
        return;
      }

      setDate(parsed);
      setInputValue(formatDisplayDate(parsed));

      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      onChange?.(`${y}-${m}-${d}`);
    } else {
      // Invalid input, revert to previous value
      setInputValue(date ? formatDisplayDate(date) : '');
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur();
      setOpen(false);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDate(undefined);
    setInputValue('');
    onChange?.('');
  };

  return (
    <div className="relative flex gap-1">
      <Input
        id={id}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleInputKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('flex-1 pr-8', className)}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="shrink-0"
            disabled={disabled}
            type="button"
            aria-label="Open calendar"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="end">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleSelect}
            defaultMonth={date}
            initialFocus
            disabled={(day) => {
              if (maxDate && day > maxDate) return true;
              if (minDate && day < minDate) return true;
              return false;
            }}
            toDate={maxDate}
            fromDate={minDate}
          />
        </PopoverContent>
      </Popover>
      {date && !disabled && !required && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
          aria-label="Clear date"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
