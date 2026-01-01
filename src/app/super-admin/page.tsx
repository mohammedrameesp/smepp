import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Building2, Users, Signal, CheckCircle, Eye, UserCog, Edit, UserPlus, BarChart3, Settings, Plus } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

export const dynamic = 'force-dynamic';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

async function getOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: {
      _count: {
        select: {
          members: true,
          assets: true,
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
  // Get date for "this week" calculations
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  const [
    orgCount,
    userCount,
    orgsThisWeek,
    usersThisWeek,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.user.count({ where: { isSuperAdmin: false } }),
    prisma.organization.count({
      where: { createdAt: { gte: oneWeekAgo } },
    }),
    prisma.organizationUser.count({
      where: { joinedAt: { gte: oneWeekAgo } },
    }),
  ]);

  return {
    orgCount,
    userCount,
    orgsThisWeek,
    usersThisWeek,
  };
}

async function getRecentActivity() {
  // Get recent organization creations and user joins
  const recentOrgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    take: 2,
    select: { name: true, createdAt: true },
  });

  const recentUsers = await prisma.organizationUser.findMany({
    orderBy: { joinedAt: 'desc' },
    take: 2,
    include: {
      user: { select: { name: true } },
      organization: { select: { name: true } },
    },
  });

  return { recentOrgs, recentUsers };
}

export default async function SuperAdminDashboard() {
  let organizations;
  let stats;
  let activity;

  try {
    [organizations, stats, activity] = await Promise.all([
      getOrganizations(),
      getStats(),
      getRecentActivity(),
    ]);
  } catch (error) {
    console.error('Super Admin Dashboard Error:', error);
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Database Connection Error</h2>
        <p className="text-red-600 text-sm">
          Failed to load dashboard data. Please check the database connection.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <StatCard
          icon={Building2}
          iconBg="bg-indigo-50"
          iconColor="text-indigo-600"
          label="Organizations"
          value={stats.orgCount}
          trend={stats.orgsThisWeek > 0 ? `+${stats.orgsThisWeek} this week` : undefined}
        />
        <StatCard
          icon={Users}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-600"
          label="Total Users"
          value={stats.userCount}
          trend={stats.usersThisWeek > 0 ? `+${stats.usersThisWeek} this week` : undefined}
        />
        <StatCard
          icon={Signal}
          iconBg="bg-cyan-50"
          iconColor="text-cyan-600"
          label="Organizations Active"
          value={stats.orgCount}
          subtitle="All organizations"
        />
        <StatCard
          icon={CheckCircle}
          iconBg="bg-green-50"
          iconColor="text-green-600"
          label="Total Assets"
          value={stats.orgCount > 0 ? 'Active' : 'N/A'}
          subtitle="Platform status"
        />
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Organizations</h2>
            <p className="text-sm text-gray-500">Manage all registered organizations</p>
          </div>
          <Link href="/super-admin/organizations" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            View all →
          </Link>
        </div>

        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first organization to get started</p>
            <Link
              href="/super-admin/organizations/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Create Organization
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 lg:px-6 py-3">Organization</th>
                <th className="px-4 lg:px-6 py-3 hidden sm:table-cell">Owner</th>
                <th className="px-4 lg:px-6 py-3">Users</th>
                <th className="px-4 lg:px-6 py-3 hidden md:table-cell">Status</th>
                <th className="px-4 lg:px-6 py-3 hidden md:table-cell">Created</th>
                <th className="px-4 lg:px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {organizations.map((org) => {
                const owner = org.members[0]?.user;
                return (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-4 lg:px-6 py-4">
                      <div className="flex items-center gap-3">
                        {org.logoUrl ? (
                          <img
                            src={org.logoUrl}
                            alt={org.name}
                            className="w-9 h-9 rounded-lg object-contain bg-gray-100"
                          />
                        ) : (
                          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600 font-semibold text-sm">
                            {org.name.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900 text-sm lg:text-base">{org.name}</div>
                          <div className="text-xs lg:text-sm text-gray-500">{org.slug}.{APP_DOMAIN.split(':')[0]}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 lg:px-6 py-4 hidden sm:table-cell">
                      <div className="text-sm text-gray-900">{owner?.name || 'No owner'}</div>
                      <div className="text-xs text-gray-500">{owner?.email || '-'}</div>
                    </td>
                    <td className="px-4 lg:px-6 py-4">
                      <span className="text-sm text-gray-900">{org._count.members}</span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                        Active
                      </span>
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-sm text-gray-500 hidden md:table-cell">
                      {format(new Date(org.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 lg:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1 lg:gap-2">
                        <Link
                          href={`/api/super-admin/impersonate?organizationId=${org.id}`}
                          className="text-gray-400 hover:text-indigo-600 p-1.5 hover:bg-indigo-50 rounded"
                          title="Impersonate"
                        >
                          <UserCog className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/super-admin/organizations/${org.id}?edit=true`}
                          className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-100 rounded"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}

        {organizations.length > 0 && (
          <div className="px-4 lg:px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="text-sm text-gray-500">Showing {organizations.length} of {stats.orgCount} organizations</div>
            <Link
              href="/super-admin/organizations"
              className="px-3 py-1.5 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              View all
            </Link>
          </div>
        )}
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {activity.recentUsers.slice(0, 2).map((item, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4">
                <div className="w-8 h-8 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserPlus className="text-green-600 h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{item.user.name || 'New user'}</span> joined {item.organization.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(item.joinedAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {activity.recentOrgs.map((org, i) => (
              <div key={i} className="px-6 py-4 flex items-start gap-4">
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Building2 className="text-blue-600 h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{org.name}</span> was created
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {formatDistanceToNow(new Date(org.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick Actions</h2>
          </div>
          <div className="p-6 grid grid-cols-2 gap-4">
            <Link
              href="/super-admin/organizations/new"
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
            >
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-200">
                <Plus className="text-indigo-600 h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Create Organization</span>
            </Link>
            <Link
              href="/super-admin/admins"
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-colors group"
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-200">
                <UserPlus className="text-emerald-600 h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Invite Admin</span>
            </Link>
            <Link
              href="/super-admin/analytics"
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-cyan-300 hover:bg-cyan-50/50 transition-colors group"
            >
              <div className="w-10 h-10 bg-cyan-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-cyan-200">
                <BarChart3 className="text-cyan-600 h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">View Analytics</span>
            </Link>
            <Link
              href="/super-admin/settings"
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/50 transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-200">
                <Settings className="text-amber-600 h-5 w-5" />
              </div>
              <span className="text-sm font-medium text-gray-700">Settings</span>
            </Link>
          </div>
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
  trend,
  subtitle,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string | number;
  trend?: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-white rounded-xl p-5 border border-gray-100 hover:shadow-sm transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBg}`}>
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </div>
        {trend && (
          <span className="text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
        {subtitle && (
          <span className="text-xs text-gray-500 font-medium">
            {subtitle}
          </span>
        )}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
