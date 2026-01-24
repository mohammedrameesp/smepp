/**
 * Workflow Schemas Unit Tests
 * Tests for workflow validation schemas (approval, rejection, cancellation, etc.)
 */

import {
  approvalSchema,
  rejectionSchema,
  cancellationSchema,
  statusChangeSchema,
  assignmentSchema,
  commentSchema,
  returnSchema,
  createStatusTransitionSchema,
  validateStatusTransition,
} from '@/lib/validations/workflow-schemas';

describe('WorkflowSchemas', () => {
  describe('approvalSchema', () => {
    it('should accept valid approval without notes', () => {
      const result = approvalSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept valid approval with notes', () => {
      const result = approvalSchema.safeParse({ notes: 'Approved as requested' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe('Approved as requested');
      }
    });

    it('should accept empty notes', () => {
      const result = approvalSchema.safeParse({ notes: '' });
      expect(result.success).toBe(true);
    });

    it('should accept notes at exactly 500 characters', () => {
      const notes = 'a'.repeat(500);
      const result = approvalSchema.safeParse({ notes });
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding 500 characters', () => {
      const notes = 'a'.repeat(501);
      const result = approvalSchema.safeParse({ notes });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters');
      }
    });

    it('should ignore extra fields', () => {
      const result = approvalSchema.safeParse({ notes: 'Test', extraField: 'ignored' });
      expect(result.success).toBe(true);
    });
  });

  describe('rejectionSchema', () => {
    it('should accept valid rejection with reason', () => {
      const result = rejectionSchema.safeParse({ reason: 'Budget constraints' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Budget constraints');
      }
    });

    it('should reject missing reason', () => {
      const result = rejectionSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = rejectionSchema.safeParse({ reason: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should accept reason at exactly 500 characters', () => {
      const reason = 'a'.repeat(500);
      const result = rejectionSchema.safeParse({ reason });
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding 500 characters', () => {
      const reason = 'a'.repeat(501);
      const result = rejectionSchema.safeParse({ reason });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('500 characters');
      }
    });

    it('should accept single character reason', () => {
      const result = rejectionSchema.safeParse({ reason: 'X' });
      expect(result.success).toBe(true);
    });
  });

  describe('cancellationSchema', () => {
    it('should accept cancellation without reason', () => {
      const result = cancellationSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept cancellation with reason', () => {
      const result = cancellationSchema.safeParse({ reason: 'Plans changed' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Plans changed');
      }
    });

    it('should accept empty reason', () => {
      const result = cancellationSchema.safeParse({ reason: '' });
      expect(result.success).toBe(true);
    });

    it('should reject reason exceeding 500 characters', () => {
      const reason = 'a'.repeat(501);
      const result = cancellationSchema.safeParse({ reason });
      expect(result.success).toBe(false);
    });
  });

  describe('statusChangeSchema', () => {
    it('should accept valid status change', () => {
      const result = statusChangeSchema.safeParse({ status: 'APPROVED' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('APPROVED');
      }
    });

    it('should accept status change with notes', () => {
      const result = statusChangeSchema.safeParse({
        status: 'COMPLETED',
        notes: 'Task finished early',
      });
      expect(result.success).toBe(true);
    });

    it('should accept status change with effective date', () => {
      const result = statusChangeSchema.safeParse({
        status: 'ACTIVE',
        effectiveDate: '2024-01-15',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.effectiveDate).toBeInstanceOf(Date);
      }
    });

    it('should reject missing status', () => {
      const result = statusChangeSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty status', () => {
      const result = statusChangeSchema.safeParse({ status: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should coerce date strings to Date objects', () => {
      const result = statusChangeSchema.safeParse({
        status: 'ACTIVE',
        effectiveDate: '2024-06-15T10:30:00Z',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.effectiveDate).toBeInstanceOf(Date);
        expect(result.data.effectiveDate?.toISOString()).toContain('2024-06-15');
      }
    });

    it('should reject notes exceeding 500 characters', () => {
      const result = statusChangeSchema.safeParse({
        status: 'ACTIVE',
        notes: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('assignmentSchema', () => {
    it('should accept valid assignment', () => {
      const result = assignmentSchema.safeParse({ assigneeId: 'user-123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBe('user-123');
        expect(result.data.notifyAssignee).toBe(true); // Default value
      }
    });

    it('should accept assignment with all fields', () => {
      const result = assignmentSchema.safeParse({
        assigneeId: 'user-456',
        notes: 'Please review urgently',
        notifyAssignee: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assigneeId).toBe('user-456');
        expect(result.data.notes).toBe('Please review urgently');
        expect(result.data.notifyAssignee).toBe(false);
      }
    });

    it('should reject missing assigneeId', () => {
      const result = assignmentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty assigneeId', () => {
      const result = assignmentSchema.safeParse({ assigneeId: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should default notifyAssignee to true', () => {
      const result = assignmentSchema.safeParse({ assigneeId: 'user-123' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notifyAssignee).toBe(true);
      }
    });

    it('should reject notes exceeding 500 characters', () => {
      const result = assignmentSchema.safeParse({
        assigneeId: 'user-123',
        notes: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('commentSchema', () => {
    it('should accept valid comment', () => {
      const result = commentSchema.safeParse({ content: 'This looks good!' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.content).toBe('This looks good!');
        expect(result.data.isInternal).toBe(false); // Default value
      }
    });

    it('should accept internal comment', () => {
      const result = commentSchema.safeParse({
        content: 'Internal note for team',
        isInternal: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isInternal).toBe(true);
      }
    });

    it('should reject missing content', () => {
      const result = commentSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty content', () => {
      const result = commentSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('empty');
      }
    });

    it('should accept content at exactly 2000 characters', () => {
      const content = 'a'.repeat(2000);
      const result = commentSchema.safeParse({ content });
      expect(result.success).toBe(true);
    });

    it('should reject content exceeding 2000 characters', () => {
      const content = 'a'.repeat(2001);
      const result = commentSchema.safeParse({ content });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2000 characters');
      }
    });

    it('should default isInternal to false', () => {
      const result = commentSchema.safeParse({ content: 'Public comment' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isInternal).toBe(false);
      }
    });
  });

  describe('returnSchema', () => {
    it('should accept valid return with reason', () => {
      const result = returnSchema.safeParse({ reason: 'Missing documentation' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reason).toBe('Missing documentation');
        expect(result.data.requiresCorrection).toBe(true); // Default value
      }
    });

    it('should accept return without requiring correction', () => {
      const result = returnSchema.safeParse({
        reason: 'For your information',
        requiresCorrection: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requiresCorrection).toBe(false);
      }
    });

    it('should reject missing reason', () => {
      const result = returnSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should reject empty reason', () => {
      const result = returnSchema.safeParse({ reason: '' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should reject reason exceeding 500 characters', () => {
      const reason = 'a'.repeat(501);
      const result = returnSchema.safeParse({ reason });
      expect(result.success).toBe(false);
    });

    it('should default requiresCorrection to true', () => {
      const result = returnSchema.safeParse({ reason: 'Needs update' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.requiresCorrection).toBe(true);
      }
    });
  });

  describe('createStatusTransitionSchema', () => {
    it('should create schema with allowed statuses', () => {
      const schema = createStatusTransitionSchema(['PENDING', 'APPROVED', 'REJECTED'] as const);

      const validResult = schema.safeParse({ status: 'APPROVED' });
      expect(validResult.success).toBe(true);

      const invalidResult = schema.safeParse({ status: 'INVALID' });
      expect(invalidResult.success).toBe(false);
    });

    it('should accept all allowed statuses', () => {
      const schema = createStatusTransitionSchema(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as const);

      expect(schema.safeParse({ status: 'DRAFT' }).success).toBe(true);
      expect(schema.safeParse({ status: 'PENDING' }).success).toBe(true);
      expect(schema.safeParse({ status: 'APPROVED' }).success).toBe(true);
      expect(schema.safeParse({ status: 'REJECTED' }).success).toBe(true);
    });

    it('should accept optional notes', () => {
      const schema = createStatusTransitionSchema(['ACTIVE', 'INACTIVE'] as const);

      const result = schema.safeParse({
        status: 'ACTIVE',
        notes: 'Reactivating account',
      });
      expect(result.success).toBe(true);
    });

    it('should reject notes exceeding 500 characters', () => {
      const schema = createStatusTransitionSchema(['ACTIVE'] as const);

      const result = schema.safeParse({
        status: 'ACTIVE',
        notes: 'a'.repeat(501),
      });
      expect(result.success).toBe(false);
    });

    it('should reject statuses not in allowed list', () => {
      const schema = createStatusTransitionSchema(['PENDING', 'APPROVED'] as const);

      const result = schema.safeParse({ status: 'REJECTED' });
      expect(result.success).toBe(false);
    });
  });

  describe('validateStatusTransition', () => {
    const allowedTransitions = {
      DRAFT: ['PENDING'] as const,
      PENDING: ['APPROVED', 'REJECTED'] as const,
      APPROVED: ['COMPLETED'] as const,
      REJECTED: [] as const,
      COMPLETED: [] as const,
    };

    it('should validate allowed transitions', () => {
      expect(validateStatusTransition('DRAFT', 'PENDING', allowedTransitions)).toEqual({
        valid: true,
      });

      expect(validateStatusTransition('PENDING', 'APPROVED', allowedTransitions)).toEqual({
        valid: true,
      });

      expect(validateStatusTransition('PENDING', 'REJECTED', allowedTransitions)).toEqual({
        valid: true,
      });
    });

    it('should reject disallowed transitions', () => {
      const result = validateStatusTransition('DRAFT', 'APPROVED', allowedTransitions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from DRAFT to APPROVED');
      expect(result.error).toContain('PENDING');
    });

    it('should reject transitions from terminal states', () => {
      const result = validateStatusTransition('COMPLETED', 'PENDING', allowedTransitions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Cannot transition from COMPLETED');
    });

    it('should handle unknown current status', () => {
      // @ts-expect-error Testing unknown status
      const result = validateStatusTransition('UNKNOWN', 'PENDING', allowedTransitions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('No transitions allowed from status');
    });

    it('should reject backward transitions', () => {
      const result = validateStatusTransition('APPROVED', 'PENDING', allowedTransitions);

      expect(result.valid).toBe(false);
    });

    it('should reject transition to same status if not allowed', () => {
      const result = validateStatusTransition('DRAFT', 'DRAFT', allowedTransitions);

      expect(result.valid).toBe(false);
    });

    it('should list allowed transitions in error message', () => {
      const result = validateStatusTransition('PENDING', 'COMPLETED', allowedTransitions);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('APPROVED');
      expect(result.error).toContain('REJECTED');
    });
  });

  describe('edge cases and security', () => {
    it('should handle special characters in notes', () => {
      const result = approvalSchema.safeParse({
        notes: '<script>alert("XSS")</script>',
      });
      expect(result.success).toBe(true);
      // Note: Zod doesn't sanitize, but validation passes
      // Sanitization should happen at display time
    });

    it('should handle unicode in comments', () => {
      const result = commentSchema.safeParse({
        content: '✓ Approved - مرحبا - 你好',
      });
      expect(result.success).toBe(true);
    });

    it('should handle whitespace-only content in comments', () => {
      const result = commentSchema.safeParse({ content: '   ' });
      // Whitespace is technically content, so this should pass
      expect(result.success).toBe(true);
    });

    it('should handle newlines in reason', () => {
      const result = rejectionSchema.safeParse({
        reason: 'Line 1\nLine 2\nLine 3',
      });
      expect(result.success).toBe(true);
    });

    it('should handle very long valid inputs at boundary', () => {
      // Test exactly at 500 character boundary
      const result = rejectionSchema.safeParse({ reason: 'a'.repeat(500) });
      expect(result.success).toBe(true);

      // Test at 501 (should fail)
      const result2 = rejectionSchema.safeParse({ reason: 'a'.repeat(501) });
      expect(result2.success).toBe(false);
    });
  });
});
