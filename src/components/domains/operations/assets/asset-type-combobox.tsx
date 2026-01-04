'use client';

/**
 * @file asset-type-combobox.tsx
 * @description Combobox for asset types with auto-suggest and auto-category assignment
 * @module components/domains/operations/assets
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  searchAssetTypes,
  findCategoryForType,
  type AssetTypeSuggestion,
} from '@/lib/constants/asset-type-suggestions';
import { cn } from '@/lib/utils';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Update suggestions when value changes
  useEffect(() => {
    if (value && value.length >= 1) {
      const matches = searchAssetTypes(value, 8);
      setSuggestions(matches);
    } else {
      setSuggestions([]);
    }
  }, [value]);

  // Check for category match when value changes (with debounce)
  useEffect(() => {
    if (!value || !onCategoryMatch) return;

    const timer = setTimeout(() => {
      const match = findCategoryForType(value);
      if (match) {
        onCategoryMatch(match.categoryCode, match.categoryName);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [value, onCategoryMatch]);

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
      <Input
        ref={inputRef}
        value={value}
        onChange={handleInputChange}
        onFocus={() => value && suggestions.length > 0 && setShowSuggestions(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={className}
        autoComplete="off"
      />

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-auto"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.categoryCode}-${suggestion.type}`}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                'w-full px-3 py-2 text-left flex items-center justify-between hover:bg-accent transition-colors',
                index === selectedIndex && 'bg-accent'
              )}
            >
              <span className="font-medium">{suggestion.type}</span>
              <Badge variant="outline" className="text-xs font-mono">
                {suggestion.categoryCode}
              </Badge>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
