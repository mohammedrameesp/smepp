/**
 * @file birth-date-picker.tsx
 * @description Birth date picker with year/month dropdowns for easy navigation to past dates
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/core/utils';
import { CalendarIcon, X } from 'lucide-react';

export interface BirthDatePickerProps {
  id?: string;
  value?: string; // Expected in yyyy-mm-dd format (ISO)
  onChange?: (value: string) => void; // Returns yyyy-mm-dd format (ISO)
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  required?: boolean;
  maxDate?: Date; // Maximum selectable date (defaults to today for birth dates)
  minDate?: Date; // Minimum selectable date (defaults to 1940)
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Birth date picker with year and month dropdowns for easy navigation to past dates.
 * Ideal for selecting date of birth where you need to go back 20-80 years.
 * Also supports typing the date directly.
 */
export function BirthDatePicker({
  id,
  value,
  onChange,
  disabled,
  className,
  placeholder = 'DD/MM/YYYY',
  required,
  maxDate,
  minDate,
}: BirthDatePickerProps) {
  // Default maxDate to today, minDate to 1940
  const effectiveMaxDate = React.useMemo(() => maxDate || new Date(), [maxDate]);
  const effectiveMinDate = React.useMemo(() => minDate || new Date(1940, 0, 1), [minDate]);

  const [date, setDate] = React.useState<Date | undefined>(() => {
    if (value) {
      const parsed = new Date(value);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
    return undefined;
  });

  const [open, setOpen] = React.useState(false);
  const [inputValue, setInputValue] = React.useState('');

  // Track the currently displayed month/year in the calendar
  const [displayMonth, setDisplayMonth] = React.useState<Date>(() => {
    if (date) return date;
    // Default to a reasonable age (25 years ago)
    const defaultYear = new Date().getFullYear() - 25;
    return new Date(defaultYear, 0, 1);
  });

  // Update internal state when value prop changes
  React.useEffect(() => {
    if (value && value.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [y, m, d] = value.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0);
      if (!isNaN(dateObj.getTime())) {
        setDate(dateObj);
        setDisplayMonth(dateObj);
        setInputValue(formatDisplayDate(dateObj));
      }
    } else if (!value) {
      setDate(undefined);
      setInputValue('');
    }
  }, [value]);

  // Generate year options
  const years = React.useMemo(() => {
    const result: number[] = [];
    const startYear = effectiveMinDate.getFullYear();
    const endYear = effectiveMaxDate.getFullYear();
    for (let y = endYear; y >= startYear; y--) {
      result.push(y);
    }
    return result;
  }, [effectiveMinDate, effectiveMaxDate]);

  const formatDisplayDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const parseInputDate = (input: string): Date | null => {
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
      const monthIndex = MONTH_NAMES_SHORT.findIndex(mn => mn.toLowerCase() === m.toLowerCase());
      if (monthIndex >= 0) {
        const date = new Date(parseInt(y), monthIndex, parseInt(d), 12, 0, 0);
        if (!isNaN(date.getTime())) return date;
      }
    }

    return null;
  };

  const handleYearChange = (yearStr: string) => {
    const year = parseInt(yearStr, 10);
    const newMonth = new Date(year, displayMonth.getMonth(), 1);
    setDisplayMonth(newMonth);
  };

  const handleMonthChange = (monthStr: string) => {
    const month = parseInt(monthStr, 10);
    const newMonth = new Date(displayMonth.getFullYear(), month, 1);
    setDisplayMonth(newMonth);
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
    setDisplayMonth(selectedDate);
    setInputValue(formatDisplayDate(selectedDate));

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
      if (effectiveMaxDate && parsed > effectiveMaxDate) {
        setInputValue(date ? formatDisplayDate(date) : '');
        return;
      }
      if (effectiveMinDate && parsed < effectiveMinDate) {
        setInputValue(date ? formatDisplayDate(date) : '');
        return;
      }

      setDate(parsed);
      setDisplayMonth(parsed);
      setInputValue(formatDisplayDate(parsed));

      const y = parsed.getFullYear();
      const m = String(parsed.getMonth() + 1).padStart(2, '0');
      const d = String(parsed.getDate()).padStart(2, '0');
      onChange?.(`${y}-${m}-${d}`);
    } else {
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
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50" align="end">
          <div className="p-3 space-y-3">
            {/* Year and Month dropdowns */}
            <div className="flex gap-2">
              <Select
                value={displayMonth.getFullYear().toString()}
                onValueChange={handleYearChange}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent className="max-h-[200px]">
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={displayMonth.getMonth().toString()}
                onValueChange={handleMonthChange}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Month" />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Calendar */}
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleSelect}
              month={displayMonth}
              onMonthChange={setDisplayMonth}
              disabled={(day) => {
                if (effectiveMaxDate && day > effectiveMaxDate) return true;
                if (effectiveMinDate && day < effectiveMinDate) return true;
                return false;
              }}
              toDate={effectiveMaxDate}
              fromDate={effectiveMinDate}
              initialFocus
            />
          </div>
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
