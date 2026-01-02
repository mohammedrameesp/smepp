/**
 * @file seed-leave-types.ts
 * @description Seed default leave types for new organizations
 * @module hr/leave
 */

import { prisma } from '@/lib/core/prisma';
import { LeaveCategory } from '@prisma/client';

const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Annual Leave',
    description: 'Paid annual vacation leave (Qatar Law: 21 days for <5 years, 28 days for 5+ years of service). Accrues monthly from day one.',
    color: '#3B82F6',
    defaultDays: 21,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 7,
    allowCarryForward: true,
    maxCarryForwardDays: 5,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    serviceBasedEntitlement: { '12': 21, '60': 28 },
    category: LeaveCategory.STANDARD,
    accrualBased: true,
  },
  {
    name: 'Sick Leave',
    description: 'Leave for medical reasons (Qatar Law: 2 weeks full pay). Requires medical certificate.',
    color: '#EF4444',
    defaultDays: 14,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 3,
    isOnceInEmployment: false,
    category: LeaveCategory.MEDICAL,
    accrualBased: false,
  },
  {
    name: 'Maternity Leave',
    description: 'Leave for new mothers (Qatar Law: 50 days - up to 15 days before delivery, fully paid if 1+ year of service)',
    color: '#EC4899',
    defaultDays: 50,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 14,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'FEMALE',
    accrualBased: false,
  },
  {
    name: 'Paternity Leave',
    description: 'Leave for new fathers (3 days paid)',
    color: '#8B5CF6',
    defaultDays: 3,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'MALE',
    accrualBased: false,
  },
  {
    name: 'Hajj Leave',
    description: 'Leave for Hajj pilgrimage (Qatar Law: Up to 20 days unpaid, once during employment, requires 1 year of service)',
    color: '#059669',
    defaultDays: 20,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 20,
    minNoticeDays: 30,
    allowCarryForward: false,
    minimumServiceMonths: 12,
    isOnceInEmployment: true,
    category: LeaveCategory.RELIGIOUS,
    accrualBased: false,
  },
  {
    name: 'Unpaid Leave',
    description: 'Unpaid leave of absence (max 30 days per request)',
    color: '#6B7280',
    defaultDays: 30,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 30,
    minNoticeDays: 14,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
  {
    name: 'Compassionate Leave',
    description: 'Leave for bereavement or family emergencies (5 days paid)',
    color: '#3B82F6',
    defaultDays: 5,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
];

/**
 * Seed default leave types for an organization
 * @param organizationId - The organization ID to seed leave types for
 */
export async function seedDefaultLeaveTypes(organizationId: string): Promise<void> {
  try {
    // Check if leave types already exist
    const existingCount = await prisma.leaveType.count({
      where: { tenantId: organizationId },
    });

    if (existingCount > 0) {
      console.log(`[seedDefaultLeaveTypes] Organization ${organizationId} already has ${existingCount} leave types, skipping`);
      return;
    }

    // Create all leave types
    await prisma.leaveType.createMany({
      data: DEFAULT_LEAVE_TYPES.map(lt => ({
        ...lt,
        tenantId: organizationId,
      })),
    });

    console.log(`[seedDefaultLeaveTypes] Created ${DEFAULT_LEAVE_TYPES.length} leave types for organization ${organizationId}`);
  } catch (error) {
    console.error('[seedDefaultLeaveTypes] Error:', error);
    throw error;
  }
}
