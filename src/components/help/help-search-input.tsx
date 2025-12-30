'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Command, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface HelpSearchInputProps {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  onSearch?: (query: string) => void;
  showShortcut?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function HelpSearchInput({
  placeholder = 'Search help articles...',
  className,
  autoFocus = false,
  onSearch,
  showShortcut = true,
  size = 'md',
}: HelpSearchInputProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const sizeStyles = {
    sm: 'h-9 text-sm',
    md: 'h-10',
    lg: 'h-12 text-lg',
  };

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        if (onSearch) {
          onSearch(query.trim());
        } else {
          router.push(`/help/search?q=${encodeURIComponent(query.trim())}`);
        }
      }
    },
    [query, onSearch, router]
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('');
      inputRef.current?.blur();
    }
  }, []);

  // Global keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  return (
    <form onSubmit={handleSubmit} className={cn('relative', className)}>
      <Search
        className={cn(
          'absolute left-3 top-1/2 -translate-y-1/2 text-gray-400',
          size === 'sm' ? 'h-4 w-4' : 'h-5 w-5'
        )}
      />

      <Input
        ref={inputRef}
        type="search"
        placeholder={placeholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        onKeyDown={handleKeyDown}
        autoFocus={autoFocus}
        className={cn(
          'pl-10 pr-20',
          sizeStyles[size],
          isFocused && 'ring-2 ring-blue-500 border-blue-500'
        )}
      />

      {/* Clear button */}
      {query && (
        <button
          type="button"
          onClick={() => setQuery('')}
          className="absolute right-12 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      {/* Keyboard shortcut indicator */}
      {showShortcut && !query && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 text-gray-400 text-xs">
          <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs font-mono">
            <Command className="h-3 w-3 inline" />
          </kbd>
          <kbd className="px-1.5 py-0.5 bg-gray-100 border rounded text-xs font-mono">K</kbd>
        </div>
      )}
    </form>
  );
}

// Large hero search for main help page
export function HelpHeroSearch({ className }: { className?: string }) {
  return (
    <div className={cn('max-w-2xl mx-auto', className)}>
      <HelpSearchInput
        placeholder="Search for help articles, FAQs, and guides..."
        size="lg"
        autoFocus
        className="shadow-lg"
      />
      <p className="text-center text-sm text-gray-500 mt-3">
        Try searching for &quot;leave request&quot;, &quot;add asset&quot;, or &quot;payroll&quot;
      </p>
    </div>
  );
}
