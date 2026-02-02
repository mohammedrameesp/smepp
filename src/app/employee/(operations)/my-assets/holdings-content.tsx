/**
 * @module app/employee/(operations)/my-assets/holdings-content
 * @description Client component displaying an employee's asset and subscription holdings
 * with tabbed navigation. Shows currently assigned assets, past asset assignments,
 * active subscriptions, and previous subscriptions with usage statistics and history.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Laptop,
  Smartphone,
  Monitor,
  Package,
  CreditCard,
  Clock,
  Calendar,
  ArrowRight,
  CheckCircle2,
  History,
  Sparkles,
} from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';
import { formatCurrency } from '@/lib/core/currency';
import { ICON_SIZES } from '@/lib/constants';
import type { UserAssetHistoryItem } from '@/features/users/components/user-asset-history';
import type { UserSubscriptionHistoryItem } from '@/features/users/components/user-subscription-history';

interface MyHoldingsContentProps {
  activeAssets: UserAssetHistoryItem[];
  pastAssets: UserAssetHistoryItem[];
  activeSubscriptions: UserSubscriptionHistoryItem[];
  inactiveSubscriptions: UserSubscriptionHistoryItem[];
}

function getAssetIcon(type?: string) {
  switch (type?.toLowerCase()) {
    case 'laptop':
    case 'computer':
      return Laptop;
    case 'phone':
    case 'mobile':
      return Smartphone;
    case 'monitor':
    case 'display':
      return Monitor;
    default:
      return Package;
  }
}

function formatDuration(days: number) {
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(days / 365);
    const months = Math.floor((days % 365) / 30);
    return months > 0
      ? `${years}y ${months}m`
      : `${years} year${years !== 1 ? 's' : ''}`;
  }
}

export function MyHoldingsContent({
  activeAssets,
  pastAssets,
  activeSubscriptions,
  inactiveSubscriptions,
}: MyHoldingsContentProps) {
  const [activeTab, setActiveTab] = useState<'assets' | 'subscriptions'>('assets');

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${
              activeTab === 'assets'
                ? 'text-blue-600 bg-blue-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Laptop className={ICON_SIZES.sm} />
              <span>Assets</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'assets'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {activeAssets.length}
              </span>
            </div>
            {activeTab === 'assets' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-all relative ${
              activeTab === 'subscriptions'
                ? 'text-emerald-600 bg-emerald-50/50'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CreditCard className={ICON_SIZES.sm} />
              <span>Subscriptions</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                activeTab === 'subscriptions'
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {activeSubscriptions.length}
              </span>
            </div>
            {activeTab === 'subscriptions' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600" />
            )}
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'assets' ? (
            <AssetsTab activeAssets={activeAssets} pastAssets={pastAssets} />
          ) : (
            <SubscriptionsTab
              activeSubscriptions={activeSubscriptions}
              inactiveSubscriptions={inactiveSubscriptions}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AssetsTab({
  activeAssets,
  pastAssets,
}: {
  activeAssets: UserAssetHistoryItem[];
  pastAssets: UserAssetHistoryItem[];
}) {
  return (
    <div className="space-y-8">
      {/* Active Assets */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <CheckCircle2 className={`${ICON_SIZES.sm} text-emerald-600`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Currently Assigned</h3>
            <p className="text-xs text-slate-500">{activeAssets.length} asset{activeAssets.length !== 1 ? 's' : ''} in your possession</p>
          </div>
        </div>

        {activeAssets.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className={`${ICON_SIZES.xl} text-slate-400`} />
            </div>
            <p className="text-slate-600 font-medium mb-1">No assets assigned</p>
            <p className="text-slate-400 text-sm">Assets assigned to you will appear here</p>
            <Link
              href="/employee/assets"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Browse Available Assets
              <ArrowRight className={ICON_SIZES.sm} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeAssets.map((asset) => {
              const Icon = getAssetIcon(asset.type);
              return (
                <Link
                  key={asset.id}
                  href={`/employee/assets/${asset.id}`}
                  className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-500/10 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                      <Icon className={ICON_SIZES.lg} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                            {asset.model}
                          </h4>
                          <p className="text-sm text-slate-500">{asset.type}</p>
                        </div>
                        <ArrowRight className={`${ICON_SIZES.sm} text-slate-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1`} />
                      </div>
                      {asset.assetTag && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                          {asset.assetTag}
                        </span>
                      )}
                    </div>
                  </div>

                  {asset.currentPeriod && (
                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Since {formatDate(asset.currentPeriod.startDate)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-emerald-600 font-medium">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{formatDuration(asset.currentPeriod.days)}</span>
                      </div>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Past Assets */}
      {pastAssets.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <History className={`${ICON_SIZES.sm} text-slate-500`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Previously Assigned</h3>
              <p className="text-xs text-slate-500">{pastAssets.length} past assignment{pastAssets.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-3">
            {pastAssets.map((asset) => {
              const Icon = getAssetIcon(asset.type);
              const lastPeriod = asset.memberPeriods[asset.memberPeriods.length - 1];
              return (
                <Link
                  key={asset.id}
                  href={`/employee/assets/${asset.id}`}
                  className="group flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-300 transition-colors">
                    <Icon className={ICON_SIZES.md} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-slate-700 truncate">{asset.model}</h4>
                    <p className="text-xs text-slate-500">
                      {asset.assetTag && <span className="font-mono">{asset.assetTag} • </span>}
                      {asset.type}
                    </p>
                  </div>
                  <div className="text-right text-xs text-slate-500 flex-shrink-0">
                    <div>Used for {formatDuration(asset.totalDays)}</div>
                    {lastPeriod?.endDate && (
                      <div className="text-slate-400">Returned {formatDate(lastPeriod.endDate)}</div>
                    )}
                  </div>
                  <ArrowRight className={`${ICON_SIZES.sm} text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0`} />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SubscriptionsTab({
  activeSubscriptions,
  inactiveSubscriptions,
}: {
  activeSubscriptions: UserSubscriptionHistoryItem[];
  inactiveSubscriptions: UserSubscriptionHistoryItem[];
}) {
  return (
    <div className="space-y-8">
      {/* Active Subscriptions */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
            <Sparkles className={`${ICON_SIZES.sm} text-emerald-600`} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Active Subscriptions</h3>
            <p className="text-xs text-slate-500">{activeSubscriptions.length} service{activeSubscriptions.length !== 1 ? 's' : ''} you have access to</p>
          </div>
        </div>

        {activeSubscriptions.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard className={`${ICON_SIZES.xl} text-slate-400`} />
            </div>
            <p className="text-slate-600 font-medium mb-1">No active subscriptions</p>
            <p className="text-slate-400 text-sm">Subscriptions assigned to you will appear here</p>
            <Link
              href="/employee/subscriptions"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Browse Subscriptions
              <ArrowRight className={ICON_SIZES.sm} />
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {activeSubscriptions.map((sub) => (
              <Link
                key={sub.id}
                href={`/employee/subscriptions/${sub.id}`}
                className="group bg-white border border-slate-200 rounded-xl p-4 hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-500/10 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/30 group-hover:scale-105 transition-transform">
                    <CreditCard className={ICON_SIZES.lg} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-slate-900 truncate group-hover:text-emerald-600 transition-colors">
                          {sub.serviceName}
                        </h4>
                        <p className="text-sm text-slate-500">
                          {sub.vendor && <span>{sub.vendor} • </span>}
                          {sub.category}
                        </p>
                      </div>
                      <ArrowRight className={`${ICON_SIZES.sm} text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1`} />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Billing</div>
                    <div className="text-sm font-medium text-slate-700">
                      {sub.costPerCycle
                        ? `${formatCurrency(sub.costPerCycle, sub.costCurrency || 'QAR')}/${sub.billingCycle?.toLowerCase()}`
                        : sub.billingCycle}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">Your Usage</div>
                    <div className="text-sm font-medium text-emerald-600">
                      {Math.round(sub.totalMonths * 10) / 10} months
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Inactive Subscriptions */}
      {inactiveSubscriptions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <History className={`${ICON_SIZES.sm} text-slate-500`} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Previous Subscriptions</h3>
              <p className="text-xs text-slate-500">{inactiveSubscriptions.length} past subscription{inactiveSubscriptions.length !== 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="space-y-3">
            {inactiveSubscriptions.map((sub) => (
              <Link
                key={sub.id}
                href={`/employee/subscriptions/${sub.id}`}
                className="group flex items-center gap-4 p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center text-slate-500 group-hover:bg-slate-300 transition-colors">
                  <CreditCard className={ICON_SIZES.md} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-700 truncate">{sub.serviceName}</h4>
                  <p className="text-xs text-slate-500">
                    {sub.vendor && <span>{sub.vendor} • </span>}
                    {sub.category}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-500 flex-shrink-0">
                  <div>Used for {Math.round(sub.totalMonths * 10) / 10} months</div>
                  <div className="text-slate-400">
                    {formatCurrency(sub.totalCost, sub.costCurrency || 'QAR')} total
                  </div>
                </div>
                <ArrowRight className={`${ICON_SIZES.sm} text-slate-300 group-hover:text-slate-500 transition-colors flex-shrink-0`} />
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Client component for employee "My Holdings" page displaying assets and subscriptions
 * assigned to the current user, organized in a tabbed interface with active/past sections.
 *
 * Key Features:
 * - Tabbed navigation between Assets and Subscriptions
 * - Active vs past items separation for both tabs
 * - Asset type-based icon mapping (laptop, phone, monitor, etc.)
 * - Duration formatting (days/months/years) for assignment periods
 * - Empty state CTAs linking to browse pages
 *
 * Critical Logic:
 * - getAssetIcon: Maps asset type strings to appropriate Lucide icons
 * - formatDuration: Converts days to human-readable duration strings
 * - currentPeriod vs memberPeriods: Distinguishes active from historical assignments
 * - totalMonths calculation for subscription usage tracking
 *
 * Edge Cases Handled:
 * - Empty arrays render helpful empty state prompts
 * - Optional fields (assetTag, vendor, costPerCycle) conditionally rendered
 * - Currency fallback to 'QAR' when costCurrency is missing
 * - Singular/plural text for counts (day/days, month/months)
 *
 * Potential Issues:
 * - formatDuration uses fixed 30-day month approximation (may be imprecise)
 * - No loading state - assumes parent handles data fetching
 * - Asset type matching is case-insensitive but limited to hardcoded values
 * - No error boundary for rendering failures
 *
 * Security Considerations:
 * - Read-only display component with no sensitive actions
 * - All links are internal navigation (no external URLs)
 *
 * Performance:
 * - Simple component with minimal re-renders (only tab state changes)
 * - No expensive computations or API calls
 * - CSS transitions for smooth hover effects
 */
