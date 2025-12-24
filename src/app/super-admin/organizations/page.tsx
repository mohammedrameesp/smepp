import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Building2, Plus, Users, Mail, Calendar, Search, Filter } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

// Prevent static pre-rendering (requires database)
export const dynamic = 'force-dynamic';

async function getOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
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
  const [total, free, starter, professional, enterprise] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { subscriptionTier: 'FREE' } }),
    prisma.organization.count({ where: { subscriptionTier: 'STARTER' } }),
    prisma.organization.count({ where: { subscriptionTier: 'PROFESSIONAL' } }),
    prisma.organization.count({ where: { subscriptionTier: 'ENTERPRISE' } }),
  ]);

  return { total, free, starter, professional, enterprise };
}

export default async function OrganizationsPage() {
  const [organizations, stats] = await Promise.all([
    getOrganizations(),
    getStats(),
  ]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Organizations</h2>
          <p className="text-slate-500">
            Manage all {stats.total} organizations on the platform
          </p>
        </div>
        <Link href="/super-admin/organizations/new">
          <Button className="bg-slate-900 hover:bg-slate-800">
            <Plus className="h-4 w-4 mr-2" />
            Create Organization
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total" value={stats.total} />
        <StatCard label="Free" value={stats.free} color="text-slate-600" />
        <StatCard label="Starter" value={stats.starter} color="text-blue-600" />
        <StatCard label="Professional" value={stats.professional} color="text-indigo-600" />
        <StatCard label="Enterprise" value={stats.enterprise} color="text-amber-600" />
      </div>

      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">No organizations yet</h3>
            <p className="text-slate-500 text-sm mb-4">
              Create your first organization to get started
            </p>
            <Link href="/super-admin/organizations/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Organization</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Owner</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Tier</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Users</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Assets</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase">Created</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-slate-500 uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {organizations.map((org) => {
                const owner = org.members[0]?.user;
                return (
                  <tr key={org.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
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
                          <p className="font-medium text-slate-900">{org.name}</p>
                          <p className="text-xs text-slate-400">{org.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-600 text-sm">
                        {owner?.name || owner?.email || 'No owner'}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <TierBadge tier={org.subscriptionTier} />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        {org._count.members}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-600">
                      {org._count.assets}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs">
                      {formatDistanceToNow(org.createdAt, { addSuffix: true })}
                    </td>
                    <td className="px-5 py-4">
                      <Link href={`/super-admin/organizations/${org.id}`}>
                        <Button variant="outline" size="sm">
                          Manage
                        </Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'text-slate-900' }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
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
