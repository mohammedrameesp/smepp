/**
 * @module app/admin/(system)/settings/page
 * @description Server component page for organization data management.
 * Provides quick navigation to module management and access control,
 * along with data export/import functionality.
 *
 * @dependencies
 * - DataExportImport: Component for bulk data operations
 * - PageHeader/PageContent: Standard layout components
 *
 * @routes
 * - GET /admin/settings - Settings and data management page
 *
 * @access
 * - Admins only (isAdmin check)
 * - Development mode: Open access
 *
 * @features
 * - Quick link to Module Management (/admin/modules)
 * - Quick link to Access Control (/admin/settings/access-control)
 * - Data export/import functionality via DataExportImport component
 *
 * @navigation
 * - /admin/modules - Enable/disable organization features
 * - /admin/settings/access-control - Team permissions management
 */

import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

import { DataExportImport } from '@/features/settings/components';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Package, ChevronRight, ShieldCheck } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

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
        {/* Quick Links */}
        <div className="space-y-3 mb-6">
          <Link
            href="/admin/modules"
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-100">
                <Package className={`${ICON_SIZES.md} text-slate-600`} />
              </div>
              <div>
                <p className="font-medium text-slate-900">Manage Modules</p>
                <p className="text-sm text-slate-500">Install or remove features for your organization</p>
              </div>
            </div>
            <ChevronRight className={`${ICON_SIZES.md} text-slate-400 group-hover:text-slate-600 transition-colors`} />
          </Link>

          <Link
            href="/admin/settings/access-control"
            className="flex items-center justify-between p-4 bg-white rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <ShieldCheck className={`${ICON_SIZES.md} text-red-600`} />
              </div>
              <div>
                <p className="font-medium text-slate-900">Access Control</p>
                <p className="text-sm text-slate-500">Manage team permissions and module access</p>
              </div>
            </div>
            <ChevronRight className={`${ICON_SIZES.md} text-slate-400 group-hover:text-slate-600 transition-colors`} />
          </Link>
        </div>

        <DataExportImport />
      </PageContent>
    </>
  );
}

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Date: 2026-02-01
 * Reviewer: Claude (AI Code Review)
 *
 * Overall Assessment: PASS
 * Clean settings page with good navigation patterns.
 *
 * Strengths:
 * 1. Admin-only access control (appropriate for settings)
 * 2. Clear quick-link navigation with visual indicators
 * 3. Good use of icons and descriptions for link clarity
 * 4. Proper hover states for interactive feedback
 * 5. Delegates complex functionality to DataExportImport component
 *
 * Potential Improvements:
 * 1. Page title says "Data Management" but route is /settings
 *    - Consider renaming page or adding more general settings options
 * 2. Could add more settings sections (organization profile, integrations, etc.)
 * 3. Consider adding confirmation for destructive import operations
 *
 * Security: Good - admin-only access, no direct data manipulation
 * Performance: Minimal - simple render with no data fetching
 * Maintainability: Good - clean structure, clear intent
 */
