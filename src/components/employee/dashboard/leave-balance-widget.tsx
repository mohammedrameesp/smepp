import Link from 'next/link';
import { CalendarDays, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface LeaveBalance {
  id: string;
  leaveTypeName: string;
  color: string;
  available: number;
  total: number;
  isAccrual?: boolean;
}

interface LeaveBalanceWidgetProps {
  balances: LeaveBalance[];
  year: number;
  className?: string;
}

export function LeaveBalanceWidget({ balances, year, className }: LeaveBalanceWidgetProps) {
  const hasBalances = balances.length > 0;

  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl p-4', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-gray-500" />
          Leave Balance
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{year}</span>
      </div>

      {!hasBalances ? (
        <div className="text-center py-6 text-gray-500">
          <CalendarDays className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium">No leave balances</p>
          <p className="text-xs">Contact HR to set up your leave</p>
        </div>
      ) : (
        <div className="space-y-3">
          {balances.slice(0, 4).map((balance) => {
            const percentage = balance.total > 0 ? (balance.available / balance.total) * 100 : 0;

            return (
              <div key={balance.id}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: balance.color }}
                    />
                    <span className="text-sm text-gray-700">{balance.leaveTypeName}</span>
                    {balance.isAccrual && (
                      <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded">
                        Accrual
                      </span>
                    )}
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: balance.color }}
                  >
                    {balance.available.toFixed(1)} / {balance.total.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(percentage, 100)}%`,
                      backgroundColor: balance.color,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Link href="/employee/leave/new">
        <Button className="w-full mt-4 bg-slate-800 hover:bg-slate-900">
          <Plus className="h-4 w-4 mr-2" />
          Request Leave
        </Button>
      </Link>
    </div>
  );
}
