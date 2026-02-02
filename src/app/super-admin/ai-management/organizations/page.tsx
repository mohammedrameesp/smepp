/**
 * @module super-admin/ai-management/organizations
 * @description Super admin page for managing AI configuration per organization.
 * Lists all organizations with their AI status, token budgets, and usage metrics,
 * allowing quick toggling of AI chat access and navigation to detailed settings.
 *
 * @features
 * - Organization listing with search/filter capability
 * - Quick AI enable/disable toggle per organization
 * - Monthly token budget and usage percentage display
 * - Visual progress bars for budget consumption (green/yellow/red thresholds)
 * - Link to detailed configuration page per organization
 *
 * @dependencies
 * - GET /api/super-admin/organizations - Fetches all organizations
 * - GET /api/super-admin/ai-usage?period=month - Fetches monthly usage data
 * - PATCH /api/super-admin/ai-usage/[orgId] - Toggles AI chat enabled status
 *
 * @access Super Admin only (protected by middleware)
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  Building2,
  Search,
  Settings,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface Organization {
  id: string;
  name: string;
  slug: string;
  subscriptionTier: string;
  aiChatEnabled: boolean;
  aiTokenBudgetMonthly: number | null;
  _count?: {
    teamMembers: number;
  };
}

interface OrgUsage {
  organizationId: string;
  totalTokens: number;
  totalCostUsd: number;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [usage, setUsage] = useState<Map<string, OrgUsage>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [togglingOrg, setTogglingOrg] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsResponse, usageResponse] = await Promise.all([
        fetch('/api/super-admin/organizations'),
        fetch('/api/super-admin/ai-usage?period=month'),
      ]);

      if (!orgsResponse.ok || !usageResponse.ok) {
        throw new Error('Failed to fetch data');
      }

      const orgsData = await orgsResponse.json();
      const usageData = await usageResponse.json();

      setOrganizations(orgsData.organizations || []);

      // Build usage map
      const usageMap = new Map<string, OrgUsage>();
      for (const org of usageData.organizations || []) {
        usageMap.set(org.organizationId, org);
      }
      setUsage(usageMap);
    } catch {
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const toggleAI = async (orgId: string, currentState: boolean) => {
    setTogglingOrg(orgId);
    try {
      const response = await fetch(`/api/super-admin/ai-usage/${orgId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiChatEnabled: !currentState }),
      });

      if (!response.ok) throw new Error('Failed to update');

      // Update local state
      setOrganizations((prev) =>
        prev.map((org) =>
          org.id === orgId ? { ...org, aiChatEnabled: !currentState } : org
        )
      );
    } catch (err) {
      console.error('Failed to toggle AI:', err);
    } finally {
      setTogglingOrg(null);
    }
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(search.toLowerCase()) ||
      org.slug.toLowerCase().includes(search.toLowerCase())
  );

  const getUsagePercent = (org: Organization): number => {
    const orgUsage = usage.get(org.id);
    if (!orgUsage || !org.aiTokenBudgetMonthly) return 0;
    return Math.round((orgUsage.totalTokens / org.aiTokenBudgetMonthly) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error</h2>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/super-admin/ai-management"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className={ICON_SIZES.md} />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">AI Configuration</h1>
          <p className="text-sm text-gray-500">Manage AI settings per organization</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="relative">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 ${ICON_SIZES.sm}`} />
          <input
            type="text"
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        {filteredOrgs.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className={`${ICON_SIZES['3xl']} text-gray-300 mx-auto mb-4`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations found</h3>
            <p className="text-gray-500 text-sm">
              {search ? 'Try a different search term' : 'No organizations exist yet'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-4 lg:px-6 py-3">Organization</th>
                  <th className="px-4 lg:px-6 py-3">Tier</th>
                  <th className="px-4 lg:px-6 py-3">AI Status</th>
                  <th className="px-4 lg:px-6 py-3">Budget</th>
                  <th className="px-4 lg:px-6 py-3">Usage (Month)</th>
                  <th className="px-4 lg:px-6 py-3">% Used</th>
                  <th className="px-4 lg:px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrgs.map((org) => {
                  const orgUsage = usage.get(org.id);
                  const usagePercent = getUsagePercent(org);

                  return (
                    <tr key={org.id} className="hover:bg-gray-50">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-sm">
                            {org.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{org.name}</div>
                            <div className="text-xs text-gray-500">{org.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span className="inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full bg-gray-100 text-gray-700">
                          {org.subscriptionTier}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <button
                          onClick={() => toggleAI(org.id, org.aiChatEnabled)}
                          disabled={togglingOrg === org.id}
                          className="flex items-center gap-2"
                        >
                          {togglingOrg === org.id ? (
                            <Loader2 className={`${ICON_SIZES.md} animate-spin text-gray-400`} />
                          ) : org.aiChatEnabled ? (
                            <ToggleRight className={`${ICON_SIZES.lg} text-green-500`} />
                          ) : (
                            <ToggleLeft className={`${ICON_SIZES.lg} text-gray-400`} />
                          )}
                          <span
                            className={`text-sm ${
                              org.aiChatEnabled ? 'text-green-700' : 'text-gray-500'
                            }`}
                          >
                            {org.aiChatEnabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </button>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                        {org.aiTokenBudgetMonthly
                          ? org.aiTokenBudgetMonthly.toLocaleString()
                          : 'Default'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                        {orgUsage ? orgUsage.totalTokens.toLocaleString() : '0'}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {org.aiTokenBudgetMonthly ? (
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  usagePercent >= 90
                                    ? 'bg-red-500'
                                    : usagePercent >= 75
                                    ? 'bg-yellow-500'
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(usagePercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{usagePercent}%</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-right">
                        <Link
                          href={`/super-admin/ai-management/organizations/${org.id}`}
                          className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                          <Settings className={ICON_SIZES.sm} />
                          Configure
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
 * - Parallel data fetching with Promise.all for organizations and usage
 * - Clean client-side search filtering
 * - Optimistic UI update after AI toggle with local state management
 * - Visual progress bars with color thresholds (green/yellow/red)
 * - Proper error handling for toggle failures with console.error
 *
 * Minor Observations:
 * - Empty catch block on line 69 - error context is lost
 * - The usage Map lookup on line 107-109 recalculates on every render;
 *   could memoize with useMemo
 * - No loading state indicator during AI toggle beyond the spinner
 *
 * Recommendations:
 * - Add toast notification for successful/failed AI toggle
 * - Consider adding pagination for large organization lists
 * - Add confirmation dialog before disabling AI for an organization
 */
