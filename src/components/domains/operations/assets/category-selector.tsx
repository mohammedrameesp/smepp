'use client';

/**
 * @file category-selector.tsx
 * @description Asset category dropdown selector component
 * @module components/domains/operations/assets
 */

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface AssetCategory {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

interface CategorySelectorProps {
  value?: string | null;
  onChange: (categoryId: string | null, categoryCode: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const NONE_VALUE = '__none__';

export function CategorySelector({
  value,
  onChange,
  disabled,
  placeholder = 'Select category...',
  className,
  required,
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch('/api/asset-categories');
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        } else {
          setError('Failed to load categories');
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
        setError('Failed to load categories');
      } finally {
        setLoading(false);
      }
    }
    fetchCategories();
  }, []);

  if (loading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (error) {
    return (
      <div className="text-sm text-destructive">
        {error}
      </div>
    );
  }

  return (
    <Select
      value={value || NONE_VALUE}
      onValueChange={(val) => {
        if (val === NONE_VALUE) {
          onChange(null, null);
        } else {
          const category = categories.find((c) => c.id === val);
          onChange(val, category?.code || null);
        }
      }}
      disabled={disabled}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {!required && (
          <SelectItem value={NONE_VALUE}>
            <span className="text-muted-foreground">No category</span>
          </SelectItem>
        )}
        {categories.map((cat) => (
          <SelectItem key={cat.id} value={cat.id}>
            <span className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                {cat.code}
              </span>
              <span>{cat.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
