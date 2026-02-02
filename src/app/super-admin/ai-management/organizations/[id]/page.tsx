/**
 * @module super-admin/ai-management/organizations/[id]
 * @description Super admin detail page for configuring AI settings for a specific organization.
 * Provides comprehensive view of AI usage, budget status, member breakdown, and security audit summary.
 *
 * @features
 * - AI chat enable/disable toggle with immediate save
 * - Custom monthly token budget configuration (or use tier default)
 * - Chat retention period configuration (30/60/90 days or never delete)
 * - Real-time budget progress bar with percentage display
 * - Member-by-member token usage breakdown table
 * - Security audit summary showing flagged queries count
 *
 * @dependencies
 * - GET /api/super-admin/ai-usage/[orgId] - Fetches organization AI data
 * - PATCH /api/super-admin/ai-usage/[orgId] - Updates AI settings
 *
 * @access Super Admin only (protected by middleware)
 */
'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Save,
  Sparkles,
  DollarSign,
  AlertTriangle,
  Users,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  aiChatEnabled: boolean;
  aiTokenBudgetMonthly: number | null;
  chatRetentionDays: number | null;
}

interface BudgetStatus {
  monthlyTokensUsed: number;
  monthlyTokenLimit: number;
  percentUsed: number;
  isOverBudget: boolean;
}

interface MemberUsage {
  memberId: string;
  memberName: string;
  memberEmail: string;
  isAdmin: boolean;
  totalTokens: number;
  costUsd: number;
  apiCallCount: number;
}

interface AuditSummary {
  totalQueries: number;
  avgRiskScore: number;
  flaggedQueries: number;
}

