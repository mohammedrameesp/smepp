import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
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
import { OrganizationSettings, TeamMembers } from '@/components/domains/system/organization';
import { prisma } from '@/lib/core/prisma';

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

  // Fetch organization data if user has one
  let organization = null;
  let members: {
    id: string;
    role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
    isOwner: boolean;
    joinedAt: string;
    user: { id: string; name: string | null; email: string; image: string | null };
  }[] = [];
  let invitations: {
    id: string;
    email: string;
    role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'MEMBER';
    expiresAt: string;
  }[] = [];
  let currentMembership = null;

  if (session.user.organizationId) {
    const [orgData, memberData, inviteData, membershipData] = await Promise.all([
      prisma.organization.findUnique({
        where: { id: session.user.organizationId },
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          subscriptionTier: true,
          maxUsers: true,
          maxAssets: true,
          _count: { select: { members: true } },
        },
      }),
      prisma.organizationUser.findMany({
        where: { organizationId: session.user.organizationId },
        include: {
          user: {
            select: { id: true, name: true, email: true, image: true },
          },
        },
        orderBy: [{ isOwner: 'desc' }, { role: 'asc' }, { joinedAt: 'asc' }],
      }),
      prisma.organizationInvitation.findMany({
        where: {
          organizationId: session.user.organizationId,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.organizationUser.findUnique({
        where: {
          organizationId_userId: {
            organizationId: session.user.organizationId,
            userId: session.user.id,
          },
        },
      }),
    ]);

    organization = orgData;
    members = memberData.map((m) => ({
      id: m.id,
      role: m.role,
      isOwner: m.isOwner,
      joinedAt: m.joinedAt.toISOString(),
      user: m.user,
    }));
    invitations = inviteData.map((i) => ({
      id: i.id,
      email: i.email,
      role: i.role,
      expiresAt: i.expiresAt.toISOString(),
    }));
    currentMembership = membershipData;
  }

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
              {organization && currentMembership ? (
                <>
                  <OrganizationSettings organization={organization} />
                  <TeamMembers
                    organizationId={organization.id}
                    members={members}
                    invitations={invitations}
                    currentUserOrgRole={currentMembership.role}
                    isOwner={currentMembership.isOwner}
                  />
                </>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>No Organization</CardTitle>
                    <CardDescription>
                      You are not part of any organization yet.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-500">
                      Create or join an organization to access these settings.
                    </p>
                  </CardContent>
                </Card>
              )}
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
