/**
 * @file progress-tracker.ts
 * @description Utility functions for tracking organization setup progress
 * @module system/setup
 */

import { prisma } from '@/lib/core/prisma';
import type { OrganizationSetupProgress } from '@prisma/client';

export type SetupProgressField =
  | 'profileComplete'
  | 'logoUploaded'
  | 'brandingConfigured'
  | 'firstAssetAdded'
  | 'firstTeamMemberInvited';

export interface SetupProgressStatus {
  progress: OrganizationSetupProgress | null;
  completedCount: number;
  totalCount: number;
  percentComplete: number;
  isComplete: boolean;
}

const CHECKLIST_FIELDS: SetupProgressField[] = [
  'profileComplete',
  'logoUploaded',
  'brandingConfigured',
  'firstAssetAdded',
  'firstTeamMemberInvited',
];

/**
 * Get setup progress for an organization
 * Always syncs data-driven fields (assets, team members, employees) with actual counts
 */
export async function getSetupProgress(tenantId: string): Promise<SetupProgressStatus> {
  // Always fetch actual data to keep progress in sync
  const [org, assetCount, memberCount, existingProgress] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: tenantId },
      select: { name: true, logoUrl: true, primaryColor: true },
    }),
    prisma.asset.count({ where: { tenantId, deletedAt: null } }),
    prisma.teamMember.count({ where: { tenantId, isDeleted: false } }),
    prisma.organizationSetupProgress.findUnique({
      where: { organizationId: tenantId },
    }),
  ]);

  if (!org) {
    return {
      progress: null,
      completedCount: 0,
      totalCount: CHECKLIST_FIELDS.length,
      percentComplete: 0,
      isComplete: false,
    };
  }

  // Infer data-driven progress from actual counts
  const dataProgress = {
    profileComplete: Boolean(org.name && org.name.length > 2),
    logoUploaded: Boolean(org.logoUrl),
    brandingConfigured: Boolean(org.primaryColor),
    firstAssetAdded: assetCount > 0,
    firstTeamMemberInvited: memberCount > 1, // More than just the owner
  };

  // Check if any data-driven field needs to be updated
  const needsUpdate = !existingProgress ||
    existingProgress.firstAssetAdded !== dataProgress.firstAssetAdded ||
    existingProgress.firstTeamMemberInvited !== dataProgress.firstTeamMemberInvited ||
    existingProgress.logoUploaded !== dataProgress.logoUploaded ||
    existingProgress.brandingConfigured !== dataProgress.brandingConfigured;

  let progress = existingProgress;
  if (needsUpdate) {
    progress = await prisma.organizationSetupProgress.upsert({
      where: { organizationId: tenantId },
      create: {
        organizationId: tenantId,
        ...dataProgress,
      },
      update: dataProgress,
    });
  }

  if (!progress) {
    return {
      progress: null,
      completedCount: 0,
      totalCount: CHECKLIST_FIELDS.length,
      percentComplete: 0,
      isComplete: false,
    };
  }

  const completedCount = CHECKLIST_FIELDS.filter(field => progress[field]).length;
  const percentComplete = Math.round((completedCount / CHECKLIST_FIELDS.length) * 100);

  return {
    progress,
    completedCount,
    totalCount: CHECKLIST_FIELDS.length,
    percentComplete,
    isComplete: completedCount === CHECKLIST_FIELDS.length,
  };
}

/**
 * Update a specific setup progress field
 */
export async function updateSetupProgress(
  tenantId: string,
  field: SetupProgressField,
  value: boolean = true
): Promise<OrganizationSetupProgress> {
  return prisma.organizationSetupProgress.upsert({
    where: { organizationId: tenantId },
    create: {
      organizationId: tenantId,
      [field]: value,
    },
    update: {
      [field]: value,
    },
  });
}

/**
 * Update multiple setup progress fields at once
 */
export async function updateSetupProgressBulk(
  tenantId: string,
  updates: Partial<Record<SetupProgressField, boolean>>
): Promise<OrganizationSetupProgress> {
  return prisma.organizationSetupProgress.upsert({
    where: { organizationId: tenantId },
    create: {
      organizationId: tenantId,
      ...updates,
    },
    update: updates,
  });
}

/**
 * Check if all setup items are complete
 */
export async function isSetupComplete(tenantId: string): Promise<boolean> {
  const { isComplete } = await getSetupProgress(tenantId);
  return isComplete;
}

/**
 * Initialize setup progress record for a new organization
 */
export async function initializeSetupProgress(
  tenantId: string,
  initialValues?: Partial<Record<SetupProgressField, boolean>>
): Promise<OrganizationSetupProgress> {
  return prisma.organizationSetupProgress.create({
    data: {
      organizationId: tenantId,
      ...initialValues,
    },
  });
}

/**
 * Get the list of incomplete setup items
 */
export async function getIncompleteItems(tenantId: string): Promise<SetupProgressField[]> {
  const progress = await prisma.organizationSetupProgress.findUnique({
    where: { organizationId: tenantId },
  });

  if (!progress) {
    return CHECKLIST_FIELDS;
  }

  return CHECKLIST_FIELDS.filter(field => !progress[field]);
}

/**
 * Checklist item metadata for UI display
 */
export const CHECKLIST_ITEMS = [
  {
    field: 'profileComplete' as const,
    title: 'Complete organization profile',
    description: 'Set up your organization name and basic information',
    link: '/admin/organization',
    icon: 'Building2',
  },
  {
    field: 'logoUploaded' as const,
    title: 'Upload company logo',
    description: 'Add your company logo to personalize your workspace',
    link: '/admin/organization',
    icon: 'Image',
  },
  {
    field: 'brandingConfigured' as const,
    title: 'Configure brand colors',
    description: 'Customize colors to match your brand identity',
    link: '/admin/organization',
    icon: 'Palette',
  },
  {
    field: 'firstAssetAdded' as const,
    title: 'Add your first asset',
    description: 'Start tracking your company assets',
    link: '/admin/assets/new',
    icon: 'Package',
  },
  {
    field: 'firstTeamMemberInvited' as const,
    title: 'Invite a team member',
    description: 'Bring your team on board',
    link: '/admin/employees',
    icon: 'UserPlus',
  },
];
