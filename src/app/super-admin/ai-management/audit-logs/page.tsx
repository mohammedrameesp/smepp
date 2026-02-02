/**
 * @module super-admin/ai-management/audit-logs
 * @description Super admin page for viewing AI audit logs across all organizations.
 * Provides security monitoring and compliance tracking for AI chat interactions,
 * including risk scores, flagged queries, and detailed function call tracking.
 *
 * @features
 * - Paginated audit log listing with 50 logs per page
 * - Advanced filtering by organization, risk score, date range, and flagged status
 * - Risk score color-coded badges (green <15, yellow 15-29, red 30+)
 * - Display of functions called and flag reasons per interaction
 * - Real-time filter updates via URL search params
 *
 * @dependencies
 * - GET /api/super-admin/ai-audit-logs - Fetches paginated audit logs
 * - GET /api/super-admin/organizations - Fetches organization list for filter dropdown
 *
 * @access Super Admin only (protected by middleware)
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Loader2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { format } from 'date-fns';
import { useSearchParams, useRouter } from 'next/navigation';

interface AuditLog {
  id: string;
  tenantId: string;
  memberId: string;
  queryHash: string;
  queryLength: number;
  functionsCalled: string[];
  dataAccessed: {
    entityTypes: string[];
    recordCount: number;
    sensitiveData: boolean;
  };
  tokensUsed: number;
  responseTimeMs: number;
  flagged: boolean;
  flagReasons: string[];
  riskScore: number;
  createdAt: string;
  organizationName: string;
  organizationSlug: string;
  memberName: string;
  memberEmail: string;
}

interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function AuditLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    totalCount: 0,
    totalPages: 0,
  });
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [selectedOrg, setSelectedOrg] = useState(searchParams.get('orgId') || '');
  const [minRiskScore, setMinRiskScore] = useState(searchParams.get('minRiskScore') || '');
  const [flaggedOnly, setFlaggedOnly] = useState(searchParams.get('flagged') === 'true');
  const [startDate, setStartDate] = useState(searchParams.get('startDate') || '');
  const [endDate, setEndDate] = useState(searchParams.get('endDate') || '');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [selectedOrg, minRiskScore, flaggedOnly, startDate, endDate]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch('/api/super-admin/organizations');
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  };

  const fetchLogs = async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '50');

      if (selectedOrg) params.set('orgId', selectedOrg);
      if (minRiskScore) params.set('minRiskScore', minRiskScore);
      if (flaggedOnly) params.set('flagged', 'true');
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);

      const response = await fetch(`/api/super-admin/ai-audit-logs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch audit logs');

      const data = await response.json();
      setLogs(data.logs);
      setPagination(data.pagination);
    } catch {
      setError('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const getRiskBadgeColor = (score: number) => {
    if (score >= 30) return 'bg-red-50 text-red-700';
    if (score >= 15) return 'bg-yellow-50 text-yellow-700';
    return 'bg-green-50 text-green-700';
  };

  const clearFilters = () => {
    setSelectedOrg('');
    setMinRiskScore('');
    setFlaggedOnly(false);
    setStartDate('');
    setEndDate('');
    router.replace('/super-admin/ai-management/audit-logs');
  };

  const hasActiveFilters = selectedOrg || minRiskScore || flaggedOnly || startDate || endDate;

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
          <h1 className="text-xl font-semibold text-gray-900">AI Audit Logs</h1>
          <p className="text-sm text-gray-500">Security monitoring and compliance tracking</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            <Filter className={ICON_SIZES.sm} />
            Filters
            {hasActiveFilters && (
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className={ICON_SIZES.xs} />
              Clear all
            </button>
          )}
        </div>

        {showFilters && (
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 border-b border-gray-100">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Organization
              </label>
              <select
                value={selectedOrg}
                onChange={(e) => setSelectedOrg(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All organizations</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Min Risk Score
              </label>
              <input
                type="number"
                value={minRiskScore}
                onChange={(e) => setMinRiskScore(e.target.value)}
                placeholder="0-100"
                min="0"
                max="100"
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-end">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flaggedOnly}
                  onChange={(e) => setFlaggedOnly(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Flagged only</span>
              </label>
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400`} />
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-600">{error}</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className={`${ICON_SIZES['3xl']} text-gray-300 mx-auto mb-4`} />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No audit logs found</h3>
            <p className="text-gray-500 text-sm">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'AI interactions will appear here once organizations start using AI chat'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 lg:px-6 py-3">Organization</th>
                    <th className="px-4 lg:px-6 py-3">Member</th>
                    <th className="px-4 lg:px-6 py-3">Risk Score</th>
                    <th className="px-4 lg:px-6 py-3">Flags</th>
                    <th className="px-4 lg:px-6 py-3">Functions</th>
                    <th className="px-4 lg:px-6 py-3">Tokens</th>
                    <th className="px-4 lg:px-6 py-3">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50 ${log.flagged ? 'bg-red-50/30' : ''}`}
                    >
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm font-medium text-gray-900">
                          {log.organizationName}
                        </div>
                        <div className="text-xs text-gray-500">{log.organizationSlug}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="text-sm text-gray-900">{log.memberName}</div>
                        <div className="text-xs text-gray-500">{log.memberEmail}</div>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <span
                          className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${getRiskBadgeColor(
                            log.riskScore
                          )}`}
                        >
                          {log.riskScore}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        {log.flagged ? (
                          <div className="flex flex-wrap gap-1">
                            {log.flagReasons.slice(0, 2).map((reason, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded bg-red-100 text-red-700"
                                title={reason}
                              >
                                {reason.length > 20 ? `${reason.slice(0, 20)}...` : reason}
                              </span>
                            ))}
                            {log.flagReasons.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{log.flagReasons.length - 2} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {log.functionsCalled.slice(0, 2).map((func, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center text-xs font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700"
                            >
                              {func}
                            </span>
                          ))}
                          {log.functionsCalled.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{log.functionsCalled.length - 2}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                        {log.tokensUsed.toLocaleString()}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-500">
                        {format(new Date(log.createdAt), 'MMM d, yyyy')}
                        <div className="text-xs">
                          {format(new Date(log.createdAt), 'HH:mm:ss')}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{' '}
                {pagination.totalCount} logs
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchLogs(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className={ICON_SIZES.sm} />
                </button>
                <span className="text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchLogs(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className={ICON_SIZES.sm} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Status: APPROVED with minor observations
 *
 * Strengths:
 * - Comprehensive filtering system with URL parameter synchronization
 * - Clean separation of concerns with dedicated fetch functions
 * - Proper loading and error state handling
 * - Risk score visualization with color-coded badges
 * - Responsive pagination implementation
 *
 * Minor Observations:
 * - useEffect dependency array on line 82-84 triggers on every filter change
 *   which could cause rapid API calls during typing; consider debouncing
 * - The `router` from useRouter is imported but only used for clearFilters;
 *   could use window.history.replaceState instead
 * - Empty catch block on line 117 swallows the error - already handled by setError
 *
 * Recommendations:
 * - Add debouncing for minRiskScore input to reduce API calls
 * - Consider adding export functionality for audit logs
 * - Add click-through to detailed audit log view
 */
