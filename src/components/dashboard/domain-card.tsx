'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, Package, FolderKanban, Settings, Briefcase, FileText } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

// Icon mapping for Server Component compatibility
const iconMap = {
  users: Users,
  package: Package,
  'folder-kanban': FolderKanban,
  settings: Settings,
  briefcase: Briefcase,
  'file-text': FileText,
} as const;

type IconName = keyof typeof iconMap;

interface ModuleItem {
  name: string;
  href: string;
  count?: number;
  badge?: number;
}

interface DomainCardProps {
  domain: string;
  iconName: IconName;
  href: string;
  color: 'emerald' | 'blue' | 'purple' | 'slate' | 'orange' | 'pink';
  modules: ModuleItem[];
  className?: string;
}

const colorStyles = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-600 dark:text-emerald-400',
    title: 'text-emerald-900 dark:text-emerald-100',
    hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/50',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-600 dark:text-blue-400',
    title: 'text-blue-900 dark:text-blue-100',
    hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/50',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  },
  purple: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    icon: 'text-purple-600 dark:text-purple-400',
    title: 'text-purple-900 dark:text-purple-100',
    hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/50',
    badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300',
  },
  slate: {
    bg: 'bg-slate-50 dark:bg-slate-950/30',
    border: 'border-slate-200 dark:border-slate-800',
    icon: 'text-slate-600 dark:text-slate-400',
    title: 'text-slate-900 dark:text-slate-100',
    hover: 'hover:bg-slate-100 dark:hover:bg-slate-900/50',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-900 dark:text-slate-300',
  },
  orange: {
    bg: 'bg-orange-50 dark:bg-orange-950/30',
    border: 'border-orange-200 dark:border-orange-800',
    icon: 'text-orange-600 dark:text-orange-400',
    title: 'text-orange-900 dark:text-orange-100',
    hover: 'hover:bg-orange-100 dark:hover:bg-orange-900/50',
    badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
  },
  pink: {
    bg: 'bg-pink-50 dark:bg-pink-950/30',
    border: 'border-pink-200 dark:border-pink-800',
    icon: 'text-pink-600 dark:text-pink-400',
    title: 'text-pink-900 dark:text-pink-100',
    hover: 'hover:bg-pink-100 dark:hover:bg-pink-900/50',
    badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300',
  },
};

export function DomainCard({
  domain,
  iconName,
  href,
  color,
  modules,
  className,
}: DomainCardProps) {
  const styles = colorStyles[color];
  const Icon = iconMap[iconName];

  // Calculate total pending/badge items
  const totalBadges = modules.reduce((sum, m) => sum + (m.badge || 0), 0);

  return (
    <Card
      className={cn(
        'transition-all duration-200 border-2',
        styles.bg,
        styles.border,
        className
      )}
    >
      <CardHeader className="pb-3">
        <Link
          href={href}
          className={cn(
            'flex items-center justify-between rounded-lg -mx-2 -my-1 px-2 py-1 transition-colors',
            styles.hover
          )}
        >
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', styles.bg)}>
              <Icon className={cn(ICON_SIZES.md, styles.icon)} />
            </div>
            <CardTitle className={cn('text-lg font-semibold', styles.title)}>
              {domain}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {totalBadges > 0 && (
              <Badge variant="destructive" className="h-6 min-w-6 px-2">
                {totalBadges}
              </Badge>
            )}
            <ArrowRight className={cn(ICON_SIZES.sm, styles.icon)} />
          </div>
        </Link>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {modules.map((module) => (
            <Link
              key={module.href}
              href={module.href}
              className={cn(
                'flex items-center justify-between py-2 px-3 rounded-md text-sm transition-colors',
                styles.hover,
                'text-slate-700 dark:text-slate-300'
              )}
            >
              <span>{module.name}</span>
              <div className="flex items-center gap-2">
                {module.count !== undefined && (
                  <span className={cn('text-xs px-2 py-0.5 rounded-full', styles.badge)}>
                    {module.count}
                  </span>
                )}
                {module.badge !== undefined && module.badge > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                    {module.badge}
                  </Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
