'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { Search, FileText, HelpCircle, ArrowRight } from 'lucide-react';
import { HelpSearchInput } from '@/components/help';
import { helpCategories } from '@/lib/help/help-categories';
import { ICON_SIZES } from '@/lib/constants';

// Simple client-side search (will be enhanced in Phase 5)
function searchContent(query: string) {
  if (!query.trim()) return [];

  const results: Array<{
    id: string;
    title: string;
    description: string;
    category: string;
    url: string;
    type: 'module' | 'faq';
  }> = [];

  const normalizedQuery = query.toLowerCase();

  // Search through modules
  for (const category of helpCategories) {
    for (const moduleItem of category.modules) {
      if (
        moduleItem.name.toLowerCase().includes(normalizedQuery) ||
        moduleItem.description.toLowerCase().includes(normalizedQuery)
      ) {
        results.push({
          id: `${category.id}-${moduleItem.id}`,
          title: moduleItem.name,
          description: moduleItem.description,
          category: category.name,
          url: moduleItem.href,
          type: 'module',
        });
      }
    }
  }

  return results;
}

function SearchResults() {
  const searchParams = useSearchParams();
  const query = searchParams.get('q') || '';
  const results = searchContent(query);

  if (!query) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <Search className={`${ICON_SIZES.xl} text-gray-400`} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Search Help</h2>
        <p className="text-gray-500 max-w-md mx-auto">
          Enter a search term to find help articles, FAQs, and guides.
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
          <HelpCircle className={`${ICON_SIZES.xl} text-gray-400`} />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">No results found</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-6">
          We couldn&apos;t find any results for &quot;{query}&quot;. Try different keywords or browse
          our help categories.
        </p>
        <Link
          href="/help"
          className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          Browse all topics
          <ArrowRight className={ICON_SIZES.sm} />
        </Link>
      </div>
    );
  }

  return (
    <div>
      <p className="text-gray-500 mb-6">
        Found {results.length} result{results.length !== 1 ? 's' : ''} for &quot;{query}&quot;
      </p>

      <div className="space-y-4">
        {results.map((result) => (
          <Link
            key={result.id}
            href={result.url}
            className="block p-4 rounded-lg border bg-white hover:border-blue-200 hover:shadow-sm transition-all group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors">
                <FileText className={`${ICON_SIZES.md} text-gray-400 group-hover:text-blue-600 transition-colors`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {result.title}
                  </h3>
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">
                    {result.category}
                  </span>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2">{result.description}</p>
              </div>
              <ArrowRight className={`${ICON_SIZES.sm} text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1`} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function HelpSearchPage() {
  return (
    <div className="space-y-8">
      {/* Search Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Search Help</h1>
        <HelpSearchInput
          placeholder="Search for help articles..."
          autoFocus
          className="max-w-xl"
        />
      </div>

      {/* Results */}
      <Suspense
        fallback={
          <div className="text-center py-16">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-32 mx-auto mb-4" />
              <div className="h-20 bg-gray-100 rounded max-w-lg mx-auto" />
            </div>
          </div>
        }
      >
        <SearchResults />
      </Suspense>
    </div>
  );
}
