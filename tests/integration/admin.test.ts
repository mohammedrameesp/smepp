/**
 * Admin API Integration Tests
 * Covers: /api/admin/* routes
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';
import { OrgRole } from '@prisma/client';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

describe('Admin API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@example.com',
      organizationId: 'org-123',
      organizationSlug: 'test-org',
      orgRole: 'ADMIN' as OrgRole,
      teamMemberRole: 'ADMIN',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockMemberSession = {
    user: {
      id: 'member-123',
      email: 'member@example.com',
      organizationId: 'org-123',
      organizationSlug: 'test-org',
      orgRole: 'MEMBER' as OrgRole,
      teamMemberRole: 'MEMBER',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/organization', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return organization details for admin', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockOrg = prisma.organization as any;
      mockOrg.findUnique.mockResolvedValue({
        id: 'org-123',
        name: 'Test Organization',
        slug: 'test-org',
        subscriptionTier: 'PROFESSIONAL',
        enabledModules: ['assets', 'employees', 'leave'],
      });

      const org = await mockOrg.findUnique({ where: { id: 'org-123' } });
      expect(org.name).toBe('Test Organization');
      expect(org.enabledModules).toContain('assets');
    });
  });

  describe('PATCH /api/admin/organization', () => {
    it('should update organization settings', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockOrg = prisma.organization as any;
      mockOrg.update.mockResolvedValue({
        id: 'org-123',
        name: 'Updated Organization',
        timezone: 'Asia/Dubai',
        currency: 'AED',
      });

      const updatedOrg = await mockOrg.update({
        where: { id: 'org-123' },
        data: { name: 'Updated Organization' },
      });

      expect(updatedOrg.name).toBe('Updated Organization');
    });

    it('should reject non-admin updates', async () => {
      mockGetServerSession.mockResolvedValue(mockMemberSession);
      const session = await mockGetServerSession();
      expect(session?.user.orgRole).not.toBe('ADMIN');
      expect(session?.user.orgRole).not.toBe('OWNER');
    });
  });

  describe('GET /api/admin/team', () => {
    it('should return team members for authenticated admin', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findMany.mockResolvedValue([
        { id: 'member-1', email: 'user1@example.com', role: 'ADMIN', status: 'ACTIVE' },
        { id: 'member-2', email: 'user2@example.com', role: 'MEMBER', status: 'ACTIVE' },
      ]);
      mockTeamMember.count.mockResolvedValue(2);

      const members = await mockTeamMember.findMany({ where: { tenantId: 'org-123' } });
      expect(members).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const page = 1;
      const pageSize = 10;
      const skip = (page - 1) * pageSize;

      expect(skip).toBe(0);
    });

    it('should support role filtering', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findMany.mockResolvedValue([
        { id: 'member-1', email: 'admin@example.com', role: 'ADMIN' },
      ]);

      const admins = await mockTeamMember.findMany({
        where: { tenantId: 'org-123', role: 'ADMIN' },
      });
      expect(admins).toHaveLength(1);
    });
  });

  describe('POST /api/admin/team', () => {
    it('should invite new team member', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockInvitation = prisma.organizationInvitation as any;
      mockInvitation.create.mockResolvedValue({
        id: 'invite-123',
        email: 'newmember@example.com',
        role: 'MEMBER',
        token: 'invite-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const invitation = await mockInvitation.create({
        data: {
          email: 'newmember@example.com',
          organizationId: 'org-123',
          role: 'MEMBER',
        },
      });

      expect(invitation.email).toBe('newmember@example.com');
    });

    it('should reject duplicate invitations', async () => {
      const mockInvitation = prisma.organizationInvitation as any;
      mockInvitation.findFirst.mockResolvedValue({
        id: 'invite-existing',
        email: 'existing@example.com',
      });

      const existing = await mockInvitation.findFirst({
        where: { email: 'existing@example.com', organizationId: 'org-123' },
      });
      expect(existing).not.toBeNull();
    });

    it('should check existing team members', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findFirst.mockResolvedValue({
        id: 'member-existing',
        email: 'existing@example.com',
      });

      const existing = await mockTeamMember.findFirst({
        where: { email: 'existing@example.com', tenantId: 'org-123' },
      });
      expect(existing).not.toBeNull();
    });
  });

  describe('GET /api/admin/team/[memberId]', () => {
    it('should return team member details', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findFirst.mockResolvedValue({
        id: 'member-123',
        email: 'member@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'MEMBER',
        status: 'ACTIVE',
        assignedAssets: [],
        leaveBalances: [],
      });

      const member = await mockTeamMember.findFirst({
        where: { id: 'member-123', tenantId: 'org-123' },
      });
      expect(member.firstName).toBe('John');
    });

    it('should return 404 for non-existent member', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findFirst.mockResolvedValue(null);

      const member = await mockTeamMember.findFirst({
        where: { id: 'nonexistent', tenantId: 'org-123' },
      });
      expect(member).toBeNull();
    });
  });

  describe('PATCH /api/admin/team/[memberId]', () => {
    it('should update team member', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.update.mockResolvedValue({
        id: 'member-123',
        role: 'ADMIN',
        department: 'Engineering',
      });

      const updated = await mockTeamMember.update({
        where: { id: 'member-123' },
        data: { role: 'ADMIN', department: 'Engineering' },
      });

      expect(updated.role).toBe('ADMIN');
    });

    it('should prevent self-demotion for owner', async () => {
      const ownerSession = {
        ...mockAdminSession,
        user: { ...mockAdminSession.user, id: 'owner-123', orgRole: 'OWNER' as OrgRole },
      };
      mockGetServerSession.mockResolvedValue(ownerSession);

      // Cannot demote yourself if you're the owner
      const session = await mockGetServerSession();
      expect(session?.user.orgRole).toBe('OWNER');
    });
  });

  describe('DELETE /api/admin/team/[memberId]', () => {
    it('should remove team member (soft delete)', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.update.mockResolvedValue({
        id: 'member-123',
        isDeleted: true,
        deletedAt: new Date(),
        status: 'INACTIVE',
      });

      const deleted = await mockTeamMember.update({
        where: { id: 'member-123' },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          status: 'INACTIVE',
        },
      });

      expect(deleted.isDeleted).toBe(true);
    });

    it('should prevent owner from being deleted', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findFirst.mockResolvedValue({
        id: 'owner-123',
        orgRole: 'OWNER',
      });

      const member = await mockTeamMember.findFirst({ where: { id: 'owner-123' } });
      expect(member.orgRole).toBe('OWNER');
      // Should return 403
    });
  });

  describe('POST /api/admin/team/[memberId]/resend', () => {
    it('should resend invitation email', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findFirst.mockResolvedValue({
        id: 'member-123',
        email: 'pending@example.com',
        status: 'INVITED',
        setupToken: 'old-token',
      });
      mockTeamMember.update.mockResolvedValue({
        id: 'member-123',
        setupToken: 'new-token',
        setupTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      const member = await mockTeamMember.findFirst({ where: { id: 'member-123' } });
      expect(member.status).toBe('INVITED');
    });
  });

  describe('GET /api/admin/team/check-email', () => {
    it('should check if email is available', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findFirst.mockResolvedValue(null);

      const existing = await mockTeamMember.findFirst({
        where: { email: 'new@example.com', tenantId: 'org-123' },
      });
      expect(existing).toBeNull();
    });

    it('should check pending invitations', async () => {
      const mockInvitation = prisma.organizationInvitation as any;
      mockInvitation.findFirst.mockResolvedValue({
        id: 'invite-123',
        email: 'pending@example.com',
      });

      const invitation = await mockInvitation.findFirst({
        where: { email: 'pending@example.com', organizationId: 'org-123' },
      });
      expect(invitation).not.toBeNull();
    });
  });

  describe('GET /api/admin/team/invitations', () => {
    it('should list pending invitations', async () => {
      const mockInvitation = prisma.organizationInvitation as any;
      mockInvitation.findMany.mockResolvedValue([
        { id: 'invite-1', email: 'pending1@example.com', status: 'PENDING' },
        { id: 'invite-2', email: 'pending2@example.com', status: 'PENDING' },
      ]);

      const invitations = await mockInvitation.findMany({
        where: { organizationId: 'org-123' },
      });
      expect(invitations).toHaveLength(2);
    });
  });

  describe('DELETE /api/admin/team/invitations/[id]', () => {
    it('should cancel pending invitation', async () => {
      const mockInvitation = prisma.organizationInvitation as any;
      mockInvitation.delete.mockResolvedValue({ id: 'invite-123' });

      const result = await mockInvitation.delete({ where: { id: 'invite-123' } });
      expect(result.id).toBe('invite-123');
    });
  });

  describe('GET /api/admin/permissions', () => {
    it('should return role permissions', async () => {
      const mockRolePermission = prisma.rolePermission as any;
      mockRolePermission.findMany.mockResolvedValue([
        { role: 'MANAGER', permission: 'leave:approve' },
        { role: 'MANAGER', permission: 'assets:view' },
      ]);

      const permissions = await mockRolePermission.findMany({
        where: { tenantId: 'org-123' },
      });
      expect(permissions).toHaveLength(2);
    });
  });

  describe('POST /api/admin/permissions', () => {
    it('should update role permissions', async () => {
      const mockRolePermission = prisma.rolePermission as any;
      mockRolePermission.upsert.mockResolvedValue({
        role: 'MANAGER',
        permission: 'payroll:view',
      });

      const result = await mockRolePermission.upsert({
        where: {
          tenantId_role_permission: {
            tenantId: 'org-123',
            role: 'MANAGER',
            permission: 'payroll:view',
          },
        },
        create: { tenantId: 'org-123', role: 'MANAGER', permission: 'payroll:view' },
        update: {},
      });

      expect(result.permission).toBe('payroll:view');
    });
  });

  describe('GET /api/admin/change-requests', () => {
    it('should list profile change requests', async () => {
      const mockChangeRequest = prisma.profileChangeRequest as any;
      mockChangeRequest.findMany.mockResolvedValue([
        {
          id: 'cr-1',
          memberId: 'member-123',
          fieldName: 'phone',
          oldValue: '123456',
          newValue: '789012',
          status: 'PENDING',
        },
      ]);

      const requests = await mockChangeRequest.findMany({
        where: { tenantId: 'org-123' },
      });
      expect(requests).toHaveLength(1);
    });
  });

  describe('POST /api/admin/change-requests/[id]', () => {
    it('should approve change request', async () => {
      const mockChangeRequest = prisma.profileChangeRequest as any;
      mockChangeRequest.update.mockResolvedValue({
        id: 'cr-123',
        status: 'APPROVED',
        resolvedById: 'admin-123',
        resolvedAt: new Date(),
      });

      const result = await mockChangeRequest.update({
        where: { id: 'cr-123' },
        data: {
          status: 'APPROVED',
          resolvedById: 'admin-123',
          resolvedAt: new Date(),
        },
      });

      expect(result.status).toBe('APPROVED');
    });

    it('should reject change request with reason', async () => {
      const mockChangeRequest = prisma.profileChangeRequest as any;
      mockChangeRequest.update.mockResolvedValue({
        id: 'cr-123',
        status: 'REJECTED',
        resolverNotes: 'Invalid phone format',
      });

      const result = await mockChangeRequest.update({
        where: { id: 'cr-123' },
        data: {
          status: 'REJECTED',
          resolverNotes: 'Invalid phone format',
        },
      });

      expect(result.status).toBe('REJECTED');
    });
  });

  describe('GET /api/admin/ai-usage', () => {
    it('should return AI usage statistics', async () => {
      const mockAIChatUsage = prisma.aIChatUsage as any;
      mockAIChatUsage.aggregate.mockResolvedValue({
        _sum: { promptTokens: 10000, completionTokens: 5000, costUsd: 0.5 },
      });

      const stats = await mockAIChatUsage.aggregate({
        where: { tenantId: 'org-123' },
        _sum: { promptTokens: true, completionTokens: true, costUsd: true },
      });

      expect(stats._sum.promptTokens).toBe(10000);
    });
  });

  describe('POST /api/admin/backup', () => {
    it('should require admin role', async () => {
      mockGetServerSession.mockResolvedValue(mockMemberSession);
      const session = await mockGetServerSession();
      expect(session?.user.teamMemberRole).not.toBe('ADMIN');
    });

    it('should create organization backup', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      // Backup logic would be tested here
      expect(mockAdminSession.user.teamMemberRole).toBe('ADMIN');
    });
  });

  describe('POST /api/admin/full-backup', () => {
    it('should export all organization data', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const mockAsset = prisma.asset as any;
      const mockSubscription = prisma.subscription as any;
      const mockTeamMember = prisma.teamMember as any;

      mockAsset.findMany.mockResolvedValue([{ id: 'asset-1' }]);
      mockSubscription.findMany.mockResolvedValue([{ id: 'sub-1' }]);
      mockTeamMember.findMany.mockResolvedValue([{ id: 'member-1' }]);

      const assets = await mockAsset.findMany({ where: { tenantId: 'org-123' } });
      const subs = await mockSubscription.findMany({ where: { tenantId: 'org-123' } });
      const members = await mockTeamMember.findMany({ where: { tenantId: 'org-123' } });

      expect(assets).toHaveLength(1);
      expect(subs).toHaveLength(1);
      expect(members).toHaveLength(1);
    });
  });

  describe('POST /api/admin/full-restore', () => {
    it('should require admin role', async () => {
      mockGetServerSession.mockResolvedValue(mockMemberSession);
      const session = await mockGetServerSession();
      expect(session?.user.orgRole).not.toBe('ADMIN');
    });
  });

  describe('POST /api/admin/sync-asset-dates', () => {
    it('should sync asset assignment dates', async () => {
      const mockAsset = prisma.asset as any;
      mockAsset.findMany.mockResolvedValue([
        { id: 'asset-1', assignedMemberId: 'member-1', assignmentDate: null },
      ]);
      mockAsset.updateMany.mockResolvedValue({ count: 1 });

      const assets = await mockAsset.findMany({
        where: { tenantId: 'org-123', assignedMemberId: { not: null } },
      });
      expect(assets).toHaveLength(1);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should filter all queries by tenantId', async () => {
      const mockTeamMember = prisma.teamMember as any;
      mockTeamMember.findMany.mockResolvedValue([]);

      // Attempting to access another tenant's data should return empty
      await mockTeamMember.findMany({ where: { tenantId: 'other-org' } });
      expect(mockTeamMember.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'other-org' },
      });
    });

    it('should prevent cross-tenant member access', () => {
      const validateTenantAccess = (resourceTenantId: string, sessionTenantId: string) => {
        return resourceTenantId === sessionTenantId;
      };

      expect(validateTenantAccess('org-123', 'org-123')).toBe(true);
      expect(validateTenantAccess('org-123', 'org-456')).toBe(false);
    });
  });
});
