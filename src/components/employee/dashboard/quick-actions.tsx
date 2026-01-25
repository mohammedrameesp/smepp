import Link from 'next/link';
import { Palmtree, ShoppingCart, Search, CreditCard, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';

interface QuickAction {
  label: string;
  href: string;
  icon: typeof Palmtree;
  bgColor: string;
  hoverBgColor: string;
  iconBgColor: string;
  iconColor: string;
}

const defaultActions: QuickAction[] = [
  {
    label: 'Request Leave',
    href: '/employee/leave/new',
    icon: Palmtree,
    bgColor: 'bg-gray-50',
    hoverBgColor: 'hover:bg-gray-100',
    iconBgColor: 'bg-slate-100',
    iconColor: 'text-blue-600',
  },
  {
    label: 'New Purchase',
    href: '/employee/spend-requests/new',
    icon: ShoppingCart,
    bgColor: 'bg-gray-50',
    hoverBgColor: 'hover:bg-gray-100',
    iconBgColor: 'bg-slate-100',
    iconColor: 'text-violet-600',
  },
  {
    label: 'Browse Assets',
    href: '/employee/assets',
    icon: Search,
    bgColor: 'bg-gray-50',
    hoverBgColor: 'hover:bg-gray-100',
    iconBgColor: 'bg-slate-100',
    iconColor: 'text-emerald-600',
  },
  {
    label: 'Browse Subscriptions',
    href: '/employee/subscriptions',
    icon: CreditCard,
    bgColor: 'bg-gray-50',
    hoverBgColor: 'hover:bg-gray-100',
    iconBgColor: 'bg-slate-100',
    iconColor: 'text-amber-600',
  },
];

interface QuickActionsProps {
  actions?: QuickAction[];
  className?: string;
}

export function QuickActions({ actions = defaultActions, className }: QuickActionsProps) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl p-4', className)}>
      <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
        Quick Actions
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link key={action.href} href={action.href}>
              <div
                className={cn(
                  'p-4 rounded-xl transition-colors text-left',
                  action.bgColor,
                  action.hoverBgColor
                )}
              >
                <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-2', action.iconBgColor)}>
                  <Icon className={cn('h-5 w-5', action.iconColor)} />
                </div>
                <p className="text-sm font-medium text-gray-900">{action.label}</p>
              </div>
            </Link>
          );
        })}
      </div>

      <Link
        href="/help"
        className="flex items-center justify-center gap-1 mt-4 text-sm text-gray-500 hover:text-gray-700"
      >
        <HelpCircle className="h-4 w-4" />
        Help & Support
      </Link>
    </div>
  );
}
