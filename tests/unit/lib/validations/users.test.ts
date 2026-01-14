/**
 * Tests for User Validation Schemas
 * @see src/lib/validations/users.ts
 */

import { createUserSchema, updateUserSchema } from '@/features/users/validations/users';

describe('User Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate a complete valid user', () => {
      const validUser = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        isAdmin: false,
        password: 'SecurePass123!',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields (without password)', () => {
      const minimalUser = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        isAdmin: true,
      };

      const result = createUserSchema.safeParse(minimalUser);
      expect(result.success).toBe(true);
    });

    it('should fail when name is missing', () => {
      const invalidUser = {
        email: 'test@example.com',
        isAdmin: false,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('name'))).toBe(true);
      }
    });

    it('should fail when name is empty', () => {
      const invalidUser = {
        name: '',
        email: 'test@example.com',
        isAdmin: false,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should fail when name exceeds 100 characters', () => {
      const invalidUser = {
        name: 'A'.repeat(101),
        email: 'test@example.com',
        isAdmin: false,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should fail when email is missing for login user', () => {
      const invalidUser = {
        name: 'Test User',
        isAdmin: false,
        canLogin: true,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should fail when email is invalid format', () => {
      const invalidEmails = [
        'notanemail',
        '@example.com',
        'test@',
        'test@.com',
        'test@example',
        'test @example.com',
        '',
      ];

      invalidEmails.forEach(email => {
        const result = createUserSchema.safeParse({
          name: 'Test User',
          email,
          isAdmin: false,
        });
        expect(result.success).toBe(false);
      });
    });

    it('should accept valid email formats', () => {
      const validEmails = [
        'test@example.com',
        'test.user@example.com',
        'test+tag@example.com',
        'test@sub.example.com',
        'test123@example.co.uk',
      ];

      validEmails.forEach(email => {
        const result = createUserSchema.safeParse({
          name: 'Test User',
          email,
          isAdmin: false,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should use default isAdmin value when not provided', () => {
      const user = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const result = createUserSchema.safeParse(user);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isAdmin).toBe(false);
      }
    });

    it('should fail with invalid isAdmin type', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: 'yes', // should be boolean
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should validate both isAdmin options', () => {
      const adminValues = [true, false];

      adminValues.forEach(isAdmin => {
        const user = {
          name: 'Test User',
          email: 'test@example.com',
          isAdmin,
        };

        const result = createUserSchema.safeParse(user);
        expect(result.success).toBe(true);
      });
    });

    it('should fail when password is too short', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
        password: '1234567', // 7 characters
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept password with exactly 8 characters', () => {
      const validUser = {
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
        password: '12345678',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should fail when password exceeds 100 characters', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
        password: 'A'.repeat(101),
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept password with exactly 100 characters', () => {
      const validUser = {
        name: 'Test User',
        email: 'test@example.com',
        isAdmin: false,
        password: 'A'.repeat(100),
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });
  });

  describe('updateUserSchema', () => {
    it('should allow partial updates with only name', () => {
      const partialUpdate = {
        name: 'Updated Name',
      };

      const result = updateUserSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow partial updates with only isAdmin', () => {
      const partialUpdate = {
        isAdmin: true,
      };

      const result = updateUserSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow both name and isAdmin', () => {
      const update = {
        name: 'Updated Name',
        isAdmin: false,
      };

      const result = updateUserSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate name length on update', () => {
      const invalidUpdate = {
        name: 'A'.repeat(101),
      };

      const result = updateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should not allow empty name on update', () => {
      const invalidUpdate = {
        name: '',
      };

      const result = updateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should validate isAdmin type on update', () => {
      const invalidUpdate = {
        isAdmin: 'yes', // should be boolean
      };

      const result = updateUserSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });

    it('should not include email in update schema', () => {
      // updateUserSchema should not allow email updates
      // This prevents changing user email after creation
      const update = {
        name: 'Test',
        email: 'new@example.com', // This should be ignored or fail
      };

      const result = updateUserSchema.safeParse(update);
      // The schema strips unknown keys, so email should not be in the result
      if (result.success) {
        expect(result.data).not.toHaveProperty('email');
      }
    });

    it('should not include password in update schema', () => {
      const update = {
        name: 'Test',
        password: 'newpassword123',
      };

      const result = updateUserSchema.safeParse(update);
      if (result.success) {
        expect(result.data).not.toHaveProperty('password');
      }
    });
  });
});
