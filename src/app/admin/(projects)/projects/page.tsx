import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { ProjectListTable } from '@/components/projects/project-list-table';
import { FolderKanban, Play, CheckCircle, PauseCircle, Plus } from 'lucide-react';
import { StatsCard, StatsCardGrid } from '@/components/ui/stats-card';

export default async function AdminProjectsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Require organization context for tenant isolation
  if (!session.user.organizationId) {
    redirect('/forbidden');
  }

  const tenantId = session.user.organizationId;

  // Fetch stats (filtered by tenant)
  const [
    totalProjects,
    activeProjects,
    statusCounts,
  ] = await Promise.all([
    prisma.project.count({ where: { tenantId } }),
    prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
    prisma.project.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: { _all: true },
    }),
  ]);

  // Get status breakdown
  const statusMap = statusCounts.reduce((acc, item) => {
    acc[item.status] = item._count._all;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Project Management</h1>
          <p className="text-slate-500 text-sm">Manage projects, budgets, and financial tracking</p>
        </div>
        <Link
          href="/admin/projects/new"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Project
        </Link>
      </div>

      {/* Stats Cards */}
      <StatsCardGrid columns={4} className="mb-6">
        <StatsCard
          title="Total Projects"
          subtitle={`${activeProjects} active`}
          value={totalProjects}
          icon={FolderKanban}
          color="blue"
        />
        <StatsCard
          title="Planning"
          subtitle="In planning phase"
          value={statusMap['PLANNING'] || 0}
          icon={PauseCircle}
          color="amber"
        />
        <StatsCard
          title="Active"
          subtitle="Currently running"
          value={statusMap['ACTIVE'] || 0}
          icon={Play}
          color="emerald"
        />
        <StatsCard
          title="Completed"
          subtitle="Successfully finished"
          value={statusMap['COMPLETED'] || 0}
          icon={CheckCircle}
          color="purple"
        />
      </StatsCardGrid>

      {/* Projects Table */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-4 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">All Projects</h2>
          <p className="text-sm text-slate-500">Complete list of projects with filters and sorting</p>
        </div>
        <div className="p-4">
          <ProjectListTable />
        </div>
      </div>
    </div>
  );
}
