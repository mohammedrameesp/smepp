/**
 * @file hr-profile-validation.test.ts
 * @description Unit tests for HR profile validation schemas including Qatar-specific validations
 * @module tests/unit/features/employees
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

describe('HR Profile Validation', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // QID (QATAR ID) VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('QID Validation', () => {
    describe('validateQID helper', () => {
      it('should accept valid 11-digit QID', () => {
        expect(validateQID('12345678901')).toBe(true);
        expect(validateQID('28476123045')).toBe(true);
      });

      it('should reject QID with less than 11 digits', () => {
        expect(validateQID('1234567890')).toBe(false);
        expect(validateQID('12345')).toBe(false);
      });

      it('should reject QID with more than 11 digits', () => {
        expect(validateQID('123456789012')).toBe(false);
      });

      it('should reject QID with non-digit characters', () => {
        expect(validateQID('1234567890A')).toBe(false);
        expect(validateQID('12345-67890')).toBe(false);
      });
    });

    describe('schema validation', () => {
      it('should accept valid QID in schema', () => {
        const result = hrProfileSchema.safeParse({
          qidNumber: '12345678901',
        });
        expect(result.success).toBe(true);
      });

      it('should strip non-digits and validate', () => {
        const result = hrProfileSchema.safeParse({
          qidNumber: '123-456-789-01',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.qidNumber).toBe('12345678901');
        }
      });

      it('should reject invalid QID length', () => {
        const result = hrProfileSchema.safeParse({
          qidNumber: '12345',
        });
        expect(result.success).toBe(false);
      });

      it('should accept null/undefined QID (optional field)', () => {
        const result1 = hrProfileSchema.safeParse({ qidNumber: null });
        const result2 = hrProfileSchema.safeParse({});
        expect(result1.success).toBe(true);
        expect(result2.success).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // QATAR MOBILE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Qatar Mobile Validation', () => {
    describe('validateQatarMobile helper', () => {
      it('should accept valid 8-digit Qatar mobile', () => {
        expect(validateQatarMobile('55123456')).toBe(true);
        expect(validateQatarMobile('33445566')).toBe(true);
        expect(validateQatarMobile('66778899')).toBe(true);
      });

      it('should reject mobile with less than 8 digits', () => {
        expect(validateQatarMobile('5512345')).toBe(false);
      });

      it('should reject mobile with more than 8 digits', () => {
        expect(validateQatarMobile('551234567')).toBe(false);
      });

      it('should reject mobile with country code', () => {
        expect(validateQatarMobile('+97455123456')).toBe(false);
        expect(validateQatarMobile('97455123456')).toBe(false);
      });
    });

    describe('schema validation', () => {
      it('should accept valid Qatar mobile', () => {
        const result = hrProfileSchema.safeParse({
          qatarMobile: '55123456',
        });
        expect(result.success).toBe(true);
      });

      it('should strip non-digits from mobile', () => {
        const result = hrProfileSchema.safeParse({
          qatarMobile: '55-12-34-56',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.qatarMobile).toBe('55123456');
        }
      });

      it('should accept null/undefined (optional)', () => {
        const result = hrProfileSchema.safeParse({ qatarMobile: null });
        expect(result.success).toBe(true);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IBAN VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('IBAN Validation', () => {
    describe('validateIBAN helper', () => {
      it('should accept valid Qatar IBAN', () => {
        expect(validateIBAN('QA58DOHA00001234567890ABCDEFGHI')).toBe(true);
      });

      it('should accept IBAN with spaces (will be stripped)', () => {
        expect(validateIBAN('QA58 DOHA 0000 1234 5678 90AB CDEF GHI')).toBe(true);
      });

      it('should accept other country IBANs', () => {
        expect(validateIBAN('DE89370400440532013000')).toBe(true);
        expect(validateIBAN('GB82WEST12345698765432')).toBe(true);
      });

      it('should reject IBAN without country code', () => {
        expect(validateIBAN('58DOHA00001234567890')).toBe(false);
      });

      it('should reject IBAN too short', () => {
        expect(validateIBAN('QA58DOH')).toBe(false);
      });
    });

    describe('schema validation', () => {
      it('should accept valid IBAN', () => {
        const result = hrProfileSchema.safeParse({
          iban: 'QA58DOHA00001234567890ABCDEFGHI',
        });
        expect(result.success).toBe(true);
      });

      it('should uppercase IBAN', () => {
        const result = hrProfileSchema.safeParse({
          iban: 'qa58doha00001234567890abcdefghi',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.iban).toBe('QA58DOHA00001234567890ABCDEFGHI');
        }
      });

      it('should strip spaces from IBAN', () => {
        const result = hrProfileSchema.safeParse({
          iban: 'QA58 DOHA 0000 1234 5678 90AB',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.iban).not.toContain(' ');
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSPORT VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Passport Validation', () => {
    describe('validatePassportNumber helper', () => {
      it('should accept valid passport numbers', () => {
        expect(validatePassportNumber('AB1234567')).toBe(true);
        expect(validatePassportNumber('P12345678')).toBe(true);
        expect(validatePassportNumber('123456789')).toBe(true);
      });

      it('should accept 5-20 characters', () => {
        expect(validatePassportNumber('ABCDE')).toBe(true);  // 5 chars
        expect(validatePassportNumber('12345678901234567890')).toBe(true);  // 20 chars
      });

      it('should reject less than 5 characters', () => {
        expect(validatePassportNumber('ABCD')).toBe(false);
      });

      it('should reject more than 20 characters', () => {
        expect(validatePassportNumber('123456789012345678901')).toBe(false);
      });

      it('should reject special characters', () => {
        expect(validatePassportNumber('AB-123456')).toBe(false);
        expect(validatePassportNumber('AB 123456')).toBe(false);
      });
    });

    describe('schema validation', () => {
      it('should accept valid passport', () => {
        const result = hrProfileSchema.safeParse({
          passportNumber: 'AB1234567',
        });
        expect(result.success).toBe(true);
      });

      it('should uppercase passport number', () => {
        const result = hrProfileSchema.safeParse({
          passportNumber: 'ab1234567',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.passportNumber).toBe('AB1234567');
        }
      });

      it('should trim whitespace', () => {
        const result = hrProfileSchema.safeParse({
          passportNumber: '  AB1234567  ',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.passportNumber).toBe('AB1234567');
        }
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PERSONAL EMAIL VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Personal Email Validation', () => {
    it('should accept valid email', () => {
      const result = hrProfileSchema.safeParse({
        personalEmail: 'john.doe@example.com',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const result = hrProfileSchema.safeParse({
        personalEmail: 'invalid-email',
      });
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from email', () => {
      const result = hrProfileSchema.safeParse({
        personalEmail: '  john@example.com  ',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.personalEmail).toBe('john@example.com');
      }
    });

    it('should accept null/undefined (optional)', () => {
      const result = hrProfileSchema.safeParse({});
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // OTHER MOBILE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Other Mobile Validation', () => {
    it('should accept 5-15 digit mobile numbers', () => {
      const result = hrProfileSchema.safeParse({
        otherMobileNumber: '12345678901',
      });
      expect(result.success).toBe(true);
    });

    it('should strip non-digits', () => {
      const result = hrProfileSchema.safeParse({
        otherMobileNumber: '+1-234-567-8901',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.otherMobileNumber).toBe('12345678901');
      }
    });

    it('should reject very short numbers', () => {
      const result = hrProfileSchema.safeParse({
        otherMobileNumber: '1234',
      });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // EMERGENCY CONTACTS VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Emergency Contacts Validation', () => {
    it('should accept valid local emergency contact', () => {
      const result = hrProfileSchema.safeParse({
        localEmergencyName: 'Ahmed Hassan',
        localEmergencyRelation: 'Brother',
        localEmergencyPhone: '55123456789',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid home country emergency contact', () => {
      const result = hrProfileSchema.safeParse({
        homeEmergencyName: 'John Smith',
        homeEmergencyRelation: 'Father',
        homeEmergencyPhone: '919876543210',
      });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GRADUATION YEAR VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Graduation Year Validation', () => {
    it('should accept valid graduation year', () => {
      const result = hrProfileSchema.safeParse({
        graduationYear: 2020,
      });
      expect(result.success).toBe(true);
    });

    it('should coerce string to number', () => {
      const result = hrProfileSchema.safeParse({
        graduationYear: '2018',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.graduationYear).toBe(2018);
      }
    });

    it('should reject year before 1950', () => {
      const result = hrProfileSchema.safeParse({
        graduationYear: 1940,
      });
      expect(result.success).toBe(false);
    });

    it('should reject future year', () => {
      const result = hrProfileSchema.safeParse({
        graduationYear: new Date().getFullYear() + 1,
      });
      expect(result.success).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // BOOLEAN FIELDS VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Boolean Fields Validation', () => {
    it('should accept hasDrivingLicense boolean', () => {
      const result1 = hrProfileSchema.safeParse({ hasDrivingLicense: true });
      const result2 = hrProfileSchema.safeParse({ hasDrivingLicense: false });
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });

    it('should default hasDrivingLicense to false', () => {
      const result = hrProfileSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.hasDrivingLicense).toBe(false);
      }
    });

    it('should accept onboardingComplete boolean', () => {
      const result = hrProfileSchema.safeParse({ onboardingComplete: true });
      expect(result.success).toBe(true);
    });

    it('should accept bypassNoticeRequirement boolean', () => {
      const result = hrProfileSchema.safeParse({ bypassNoticeRequirement: true });
      expect(result.success).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // ONBOARDING STEP VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Onboarding Step Validation', () => {
    it('should accept valid onboarding step (0-10)', () => {
      const result = hrProfileSchema.safeParse({ onboardingStep: 5 });
      expect(result.success).toBe(true);
    });

    it('should reject negative step', () => {
      const result = hrProfileSchema.safeParse({ onboardingStep: -1 });
      expect(result.success).toBe(false);
    });

    it('should reject step > 10', () => {
      const result = hrProfileSchema.safeParse({ onboardingStep: 11 });
      expect(result.success).toBe(false);
    });

    it('should coerce string to number', () => {
      const result = hrProfileSchema.safeParse({ onboardingStep: '3' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.onboardingStep).toBe(3);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // SCHEMA VARIANTS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Schema Variants', () => {
    describe('hrProfileAdminSchema', () => {
      it('should be the same as base schema', () => {
        const result = hrProfileAdminSchema.safeParse({
          employeeId: 'EMP-001',
          qidNumber: '12345678901',
        });
        expect(result.success).toBe(true);
      });

      it('should allow employeeId modification', () => {
        const result = hrProfileAdminSchema.safeParse({
          employeeId: 'EMP-002',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.employeeId).toBe('EMP-002');
        }
      });
    });

    describe('hrProfileEmployeeSchema', () => {
      it('should exclude employeeId', () => {
        // Employee schema should omit employeeId
        const result = hrProfileEmployeeSchema.safeParse({
          qidNumber: '12345678901',
          qatarMobile: '55123456',
        });
        expect(result.success).toBe(true);
      });

      it('should still validate other fields', () => {
        const result = hrProfileEmployeeSchema.safeParse({
          qidNumber: '12345',  // Invalid
        });
        expect(result.success).toBe(false);
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASSTHROUGH BEHAVIOR
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Passthrough Behavior', () => {
    it('should allow extra fields to pass through', () => {
      const result = hrProfileSchema.safeParse({
        qidNumber: '12345678901',
        extraField: 'value',
        anotherField: 123,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        const data = result.data as unknown as { extraField: string; anotherField: number };
        expect(data.extraField).toBe('value');
        expect(data.anotherField).toBe(123);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPLETE PROFILE VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Complete Profile Validation', () => {
    it('should validate a complete HR profile', () => {
      const completeProfile = {
        // Personal
        dateOfBirth: '1990-01-15',
        gender: 'male',
        maritalStatus: 'married',
        nationality: 'Indian',
        // Contact
        qatarMobile: '55123456',
        otherMobileCode: '+91',
        otherMobileNumber: '9876543210',
        personalEmail: 'john@example.com',
        qatarZone: 'Doha',
        qatarStreet: 'Al Sadd Street',
        qatarBuilding: '123',
        qatarUnit: '5A',
        homeCountryAddress: '123 Main St, Mumbai, India',
        // Emergency Local
        localEmergencyName: 'Ahmed',
        localEmergencyRelation: 'Colleague',
        localEmergencyPhoneCode: '+974',
        localEmergencyPhone: '55654321',
        // Emergency Home
        homeEmergencyName: 'Priya',
        homeEmergencyRelation: 'Spouse',
        homeEmergencyPhoneCode: '+91',
        homeEmergencyPhone: '9123456789',
        // Identification
        qidNumber: '28412345678',
        qidExpiry: '2025-12-31',
        passportNumber: 'L1234567',
        passportExpiry: '2028-06-15',
        healthCardExpiry: '2025-06-30',
        sponsorshipType: 'company',
        // Employment
        employeeId: 'EMP-001',
        designation: 'Software Engineer',
        dateOfJoining: '2022-03-01',
        // Bank
        bankName: 'Qatar National Bank',
        iban: 'QA58QNBA000000001234567890123',
        // Education
        highestQualification: 'Bachelor of Engineering',
        specialization: 'Computer Science',
        institutionName: 'IIT Bombay',
        graduationYear: 2018,
        // Documents
        qidUrl: 'https://storage.example.com/qid.pdf',
        passportCopyUrl: 'https://storage.example.com/passport.pdf',
        photoUrl: 'https://storage.example.com/photo.jpg',
        contractCopyUrl: 'https://storage.example.com/contract.pdf',
        contractExpiry: '2025-02-28',
        // Additional
        hasDrivingLicense: true,
        licenseExpiry: '2026-01-15',
        languagesKnown: '["English", "Hindi", "Arabic"]',
        skillsCertifications: '["AWS Certified", "Azure Developer"]',
        // Onboarding
        onboardingStep: 5,
        onboardingComplete: true,
        bypassNoticeRequirement: false,
      };

      const result = hrProfileSchema.safeParse(completeProfile);
      expect(result.success).toBe(true);
    });
  });
});
