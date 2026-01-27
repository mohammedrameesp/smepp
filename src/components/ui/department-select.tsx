'use client';

/**
 * @file department-select.tsx
 * @description Searchable department select with autocomplete and free-text entry
 * @module components/ui
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Search, Plus } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface DepartmentSelectProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = 'Select or type department',
  disabled = false,
  className,
  id,
}: DepartmentSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [departments, setDepartments] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Fetch departments on mount
  React.useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await fetch('/api/employees/departments');
        if (response.ok) {
          const data = await response.json();
          setDepartments(data.departments || []);
        }
      } catch (error) {
        console.error('Failed to fetch departments:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchDepartments();
  }, []);

  // Filter departments based on search
  const filteredDepartments = React.useMemo(() => {
    if (!search) return departments;
    const searchLower = search.toLowerCase();
    return departments.filter((dept) =>
      dept.toLowerCase().includes(searchLower)
    );
  }, [search, departments]);

  // Check if search term is a new value (not in existing list)
  const isNewValue = React.useMemo(() => {
    if (!search.trim()) return false;
    const searchLower = search.toLowerCase().trim();
    return !departments.some((dept) => dept.toLowerCase() === searchLower);
  }, [search, departments]);

  // Focus search input when popover opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  const handleSelect = (department: string) => {
    onChange?.(department);
    setOpen(false);
  };

  const handleAddNew = () => {
    const newDept = search.trim();
    if (newDept) {
      onChange?.(newDept);
      // Add to local list so it appears immediately if reopened
      if (!departments.includes(newDept)) {
        setDepartments((prev) => [...prev, newDept].sort());
      }
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground',
            className
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className={`ml-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="flex items-center border-b px-3 py-2">
          <Search className={`mr-2 ${ICON_SIZES.sm} shrink-0 opacity-50`} />
          <Input
            ref={inputRef}
            placeholder="Search or type new..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isNewValue) {
                e.preventDefault();
                handleAddNew();
              }
            }}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 h-8 px-0"
          />
        </div>
        <ScrollArea className="max-h-[200px]">
          {loading ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : (
            <div className="p-1">
              {/* Add new option when search doesn't match existing */}
              {isNewValue && (
                <button
                  type="button"
                  onClick={handleAddNew}
                  className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground text-blue-600"
                >
                  <Plus className={`mr-2 ${ICON_SIZES.sm}`} />
                  Add &quot;{search.trim()}&quot;
                </button>
              )}

              {filteredDepartments.length === 0 && !isNewValue ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {departments.length === 0
                    ? 'No departments yet. Type to add one.'
                    : 'No matching department.'}
                </div>
              ) : (
                filteredDepartments.map((department) => (
                  <button
                    key={department}
                    type="button"
                    onClick={() => handleSelect(department)}
                    className={cn(
                      'relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 px-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground',
                      value === department && 'bg-accent'
                    )}
                  >
                    <Check
                      className={cn(
                        `mr-2 ${ICON_SIZES.sm}`,
                        value === department ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {department}
                  </button>
                ))
              )}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
