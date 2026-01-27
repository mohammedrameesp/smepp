/**
 * @file OnboardingFunnel.tsx
 * @description Visual funnel showing onboarding step completion rates
 * @module super-admin/analytics
 */

import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface FunnelStep {
  step: string;
  count: number;
  percentage: number;
}

interface OnboardingFunnelProps {
  data: FunnelStep[];
  totalOrgs: number;
}

export function OnboardingFunnel({ data, totalOrgs }: OnboardingFunnelProps) {
  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Onboarding Completion</h3>
        <p className="text-sm text-slate-500">
          How far organizations get in the setup process
        </p>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => {
          const isHighCompletion = item.percentage >= 50;
          const barColor = isHighCompletion
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
            : item.percentage >= 25
            ? 'bg-gradient-to-r from-amber-500 to-amber-400'
            : 'bg-gradient-to-r from-slate-400 to-slate-300';

          return (
            <div key={item.step} className="group">
              <div className="flex items-center gap-3">
                {/* Step number */}
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                    item.percentage >= 50
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {item.percentage >= 50 ? (
                    <CheckCircle2 className={ICON_SIZES.sm} />
                  ) : (
                    index + 1
                  )}
                </div>

                {/* Bar and label */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700 truncate">
                      {item.step}
                    </span>
                    <span className="text-sm text-slate-500 ml-2">
                      {item.percentage}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor}`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary stats */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-500">Total organizations</span>
          <span className="font-semibold text-slate-900">{totalOrgs}</span>
        </div>
        {data.length > 0 && (
          <div className="flex items-center justify-between text-sm mt-1">
            <span className="text-slate-500">Fully onboarded</span>
            <span className="font-semibold text-emerald-600">
              {data[data.length - 1]?.count || 0} (
              {data[data.length - 1]?.percentage || 0}%)
            </span>
          </div>
        )}
      </div>
    </Card>
  );
}
