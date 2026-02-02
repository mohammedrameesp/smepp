/**
 * @file OrganizationBreakdown.tsx
 * @description Tier distribution visualization for organizations
 * @module super-admin/analytics
 */

import { Card } from '@/components/ui/card';

interface TierData {
  tier: string;
  count: number;
}

interface OrganizationBreakdownProps {
  data: TierData[];
  totalOrgs: number;
}

const TIER_COLORS: Record<string, { bg: string; text: string; ring: string }> = {
  Free: { bg: 'bg-slate-100', text: 'text-slate-700', ring: 'ring-slate-200' },
  Starter: { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-200' },
  Professional: { bg: 'bg-purple-100', text: 'text-purple-700', ring: 'ring-purple-200' },
  Enterprise: { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200' },
};

const TIER_BAR_COLORS: Record<string, string> = {
  Free: 'bg-slate-400',
  Starter: 'bg-blue-500',
  Professional: 'bg-purple-500',
  Enterprise: 'bg-amber-500',
};

export function OrganizationBreakdown({ data, totalOrgs }: OrganizationBreakdownProps) {
  const sortedData = [...data].sort((a, b) => {
    const order = ['Enterprise', 'Professional', 'Starter', 'Free'];
    return order.indexOf(a.tier) - order.indexOf(b.tier);
  });

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900">Subscription Tiers</h3>
        <p className="text-sm text-slate-500">
          Distribution of organizations by plan
        </p>
      </div>

      {/* Stacked bar visualization */}
      <div className="mb-6">
        <div className="h-8 bg-slate-100 rounded-lg overflow-hidden flex">
          {sortedData.map((item) => {
            const percentage = totalOrgs > 0 ? (item.count / totalOrgs) * 100 : 0;
            if (percentage === 0) return null;

            return (
              <div
                key={item.tier}
                className={`h-full ${TIER_BAR_COLORS[item.tier] || 'bg-slate-400'} relative group transition-all hover:opacity-90`}
                style={{ width: `${percentage}%` }}
                title={`${item.tier}: ${item.count} (${Math.round(percentage)}%)`}
              >
                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                    {item.tier}: {Math.round(percentage)}%
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tier breakdown list */}
      <div className="space-y-3">
        {sortedData.map((item) => {
          const percentage = totalOrgs > 0 ? Math.round((item.count / totalOrgs) * 100) : 0;
          const colors = TIER_COLORS[item.tier] || TIER_COLORS.Free;

          return (
            <div
              key={item.tier}
              className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-3 h-3 rounded-full ${TIER_BAR_COLORS[item.tier] || 'bg-slate-400'}`}
                />
                <span className="font-medium text-slate-700">{item.tier}</span>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}
                >
                  {percentage}%
                </span>
                <span className="text-sm text-slate-600 w-12 text-right">
                  {item.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue indicator (visual hint) */}
      {sortedData.some((d) => d.tier !== 'Free' && d.count > 0) && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Paid organizations</span>
            <span className="font-semibold text-emerald-600">
              {sortedData
                .filter((d) => d.tier !== 'Free')
                .reduce((sum, d) => sum + d.count, 0)}{' '}
              (
              {totalOrgs > 0
                ? Math.round(
                    (sortedData
                      .filter((d) => d.tier !== 'Free')
                      .reduce((sum, d) => sum + d.count, 0) /
                      totalOrgs) *
                      100
                  )
                : 0}
              %)
            </span>
          </div>
        </div>
      )}
    </Card>
  );
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: Added review summary
 * Issues: None identified
 */
