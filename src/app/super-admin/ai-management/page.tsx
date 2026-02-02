/**
 * @module super-admin/ai-management
 * @description Super admin dashboard for platform-wide AI usage monitoring.
 * Provides overview metrics, usage trends, and organization breakdown for AI chat feature.
 *
 * @features
 * - Aggregate stats cards: total tokens, estimated cost, active AI orgs, flagged queries
 * - Interactive bar chart showing daily token usage trends
 * - Period selector: last 7 days, 30 days, or 90 days
 * - Top 10 organizations table with AI status, tokens, cost, and API calls
 * - Quick links to audit logs and organization settings pages
 * - Flagged queries alert with direct link to review
 *
 * @dependencies
 * - GET /api/super-admin/ai-usage?period={week|month|all} - Fetches usage data
 *
 * @access Super Admin only (protected by middleware)
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  DollarSign,
  Building2,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Eye,
  Settings,
  BarChart3,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { format } from 'date-fns';

interface OrgUsage {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  aiChatEnabled: boolean;
  totalTokens: number;
  totalCostUsd: number;
  apiCallCount: number;
}

interface DailyUsage {
  date: string;
  tokens: number;
  cost: number;
  calls: number;
}

interface AuditSummary {
  totalQueries: number;
  avgRiskScore: number;
  flaggedQueries: number;
  activeAIOrgs: number;
}

interface UsageData {
  organizations: OrgUsage[];
  totals: {
    totalTokens: number;
    totalCostUsd: number;
    totalApiCalls: number;
    organizationCount: number;
  };
  period: string;
  dailyUsage: DailyUsage[];
  auditSummary: AuditSummary;
}

export default function AIManagementPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState<'week' | 'month' | 'all'>('month');

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/super-admin/ai-usage?period=${period}`);
      if (!response.ok) throw new Error('Failed to fetch data');
      const result = await response.json();
      setData(result);
    } catch {
      setError('Failed to load AI usage data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-600 text-sm">{error || 'Failed to load data'}</p>
      </div>
    );
  }

  const maxTokens = Math.max(...data.dailyUsage.map((d) => d.tokens), 1);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          icon={Sparkles}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label="Total Tokens"
          value={data.totals.totalTokens.toLocaleString()}
          subtitle={`${data.totals.totalApiCalls.toLocaleString()} API calls`}
        />
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Estimated Cost"
          value={`$${data.totals.totalCostUsd.toFixed(2)}`}
          subtitle="This period"
        />
        <StatCard
          icon={Building2}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="Active AI Orgs"
          value={data.auditSummary.activeAIOrgs}
          subtitle={`${data.totals.organizationCount} with usage`}
        />
        <StatCard
          icon={AlertTriangle}
          iconBg={data.auditSummary.flaggedQueries > 0 ? 'bg-red-50' : 'bg-green-50'}
          iconColor={data.auditSummary.flaggedQueries > 0 ? 'text-red-600' : 'text-green-600'}
          label="Flagged Queries"
          value={data.auditSummary.flaggedQueries}
          subtitle={data.auditSummary.flaggedQueries > 0 ? (
            <Link href="/super-admin/ai-management/audit-logs?flagged=true" className="text-red-600 hover:text-red-700 underline">
              Review alerts
            </Link>
          ) : 'No security alerts'}
        />
      </div>

      {/* Usage Trend Chart */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Usage Trend</h2>
            <p className="text-sm text-gray-500">Daily token usage over time</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as 'week' | 'month' | 'all')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
              <option value="all">Last 90 days</option>
            </select>
          </div>
        </div>
        <div className="p-6">
          <div className="h-48 flex items-end gap-1">
            {data.dailyUsage.map((day, index) => {
              const height = maxTokens > 0 ? (day.tokens / maxTokens) * 100 : 0;
              return (
                <div
                  key={day.date}
                  className="flex-1 group relative"
                  title={`${format(new Date(day.date), 'MMM d')}: ${day.tokens.toLocaleString()} tokens`}
                >
                  <div
                    className="bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-pointer"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  {/* Tooltip */}
                  <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap z-10">
                    {format(new Date(day.date), 'MMM d')}: {day.tokens.toLocaleString()} tokens
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-500">
            <span>{data.dailyUsage.length > 0 ? format(new Date(data.dailyUsage[0].date), 'MMM d') : ''}</span>
            <span>{data.dailyUsage.length > 0 ? format(new Date(data.dailyUsage[data.dailyUsage.length - 1].date), 'MMM d') : ''}</span>
          </div>
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Organizations</h2>
            <p className="text-sm text-gray-500">AI usage by organization</p>
          </div>
          <Link
            href="/super-admin/ai-management/organizations"
            className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
          >
            Manage settings →
          </Link>
        </div>

        {data.organizations.length === 0 ? (
          <div className="p-12 text-center">
            <BarChart3 className={`${ICON_SIZES['3xl']} text-gray-300 mx-auto mb-4`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No AI usage yet</h3>
            <p className="text-gray-500 text-sm">Organizations will appear here once they start using AI chat</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 lg:px-6 py-3">Organization</th>
                  <th className="px-4 lg:px-6 py-3">AI Status</th>
                  <th className="px-4 lg:px-6 py-3">Tokens</th>
                  <th className="px-4 lg:px-6 py-3">Cost</th>
                  <th className="px-4 lg:px-6 py-3">API Calls</th>
                  <th className="px-4 lg:px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.organizations.slice(0, 10).map((org) => (
                  <tr key={org.organizationId} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-sm">
                          {org.organizationName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 text-sm">{org.organizationName}</div>
                          <div className="text-xs text-gray-500">{org.organizationSlug}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                          org.aiChatEnabled
                            ? 'text-green-700 bg-green-50'
                            : 'text-gray-600 bg-gray-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            org.aiChatEnabled ? 'bg-green-500' : 'bg-gray-400'
                          }`}
                        />
                        {org.aiChatEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                      {org.totalTokens.toLocaleString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                      ${org.totalCostUsd.toFixed(2)}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                      {org.apiCallCount.toLocaleString()}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/super-admin/ai-management/organizations/${org.organizationId}`}
                          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded"
                          title="View Details"
                        >
                          <Eye className={ICON_SIZES.sm} />
                        </Link>
                        <Link
                          href={`/super-admin/ai-management/organizations/${org.organizationId}`}
                          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded"
                          title="Settings"
                        >
                          <Settings className={ICON_SIZES.sm} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.organizations.length > 10 && (
          <div className="px-4 lg:px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing 10 of {data.organizations.length} organizations
            </div>
            <Link
              href="/super-admin/ai-management/organizations"
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              View all
            </Link>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Link
          href="/super-admin/ai-management/audit-logs"
          className="bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center group-hover:bg-amber-200">
              <AlertTriangle className={`text-amber-600 ${ICON_SIZES.md}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Security Audit Logs</h3>
              <p className="text-sm text-gray-500">
                Review AI interactions, risk scores, and security alerts across all organizations
              </p>
            </div>
          </div>
        </Link>
        <Link
          href="/super-admin/ai-management/organizations"
          className="bg-white rounded-xl border border-gray-100 p-6 hover:border-indigo-300 hover:shadow-sm transition-all group"
        >
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200">
              <Settings className={`text-indigo-600 ${ICON_SIZES.md}`} />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Organization Settings</h3>
              <p className="text-sm text-gray-500">
                Configure AI chat access, budgets, and retention policies per organization
              </p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  subtitle,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`${ICON_SIZES.md} ${iconColor}`} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
      {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Status: APPROVED
 *
 * Strengths:
 * - Clean dashboard layout with stats cards, chart, and data table
 * - Interactive bar chart with hover tooltips for daily usage
 * - Period selector that triggers data refresh
 * - Smart handling of empty state with appropriate messaging
 * - Quick links section for easy navigation to sub-pages
 * - Flagged queries alert with direct action link
 *
 * Minor Observations:
 * - The bar chart implementation is custom; consider using a charting library
 *   like Recharts for better accessibility and interactivity
 * - Organizations table is limited to 10 with "View all" link, which is good UX
 * - Empty catch block on line 73 - could log error for debugging
 * - duplicate links to same page in actions column (Eye and Settings icons)
 *
 * Recommendations:
 * - Add data export functionality (CSV/JSON)
 * - Consider adding cost trend comparison (this period vs previous)
 * - Add keyboard accessibility to the bar chart tooltips
 */
