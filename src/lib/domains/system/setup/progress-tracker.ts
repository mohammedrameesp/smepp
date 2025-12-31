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
  | 'firstTeamMemberInvited'
  | 'firstEmployeeAdded';

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
  'firstEmployeeAdded',
];

/**
 * Get setup progress for an organization
 */
export async function getSetupProgress(tenantId: string): Promise<SetupProgressStatus> {
  const progress = await prisma.organizationSetupProgress.findUnique({
    where: { organizationId: tenantId },
  });

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
    link: '/admin/settings',
    icon: 'Building2',
  },
  {
    field: 'logoUploaded' as const,
    title: 'Upload company logo',
    description: 'Add your company logo to personalize your workspace',
    link: '/admin/settings',
    icon: 'Image',
  },
  {
    field: 'brandingConfigured' as const,
    title: 'Configure brand colors',
    description: 'Customize colors to match your brand identity',
    link: '/admin/settings',
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
    link: '/admin/team',
    icon: 'UserPlus',
  },
  {
    field: 'firstEmployeeAdded' as const,
    title: 'Add your first employee',
    description: 'Create your first employee record',
    link: '/admin/employees/new',
    icon: 'Users',
  },
];
