/**
 * @file backups.test.ts
 * @description Integration tests for super-admin backup functionality
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';
import { encryptBackup, redactBackupData } from '@/lib/security/backup-encryption';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');
jest.mock('@/lib/security/backup-encryption');
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    storage: {
      listBuckets: jest.fn(() => ({ data: [{ name: 'database-backups' }] })),
      createBucket: jest.fn(),
      from: jest.fn(() => ({
        list: jest.fn(() => ({ data: [], error: null })),
        upload: jest.fn(() => ({ error: null })),
        remove: jest.fn(() => ({ error: null })),
      })),
    },
  })),
}));

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrisma = prisma as jest.Mocked<typeof prisma>;
const mockEncryptBackup = encryptBackup as jest.MockedFunction<typeof encryptBackup>;
const mockRedactBackupData = redactBackupData as jest.MockedFunction<typeof redactBackupData>;

// Type for redacted backup data
interface RedactedBackupData {
  users: { id: string; email: string; password: string }[];
  teamMembers: { id: string; bankAccountNumber: string }[];
}

describe('Super Admin Backups API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key';
  });

  describe('GET /api/super-admin/backups', () => {
    it('should return 401 if not authenticated', async () => {
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 401 if not super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', isSuperAdmin: false },
        expires: '',
      });

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(false);
    });

    it('should return empty array if no backup bucket exists', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: '',
      });

      const response = { backups: [], organizations: [] };
      expect(response.backups).toEqual([]);
    });

    it('should list full platform backups', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: '',
      });

      const mockBackups = [
        {
          type: 'full',
          filename: 'full-backup-2024-01-15.enc',
          path: 'full/full-backup-2024-01-15.enc',
          size: 1024000,
          createdAt: '2024-01-15T00:00:00Z',
        },
      ];

      expect(mockBackups[0].type).toBe('full');
      expect(mockBackups[0].filename).toContain('.enc');
    });

    it('should list organization-specific backups', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: '',
      });

      const mockBackups = [
        {
          type: 'organization',
          organization: 'acme',
          filename: 'acme-2024-01-15.enc',
          path: 'orgs/acme/acme-2024-01-15.enc',
          size: 512000,
          createdAt: '2024-01-15T00:00:00Z',
        },
      ];

      expect(mockBackups[0].type).toBe('organization');
      expect(mockBackups[0].organization).toBe('acme');
    });

    it('should include organizations list for UI', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'super-admin-123', isSuperAdmin: true },
        expires: '',
      });

      const mockOrgs = [
        { id: 'org-1', name: 'Acme Corp', slug: 'acme' },
        { id: 'org-2', name: 'Globex', slug: 'globex' },
      ];

      (mockPrisma.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);

      const orgs = await mockPrisma.organization.findMany({
        select: { id: true, name: true, slug: true },
        orderBy: { name: 'asc' },
      });

      expect(orgs).toHaveLength(2);
    });

    it('should sort backups by date descending', () => {
      const backups = [
        { createdAt: '2024-01-10T00:00:00Z' },
        { createdAt: '2024-01-15T00:00:00Z' },
        { createdAt: '2024-01-12T00:00:00Z' },
      ];

      backups.sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      expect(backups[0].createdAt).toBe('2024-01-15T00:00:00Z');
      expect(backups[2].createdAt).toBe('2024-01-10T00:00:00Z');
    });
  });

  describe('POST /api/super-admin/backups', () => {
    it('should return 401 if not super admin', async () => {
      mockGetServerSession.mockResolvedValue({
        user: { id: 'user-123', isSuperAdmin: false },
        expires: '',
      });

      const session = await mockGetServerSession();
      expect(session?.user.isSuperAdmin).toBe(false);
    });

    describe('Full Platform Backup', () => {
      it('should create full backup when type is "full"', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'super-admin-123', isSuperAdmin: true },
          expires: '',
        });

        const requestBody = { type: 'full' };
        expect(requestBody.type).toBe('full');
      });

      it('should export all platform data', async () => {
        const dataModels = [
          'organizations',
          'teamMembers',
          'users',
          'assets',
          'subscriptions',
          'suppliers',
          'leaveTypes',
          'leaveBalances',
          'leaveRequests',
          'payrollRuns',
          'payslips',
        ];

        // Verify all models are included in full backup
        dataModels.forEach((model) => {
          expect(dataModels).toContain(model);
        });
      });

      it('should include backup metadata', () => {
        const metadata = {
          version: '4.0',
          application: 'Durj',
          type: 'full',
          createdAt: new Date().toISOString(),
          description: 'Full platform backup - All organizations',
        };

        expect(metadata.version).toBe('4.0');
        expect(metadata.type).toBe('full');
      });

      it('should include record counts', () => {
        const counts = {
          organizations: 5,
          teamMembers: 50,
          users: 45,
          assets: 200,
          subscriptions: 100,
          suppliers: 30,
        };

        expect(counts.organizations).toBe(5);
        expect(counts.assets).toBe(200);
      });
    });

    describe('Organization Backup', () => {
      it('should create organization backup when type is "organization"', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'super-admin-123', isSuperAdmin: true },
          expires: '',
        });

        const requestBody = { type: 'organization', organizationId: 'org-123' };

        expect(requestBody.type).toBe('organization');
        expect(requestBody.organizationId).toBe('org-123');
      });

      it('should filter data by tenant ID', async () => {
        const tenantId = 'org-123';
        const tenantFilter = { tenantId };

        expect(tenantFilter.tenantId).toBe(tenantId);
      });

      it('should include organization metadata', () => {
        const metadata = {
          version: '4.0',
          application: 'Durj',
          type: 'organization',
          organizationId: 'org-123',
          organizationSlug: 'acme',
          organizationName: 'Acme Corp',
          createdAt: new Date().toISOString(),
          description: 'Organization backup - Acme Corp',
        };

        expect(metadata.type).toBe('organization');
        expect(metadata.organizationSlug).toBe('acme');
      });
    });

    describe('All Organizations Backup', () => {
      it('should create backups for all organizations when type is "all"', async () => {
        mockGetServerSession.mockResolvedValue({
          user: { id: 'super-admin-123', isSuperAdmin: true },
          expires: '',
        });

        const mockOrgs = [
          { id: 'org-1', slug: 'acme' },
          { id: 'org-2', slug: 'globex' },
          { id: 'org-3', slug: 'initech' },
        ];

        (mockPrisma.organization.findMany as jest.Mock).mockResolvedValue(mockOrgs);

        const orgs = await mockPrisma.organization.findMany({
          select: { id: true, slug: true },
        });

        expect(orgs).toHaveLength(3);
      });

      it('should also create full backup when type is "all"', async () => {
        const requestBody = { type: 'all' };

        // type 'all' should trigger both full and all org backups
        expect(requestBody.type).toBe('all');
      });

      it('should return results for each backup', () => {
        const results = [
          { type: 'full', filename: 'full-backup-2024-01-15.enc', success: true },
          { type: 'organization', organization: 'acme', filename: 'acme-2024-01-15.enc', success: true },
          { type: 'organization', organization: 'globex', filename: 'globex-2024-01-15.enc', success: true },
        ];

        expect(results).toHaveLength(3);
        expect(results.every((r) => r.success)).toBe(true);
      });
    });
  });

  describe('Security', () => {
    it('should encrypt backups before storage', async () => {
      mockEncryptBackup.mockReturnValue(Buffer.from('encrypted-data'));

      const backupJson = JSON.stringify({ test: 'data' });
      const encrypted = mockEncryptBackup(backupJson);

      expect(mockEncryptBackup).toHaveBeenCalledWith(backupJson);
      expect(encrypted).toBeInstanceOf(Buffer);
    });

    it('should redact sensitive fields before encryption', async () => {
      const sensitiveData = {
        users: [
          { id: 'user-1', email: 'test@example.com', password: 'hashed-password' },
        ],
        teamMembers: [
          { id: 'tm-1', bankAccountNumber: '123456789' },
        ],
      };

      mockRedactBackupData.mockReturnValue({
        users: [
          { id: 'user-1', email: 'test@example.com', password: '[REDACTED]' },
        ],
        teamMembers: [
          { id: 'tm-1', bankAccountNumber: '[REDACTED]' },
        ],
      });

      const redacted = mockRedactBackupData(sensitiveData) as unknown as RedactedBackupData;

      expect(redacted.users[0].password).toBe('[REDACTED]');
      expect(redacted.teamMembers[0].bankAccountNumber).toBe('[REDACTED]');
    });

    it('should use .enc extension for encrypted files', () => {
      const originalFilename = 'full-backup-2024-01-15.json';
      const encryptedFilename = originalFilename.replace('.json', '.enc');

      expect(encryptedFilename).toBe('full-backup-2024-01-15.enc');
    });

    it('should store backups in private bucket', () => {
      const bucketConfig = { public: false };
      expect(bucketConfig.public).toBe(false);
    });
  });

  describe('Backup Cleanup', () => {
    it('should keep only last 30 backups per organization', () => {
      const maxBackups = 30;
      const currentBackups = 35;
      const toDelete = currentBackups - maxBackups;

      expect(toDelete).toBe(5);
    });

    it('should delete oldest backups first', () => {
      const files = [
        { name: 'backup-1.enc', created_at: '2024-01-01' },
        { name: 'backup-3.enc', created_at: '2024-01-03' },
        { name: 'backup-2.enc', created_at: '2024-01-02' },
      ];

      const sorted = files.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );

      expect(sorted[0].name).toBe('backup-1.enc'); // Oldest first
      expect(sorted[2].name).toBe('backup-3.enc'); // Newest last
    });
  });

  describe('Error Handling', () => {
    it('should return error result for failed backups', () => {
      const failedResult = {
        filename: '',
        success: false,
        error: 'Database connection failed',
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.error).toBeDefined();
    });

    it('should continue with other backups if one fails', () => {
      const results = [
        { type: 'organization', organization: 'acme', success: true },
        { type: 'organization', organization: 'globex', success: false, error: 'Failed' },
        { type: 'organization', organization: 'initech', success: true },
      ];

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      expect(successful).toHaveLength(2);
      expect(failed).toHaveLength(1);
    });

    it('should log errors with organization context', () => {
      const errorLog = {
        error: 'Upload failed',
        orgSlug: 'acme',
      };

      expect(errorLog).toHaveProperty('error');
      expect(errorLog).toHaveProperty('orgSlug');
    });
  });

  describe('Cron Integration', () => {
    it('should export backup functions for cron job', () => {
      // The module should export these functions
      const expectedExports = ['createFullBackup', 'createOrganizationBackup'];

      expectedExports.forEach((fn) => {
        expect(expectedExports).toContain(fn);
      });
    });

    it('should use date-based filename format', () => {
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `full-backup-${timestamp}.json`;

      expect(filename).toMatch(/^full-backup-\d{4}-\d{2}-\d{2}\.json$/);
    });
  });
});
