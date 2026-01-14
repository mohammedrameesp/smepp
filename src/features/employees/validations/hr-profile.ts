/**
 * @file hr-profile.ts
 * @description Validation schemas for HR employee profiles including Qatar-specific fields
 * @module domains/hr/employees/validations
 *
 * QATAR-SPECIFIC VALIDATIONS:
 * - QID (Qatar ID): Exactly 11 digits
 * - Qatar Mobile: Exactly 8 digits (without +974 country code)
 * - IBAN: International format starting with country code (QA for Qatar)
 * - Passport: 5-20 alphanumeric characters
 *
 * PROFILE SECTIONS:
 * - Personal Information (DOB, gender, nationality)
 * - Contact Information (phones, addresses)
 * - Emergency Contacts (local Qatar + home country)
 * - Identification & Legal (QID, passport, sponsorship)
 * - Employment (employee ID, designation, joining date)
 * - Bank & Payroll (bank name, IBAN for WPS)
 * - Education (qualifications, institution)
 * - Documents (uploaded file URLs)
 *
 * USAGE:
 * - hrProfileSchema: Full schema for admin updates
 * - hrProfileEmployeeSchema: Employee self-update (excludes employeeId)
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { optionalString } from '@/lib/validations/field-schemas';
import { VALIDATION_PATTERNS, PATTERN_MESSAGES } from '@/lib/validations/patterns';

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Strip non-digit characters from a string.
 * Used for phone/QID normalization before validation.
 */
const stripNonDigits = (val: string | null | undefined): string => {
  if (!val) return '';
  return val.replace(/\D/g, '');
};

/** Helper for optional date string */
const optionalDateString = z.string().optional().nullable().or(z.literal(''));

export const hrProfileSchema = z.object({
  // Personal Information
  dateOfBirth: optionalDateString,
  gender: z.string().optional().nullable().transform((val) => val ? val.toUpperCase() : val),
  maritalStatus: z.string().optional().nullable().transform((val) => val ? val.toUpperCase() : val),
  nationality: optionalString(),

  // Contact Information
  qatarMobile: z.string()
    .optional()
    .nullable()
    .transform((val) => val ? stripNonDigits(val) : val)
    .refine((val) => !val || VALIDATION_PATTERNS.qatarMobile.test(val), {
      message: PATTERN_MESSAGES.qatarMobile,
    }),
  otherMobileCode: optionalString(),
  otherMobileNumber: z.string()
    .optional()
    .nullable()
    .transform((val) => val ? stripNonDigits(val) : val)
    .refine((val) => !val || VALIDATION_PATTERNS.mobile.test(val), {
      message: PATTERN_MESSAGES.mobile,
    }),
  personalEmail: z.string()
    .optional()
    .nullable()
    .transform((val) => val?.trim() || val)
    .refine((val) => !val || VALIDATION_PATTERNS.email.test(val), {
      message: PATTERN_MESSAGES.email,
    }),
  qatarZone: optionalString(),
  qatarStreet: optionalString(),
  qatarBuilding: optionalString(),
  qatarUnit: optionalString(),
  homeCountryAddress: optionalString(),

  // Emergency Contacts - Local (Qatar)
  localEmergencyName: optionalString(),
  localEmergencyRelation: optionalString(),
  localEmergencyPhoneCode: optionalString(),
  localEmergencyPhone: z.string()
    .optional()
    .nullable()
    .transform((val) => val ? stripNonDigits(val) : val)
    .refine((val) => !val || VALIDATION_PATTERNS.mobile.test(val), {
      message: PATTERN_MESSAGES.mobile,
    }),

  // Emergency Contacts - Home Country
  homeEmergencyName: optionalString(),
  homeEmergencyRelation: optionalString(),
  homeEmergencyPhoneCode: optionalString(),
  homeEmergencyPhone: z.string()
    .optional()
    .nullable()
    .transform((val) => val ? stripNonDigits(val) : val)
    .refine((val) => !val || VALIDATION_PATTERNS.mobile.test(val), {
      message: PATTERN_MESSAGES.mobile,
    }),

  // Identification & Legal
  qidNumber: z.string()
    .optional()
    .nullable()
    .transform((val) => val ? stripNonDigits(val) : val)
    .refine((val) => !val || VALIDATION_PATTERNS.qatarId.test(val), {
      message: PATTERN_MESSAGES.qatarId,
    }),
  qidExpiry: optionalDateString,
  passportNumber: z.string()
    .optional()
    .nullable()
    .transform((val) => val?.trim().toUpperCase() || val)
    .refine((val) => !val || VALIDATION_PATTERNS.passport.test(val), {
      message: PATTERN_MESSAGES.passport,
    }),
  passportExpiry: optionalDateString,
  healthCardExpiry: optionalDateString,
  sponsorshipType: optionalString(),

  // Employment Information
  employeeId: optionalString(),
  designation: optionalString(),
  dateOfJoining: optionalDateString,

  // Bank & Payroll
  bankName: optionalString(),
  iban: z.string()
    .optional()
    .nullable()
    .transform((val) => val?.replace(/\s/g, '').toUpperCase() || val)
    .refine((val) => !val || VALIDATION_PATTERNS.iban.test(val), {
      message: PATTERN_MESSAGES.iban,
    }),

  // Education
  highestQualification: optionalString(),
  specialization: optionalString(),
  institutionName: optionalString(),
  graduationYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional().nullable(),

  // Documents (URLs)
  qidUrl: optionalString(),
  passportCopyUrl: optionalString(),
  photoUrl: optionalString(),
  contractCopyUrl: optionalString(),
  contractExpiry: optionalDateString,

  // Additional Info
  hasDrivingLicense: z.boolean().optional().default(false),
  licenseExpiry: optionalDateString,
  languagesKnown: optionalString(),
  skillsCertifications: optionalString(),

  // Onboarding tracking
  onboardingStep: z.coerce.number().int().min(0).max(10).optional(),
  onboardingComplete: z.boolean().optional(),

  // Leave settings
  bypassNoticeRequirement: z.boolean().optional(),
}).passthrough();

