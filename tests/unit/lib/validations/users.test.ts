/**
 * Tests for User Validation Schemas
 * @see src/lib/validations/users.ts
 */

import { Role } from '@prisma/client';
import { createUserSchema, updateUserSchema } from '@/lib/validations/users';

describe('User Validation Schemas', () => {
  describe('createUserSchema', () => {
    it('should validate a complete valid user', () => {
      const validUser = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: Role.EMPLOYEE,
        password: 'SecurePass123!',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields (without password)', () => {
      const minimalUser = {
        name: 'Jane Smith',
        email: 'jane@example.com',
        role: Role.ADMIN,
      };

      const result = createUserSchema.safeParse(minimalUser);
      expect(result.success).toBe(true);
    });

    it('should fail when name is missing', () => {
      const invalidUser = {
        email: 'test@example.com',
        role: Role.EMPLOYEE,
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
        role: Role.EMPLOYEE,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should fail when name exceeds 100 characters', () => {
      const invalidUser = {
        name: 'A'.repeat(101),
        email: 'test@example.com',
        role: Role.EMPLOYEE,
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should fail when email is missing', () => {
      const invalidUser = {
        name: 'Test User',
        role: Role.EMPLOYEE,
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
          role: Role.EMPLOYEE,
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
          role: Role.EMPLOYEE,
        });
        expect(result.success).toBe(true);
      });
    });

    it('should fail when role is missing', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should fail with invalid role', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: 'SUPER_ADMIN',
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should validate all role options', () => {
      const roles = [
        Role.ADMIN,
        Role.EMPLOYEE,
        Role.TEMP_STAFF,
      ];

      roles.forEach(role => {
        const user = {
          name: 'Test User',
          email: 'test@example.com',
          role,
        };

        const result = createUserSchema.safeParse(user);
        expect(result.success).toBe(true);
      });
    });

    it('should fail when password is too short', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: Role.EMPLOYEE,
        password: '1234567', // 7 characters
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept password with exactly 8 characters', () => {
      const validUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: Role.EMPLOYEE,
        password: '12345678',
      };

      const result = createUserSchema.safeParse(validUser);
      expect(result.success).toBe(true);
    });

    it('should fail when password exceeds 100 characters', () => {
      const invalidUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: Role.EMPLOYEE,
        password: 'A'.repeat(101),
      };

      const result = createUserSchema.safeParse(invalidUser);
      expect(result.success).toBe(false);
    });

    it('should accept password with exactly 100 characters', () => {
      const validUser = {
        name: 'Test User',
        email: 'test@example.com',
        role: Role.EMPLOYEE,
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

    it('should allow partial updates with only role', () => {
      const partialUpdate = {
        role: Role.ADMIN,
      };

      const result = updateUserSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow both name and role', () => {
      const update = {
        name: 'Updated Name',
        role: Role.TEMP_STAFF,
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

    it('should validate role on update', () => {
      const invalidUpdate = {
        role: 'INVALID_ROLE',
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
