'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FAQItem, UserRole } from '@/lib/help/help-types';
import { filterByRole } from '@/lib/help/help-types';

interface HelpFAQAccordionProps {
  items: FAQItem[];
  userRole: UserRole;
  defaultOpenId?: string;
  allowMultiple?: boolean;
}

interface FAQItemProps {
  item: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}

function FAQAccordionItem({ item, isOpen, onToggle }: FAQItemProps) {
  return (
    <div className="border-b last:border-b-0">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="font-medium text-gray-900 pr-4">{item.question}</span>
        <ChevronDown
          className={cn(
            'h-5 w-5 text-gray-400 flex-shrink-0 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 text-gray-600 text-sm leading-relaxed prose prose-sm max-w-none">
          {item.answer.split('\n').map((paragraph, i) => (
            <p key={i} className={i > 0 ? 'mt-2' : ''}>
              {paragraph}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HelpFAQAccordion({
  items,
  userRole,
  defaultOpenId,
  allowMultiple = false,
}: HelpFAQAccordionProps) {
  // Filter items by role
  const filteredItems = filterByRole(items, userRole);

  // Track open items
  const [openItems, setOpenItems] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    if (defaultOpenId && filteredItems.some((item) => item.id === defaultOpenId)) {
      initial.add(defaultOpenId);
    }
    return initial;
  });

  const toggleItem = (id: string) => {
    setOpenItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (!allowMultiple) {
          next.clear();
        }
        next.add(id);
      }
      return next;
    });
  };

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No frequently asked questions available.
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white divide-y">
      {filteredItems.map((item) => (
        <FAQAccordionItem
          key={item.id}
          item={item}
          isOpen={openItems.has(item.id)}
          onToggle={() => toggleItem(item.id)}
        />
      ))}
    </div>
  );
}
