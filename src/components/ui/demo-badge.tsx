/**
 * @file demo-badge.tsx
 * @description Demo badge components for indicating simulated or sample data
 * @module components/ui
 */

import { cn } from '@/lib/utils';
import { FlaskConical } from 'lucide-react';

interface DemoBadgeProps {
  className?: string;
  size?: 'sm' | 'md';
  inline?: boolean;
}

export function DemoBadge({ className, size = 'sm', inline = false }: DemoBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 bg-violet-100 text-violet-700 font-medium rounded',
        size === 'sm' ? 'text-[9px] px-1.5 py-0.5' : 'text-[10px] px-2 py-0.5',
        inline ? 'ml-1.5' : '',
        className
      )}
      title="Simulated data for demo purposes"
    >
      <FlaskConical className={size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      DEMO
    </span>
  );
}

export function DemoSection({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('relative', className)}>
      <div className="absolute -top-2 -right-2 z-10">
        <DemoBadge size="md" />
      </div>
      {children}
    </div>
  );
}
