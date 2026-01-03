import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type ColorVariant = 'blue' | 'emerald' | 'violet' | 'amber' | 'slate';

interface StatCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  color?: ColorVariant;
  className?: string;
}

const colorStyles: Record<ColorVariant, { iconBg: string; iconColor: string }> = {
  blue: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-blue-600',
  },
  emerald: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-emerald-600',
  },
  violet: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-violet-600',
  },
  amber: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-amber-600',
  },
  slate: {
    iconBg: 'bg-slate-100',
    iconColor: 'text-slate-600',
  },
};

export function StatCard({ icon: Icon, value, label, color = 'blue', className }: StatCardProps) {
  const styles = colorStyles[color];

  return (
    <div
      className={cn(
        'bg-white rounded-xl p-4 border border-gray-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', styles.iconBg)}>
          <Icon className={cn('h-5 w-5', styles.iconColor)} />
        </div>
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </div>
      </div>
    </div>
  );
}