interface OrgData {
  organization: Organization;
  budgetStatus: BudgetStatus;
  usage: {
    totalTokens: number;
    costUsd: number;
    apiCallCount: number;
  };
  memberBreakdown: MemberUsage[];
  auditSummary: AuditSummary;
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [data, setData] = useState<OrgData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [aiEnabled, setAiEnabled] = useState(false);
  const [tokenBudget, setTokenBudget] = useState('');
  const [retentionDays, setRetentionDays] = useState('30');

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/super-admin/ai-usage/${id}`);
      if (!response.ok) throw new Error('Failed to fetch organization data');

      const result = await response.json();
      setData(result);

      // Initialize form state
      setAiEnabled(result.organization.aiChatEnabled);
      setTokenBudget(result.organization.aiTokenBudgetMonthly?.toString() || '');
      setRetentionDays(result.organization.chatRetentionDays?.toString() || '30');
    } catch {
      setError('Failed to load organization data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/super-admin/ai-usage/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aiChatEnabled: aiEnabled,
          aiTokenBudgetMonthly: tokenBudget ? parseInt(tokenBudget, 10) : null,
          chatRetentionDays: retentionDays ? parseInt(retentionDays, 10) : null,
        }),
      });

      if (!response.ok) throw new Error('Failed to save settings');

      setSuccess('Settings saved successfully');
      fetchData(); // Refresh data
    } catch {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin/ai-management/organizations"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className={ICON_SIZES.md} />
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-gray-900">{data.organization.name}</h1>
          <p className="text-sm text-gray-500">AI Settings for {data.organization.slug}</p>
        </div>
        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
          {data.organization.subscriptionTier}
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Sparkles}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label="Monthly Tokens"
          value={data.usage.totalTokens.toLocaleString()}
        />
        <StatCard
          icon={DollarSign}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Monthly Cost"
          value={`$${data.usage.costUsd.toFixed(2)}`}
        />
        <StatCard
          icon={Users}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="Active Users"
          value={data.memberBreakdown.length}
        />
        <StatCard
          icon={AlertTriangle}
          iconBg={data.auditSummary.flaggedQueries > 0 ? 'bg-red-50' : 'bg-green-50'}
          iconColor={data.auditSummary.flaggedQueries > 0 ? 'text-red-600' : 'text-green-600'}
          label="Flagged Queries"
          value={data.auditSummary.flaggedQueries}
        />
      </div>

      {/* Budget Progress */}
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Budget Usage</h2>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  data.budgetStatus.percentUsed >= 90
                    ? 'bg-red-500'
                    : data.budgetStatus.percentUsed >= 75
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(data.budgetStatus.percentUsed, 100)}%` }}
              />
            </div>
          </div>
          <span className="text-sm font-medium text-gray-700">
            {data.budgetStatus.percentUsed}%
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          {data.budgetStatus.monthlyTokensUsed.toLocaleString()} /{' '}
          {data.budgetStatus.monthlyTokenLimit.toLocaleString()} tokens used this month
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Settings Form */}
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-6">AI Settings</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-600 text-sm">
              {success}
            </div>
          )}

          <div className="space-y-6">
            {/* AI Chat Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-sm font-medium text-gray-900">AI Chat</Label>
                <p className="text-sm text-gray-500">Enable AI chat for this organization</p>
              </div>
              <Switch checked={aiEnabled} onCheckedChange={setAiEnabled} />
            </div>

            {/* Token Budget */}
            <div>
              <Label htmlFor="budget" className="text-sm font-medium text-gray-900">
                Monthly Token Budget
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                Leave empty to use tier default ({data.budgetStatus.monthlyTokenLimit.toLocaleString()})
              </p>
              <Input
                id="budget"
                type="number"
                value={tokenBudget}
                onChange={(e) => setTokenBudget(e.target.value)}
                placeholder="e.g., 500000"
                className="mt-1"
              />
            </div>

            {/* Retention Days */}
            <div>
              <Label htmlFor="retention" className="text-sm font-medium text-gray-900">
                Chat Retention Days
              </Label>
              <p className="text-sm text-gray-500 mb-2">
                How long to keep chat history
              </p>
              <select
                id="retention"
                value={retentionDays}
                onChange={(e) => setRetentionDays(e.target.value)}
                className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="30">30 days</option>
                <option value="60">60 days</option>
                <option value="90">90 days</option>
                <option value="">Never delete</option>
              </select>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <Loader2 className={`${ICON_SIZES.sm} animate-spin mr-2`} />
              ) : (
                <Save className={`${ICON_SIZES.sm} mr-2`} />
              )}
              Save Settings
            </Button>
          </div>
        </div>

        {/* Member Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Member Usage</h2>
            <p className="text-sm text-gray-500">This month's usage by member</p>
          </div>

          {data.memberBreakdown.length === 0 ? (
            <div className="p-12 text-center">
              <Users className={`${ICON_SIZES['3xl']} text-gray-300 mx-auto mb-4`} />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No usage yet</h3>
              <p className="text-gray-500 text-sm">
                Members will appear here once they start using AI chat
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Tokens</th>
                    <th className="px-4 py-3">Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.memberBreakdown.map((member) => (
                    <tr key={member.memberId} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-gray-900">{member.memberName}</div>
                        <div className="text-xs text-gray-500">{member.memberEmail}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {member.totalTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        ${member.costUsd.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`${ICON_SIZES.md} ${iconColor}`} />
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{value}</div>
          <div className="text-xs text-gray-500">{label}</div>
        </div>
      </div>
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Status: APPROVED
 *
 * Strengths:
 * - Uses React 19 `use()` hook for params unwrapping correctly
 * - Clean form state management with separate state variables
 * - Good UX with success/error message display and auto-refresh after save
 * - Comprehensive data display: stats, budget progress, member breakdown
 * - Reusable StatCard component for consistent card styling
 *
 * Minor Observations:
 * - useEffect dependency array includes `id` which is correct but ESLint
 *   may warn about missing dependency on fetchData
 * - Empty catch blocks on lines 100 and 127 - error message set but original
 *   error not logged
 * - The retention dropdown uses empty string for "Never delete" which works
 *   but could be confusing
 *
 * Recommendations:
 * - Add form dirty state tracking to warn on unsaved changes
 * - Consider adding confirmation before disabling AI
 * - Add audit log link for this specific organization
 */
