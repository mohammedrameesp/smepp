/**
 * Workflow Schemas Unit Tests
 * Tests for workflow validation schemas (approval, rejection, cancellation)
 */

import {
  approvalSchema,
  rejectionSchema,
  cancellationSchema,
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

  describe('edge cases and security', () => {
    it('should handle special characters in notes', () => {
      const result = approvalSchema.safeParse({
        notes: '<script>alert("XSS")</script>',
      });
      expect(result.success).toBe(true);
      // Note: Zod doesn't sanitize, but validation passes
      // Sanitization should happen at display time
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
