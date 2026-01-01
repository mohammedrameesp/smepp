import { prisma } from '@/lib/core/prisma';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Users, Eye, UserCog, Edit } from 'lucide-react';
import { format } from 'date-fns';

export const dynamic = 'force-dynamic';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

async function getOrganizations() {
  const organizations = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          teamMembers: true,
          assets: true,
        },
      },
      teamMembers: {
        where: { isOwner: true, isDeleted: false },
        select: { name: true, email: true },
        take: 1,
      },
    },
  });

  return organizations;
}

export default async function OrganizationsPage() {
  const organizations = await getOrganizations();

  return (
    <div className="space-y-6">
      {/* Organizations Table */}
      <div className="bg-white rounded-xl border border-gray-100">
        {organizations.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No organizations yet</h3>
            <p className="text-gray-500 text-sm mb-4">Create your first organization to get started</p>
            <Link href="/super-admin/organizations/new">
              <Button className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-100">
                    <th className="px-4 lg:px-6 py-3">Organization</th>
                    <th className="px-4 lg:px-6 py-3 hidden sm:table-cell">Owner</th>
                    <th className="px-4 lg:px-6 py-3">Users</th>
                    <th className="px-4 lg:px-6 py-3 hidden md:table-cell">Assets</th>
                    <th className="px-4 lg:px-6 py-3 hidden md:table-cell">Status</th>
                    <th className="px-4 lg:px-6 py-3 hidden lg:table-cell">Created</th>
                    <th className="px-4 lg:px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {organizations.map((org) => {
                    const owner = org.teamMembers[0];
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
                          <div className="flex items-center gap-1.5 text-sm text-gray-900">
                            <Users className="h-4 w-4 text-gray-400" />
                            {org._count.teamMembers}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 hidden md:table-cell">
                          {org._count.assets}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell">
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full">
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                            Active
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-500 hidden lg:table-cell">
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

            <div className="px-4 lg:px-6 py-4 border-t border-gray-100">
              <div className="text-sm text-gray-500">
                Showing {organizations.length} organization{organizations.length !== 1 ? 's' : ''}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
