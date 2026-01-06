/**
 * @file asset-type-combobox.tsx
 * @description Combobox for asset types with auto-suggest and auto-category assignment
 * @module components/domains/operations/assets
 *
 * Features:
 * - Debounced API search for asset type suggestions (100ms delay)
 * - Auto-assigns category when type matches a known suggestion
 * - Supports custom tenant-specific type mappings (marked with star icon)
 * - Full keyboard navigation (Arrow keys, Enter, Escape)
 * - ARIA-compliant combobox with proper roles and labels
 * - Loading indicator during API fetch
 * - Aborts pending requests on new input (prevents race conditions)
 *
 * Props:
 * - value: Current type value (controlled)
 * - onChange: Callback when type changes
 * - onCategoryMatch: Callback when type matches a category (code, name)
 * - placeholder: Input placeholder text
 * - disabled: Disables the input
 * - className: Additional CSS classes
 *
 * API Dependencies:
 * - GET /api/asset-types/suggestions?q={query}&limit=8 - Fetches type suggestions
 *
 * Usage:
 * - Used in asset create/edit forms for type entry
 * - Helps standardize asset types and auto-categorize
 *
 * Access: Admin only (asset management)
 */
'use client';

import { useState, useEffect, useRef, useCallback, useId } from 'react';
import { Input } from '@/components/ui/input';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetTypeSuggestion {
  type: string;
  categoryCode: string;
  categoryName: string;
  isCustom: boolean;
}

interface AssetTypeComboboxProps {
  value: string;
  onChange: (type: string) => void;
  onCategoryMatch?: (categoryCode: string, categoryName: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AssetTypeCombobox({
  value,
  onChange,
  onCategoryMatch,
  placeholder = 'e.g., Laptop, Monitor, Printer...',
  disabled,
  className,
}: AssetTypeComboboxProps) {
  const [suggestions, setSuggestions] = useState<AssetTypeSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const listboxId = useId();
  const getOptionId = (index: number) => `${listboxId}-option-${index}`;

  // Debounced fetch suggestions from API
  const fetchSuggestions = useCallback(async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (!query || query.length < 1) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        `/api/asset-types/suggestions?q=${encodeURIComponent(query)}&limit=8`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Error fetching suggestions:', error);
        setSuggestions([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update suggestions when value changes (with debounce - reduced for snappier feel)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuggestions(value);
    }, 100);

    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  // Auto-assign category when user selects a suggestion or types a matching value
  useEffect(() => {
    if (!value || !onCategoryMatch || suggestions.length === 0) return;

    // Check if current value exactly matches any suggestion
    const exactMatch = suggestions.find(
      (s) => s.type.toLowerCase() === value.toLowerCase()
    );

    if (exactMatch) {
      onCategoryMatch(exactMatch.categoryCode, exactMatch.categoryName);
    }
  }, [value, suggestions, onCategoryMatch]);

  // Handle click outside to close suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  }

  function handleSuggestionClick(suggestion: AssetTypeSuggestion) {
    onChange(suggestion.type);
    if (onCategoryMatch) {
      onCategoryMatch(suggestion.categoryCode, suggestion.categoryName);
    }
    setShowSuggestions(false);
    setSelectedIndex(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  }

  return (
    <div className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={handleInputChange}
          onFocus={() => {
            if (value) {
              setShowSuggestions(true);
              // Trigger immediate fetch on focus if we have a value but no suggestions yet
              if (suggestions.length === 0) {
                fetchSuggestions(value);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(className, isLoading && 'pr-8')}
          autoComplete="off"
          role="combobox"
          aria-expanded={showSuggestions && suggestions.length > 0}
          aria-controls={listboxId}
          aria-activedescendant={selectedIndex >= 0 ? getOptionId(selectedIndex) : undefined}
          aria-autocomplete="list"
        />
        {isLoading && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          id={listboxId}
          role="listbox"
          aria-label="Asset type suggestions"
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.categoryCode}-${suggestion.type}-${suggestion.isCustom}`}
              id={getOptionId(index)}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
            >
              <span className="font-medium">{suggestion.type}</span>
              {suggestion.isCustom && (
                <Star className="h-3 w-3 text-amber-500 fill-amber-500" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
