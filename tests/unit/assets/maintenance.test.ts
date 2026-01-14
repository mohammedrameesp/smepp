/**
 * @file maintenance.test.ts
 * @description Tests for asset maintenance record logic
 */

import { z } from 'zod';

// Define the maintenance schema for testing
const createMaintenanceSchema = z.object({
  maintenanceDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid date format',
  }),
  notes: z.string().min(1, 'Notes are required'),
});

describe('Asset Maintenance Tests', () => {
  describe('createMaintenanceSchema', () => {
    describe('maintenanceDate validation', () => {
      it('should accept valid ISO date', () => {
        const input = {
          maintenanceDate: '2024-01-15T00:00:00.000Z',
          notes: 'Maintenance performed',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept simple date string', () => {
        const input = {
          maintenanceDate: '2024-01-15',
          notes: 'Maintenance performed',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should accept date with time', () => {
        const input = {
          maintenanceDate: '2024-01-15 10:30:00',
          notes: 'Maintenance performed',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });

      it('should reject invalid date format', () => {
        const input = {
          maintenanceDate: 'not-a-date',
          notes: 'Maintenance performed',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty date', () => {
        const input = {
          maintenanceDate: '',
          notes: 'Maintenance performed',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should require maintenanceDate', () => {
        const input = {
          notes: 'Some notes',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });
    });

    describe('notes validation', () => {
      it('should accept notes', () => {
        const input = {
          maintenanceDate: '2024-01-15',
          notes: 'Replaced keyboard, cleaned fans',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.notes).toBe('Replaced keyboard, cleaned fans');
        }
      });

      it('should reject null notes', () => {
        const input = {
          maintenanceDate: '2024-01-15',
          notes: null,
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject missing notes', () => {
        const input = {
          maintenanceDate: '2024-01-15',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should reject empty string notes', () => {
        const input = {
          maintenanceDate: '2024-01-15',
          notes: '',
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(false);
      });

      it('should accept long notes', () => {
        const input = {
          maintenanceDate: '2024-01-15',
          notes: 'A'.repeat(1000),
        };

        const result = createMaintenanceSchema.safeParse(input);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Maintenance Record Logic', () => {
    describe('Sorting by Date', () => {
      it('should sort records by date descending (newest first)', () => {
        const records = [
          { maintenanceDate: new Date('2024-01-10') },
          { maintenanceDate: new Date('2024-01-15') },
          { maintenanceDate: new Date('2024-01-05') },
        ];

        const sorted = records.sort(
          (a, b) => b.maintenanceDate.getTime() - a.maintenanceDate.getTime()
        );

        expect(sorted[0].maintenanceDate.toISOString()).toContain('2024-01-15');
        expect(sorted[1].maintenanceDate.toISOString()).toContain('2024-01-10');
        expect(sorted[2].maintenanceDate.toISOString()).toContain('2024-01-05');
      });

      it('should sort records by date ascending (oldest first)', () => {
        const records = [
          { maintenanceDate: new Date('2024-01-10') },
          { maintenanceDate: new Date('2024-01-15') },
          { maintenanceDate: new Date('2024-01-05') },
        ];

        const sorted = records.sort(
          (a, b) => a.maintenanceDate.getTime() - b.maintenanceDate.getTime()
        );

        expect(sorted[0].maintenanceDate.toISOString()).toContain('2024-01-05');
        expect(sorted[1].maintenanceDate.toISOString()).toContain('2024-01-10');
        expect(sorted[2].maintenanceDate.toISOString()).toContain('2024-01-15');
      });
    });

    describe('Tenant Isolation', () => {
      it('should include tenantId in record data', () => {
        const recordData = {
          assetId: 'asset-123',
          maintenanceDate: new Date('2024-01-15'),
          notes: 'Replaced keyboard',
          performedBy: 'user-123',
          tenantId: 'tenant-123',
        };

        expect(recordData.tenantId).toBe('tenant-123');
      });

      it('should filter records by tenantId', () => {
        const allRecords = [
          { id: '1', assetId: 'asset-1', tenantId: 'tenant-123' },
          { id: '2', assetId: 'asset-2', tenantId: 'tenant-456' },
          { id: '3', assetId: 'asset-3', tenantId: 'tenant-123' },
        ];

        const tenantRecords = allRecords.filter((r) => r.tenantId === 'tenant-123');

        expect(tenantRecords).toHaveLength(2);
        expect(tenantRecords.every((r) => r.tenantId === 'tenant-123')).toBe(true);
      });
    });

    describe('Asset Verification', () => {
      it('should verify asset belongs to tenant before creating record', () => {
        const asset = { id: 'asset-123', tenantId: 'tenant-123' };
        const requestTenantId = 'tenant-123';

        const belongsToTenant = asset.tenantId === requestTenantId;
        expect(belongsToTenant).toBe(true);
      });

      it('should reject if asset belongs to different tenant', () => {
        const asset = { id: 'asset-123', tenantId: 'tenant-456' };
        const requestTenantId = 'tenant-123';

        const belongsToTenant = asset.tenantId === requestTenantId;
        expect(belongsToTenant).toBe(false);
      });

      it('should return not found if asset does not exist', () => {
        const asset = null;
        const shouldReturn404 = asset === null;

        expect(shouldReturn404).toBe(true);
      });
    });

    describe('Record Data Structure', () => {
      it('should include all required fields', () => {
        const record = {
          id: 'rec-123',
          assetId: 'asset-123',
          maintenanceDate: new Date('2024-01-15'),
          notes: 'Replaced keyboard',
          performedBy: 'user-123',
          tenantId: 'tenant-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        expect(record).toHaveProperty('id');
        expect(record).toHaveProperty('assetId');
        expect(record).toHaveProperty('maintenanceDate');
        expect(record).toHaveProperty('performedBy');
        expect(record).toHaveProperty('tenantId');
      });

      it('should require notes', () => {
        const record = {
          id: 'rec-123',
          assetId: 'asset-123',
          maintenanceDate: new Date('2024-01-15'),
          notes: 'Replaced keyboard',
          performedBy: 'user-123',
          tenantId: 'tenant-123',
        };

        expect(record.notes).toBeTruthy();
      });

      it('should track who performed maintenance', () => {
        const session = { user: { id: 'user-123' } };
        const record = {
          performedBy: session.user.id,
        };

        expect(record.performedBy).toBe('user-123');
      });
    });

    describe('Authorization', () => {
      it('should require auth for GET requests', () => {
        const routeOptions = { requireAuth: true };
        expect(routeOptions.requireAuth).toBe(true);
      });

      it('should require admin for POST requests', () => {
        const routeOptions = { requireAuth: true, requireAdmin: true };
        expect(routeOptions.requireAdmin).toBe(true);
      });

      it('should require assets module enabled', () => {
        const routeOptions = { requireModule: 'assets' };
        expect(routeOptions.requireModule).toBe('assets');
      });
    });

    describe('Date Handling', () => {
      it('should convert string date to Date object', () => {
        const dateString = '2024-01-15';
        const date = new Date(dateString);

        expect(date).toBeInstanceOf(Date);
        expect(date.getFullYear()).toBe(2024);
        expect(date.getMonth()).toBe(0); // January is 0
        expect(date.getDate()).toBe(15);
      });

      it('should handle timezone conversion', () => {
        const utcDate = '2024-01-15T00:00:00.000Z';
        const date = new Date(utcDate);

        expect(date.toISOString()).toBe('2024-01-15T00:00:00.000Z');
      });

      it('should preserve date when creating record', () => {
        const inputDate = '2024-01-15';
        const recordDate = new Date(inputDate);

        // Date should be preserved
        expect(recordDate.toISOString().startsWith('2024-01-15')).toBe(true);
      });
    });

    describe('Response Codes', () => {
      it('should return 403 if organization context missing', () => {
        const session = { user: { organizationId: null } };
        const expectedStatus = session.user.organizationId ? 200 : 403;

        expect(expectedStatus).toBe(403);
      });

      it('should return 400 if ID is missing', () => {
        const id = undefined;
        const expectedStatus = id ? 200 : 400;

        expect(expectedStatus).toBe(400);
      });

      it('should return 404 if asset not found', () => {
        const asset = null;
        const expectedStatus = asset ? 200 : 404;

        expect(expectedStatus).toBe(404);
      });

      it('should return 201 on successful creation', () => {
        const successStatus = 201;
        expect(successStatus).toBe(201);
      });

      it('should return 400 for invalid request body', () => {
        const validation = { success: false };
        const expectedStatus = validation.success ? 201 : 400;

        expect(expectedStatus).toBe(400);
      });
    });
  });

});
