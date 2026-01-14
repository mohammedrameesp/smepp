import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { DataExportImport } from '@/features/settings/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Package, ChevronRight } from 'lucide-react';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && !session.user.isAdmin) {
    redirect('/forbidden');
  }

  return (
    <>
      <PageHeader
        title="Data Management"
        subtitle="Export and import your organization's data"
      />
      <PageContent>
        {/* Quick link to Modules */}
        <Link
          href="/admin/modules"
          className="flex items-center justify-between p-4 mb-6 bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-slate-100">
              <Package className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="font-medium text-slate-900">Manage Modules</p>
              <p className="text-sm text-slate-500">Install or remove features for your organization</p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
        </Link>

        <DataExportImport />
      </PageContent>
    </>
  );
}
