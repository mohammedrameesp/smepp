/**
 * @file stats-card.tsx
 * @description Statistics card components for displaying key metrics and KPIs
 * @module components/ui
 */

'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  FileWarning,
  ClipboardList,
  Package,
  DollarSign,
  Inbox,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  ShoppingCart,
  Wallet,
  FileText,
  Building2,
  PauseCircle,
  Play,
  FolderKanban,
  Settings,
  Tags,
  Handshake,
  Search,
  AlertTriangle,
  Signal,
  Activity,
  TrendingUp,
  UserCheck,
  Percent,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Icon map for string-based icon names
const iconMap: Record<string, LucideIcon> = {
  users: Users,
  calendar: Calendar,
  'file-warning': FileWarning,
  'clipboard-list': ClipboardList,
  package: Package,
  'dollar-sign': DollarSign,
  inbox: Inbox,
  'credit-card': CreditCard,
  clock: Clock,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  'shopping-cart': ShoppingCart,
  wallet: Wallet,
  'file-text': FileText,
  building2: Building2,
  'pause-circle': PauseCircle,
  play: Play,
  'folder-kanban': FolderKanban,
  settings: Settings,
  tags: Tags,
  handshake: Handshake,
  search: Search,
  'alert-triangle': AlertTriangle,
  signal: Signal,
  activity: Activity,
  'trending-up': TrendingUp,
  'user-check': UserCheck,
  percent: Percent,
};

const colorPresets = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600',
  },
  amber: {
    bg: 'bg-amber-50',
    icon: 'bg-amber-100 text-amber-600',
    text: 'text-amber-600',
  },
  emerald: {
    bg: 'bg-emerald-50',
    icon: 'bg-emerald-100 text-emerald-600',
    text: 'text-emerald-600',
  },
  rose: {
    bg: 'bg-rose-50',
    icon: 'bg-rose-100 text-rose-600',
    text: 'text-rose-600',
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600',
  },
  cyan: {
    bg: 'bg-cyan-50',
    icon: 'bg-cyan-100 text-cyan-600',
    text: 'text-cyan-600',
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600',
  },
  slate: {
    bg: 'bg-slate-50',
    icon: 'bg-slate-100 text-slate-600',
    text: 'text-slate-600',
  },
} as const;

export type StatsCardColor = keyof typeof colorPresets;
export type StatsCardIconName = keyof typeof iconMap;

interface StatsCardProps {
  title: string;
  subtitle?: string;
  value: string | number;
  icon: StatsCardIconName;
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
  icon,
  color,
  href,
  onClick,
  selected,
  children,
  className,
}: StatsCardProps) {
  const Icon = iconMap[icon] || Package;
  const preset = colorPresets[color];

  const cardContent = (
    <div
      className={cn(
        'bg-white border border-slate-200 rounded-xl p-4 transition-all duration-200',
        (href || onClick) && !selected && 'hover:border-slate-300 hover:shadow-md cursor-pointer',
        selected && 'ring-2 ring-blue-500 border-blue-500',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', preset.icon)}>
          <Icon className="h-5 w-5" />
        </div>
        <span className="text-2xl font-bold text-slate-900">{value}</span>
      </div>
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      {children}
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
