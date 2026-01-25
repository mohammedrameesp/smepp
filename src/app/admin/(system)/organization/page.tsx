/**
 * @file page.tsx
 * @description Organization settings page - Server Component
 * @module admin/organization
 */

// Force dynamic rendering to prevent caching of weekend days and other settings
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/core/prisma';
import { getAdminAuthContext, hasAccess } from '@/lib/auth/impersonation-check';
import { OrganizationTabs } from './organization-tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { AlertCircle } from 'lucide-react';
import type { CodeFormatConfig } from '@/lib/utils/code-prefix';

export default async function OrganizationPage() {
  const auth = await getAdminAuthContext();

  if (!auth.isImpersonating && !auth.session) {
    redirect('/login');
  }

  if (!hasAccess(auth, 'admin')) {
    redirect('/forbidden');
  }

  if (!auth.tenantId) {
    redirect('/login');
  }

  const tenantId = auth.tenantId;

  // Fetch organization and current membership
  const [organization, currentMembership] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
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
        weekendDays: true,
        _count: { select: { teamMembers: true } },
      },
    }),
    // When impersonating, skip membership check
    auth.isImpersonating ? Promise.resolve(null) : prisma.teamMember.findFirst({
      where: {
        tenantId,
        id: auth.userId!,
        isDeleted: false,
      },
    }),
  ]);

  if (!organization || (!auth.isImpersonating && !currentMembership)) {
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

  // When impersonating, grant full owner access
  const currentUserRole = auth.isImpersonating
    ? 'OWNER'
    : (currentMembership!.isOwner ? 'OWNER' : currentMembership!.isAdmin ? 'ADMIN' : 'MEMBER');
  const isOwner = auth.isImpersonating || currentMembership!.isOwner;

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
    weekendDays: organization.weekendDays,
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
          currentUserRole={currentUserRole}
          isOwner={isOwner}
        />
      </PageContent>
    </>
  );
}
