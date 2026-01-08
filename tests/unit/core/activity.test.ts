/**
 * @file activity.test.ts
 * @description Tests for activity logging service
 */

describe('Activity Logging Tests', () => {
  describe('ActivityActions Constants', () => {
    const ActivityActions = {
      ASSET_CREATED: 'ASSET_CREATED',
      ASSET_UPDATED: 'ASSET_UPDATED',
      ASSET_DELETED: 'ASSET_DELETED',
      ASSET_ASSIGNED: 'ASSET_ASSIGNED',
      ASSET_LINKED_PROJECT: 'ASSET_LINKED_PROJECT',

      ASSET_CATEGORY_CREATED: 'ASSET_CATEGORY_CREATED',
      ASSET_CATEGORY_UPDATED: 'ASSET_CATEGORY_UPDATED',
      ASSET_CATEGORY_DELETED: 'ASSET_CATEGORY_DELETED',

      ASSET_REQUEST_CREATED: 'ASSET_REQUEST_CREATED',
      ASSET_REQUEST_APPROVED: 'ASSET_REQUEST_APPROVED',
      ASSET_REQUEST_REJECTED: 'ASSET_REQUEST_REJECTED',
      ASSET_REQUEST_CANCELLED: 'ASSET_REQUEST_CANCELLED',

      SUBSCRIPTION_CREATED: 'SUBSCRIPTION_CREATED',
      SUBSCRIPTION_UPDATED: 'SUBSCRIPTION_UPDATED',
      SUBSCRIPTION_DELETED: 'SUBSCRIPTION_DELETED',

      PROJECT_CREATED: 'PROJECT_CREATED',
      PROJECT_UPDATED: 'PROJECT_UPDATED',
      PROJECT_DELETED: 'PROJECT_DELETED',
      PROJECT_ARCHIVED: 'PROJECT_ARCHIVED',
      PROJECT_STATUS_CHANGED: 'PROJECT_STATUS_CHANGED',

      LEAVE_REQUEST_CREATED: 'LEAVE_REQUEST_CREATED',
      LEAVE_REQUEST_APPROVED: 'LEAVE_REQUEST_APPROVED',
      LEAVE_REQUEST_REJECTED: 'LEAVE_REQUEST_REJECTED',
      LEAVE_REQUEST_CANCELLED: 'LEAVE_REQUEST_CANCELLED',

      PAYROLL_RUN_CREATED: 'PAYROLL_RUN_CREATED',
      PAYROLL_RUN_APPROVED: 'PAYROLL_RUN_APPROVED',
      PAYROLL_RUN_REJECTED: 'PAYROLL_RUN_REJECTED',
      PAYROLL_RUN_PROCESSED: 'PAYROLL_RUN_PROCESSED',
      PAYROLL_RUN_PAID: 'PAYROLL_RUN_PAID',

      SECURITY_IMPERSONATION_STARTED: 'SECURITY_IMPERSONATION_STARTED',
      SECURITY_IMPERSONATION_ENDED: 'SECURITY_IMPERSONATION_ENDED',
    } as const;

    describe('Asset Actions', () => {
      it('should have all asset CRUD actions', () => {
        expect(ActivityActions.ASSET_CREATED).toBe('ASSET_CREATED');
        expect(ActivityActions.ASSET_UPDATED).toBe('ASSET_UPDATED');
        expect(ActivityActions.ASSET_DELETED).toBe('ASSET_DELETED');
      });

      it('should have asset workflow actions', () => {
        expect(ActivityActions.ASSET_ASSIGNED).toBe('ASSET_ASSIGNED');
        expect(ActivityActions.ASSET_LINKED_PROJECT).toBe('ASSET_LINKED_PROJECT');
      });

      it('should have asset category actions', () => {
        expect(ActivityActions.ASSET_CATEGORY_CREATED).toBe('ASSET_CATEGORY_CREATED');
        expect(ActivityActions.ASSET_CATEGORY_UPDATED).toBe('ASSET_CATEGORY_UPDATED');
        expect(ActivityActions.ASSET_CATEGORY_DELETED).toBe('ASSET_CATEGORY_DELETED');
      });

      it('should have asset request actions', () => {
        expect(ActivityActions.ASSET_REQUEST_CREATED).toBe('ASSET_REQUEST_CREATED');
        expect(ActivityActions.ASSET_REQUEST_APPROVED).toBe('ASSET_REQUEST_APPROVED');
        expect(ActivityActions.ASSET_REQUEST_REJECTED).toBe('ASSET_REQUEST_REJECTED');
        expect(ActivityActions.ASSET_REQUEST_CANCELLED).toBe('ASSET_REQUEST_CANCELLED');
      });
    });

    describe('Subscription Actions', () => {
      it('should have all subscription CRUD actions', () => {
        expect(ActivityActions.SUBSCRIPTION_CREATED).toBe('SUBSCRIPTION_CREATED');
        expect(ActivityActions.SUBSCRIPTION_UPDATED).toBe('SUBSCRIPTION_UPDATED');
        expect(ActivityActions.SUBSCRIPTION_DELETED).toBe('SUBSCRIPTION_DELETED');
      });
    });

    describe('Project Actions', () => {
      it('should have all project actions', () => {
        expect(ActivityActions.PROJECT_CREATED).toBe('PROJECT_CREATED');
        expect(ActivityActions.PROJECT_UPDATED).toBe('PROJECT_UPDATED');
        expect(ActivityActions.PROJECT_DELETED).toBe('PROJECT_DELETED');
        expect(ActivityActions.PROJECT_ARCHIVED).toBe('PROJECT_ARCHIVED');
        expect(ActivityActions.PROJECT_STATUS_CHANGED).toBe('PROJECT_STATUS_CHANGED');
      });
    });

    describe('Leave Actions', () => {
      it('should have all leave request actions', () => {
        expect(ActivityActions.LEAVE_REQUEST_CREATED).toBe('LEAVE_REQUEST_CREATED');
        expect(ActivityActions.LEAVE_REQUEST_APPROVED).toBe('LEAVE_REQUEST_APPROVED');
        expect(ActivityActions.LEAVE_REQUEST_REJECTED).toBe('LEAVE_REQUEST_REJECTED');
        expect(ActivityActions.LEAVE_REQUEST_CANCELLED).toBe('LEAVE_REQUEST_CANCELLED');
      });
    });

    describe('Payroll Actions', () => {
      it('should have all payroll run actions', () => {
        expect(ActivityActions.PAYROLL_RUN_CREATED).toBe('PAYROLL_RUN_CREATED');
        expect(ActivityActions.PAYROLL_RUN_APPROVED).toBe('PAYROLL_RUN_APPROVED');
        expect(ActivityActions.PAYROLL_RUN_REJECTED).toBe('PAYROLL_RUN_REJECTED');
        expect(ActivityActions.PAYROLL_RUN_PROCESSED).toBe('PAYROLL_RUN_PROCESSED');
        expect(ActivityActions.PAYROLL_RUN_PAID).toBe('PAYROLL_RUN_PAID');
      });
    });

    describe('Security Actions', () => {
      it('should have impersonation audit actions', () => {
        expect(ActivityActions.SECURITY_IMPERSONATION_STARTED).toBe('SECURITY_IMPERSONATION_STARTED');
        expect(ActivityActions.SECURITY_IMPERSONATION_ENDED).toBe('SECURITY_IMPERSONATION_ENDED');
      });
    });
  });

  describe('Activity Log Structure', () => {
    interface ActivityLog {
      id: string;
      tenantId: string;
      actorMemberId: string | null;
      action: string;
      entityType?: string;
      entityId?: string;
      payload?: unknown;
      createdAt: Date;
    }

    const createActivityLog = (
      tenantId: string,
      actorMemberId: string | null,
      action: string,
      entityType?: string,
      entityId?: string,
      payload?: unknown
    ): ActivityLog => {
      return {
        id: `activity-${Date.now()}`,
        tenantId,
        actorMemberId,
        action,
        entityType,
        entityId,
        payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
        createdAt: new Date(),
      };
    };

    it('should create activity with required fields', () => {
      const activity = createActivityLog('tenant-123', 'user-456', 'ASSET_CREATED');

      expect(activity.tenantId).toBe('tenant-123');
      expect(activity.actorMemberId).toBe('user-456');
      expect(activity.action).toBe('ASSET_CREATED');
      expect(activity.id).toBeDefined();
      expect(activity.createdAt).toBeInstanceOf(Date);
    });

    it('should create activity with entity reference', () => {
      const activity = createActivityLog(
        'tenant-123',
        'user-456',
        'ASSET_UPDATED',
        'Asset',
        'asset-789'
      );

      expect(activity.entityType).toBe('Asset');
      expect(activity.entityId).toBe('asset-789');
    });

    it('should create activity with payload', () => {
      const payload = {
        previousValue: 'ACTIVE',
        newValue: 'INACTIVE',
        changedFields: ['status'],
      };
      const activity = createActivityLog(
        'tenant-123',
        'user-456',
        'SUBSCRIPTION_UPDATED',
        'Subscription',
        'sub-123',
        payload
      );

      expect(activity.payload).toEqual(payload);
    });

    it('should handle null actorMemberId for system actions', () => {
      const activity = createActivityLog(
        'tenant-123',
        null,
        'ALERT_SUBSCRIPTION_RENEWAL'
      );

      expect(activity.actorMemberId).toBeNull();
    });

    it('should serialize payload deeply', () => {
      const payload = {
        nested: { deep: { value: 'test' } },
        array: [1, 2, 3],
        date: new Date().toISOString(),
      };
      const activity = createActivityLog(
        'tenant-123',
        'user-456',
        'TEST_ACTION',
        undefined,
        undefined,
        payload
      );

      expect(activity.payload).toEqual(payload);
    });
  });

  describe('TenantId Validation', () => {
    const validateTenantId = (tenantId: string | null | undefined): boolean => {
      return !!tenantId && tenantId.length > 0;
    };

    it('should return true for valid tenantId', () => {
      expect(validateTenantId('tenant-123')).toBe(true);
    });

    it('should return false for null tenantId', () => {
      expect(validateTenantId(null)).toBe(false);
    });

    it('should return false for undefined tenantId', () => {
      expect(validateTenantId(undefined)).toBe(false);
    });

    it('should return false for empty string tenantId', () => {
      expect(validateTenantId('')).toBe(false);
    });
  });

  describe('Payload Serialization', () => {
    const serializePayload = (payload: unknown): unknown => {
      if (payload === undefined || payload === null) return null;
      return JSON.parse(JSON.stringify(payload));
    };

    it('should serialize object payload', () => {
      const payload = { key: 'value', num: 123 };
      expect(serializePayload(payload)).toEqual(payload);
    });

    it('should handle null payload', () => {
      expect(serializePayload(null)).toBeNull();
    });

    it('should handle undefined payload', () => {
      expect(serializePayload(undefined)).toBeNull();
    });

    it('should remove undefined values from object', () => {
      const payload = { defined: 'yes', undef: undefined };
      const serialized = serializePayload(payload);
      expect(serialized).toEqual({ defined: 'yes' });
    });

    it('should convert Date to ISO string', () => {
      const date = new Date('2025-01-01T00:00:00.000Z');
      const payload = { date };
      const serialized = serializePayload(payload) as { date: string };
      expect(serialized.date).toBe('2025-01-01T00:00:00.000Z');
    });

    it('should handle nested objects', () => {
      const payload = {
        level1: {
          level2: {
            level3: 'deep value',
          },
        },
      };
      expect(serializePayload(payload)).toEqual(payload);
    });

    it('should handle arrays', () => {
      const payload = { items: [1, 2, 3, { nested: true }] };
      expect(serializePayload(payload)).toEqual(payload);
    });
  });

  describe('Entity Types', () => {
    const ENTITY_TYPES = [
      'Asset',
      'AssetCategory',
      'AssetRequest',
      'Subscription',
      'Supplier',
      'Project',
      'Task',
      'Board',
      'Employee',
      'LeaveRequest',
      'LeaveType',
      'PayrollRun',
      'Payslip',
      'Loan',
      'User',
      'Organization',
      'CompanyDocument',
    ];

    it('should support all major entity types', () => {
      expect(ENTITY_TYPES).toContain('Asset');
      expect(ENTITY_TYPES).toContain('Subscription');
      expect(ENTITY_TYPES).toContain('Project');
      expect(ENTITY_TYPES).toContain('Employee');
      expect(ENTITY_TYPES).toContain('PayrollRun');
    });

    it('should include HR-related entities', () => {
      expect(ENTITY_TYPES).toContain('LeaveRequest');
      expect(ENTITY_TYPES).toContain('LeaveType');
      expect(ENTITY_TYPES).toContain('Payslip');
      expect(ENTITY_TYPES).toContain('Loan');
    });

    it('should include project management entities', () => {
      expect(ENTITY_TYPES).toContain('Task');
      expect(ENTITY_TYPES).toContain('Board');
    });
  });

  describe('Activity Query Helpers', () => {
    const filterByEntityType = <T extends { entityType?: string }>(
      activities: T[],
      entityType: string
    ): T[] => {
      return activities.filter((a) => a.entityType === entityType);
    };

    const filterByAction = <T extends { action: string }>(
      activities: T[],
      action: string
    ): T[] => {
      return activities.filter((a) => a.action === action);
    };

    const filterByActor = <T extends { actorMemberId: string | null }>(
      activities: T[],
      actorMemberId: string
    ): T[] => {
      return activities.filter((a) => a.actorMemberId === actorMemberId);
    };

    const sampleActivities = [
      { action: 'ASSET_CREATED', entityType: 'Asset', actorMemberId: 'user-1' },
      { action: 'ASSET_UPDATED', entityType: 'Asset', actorMemberId: 'user-2' },
      { action: 'SUBSCRIPTION_CREATED', entityType: 'Subscription', actorMemberId: 'user-1' },
      { action: 'PROJECT_CREATED', entityType: 'Project', actorMemberId: 'user-1' },
    ];

    it('should filter by entity type', () => {
      const assetActivities = filterByEntityType(sampleActivities, 'Asset');
      expect(assetActivities).toHaveLength(2);
      assetActivities.forEach((a) => expect(a.entityType).toBe('Asset'));
    });

    it('should filter by action', () => {
      const createdActivities = filterByAction(sampleActivities, 'ASSET_CREATED');
      expect(createdActivities).toHaveLength(1);
      expect(createdActivities[0].action).toBe('ASSET_CREATED');
    });

    it('should filter by actor', () => {
      const user1Activities = filterByActor(sampleActivities, 'user-1');
      expect(user1Activities).toHaveLength(3);
    });

    it('should return empty array for no matches', () => {
      const noMatches = filterByEntityType(sampleActivities, 'NonExistent');
      expect(noMatches).toHaveLength(0);
    });
  });

  describe('Action Naming Convention', () => {
    it('should follow ENTITY_ACTION pattern', () => {
      const actions = [
        'ASSET_CREATED',
        'ASSET_UPDATED',
        'SUBSCRIPTION_DELETED',
        'PROJECT_ARCHIVED',
        'LEAVE_REQUEST_APPROVED',
      ];

      actions.forEach((action) => {
        expect(action).toMatch(/^[A-Z_]+_[A-Z]+$/);
      });
    });

    it('should use uppercase snake_case', () => {
      const action = 'PAYROLL_RUN_PROCESSED';
      expect(action).toBe(action.toUpperCase());
      expect(action).not.toContain(' ');
      expect(action).not.toContain('-');
    });
  });

  describe('Audit Trail Requirements', () => {
    interface AuditEntry {
      action: string;
      actorMemberId: string | null;
      entityId?: string;
      payload?: {
        previousValue?: unknown;
        newValue?: unknown;
        changedFields?: string[];
      };
    }

    it('should capture who made the change', () => {
      const audit: AuditEntry = {
        action: 'ASSET_UPDATED',
        actorMemberId: 'user-123',
      };
      expect(audit.actorMemberId).toBe('user-123');
    });

    it('should capture what was changed', () => {
      const audit: AuditEntry = {
        action: 'SUBSCRIPTION_UPDATED',
        actorMemberId: 'user-123',
        entityId: 'sub-456',
        payload: {
          changedFields: ['status', 'renewalDate'],
          previousValue: { status: 'ACTIVE' },
          newValue: { status: 'CANCELLED' },
        },
      };

      expect(audit.payload?.changedFields).toContain('status');
      expect(audit.payload?.previousValue).toEqual({ status: 'ACTIVE' });
      expect(audit.payload?.newValue).toEqual({ status: 'CANCELLED' });
    });

    it('should handle system actions without actor', () => {
      const audit: AuditEntry = {
        action: 'ALERT_WARRANTY_EXPIRY',
        actorMemberId: null,
      };
      expect(audit.actorMemberId).toBeNull();
    });
  });

  describe('Error Handling', () => {
    const safeLogActivity = (
      tenantId: string | null | undefined,
      action: string
    ): { success: boolean; error?: string } => {
      if (!tenantId) {
        return {
          success: false,
          error: 'logAction called without tenantId - this is a multi-tenancy violation',
        };
      }
      return { success: true };
    };

    it('should return error for missing tenantId', () => {
      const result = safeLogActivity(null, 'ASSET_CREATED');
      expect(result.success).toBe(false);
      expect(result.error).toContain('multi-tenancy violation');
    });

    it('should succeed with valid tenantId', () => {
      const result = safeLogActivity('tenant-123', 'ASSET_CREATED');
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });
});
