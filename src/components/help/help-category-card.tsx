'use client';

import Link from 'next/link';
import * as Icons from 'lucide-react';
import { HelpCircle, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { CategoryInfo } from '@/lib/help/help-categories';

interface HelpCategoryCardProps {
  category: CategoryInfo;
}

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return <HelpCircle className={className} />;
  return <IconComponent className={className} />;
}

export function HelpCategoryCard({ category }: HelpCategoryCardProps) {
  return (
    <div className={cn('rounded-xl border bg-white p-6 shadow-sm', category.bgColor)}>
      <div className="flex items-start gap-4">
        <div className={cn('p-3 rounded-lg', category.bgColor)}>
          <DynamicIcon name={category.icon} className={cn('h-6 w-6', category.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg text-gray-900">{category.name}</h3>
          <p className="text-sm text-gray-600 mt-1">{category.description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {category.modules.map((module) => (
          <Link
            key={module.id}
            href={module.href}
            className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/80 transition-colors group"
          >
            <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-gray-900">
              <DynamicIcon name={module.icon} className="h-4 w-4 text-gray-400" />
              {module.name}
              {module.adminOnly && (
                <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                  Admin
                </span>
              )}
            </span>
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>
        ))}
      </div>
    </div>
  );
}
