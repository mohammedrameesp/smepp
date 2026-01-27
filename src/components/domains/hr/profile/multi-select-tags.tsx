/**
 * @file multi-select-tags.tsx
 * @description Multi-select dropdown with tag chips for selecting multiple values
 * @module components/domains/hr
 */
'use client';

import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { X, ChevronDown, Check } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface MultiSelectTagsProps {
  options: readonly string[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  maxTags?: number;
  id?: string;
}

export function MultiSelectTags({
  options,
  value,
  onChange,
  placeholder = 'Select or type...',
  disabled = false,
  allowCustom = true,
  maxTags,
  id,
}: MultiSelectTagsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(
    (option) =>
      option.toLowerCase().includes(search.toLowerCase()) &&
      !value.includes(option)
  );

  const handleSelect = (option: string) => {
    if (maxTags && value.length >= maxTags) return;
    onChange([...value, option]);
    setSearch('');
    inputRef.current?.focus();
  };

  const handleRemove = (option: string) => {
    onChange(value.filter((v) => v !== option));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !search && value.length > 0) {
      // Remove last tag on backspace when input is empty
      handleRemove(value[value.length - 1]);
    } else if (e.key === 'Enter' && search) {
      e.preventDefault();
      // If exact match exists, select it
      const exactMatch = options.find(
        (o) => o.toLowerCase() === search.toLowerCase()
      );
      if (exactMatch && !value.includes(exactMatch)) {
        handleSelect(exactMatch);
      } else if (allowCustom && search.trim() && !value.includes(search.trim())) {
        // Add custom value
        if (!maxTags || value.length < maxTags) {
          onChange([...value, search.trim()]);
          setSearch('');
        }
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px] cursor-text ${
          disabled ? 'bg-gray-100' : 'bg-white'
        } ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
        onClick={() => {
          if (!disabled) {
            setIsOpen(true);
            inputRef.current?.focus();
          }
        }}
      >
        {value.map((item) => (
          <Badge
            key={item}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1"
          >
            {item}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(item);
                }}
                className="hover:text-red-600"
              >
                <X className={ICON_SIZES.xs} />
              </button>
            )}
          </Badge>
        ))}
        {(!maxTags || value.length < maxTags) && (
          <Input
            id={id}
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={value.length === 0 ? placeholder : ''}
            disabled={disabled}
            className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 shadow-none"
          />
        )}
        <ChevronDown className={`${ICON_SIZES.sm} text-gray-400 ml-auto self-center`} />
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(option);
                }}
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center justify-between"
              >
                {option}
                {value.includes(option) && (
                  <Check className={`${ICON_SIZES.sm} text-blue-600`} />
                )}
              </button>
            ))
          ) : search && allowCustom ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!maxTags || value.length < maxTags) {
                  onChange([...value, search.trim()]);
                  setSearch('');
                }
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-blue-600"
            >
              Add &quot;{search}&quot;
            </button>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              No options found
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simple tags input without predefined options
interface TagsInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  maxTags?: number;
  id?: string;
}

export function TagsInput({
  value,
  onChange,
  placeholder = 'Type and press Enter...',
  disabled = false,
  maxTags,
  id,
}: TagsInputProps) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input.trim()) {
      e.preventDefault();
      if (!value.includes(input.trim()) && (!maxTags || value.length < maxTags)) {
        onChange([...value, input.trim()]);
        setInput('');
      }
    } else if (e.key === 'Backspace' && !input && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  const handleRemove = (tag: string) => {
    onChange(value.filter((v) => v !== tag));
  };

  return (
    <div
      className={`flex flex-wrap gap-1 p-2 border rounded-md min-h-[42px] cursor-text ${
        disabled ? 'bg-gray-100' : 'bg-white'
      }`}
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag) => (
        <Badge
          key={tag}
          variant="secondary"
          className="flex items-center gap-1 px-2 py-1"
        >
          {tag}
          {!disabled && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleRemove(tag);
              }}
              className="hover:text-red-600"
            >
              <X className={ICON_SIZES.xs} />
            </button>
          )}
        </Badge>
      ))}
      {(!maxTags || value.length < maxTags) && (
        <Input
          id={id}
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] border-0 p-0 h-6 focus-visible:ring-0 shadow-none"
        />
      )}
    </div>
  );
}
