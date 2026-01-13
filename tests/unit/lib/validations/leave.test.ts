/**
 * Tests for Leave Validation Schemas
 * @see src/lib/validations/leave.ts
 */

import {
  createLeaveTypeSchema,
  updateLeaveTypeSchema,
  createLeaveRequestSchema,
  updateLeaveRequestSchema,
  approveLeaveRequestSchema,
  rejectLeaveRequestSchema,
  cancelLeaveRequestSchema,
  updateLeaveBalanceSchema,
  initializeLeaveBalanceSchema,
  leaveRequestQuerySchema,
  leaveBalanceQuerySchema,
  teamCalendarQuerySchema,
  leaveTypeQuerySchema,
} from '@/features/leave/validations/leave';

describe('Leave Validation Schemas', () => {
  describe('createLeaveTypeSchema', () => {
    it('should validate a complete valid leave type', () => {
      const validLeaveType = {
        name: 'Annual Leave',
        description: 'Paid annual vacation leave',
        color: '#3B82F6',
        defaultDays: 30,
        requiresApproval: true,
        requiresDocument: false,
        isPaid: true,
        isActive: true,
        maxConsecutiveDays: 15,
        minNoticeDays: 7,
        allowCarryForward: true,
        maxCarryForwardDays: 5,
      };

      const result = createLeaveTypeSchema.safeParse(validLeaveType);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields with defaults', () => {
      const minimalLeaveType = {
        name: 'Sick Leave',
      };

      const result = createLeaveTypeSchema.safeParse(minimalLeaveType);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.color).toBe('#3B82F6');
        expect(result.data.defaultDays).toBe(0);
        expect(result.data.requiresApproval).toBe(true);
        expect(result.data.requiresDocument).toBe(false);
        expect(result.data.isPaid).toBe(true);
        expect(result.data.isActive).toBe(true);
        expect(result.data.minNoticeDays).toBe(0);
        expect(result.data.allowCarryForward).toBe(false);
      }
    });

    it('should fail when name is missing', () => {
      const invalidLeaveType = {
        defaultDays: 30,
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
      }
    });

    it('should fail when name is empty', () => {
      const invalidLeaveType = {
        name: '',
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
    });

    it('should fail when name exceeds 100 characters', () => {
      const invalidLeaveType = {
        name: 'A'.repeat(101),
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid color format', () => {
      const invalidLeaveType = {
        name: 'Test Leave',
        color: 'invalid-color',
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
    });

    it('should accept valid hex color codes', () => {
      const validColors = ['#3B82F6', '#FFFFFF', '#000000', '#abcdef'];

      validColors.forEach(color => {
        const result = createLeaveTypeSchema.safeParse({
          name: 'Test Leave',
          color,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail when defaultDays is negative', () => {
      const invalidLeaveType = {
        name: 'Test Leave',
        defaultDays: -5,
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
    });

    it('should fail when maxConsecutiveDays is less than 1', () => {
      const invalidLeaveType = {
        name: 'Test Leave',
        maxConsecutiveDays: 0,
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
    });

    it('should fail when allowCarryForward is true but maxCarryForwardDays is missing', () => {
      const invalidLeaveType = {
        name: 'Test Leave',
        allowCarryForward: true,
        maxCarryForwardDays: null,
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('maxCarryForwardDays'))).toBe(true);
      }
    });

    it('should accept null maxCarryForwardDays when allowCarryForward is false', () => {
      const validLeaveType = {
        name: 'Test Leave',
        allowCarryForward: false,
        maxCarryForwardDays: null,
      };

      const result = createLeaveTypeSchema.safeParse(validLeaveType);
      expect(result.success).toBe(true);
    });

    it('should accept description up to 500 characters', () => {
      const validLeaveType = {
        name: 'Test Leave',
        description: 'A'.repeat(500),
      };

      const result = createLeaveTypeSchema.safeParse(validLeaveType);
      expect(result.success).toBe(true);
    });

    it('should fail when description exceeds 500 characters', () => {
      const invalidLeaveType = {
        name: 'Test Leave',
        description: 'A'.repeat(501),
      };

      const result = createLeaveTypeSchema.safeParse(invalidLeaveType);
      expect(result.success).toBe(false);
    });
  });

  describe('updateLeaveTypeSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = updateLeaveTypeSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only color', () => {
      const colorUpdate = {
        color: '#FF0000',
      };

      const result = updateLeaveTypeSchema.safeParse(colorUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateLeaveTypeSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('createLeaveRequestSchema', () => {
    it('should validate a complete valid leave request', () => {
      const validRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        requestType: 'FULL_DAY',
        reason: 'Annual vacation',
        documentUrl: 'https://example.com/document.pdf',
        emergencyContact: 'John Doe',
        emergencyPhone: '+97412345678',
      };

      const result = createLeaveRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields', () => {
      const minimalRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-01',
        endDate: '2025-02-01',
      };

      const result = createLeaveRequestSchema.safeParse(minimalRequest);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requestType).toBe('FULL_DAY');
      }
    });

    it('should fail when leaveTypeId is missing', () => {
      const invalidRequest = {
        startDate: '2025-02-01',
        endDate: '2025-02-05',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail when startDate is missing', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        endDate: '2025-02-05',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail when endDate is missing', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-01',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail when endDate is before startDate', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-10',
        endDate: '2025-02-05',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('endDate'))).toBe(true);
      }
    });

    it('should pass when startDate equals endDate', () => {
      const validRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-05',
        endDate: '2025-02-05',
      };

      const result = createLeaveRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should fail when half-day request spans multiple days', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-01',
        endDate: '2025-02-05',
        requestType: 'HALF_DAY_AM',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should pass when half-day request is for single day', () => {
      const validRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-05',
        endDate: '2025-02-05',
        requestType: 'HALF_DAY_AM',
      };

      const result = createLeaveRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });

    it('should accept all request types', () => {
      const requestTypes = ['FULL_DAY', 'HALF_DAY_AM', 'HALF_DAY_PM'];

      requestTypes.forEach(requestType => {
        const result = createLeaveRequestSchema.safeParse({
          leaveTypeId: 'leave-type-123',
          startDate: '2025-02-05',
          endDate: '2025-02-05',
          requestType,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid request type', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-05',
        endDate: '2025-02-05',
        requestType: 'INVALID_TYPE',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail when reason exceeds 1000 characters', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-05',
        endDate: '2025-02-05',
        reason: 'A'.repeat(1001),
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid document URL', () => {
      const invalidRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-05',
        endDate: '2025-02-05',
        documentUrl: 'not-a-url',
      };

      const result = createLeaveRequestSchema.safeParse(invalidRequest);
      expect(result.success).toBe(false);
    });

    it('should accept null for optional fields', () => {
      const validRequest = {
        leaveTypeId: 'leave-type-123',
        startDate: '2025-02-05',
        endDate: '2025-02-05',
        reason: null,
        documentUrl: null,
        emergencyContact: null,
        emergencyPhone: null,
      };

      const result = createLeaveRequestSchema.safeParse(validRequest);
      expect(result.success).toBe(true);
    });
  });

  describe('updateLeaveRequestSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        reason: 'Updated reason',
      };

      const result = updateLeaveRequestSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating dates', () => {
      const dateUpdate = {
        startDate: '2025-02-10',
        endDate: '2025-02-15',
      };

      const result = updateLeaveRequestSchema.safeParse(dateUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateLeaveRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  describe('approveLeaveRequestSchema', () => {
    it('should validate with notes', () => {
      const approval = {
        notes: 'Approved as requested',
      };

      const result = approveLeaveRequestSchema.safeParse(approval);
      expect(result.success).toBe(true);
    });

    it('should validate without notes (empty object)', () => {
      const result = approveLeaveRequestSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate with null notes', () => {
      const approval = {
        notes: null,
      };

      const result = approveLeaveRequestSchema.safeParse(approval);
      expect(result.success).toBe(true);
    });

    it('should fail when notes exceed 500 characters', () => {
      const invalidApproval = {
        notes: 'A'.repeat(501),
      };

      const result = approveLeaveRequestSchema.safeParse(invalidApproval);
      expect(result.success).toBe(false);
    });
  });

  describe('rejectLeaveRequestSchema', () => {
    it('should validate with reason', () => {
      const rejection = {
        reason: 'Insufficient staff coverage during this period',
      };

      const result = rejectLeaveRequestSchema.safeParse(rejection);
      expect(result.success).toBe(true);
    });

    it('should fail when reason is missing', () => {
      const result = rejectLeaveRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should fail when reason is empty', () => {
      const rejection = {
        reason: '',
      };

      const result = rejectLeaveRequestSchema.safeParse(rejection);
      expect(result.success).toBe(false);
    });

    it('should fail when reason exceeds 500 characters', () => {
      const invalidRejection = {
        reason: 'A'.repeat(501),
      };

      const result = rejectLeaveRequestSchema.safeParse(invalidRejection);
      expect(result.success).toBe(false);
    });
  });

  describe('cancelLeaveRequestSchema', () => {
    it('should validate with reason', () => {
      const cancellation = {
        reason: 'Plans changed',
      };

      const result = cancelLeaveRequestSchema.safeParse(cancellation);
      expect(result.success).toBe(true);
    });

    it('should fail when reason is missing', () => {
      const result = cancelLeaveRequestSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should fail when reason is empty', () => {
      const cancellation = {
        reason: '',
      };

      const result = cancelLeaveRequestSchema.safeParse(cancellation);
      expect(result.success).toBe(false);
    });
  });

  describe('updateLeaveBalanceSchema', () => {
    it('should validate adjustment with notes', () => {
      const balanceUpdate = {
        adjustment: 5,
        adjustmentNotes: 'Additional days granted for service anniversary',
      };

      const result = updateLeaveBalanceSchema.safeParse(balanceUpdate);
      expect(result.success).toBe(true);
    });

    it('should accept negative adjustment', () => {
      const balanceUpdate = {
        adjustment: -3,
        adjustmentNotes: 'Correction for error',
      };

      const result = updateLeaveBalanceSchema.safeParse(balanceUpdate);
      expect(result.success).toBe(true);
    });

    it('should fail when adjustment is missing', () => {
      const invalidUpdate = {
        adjustmentNotes: 'Some notes',
      };

      const result = updateLeaveBalanceSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should fail when adjustmentNotes is missing', () => {
      const invalidUpdate = {
        adjustment: 5,
      };

      const result = updateLeaveBalanceSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should fail when adjustmentNotes is empty', () => {
      const invalidUpdate = {
        adjustment: 5,
        adjustmentNotes: '',
      };

      const result = updateLeaveBalanceSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should fail when adjustment exceeds 365', () => {
      const invalidUpdate = {
        adjustment: 366,
        adjustmentNotes: 'Too many days',
      };

      const result = updateLeaveBalanceSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should fail when negative adjustment exceeds -365', () => {
      const invalidUpdate = {
        adjustment: -366,
        adjustmentNotes: 'Too negative',
      };

      const result = updateLeaveBalanceSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('initializeLeaveBalanceSchema', () => {
    it('should validate complete balance initialization', () => {
      const balance = {
        memberId: 'member-123',
        leaveTypeId: 'leave-type-123',
        year: 2025,
        entitlement: 30,
        carriedForward: 5,
      };

      const result = initializeLeaveBalanceSchema.safeParse(balance);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields', () => {
      const balance = {
        memberId: 'member-123',
        leaveTypeId: 'leave-type-123',
        year: 2025,
      };

      const result = initializeLeaveBalanceSchema.safeParse(balance);
      expect(result.success).toBe(true);
    });

    it('should fail with year before 2000', () => {
      const invalidBalance = {
        memberId: 'member-123',
        leaveTypeId: 'leave-type-123',
        year: 1999,
      };

      const result = initializeLeaveBalanceSchema.safeParse(invalidBalance);
      expect(result.success).toBe(false);
    });

    it('should fail with year after 2100', () => {
      const invalidBalance = {
        memberId: 'member-123',
        leaveTypeId: 'leave-type-123',
        year: 2101,
      };

      const result = initializeLeaveBalanceSchema.safeParse(invalidBalance);
      expect(result.success).toBe(false);
    });

    it('should fail with negative entitlement', () => {
      const invalidBalance = {
        memberId: 'member-123',
        leaveTypeId: 'leave-type-123',
        year: 2025,
        entitlement: -5,
      };

      const result = initializeLeaveBalanceSchema.safeParse(invalidBalance);
      expect(result.success).toBe(false);
    });
  });

  describe('leaveRequestQuerySchema', () => {
    it('should validate empty query (use defaults)', () => {
      const result = leaveRequestQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(50);
        expect(result.data.sort).toBe('createdAt');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should validate search query with filters', () => {
      const query = {
        q: 'john',
        status: 'PENDING',
        userId: 'user-123',
        leaveTypeId: 'leave-type-123',
        year: 2025,
        startDate: '2025-01-01',
        endDate: '2025-12-31',
        p: 2,
        ps: 25,
        sort: 'startDate',
        order: 'asc',
      };

      const result = leaveRequestQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should coerce page and pageSize from strings', () => {
      const query = {
        p: '3',
        ps: '20',
      };

      const result = leaveRequestQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(3);
        expect(result.data.ps).toBe(20);
      }
    });

    it('should fail with invalid page number', () => {
      const query = {
        p: 0,
      };

      const result = leaveRequestQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should fail with page size over 100', () => {
      const query = {
        ps: 101,
      };

      const result = leaveRequestQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate all sort options', () => {
      const validSorts = ['requestNumber', 'startDate', 'endDate', 'totalDays', 'createdAt', 'status'];

      validSorts.forEach(sort => {
        const result = leaveRequestQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid sort option', () => {
      const query = {
        sort: 'invalidField',
      };

      const result = leaveRequestQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate all status options', () => {
      const validStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];

      validStatuses.forEach(status => {
        const result = leaveRequestQuerySchema.safeParse({ status });
        expect(result.success).toBe(true);
      });
    });
  });

  describe('leaveBalanceQuerySchema', () => {
    it('should validate empty query (use defaults)', () => {
      const result = leaveBalanceQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(50);
      }
    });

    it('should validate query with filters', () => {
      const query = {
        userId: 'user-123',
        leaveTypeId: 'leave-type-123',
        year: 2025,
        p: 2,
        ps: 25,
      };

      const result = leaveBalanceQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should coerce year from string', () => {
      const query = {
        year: '2025',
      };

      const result = leaveBalanceQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.year).toBe(2025);
      }
    });
  });

  describe('teamCalendarQuerySchema', () => {
    it('should validate complete query', () => {
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'APPROVED',
        leaveTypeId: 'leave-type-123',
      };

      const result = teamCalendarQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should fail when startDate is missing', () => {
      const query = {
        endDate: '2025-01-31',
      };

      const result = teamCalendarQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should fail when endDate is missing', () => {
      const query = {
        startDate: '2025-01-01',
      };

      const result = teamCalendarQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate without optional status and leaveTypeId', () => {
      const query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
      };

      const result = teamCalendarQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });
  });

  describe('leaveTypeQuerySchema', () => {
    it('should validate empty query', () => {
      const result = leaveTypeQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate isActive filter', () => {
      const query = {
        isActive: 'true',
      };

      const result = leaveTypeQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should validate includeInactive filter', () => {
      const query = {
        includeInactive: 'true',
      };

      const result = leaveTypeQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid isActive value', () => {
      const query = {
        isActive: 'yes',
      };

      const result = leaveTypeQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
