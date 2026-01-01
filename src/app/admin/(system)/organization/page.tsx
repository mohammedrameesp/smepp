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
import { AlertCircle } from 'lucide-react';
import type { CodeFormatConfig } from '@/lib/utils/code-prefix';

export default async function OrganizationPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.organizationId) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You are not part of any organization. Please contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Fetch all data in parallel
  const [organization, memberData, invitationData, currentMembership] = await Promise.all([
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
        additionalCurrencies: true,
        enabledModules: true,
        _count: { select: { teamMembers: true } },
      },
    }),
    prisma.teamMember.findMany({
      where: { tenantId: session.user.organizationId, isDeleted: false },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        isOwner: true,
        joinedAt: true,
      },
      orderBy: [{ isOwner: 'desc' }, { role: 'asc' }, { joinedAt: 'asc' }],
    }),
    prisma.organizationInvitation.findMany({
      where: {
        organizationId: session.user.organizationId,
        acceptedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
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
      <div className="max-w-6xl mx-auto px-6 py-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Organization not found or you don&apos;t have access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Transform data for client component
  const members = memberData.map((m) => ({
    id: m.id,
    role: m.role,
    isOwner: m.isOwner,
    joinedAt: m.joinedAt?.toISOString() || new Date().toISOString(),
    user: {
      id: m.id,
      name: m.name,
      email: m.email,
      image: m.image,
    },
  }));

  const invitations = invitationData.map((i) => ({
    id: i.id,
    email: i.email,
    role: i.role,
    expiresAt: i.expiresAt.toISOString(),
  }));

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
    additionalCurrencies: organization.additionalCurrencies,
    enabledModules: organization.enabledModules,
    _count: organization._count,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization profile, team, and configuration
        </p>
      </div>

      <OrganizationTabs
        organization={orgData}
        members={members}
        invitations={invitations}
        currentUserRole={currentMembership.role}
        isOwner={currentMembership.isOwner}
      />
    </div>
  );
}