// Schema for admin update (includes employeeId)
export const hrProfileAdminSchema = hrProfileSchema;

// Schema for employee update (excludes employeeId modification)
export const hrProfileEmployeeSchema = hrProfileSchema.omit({ employeeId: true }).passthrough();

export type HRProfileInput = z.infer<typeof hrProfileSchema>;
export type HRProfileEmployeeInput = z.infer<typeof hrProfileEmployeeSchema>;

// Validation helpers for individual fields (using centralized patterns)
export const validateQID = (qid: string): boolean => VALIDATION_PATTERNS.qatarId.test(qid);
export const validateQatarMobile = (mobile: string): boolean => VALIDATION_PATTERNS.qatarMobile.test(mobile);
export const validateIBAN = (iban: string): boolean => VALIDATION_PATTERNS.iban.test(iban.replace(/\s/g, ''));
export const validatePassportNumber = (passport: string): boolean => VALIDATION_PATTERNS.passport.test(passport);

/**
 * Type compatibility check: Ensures Zod schema fields match Prisma TeamMember model fields.
 * Note: HR profile fields are part of the unified TeamMember model.
 */
type ZodHRProfileFields = keyof HRProfileInput;
type PrismaTeamMemberFields = keyof Omit<
  Prisma.TeamMemberUncheckedUpdateInput,
  'id' | 'tenantId' | 'email' | 'name' | 'passwordHash' | 'emailVerified' | 'image' | 'canLogin' |
  'resetToken' | 'resetTokenExpiry' | 'passwordChangedAt' | 'role' | 'status' | 'createdAt' | 'updatedAt' |
  'isOwner' | 'twoFactorEnabled' | 'twoFactorSecret' | 'backupCodes'
>;
type _ValidateHRProfileZodFieldsExistInPrisma = ZodHRProfileFields extends PrismaTeamMemberFields
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodHRProfileFields, PrismaTeamMemberFields> };
