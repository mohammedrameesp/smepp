/**
 * Tests for HR Profile Validation Schemas
 * @see src/lib/validations/hr-profile.ts
 */

import {
  hrProfileSchema,
  hrProfileAdminSchema,
  hrProfileEmployeeSchema,
  validateQID,
  validateQatarMobile,
  validateIBAN,
  validatePassportNumber,
} from '@/features/employees/validations/hr-profile';

describe('HR Profile Validation Schemas', () => {
  // ===== Individual Field Validators =====
  describe('validateQID', () => {
    it('should accept valid 11-digit QID', () => {
      expect(validateQID('28412345678')).toBe(true);
      expect(validateQID('12345678901')).toBe(true);
    });

    it('should reject QID with less than 11 digits', () => {
      expect(validateQID('1234567890')).toBe(false);
      expect(validateQID('123')).toBe(false);
    });

    it('should reject QID with more than 11 digits', () => {
      expect(validateQID('123456789012')).toBe(false);
    });

    it('should reject QID with non-numeric characters', () => {
      expect(validateQID('1234567890A')).toBe(false);
      expect(validateQID('12345-67890')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateQID('')).toBe(false);
    });
  });

  describe('validateQatarMobile', () => {
    it('should accept valid 8-digit Qatar mobile', () => {
      expect(validateQatarMobile('33445566')).toBe(true);
      expect(validateQatarMobile('55667788')).toBe(true);
      expect(validateQatarMobile('77889900')).toBe(true);
    });

    it('should reject mobile with less than 8 digits', () => {
      expect(validateQatarMobile('3344556')).toBe(false);
      expect(validateQatarMobile('123')).toBe(false);
    });

    it('should reject mobile with more than 8 digits', () => {
      expect(validateQatarMobile('334455667')).toBe(false);
    });

    it('should reject mobile with non-numeric characters', () => {
      expect(validateQatarMobile('3344556A')).toBe(false);
      expect(validateQatarMobile('+9743344')).toBe(false);
    });
  });

  describe('validateIBAN', () => {
    it('should accept valid IBAN format', () => {
      expect(validateIBAN('QA12QNBA000000000012345678901')).toBe(true);
      expect(validateIBAN('DE89370400440532013000')).toBe(true);
      expect(validateIBAN('GB82WEST12345698765432')).toBe(true);
    });

    it('should accept IBAN with spaces (spaces are stripped)', () => {
      expect(validateIBAN('QA12 QNBA 0000 0000 0012 3456 7890 1')).toBe(true);
    });

    it('should reject invalid IBAN', () => {
      expect(validateIBAN('INVALID')).toBe(false);
      expect(validateIBAN('12345678')).toBe(false);
      expect(validateIBAN('QA')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(validateIBAN('qa12qnba000000000012345678901')).toBe(true);
    });
  });

  describe('validatePassportNumber', () => {
    it('should accept valid passport formats', () => {
      expect(validatePassportNumber('AB1234567')).toBe(true);
      expect(validatePassportNumber('123456789')).toBe(true);
      expect(validatePassportNumber('A12345')).toBe(true);
    });

    it('should accept passport 5-20 characters', () => {
      expect(validatePassportNumber('12345')).toBe(true); // 5 chars
      expect(validatePassportNumber('12345678901234567890')).toBe(true); // 20 chars
    });

    it('should reject passport less than 5 characters', () => {
      expect(validatePassportNumber('1234')).toBe(false);
      expect(validatePassportNumber('AB')).toBe(false);
    });

    it('should reject passport more than 20 characters', () => {
      expect(validatePassportNumber('123456789012345678901')).toBe(false);
    });

    it('should reject passport with special characters', () => {
      expect(validatePassportNumber('AB-123456')).toBe(false);
      expect(validatePassportNumber('AB 123456')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(validatePassportNumber('ab1234567')).toBe(true);
    });
  });

  // ===== HR Profile Schema =====
  describe('hrProfileSchema', () => {
    it('should validate a complete HR profile', () => {
      const validProfile = {
        dateOfBirth: '1990-05-15',
        gender: 'Male',
        maritalStatus: 'Single',
        nationality: 'Qatari',
        qatarMobile: '33445566',
        personalEmail: 'john@example.com',
        qatarZone: 'Zone 42',
        qatarStreet: 'Street 123',
        qatarBuilding: 'Building A',
        qatarUnit: '101',
        localEmergencyName: 'Jane Doe',
        localEmergencyRelation: 'Spouse',
        localEmergencyPhone: '55667788',
        qidNumber: '28412345678',
        qidExpiry: '2027-12-31',
        passportNumber: 'AB1234567',
        passportExpiry: '2028-06-30',
        sponsorshipType: 'Company',
        employeeId: 'EMP-001',
        designation: 'Software Engineer',
        dateOfJoining: '2023-01-15',
        bankName: 'QNB',
        iban: 'QA12QNBA000000000012345678901',
        highestQualification: 'Bachelor',
        specialization: 'Computer Science',
        institutionName: 'Qatar University',
        graduationYear: 2020,
        hasDrivingLicense: true,
        onboardingStep: 5,
        onboardingComplete: true,
      };

      const result = hrProfileSchema.safeParse(validProfile);
      expect(result.success).toBe(true);
    });

    it('should validate minimal profile (all optional)', () => {
      const result = hrProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept null values for optional fields', () => {
      const profile = {
        dateOfBirth: null,
        gender: null,
        nationality: null,
        qatarMobile: null,
        personalEmail: null,
        qidNumber: null,
      };
      const result = hrProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    it('should accept empty strings for optional fields', () => {
      const profile = {
        dateOfBirth: '',
        gender: '',
        nationality: '',
        qatarStreet: '',
      };
      const result = hrProfileSchema.safeParse(profile);
      expect(result.success).toBe(true);
    });

    // QID validation
    it('should fail with invalid QID (not 11 digits)', () => {
      const result = hrProfileSchema.safeParse({
        qidNumber: '1234567890', // 10 digits
      });
      expect(result.success).toBe(false);
    });

    it('should fail with QID containing non-numeric characters', () => {
      const result = hrProfileSchema.safeParse({
        qidNumber: '1234567890A',
      });
      expect(result.success).toBe(false);
    });

    // Qatar mobile validation
    it('should fail with invalid Qatar mobile (not 8 digits)', () => {
      const result = hrProfileSchema.safeParse({
        qatarMobile: '3344556', // 7 digits
      });
      expect(result.success).toBe(false);
    });

    // Personal email validation
    it('should fail with invalid email format', () => {
      const result = hrProfileSchema.safeParse({
        personalEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid email', () => {
      const result = hrProfileSchema.safeParse({
        personalEmail: 'test@example.com',
      });
      expect(result.success).toBe(true);
    });

    // IBAN validation
    it('should fail with invalid IBAN', () => {
      const result = hrProfileSchema.safeParse({
        iban: 'INVALID_IBAN',
      });
      expect(result.success).toBe(false);
    });

    // Passport validation
    it('should fail with invalid passport number', () => {
      const result = hrProfileSchema.safeParse({
        passportNumber: 'AB', // Too short
      });
      expect(result.success).toBe(false);
    });

    // Emergency contact phone validation
    it('should fail with invalid local emergency phone', () => {
      const result = hrProfileSchema.safeParse({
        localEmergencyPhone: '123', // Too short
      });
      expect(result.success).toBe(false);
    });

    // Note: homeEmergencyPhone validation was removed - field is now optional string

    // Other mobile validation
    it('should fail with invalid other mobile number', () => {
      const result = hrProfileSchema.safeParse({
        otherMobileNumber: '123', // Too short (5-15 required)
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid other mobile number', () => {
      const result = hrProfileSchema.safeParse({
        otherMobileNumber: '1234567890',
      });
      expect(result.success).toBe(true);
    });

    // Graduation year validation
    it('should fail with graduation year before 1950', () => {
      const result = hrProfileSchema.safeParse({
        graduationYear: 1949,
      });
      expect(result.success).toBe(false);
    });

    it('should fail with graduation year in the future', () => {
      const futureYear = new Date().getFullYear() + 1;
      const result = hrProfileSchema.safeParse({
        graduationYear: futureYear,
      });
      expect(result.success).toBe(false);
    });

    it('should accept current year as graduation year', () => {
      const currentYear = new Date().getFullYear();
      const result = hrProfileSchema.safeParse({
        graduationYear: currentYear,
      });
      expect(result.success).toBe(true);
    });

    // Onboarding step validation
    it('should fail with onboarding step greater than 10', () => {
      const result = hrProfileSchema.safeParse({
        onboardingStep: 11,
      });
      expect(result.success).toBe(false);
    });

    it('should fail with negative onboarding step', () => {
      const result = hrProfileSchema.safeParse({
        onboardingStep: -1,
      });
      expect(result.success).toBe(false);
    });

    it('should accept valid onboarding steps 0-10', () => {
      for (let i = 0; i <= 10; i++) {
        const result = hrProfileSchema.safeParse({ onboardingStep: i });
        expect(result.success).toBe(true);
      }
    });

    // Boolean fields
    it('should validate boolean fields', () => {
      const result = hrProfileSchema.safeParse({
        hasDrivingLicense: true,
        onboardingComplete: false,
      });
      expect(result.success).toBe(true);
    });

    // Passthrough test
    it('should allow extra fields (passthrough)', () => {
      const result = hrProfileSchema.safeParse({
        extraField: 'extra value',
        anotherId: 123,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveProperty('extraField');
      }
    });
  });

  // ===== Admin Schema =====
  describe('hrProfileAdminSchema', () => {
    it('should include employeeId', () => {
      const result = hrProfileAdminSchema.safeParse({
        employeeId: 'EMP-001',
        designation: 'Manager',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.employeeId).toBe('EMP-001');
      }
    });
  });

  // ===== Employee Schema =====
  describe('hrProfileEmployeeSchema', () => {
    it('should omit employeeId field', () => {
      const result = hrProfileEmployeeSchema.safeParse({
        designation: 'Developer',
        dateOfBirth: '1992-03-20',
      });
      expect(result.success).toBe(true);
    });

    it('should still allow passthrough fields', () => {
      const result = hrProfileEmployeeSchema.safeParse({
        userId: 'user-123',
        workEmail: 'work@company.com',
      });
      expect(result.success).toBe(true);
    });
  });

  // ===== Edge Cases =====
  describe('Edge cases', () => {
    it('should coerce graduation year from string', () => {
      const result = hrProfileSchema.safeParse({
        graduationYear: '2015',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.graduationYear).toBe(2015);
      }
    });

    it('should coerce onboarding step from string', () => {
      const result = hrProfileSchema.safeParse({
        onboardingStep: '5',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.onboardingStep).toBe(5);
      }
    });

    it('should handle whitespace in IBAN', () => {
      const result = hrProfileSchema.safeParse({
        iban: 'QA12 QNBA 0000 0000 0012 3456 7890 1',
      });
      expect(result.success).toBe(true);
    });

    it('should handle JSON arrays as strings for languages and skills', () => {
      const result = hrProfileSchema.safeParse({
        languagesKnown: '["Arabic", "English", "Hindi"]',
        skillsCertifications: '["AWS Certified", "PMP"]',
      });
      expect(result.success).toBe(true);
    });
  });
});
