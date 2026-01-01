import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataExportImport, ExchangeRateSettings, DatabaseStats, PayrollSettings } from '@/components/domains/system/settings';
import { DocumentTypeSettings } from '@/components/domains/system/settings/DocumentTypeSettings';
import { prisma } from '@/lib/core/prisma';
import { PageHeader, PageContent } from '@/components/ui/page-header';

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Get database statistics
  const stats = await Promise.all([
    prisma.user.count(),
    prisma.asset.count(),
    prisma.subscription.count(),
    prisma.supplier.count(),
    prisma.activityLog.count(),
  ]);

  const [
    userCount,
    assetCount,
    subscriptionCount,
    supplierCount,
    activityLogCount,
  ] = stats;

  const dbStats = {
    users: userCount,
    assets: assetCount,
    subscriptions: subscriptionCount,
    suppliers: supplierCount,
    activityLogs: activityLogCount,
  };

  return (
    <>
      <PageHeader
        title="System Settings"
        subtitle="Manage system configuration, data export/import, and database utilities"
      />
      <PageContent>
        <Tabs defaultValue="export" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
              <TabsTrigger value="export">Data Export/Import</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="doctypes">Document Types</TabsTrigger>
              <TabsTrigger value="system">System Config</TabsTrigger>
            </TabsList>

            {/* Data Export/Import Tab */}
            <TabsContent value="export" className="space-y-6">
              <DataExportImport />
            </TabsContent>

            {/* Database Tab */}
            <TabsContent value="database" className="space-y-6">
              <DatabaseStats stats={dbStats} />
            </TabsContent>

            {/* Document Types Tab */}
            <TabsContent value="doctypes" className="space-y-6">
              <DocumentTypeSettings />
            </TabsContent>

            {/* System Config Tab */}
            <TabsContent value="system" className="space-y-6">
              <ExchangeRateSettings />
              <PayrollSettings />
            </TabsContent>
        </Tabs>
      </PageContent>
    </>
  );
}
