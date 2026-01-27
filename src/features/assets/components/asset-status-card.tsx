/**
 * @file asset-status-card.tsx
 * @description Status card component for asset detail sidebar
 * @module components/domains/operations/assets
 */
'use client';

import { CheckCircle, Package, Wrench, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';

interface AssetStatusCardProps {
  status: 'IN_USE' | 'SPARE' | 'REPAIR' | 'DISPOSED';
}

const statusConfig = {
  IN_USE: {
    label: 'In Use',
    icon: CheckCircle,
    badgeVariant: 'info' as const,
    bg: 'bg-blue-100',
    iconColor: 'text-blue-600'
  },
  SPARE: {
    label: 'Spare',
    icon: Package,
    badgeVariant: 'success' as const,
    bg: 'bg-emerald-100',
    iconColor: 'text-emerald-600'
  },
  REPAIR: {
    label: 'Repair',
    icon: Wrench,
    badgeVariant: 'warning' as const,
    bg: 'bg-amber-100',
    iconColor: 'text-amber-600'
  },
  DISPOSED: {
    label: 'Disposed',
    icon: XCircle,
    badgeVariant: 'default' as const,
    bg: 'bg-slate-100',
    iconColor: 'text-slate-600'
  },
};

export function AssetStatusCard({ status }: AssetStatusCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center`}>
          <Icon className={cn(ICON_SIZES.md, config.iconColor)} />
        </div>
        <h2 className="font-semibold text-slate-900">Status</h2>
      </div>
      <div className="p-5 flex items-center justify-center">
        <Badge variant={config.badgeVariant} className="text-base font-medium px-4 py-1.5">
          <Icon className={cn(ICON_SIZES.sm, 'mr-1.5')} />
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
