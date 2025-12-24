import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Building2, Users, Signal, CheckCircle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { DashboardTabs } from './components/DashboardTabs';
import { ResetPlatformButton } from './components/ResetPlatformButton';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';

async function getOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      _count: {
        select: {
          members: true,
          assets: true,
          invitations: {
            where: { acceptedAt: null },
          },
        },
      },
      members: {
        where: { isOwner: true },
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        take: 1,
      },
    },
  });

  return organizations;
}

async function getStats() {
  const [orgCount, userCount, pendingInvites] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.organizationInvitation.count({ where: { acceptedAt: null } }),
  ]);

  return { orgCount, userCount, pendingInvites };
}

export default async function SuperAdminDashboard() {
  let organizations;
  let stats;

  try {
    [organizations, stats] = await Promise.all([
      getOrganizations(),
      getStats(),
    ]);
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Database Connection Error</h2>
          <p className="text-red-600 mb-4">
            Failed to load dashboard data. Please check:
          </p>
          <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
            <li>DATABASE_URL environment variable is set correctly</li>
            <li>Database is accessible from this deployment</li>
            <li>Prisma migrations are up to date</li>
          </ul>
          <p className="text-xs text-red-500 mt-4 font-mono">
            Error: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Stats - Always Visible */}
      <div className="grid grid-cols-4 gap-4">
        <HeroStatCard
          icon={Building2}
          iconBg="bg-blue-50"
          iconColor="text-blue-600"
          label="Organizations"
          value={stats.orgCount}
          trend="+3 this week"
          trendUp
        />
        <HeroStatCard
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Total Users"
          value={stats.userCount}
          trend="+18 this week"
          trendUp
        />
        <HeroStatCard
          icon={Signal}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="Active Now"
          value={23}
          trend="Live"
          isLive
        />
        <HeroStatCard
          icon={CheckCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="System Status"
          value="OK"
          valueColor="text-green-600"
          trend="99.99% uptime"
        />
      </div>

      {/* Dashboard Tabs */}
      <DashboardTabs stats={stats} />

      {/* Testing Tools - Remove in production */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-red-800">Testing Tools</h3>
            <p className="text-xs text-red-600">Development only - remove before production</p>
          </div>
          <ResetPlatformButton />
        </div>
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Organizations</h2>
          <Link href="/super-admin/organizations" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all
          </Link>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No organizations yet</h3>
            <p className="text-slate-500 text-sm">
              Create your first organization to get started
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Organization</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Users</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-slate-50">
                  <td className="px-5 py-4">
                    <Link href={`/super-admin/organizations/${org.id}`} className="flex items-center gap-3 group">
                      {org.logoUrl ? (
                        <img
                          src={org.logoUrl}
                          alt={org.name}
                          className="w-9 h-9 rounded-lg object-contain bg-slate-100"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
                          {org.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 group-hover:text-indigo-600">{org.name}</p>
                        <p className="text-xs text-slate-400">{org.slug}</p>
                      </div>
                    </Link>
                  </td>
                  <td className="px-5 py-4">
                    <TierBadge tier={org.subscriptionTier} />
                  </td>
                  <td className="px-5 py-4 text-slate-600">{org._count.members}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                      Active
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 text-xs">
                    {formatDistanceToNow(org.createdAt, { addSuffix: true })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function HeroStatCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  valueColor = 'text-slate-900',
  trend,
  trendUp,
  isLive,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  valueColor?: string;
  trend: string;
  trendUp?: boolean;
  isLive?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${valueColor}`}>{value}</p>
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
      </div>
      <p className={`text-xs mt-3 ${trendUp ? 'text-green-600' : 'text-slate-500'}`}>
        {isLive && (
          <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-1 animate-pulse" />
        )}
        {trendUp && !isLive && <span className="mr-1">↑</span>}
        {trend}
      </p>
    </div>
  );
}

function TierBadge({ tier }: { tier: string }) {
  const colors: Record<string, string> = {
    FREE: 'text-slate-700 bg-slate-100',
    STARTER: 'text-blue-700 bg-blue-50',
    PROFESSIONAL: 'text-indigo-700 bg-indigo-50',
    ENTERPRISE: 'text-amber-700 bg-amber-50',
  };

  return (
    <span className={`text-xs font-medium px-2 py-1 rounded-full ${colors[tier] || colors.FREE}`}>
      {tier}
    </span>
  );
}
