'use client';

import Link from 'next/link';
import * as Icons from 'lucide-react';
import { HelpCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ModuleInfo } from '@/lib/help/help-categories';

interface HelpModuleCardProps {
  module: ModuleInfo;
  categoryColor?: string;
}

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return <HelpCircle className={className} />;
  return <IconComponent className={className} />;
}

export function HelpModuleCard({ module, categoryColor = 'text-blue-600' }: HelpModuleCardProps) {
  return (
    <Link
      href={module.href}
      className="group block rounded-lg border bg-white p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all"
    >
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg bg-gray-50 group-hover:bg-blue-50 transition-colors')}>
          <DynamicIcon
            name={module.icon}
            className={cn('h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors', categoryColor)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
              {module.name}
            </h4>
            {module.adminOnly && (
              <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                Admin
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1 line-clamp-2">{module.description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-gray-300 group-hover:text-blue-600 transition-colors flex-shrink-0 mt-1" />
      </div>
    </Link>
  );
}
