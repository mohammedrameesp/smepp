/**
 * @file ModuleUsageChart.tsx
 * @description Horizontal bar chart showing module adoption rates
 * @module super-admin/analytics
 */

import { Card } from '@/components/ui/card';

interface ModuleData {
  name: string;
  count: number;
  percentage: number;
}

interface ModuleUsageChartProps {
  data: ModuleData[];
  totalOrgs: number;
}

const MODULE_COLORS: Record<string, string> = {
  Assets: 'bg-blue-500',
  Subscriptions: 'bg-purple-500',
  Suppliers: 'bg-emerald-500',
  Employees: 'bg-amber-500',
  Leave: 'bg-cyan-500',
  Payroll: 'bg-rose-500',
  'Purchase Requests': 'bg-indigo-500',
  Projects: 'bg-lime-500',
};

export function ModuleUsageChart({ data }: ModuleUsageChartProps) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Module Adoption</h3>
        <p className="text-sm text-slate-500">
          Which modules organizations have enabled
        </p>
      </div>

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-slate-700">{item.name}</span>
              <span className="text-slate-500">
                {item.count} orgs ({item.percentage}%)
              </span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  MODULE_COLORS[item.name] || 'bg-slate-500'
                }`}
                style={{ width: `${(item.count / maxCount) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {data.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          No module data available
        </div>
      )}
    </Card>
  );
}
