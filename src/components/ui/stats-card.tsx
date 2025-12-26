'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const colorPresets = {
  blue: {
    gradient: 'from-blue-400 to-indigo-500',
    shadow: 'shadow-blue-200/50',
  },
  amber: {
    gradient: 'from-amber-400 to-orange-500',
    shadow: 'shadow-orange-200/50',
  },
  emerald: {
    gradient: 'from-emerald-400 to-teal-500',
    shadow: 'shadow-emerald-200/50',
  },
  rose: {
    gradient: 'from-rose-400 to-pink-500',
    shadow: 'shadow-rose-200/50',
  },
  purple: {
    gradient: 'from-purple-400 to-violet-500',
    shadow: 'shadow-purple-200/50',
  },
  cyan: {
    gradient: 'from-cyan-400 to-blue-500',
    shadow: 'shadow-cyan-200/50',
  },
  green: {
    gradient: 'from-green-400 to-emerald-500',
    shadow: 'shadow-green-200/50',
  },
} as const;

export type StatsCardColor = keyof typeof colorPresets;

interface StatsCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: LucideIcon;
  color: StatsCardColor;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  children?: ReactNode;
  className?: string;
}

export function StatsCard({
  title,
  subtitle,
  value,
  icon: Icon,
  color,
  href,
  onClick,
  selected,
  children,
  className,
}: StatsCardProps) {
  const preset = colorPresets[color];

  const cardContent = (
    <div
      className={cn(
        'relative overflow-hidden bg-gradient-to-br rounded-2xl p-4 text-white shadow-lg transition-all duration-200',
        preset.gradient,
        preset.shadow,
        (href || onClick) && !selected && 'hover:shadow-xl hover:-translate-y-1 cursor-pointer',
        !href && !onClick && 'hover:shadow-xl hover:-translate-y-1',
        selected && 'ring-2 ring-white ring-offset-2',
        className
      )}
      onClick={onClick}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-center justify-between mb-1">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
            <Icon className="h-4 w-4" />
          </div>
          <span className="text-3xl font-bold">{value}</span>
        </div>
        <p className="text-sm font-medium">{title}</p>
        {subtitle && <p className="text-xs text-white/80">{subtitle}</p>}
        {children}
      </div>
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{cardContent}</Link>;
  }

  return cardContent;
}

interface StatsCardGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export function StatsCardGrid({ children, columns = 4, className }: StatsCardGridProps) {
  const colsClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    6: 'md:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid grid-cols-2 gap-4', colsClass[columns], className)}>
      {children}
    </div>
  );
}
