'use client';

import { useState } from 'react';
import * as Icons from 'lucide-react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';

interface HelpContentSectionProps {
  id?: string;
  title: string;
  icon?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
  badge?: string;
  badgeColor?: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return <HelpCircle className={className} />;
  return <IconComponent className={className} />;
}

const badgeColors = {
  blue: 'bg-blue-100 text-blue-700',
  green: 'bg-green-100 text-green-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  red: 'bg-red-100 text-red-700',
  gray: 'bg-gray-100 text-gray-700',
};

export function HelpContentSection({
  id,
  title,
  icon,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
  badge,
  badgeColor = 'gray',
}: HelpContentSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const header = (
    <div className="flex items-center gap-3">
      {icon && (
        <div className="p-2 rounded-lg bg-gray-100">
          <DynamicIcon name={icon} className="h-5 w-5 text-gray-600" />
        </div>
      )}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {badge && (
          <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', badgeColors[badgeColor])}>
            {badge}
          </span>
        )}
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <section id={id} className={cn('scroll-mt-20', className)}>
        <div className="mb-4">{header}</div>
        <div className="text-gray-600">{children}</div>
      </section>
    );
  }

  return (
    <section id={id} className={cn('border rounded-lg bg-white overflow-hidden scroll-mt-20', className)}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={isOpen}
      >
        {header}
        <ChevronDown
          className={cn(
            'h-5 w-5 text-gray-400 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'transition-all duration-200 overflow-hidden',
          isOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-4 pb-4 text-gray-600 border-t pt-4">{children}</div>
      </div>
    </section>
  );
}

// Sub-section for grouping content within a main section
interface HelpSubSectionProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function HelpSubSection({ title, children, className }: HelpSubSectionProps) {
  return (
    <div className={cn('mt-4 first:mt-0', className)}>
      <h3 className="text-base font-medium text-gray-800 mb-2">{title}</h3>
      <div className="text-sm text-gray-600">{children}</div>
    </div>
  );
}
