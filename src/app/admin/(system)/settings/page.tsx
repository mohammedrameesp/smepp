import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataExportImport } from '@/components/settings/data-export-import';
import { ExchangeRateSettings } from '@/components/settings/exchange-rate-settings';
import { DatabaseStats } from '@/components/settings/database-stats';
import { DataDeletion } from '@/components/settings/data-deletion';
import { BackupDownload } from '@/components/settings/backup-download';
import { PayrollSettings } from '@/components/settings/payroll-settings';
import { DocumentTypeSettings } from '@/components/domains/system/settings/DocumentTypeSettings';
import { prisma } from '@/lib/prisma';

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
    prisma.project.count(),
    prisma.activityLog.count(),
  ]);

  const [
    userCount,
    assetCount,
    subscriptionCount,
    supplierCount,
    projectCount,
    activityLogCount,
  ] = stats;

  const dbStats = {
    users: userCount,
    assets: assetCount,
    subscriptions: subscriptionCount,
    suppliers: supplierCount,
    projects: projectCount,
    activityLogs: activityLogCount,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">System Settings</h1>
            <p className="text-gray-600">
              Manage system configuration, data export/import, and database utilities
            </p>
          </div>

          <Tabs defaultValue="backup" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 lg:grid-cols-7">
              <TabsTrigger value="backup">Backup</TabsTrigger>
              <TabsTrigger value="export">Data Export/Import</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="doctypes">Document Types</TabsTrigger>
              <TabsTrigger value="testing" className="text-red-600">Testing/Deletion</TabsTrigger>
              <TabsTrigger value="organization">Organization</TabsTrigger>
              <TabsTrigger value="system">System Config</TabsTrigger>
            </TabsList>

            {/* Backup Tab */}
            <TabsContent value="backup" className="space-y-6">
              <BackupDownload />
            </TabsContent>

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

            {/* Testing/Deletion Tab */}
            <TabsContent value="testing" className="space-y-6">
              <DataDeletion />
            </TabsContent>

            {/* Organization Tab */}
            <TabsContent value="organization" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Organization Settings</CardTitle>
                  <CardDescription>
                    Configure company information and branding
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-gray-500">
                    Coming soon - Organization settings will be available here
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* System Config Tab */}
            <TabsContent value="system" className="space-y-6">
              <ExchangeRateSettings />
              <PayrollSettings />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
