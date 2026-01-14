/**
 * @file page.tsx
 * @description Organization settings page - Server Component
 * @module admin/organization
 */

import { getServerSession } from 'next-auth/next';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { OrganizationTabs } from './organization-tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { AlertCircle } from 'lucide-react';
import type { CodeFormatConfig } from '@/lib/utils/code-prefix';

export default async function OrganizationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.organizationId) {
    return (
      <PageContent>
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not part of any organization. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </PageContent>
    );
  }

  // Fetch organization and current membership
  const [organization, currentMembership] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: session.user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        codePrefix: true,
        codeFormats: true,
        subscriptionTier: true,
        createdAt: true,
        primaryColor: true,
        secondaryColor: true,
        website: true,
        additionalCurrencies: true,
        enabledModules: true,
        hasMultipleLocations: true,
        _count: { select: { teamMembers: true } },
      },
    }),
    prisma.teamMember.findFirst({
      where: {
        tenantId: session.user.organizationId,
        id: session.user.id,
        isDeleted: false,
      },
    }),
  ]);

  if (!organization || !currentMembership) {
    return (
      <PageContent>
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Organization not found or you don&apos;t have access.
          </AlertDescription>
        </Alert>
      </PageContent>
    );
  }

  const orgData = {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    logoUrl: organization.logoUrl,
    codePrefix: organization.codePrefix,
    codeFormats: (organization.codeFormats as CodeFormatConfig) || {},
    subscriptionTier: organization.subscriptionTier,
    createdAt: organization.createdAt.toISOString(),
    primaryColor: organization.primaryColor,
    secondaryColor: organization.secondaryColor,
    website: organization.website,
    additionalCurrencies: organization.additionalCurrencies,
    enabledModules: organization.enabledModules,
    hasMultipleLocations: organization.hasMultipleLocations,
    _count: organization._count,
  };

  return (
    <>
      <PageHeader
        title="Organization Settings"
        subtitle="Manage your organization profile and configuration"
      />
      <PageContent>
        <OrganizationTabs
          organization={orgData}
          currentUserRole={currentMembership.role}
          isOwner={currentMembership.isOwner}
        />
      </PageContent>
    </>
  );
}
