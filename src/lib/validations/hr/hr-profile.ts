/**
 * @file hr-profile.ts
 * @description Validation schemas for HR employee profiles including Qatar-specific fields (QID, IBAN, mobile)
 * @module validations/hr
 */

import { z } from 'zod';

// Qatar QID: exactly 11 digits
const qidRegex = /^\d{11}$/;

// Qatar mobile: exactly 8 digits (without country code)
const qatarMobileRegex = /^\d{8}$/;

// Generic mobile number: 5-15 digits
const mobileRegex = /^\d{5,15}$/;

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Simple IBAN pattern for international
const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i;

// Passport number: alphanumeric, 5-20 characters
const passportRegex = /^[A-Z0-9]{5,20}$/i;

// Note: healthCardNumber and licenseNumber removed - QID serves as unique identifier

// Helper for optional string that can be empty
const optionalString = z.string().optional().nullable().or(z.literal(''));

// Helper for optional date string
const optionalDateString = z.string().optional().nullable().or(z.literal(''));

export const hrProfileSchema = z.object({
  // Personal Information
  dateOfBirth: optionalDateString,
  gender: optionalString,
  maritalStatus: optionalString,
  nationality: optionalString,

  // Contact Information
  qatarMobile: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || qatarMobileRegex.test(val), {
      message: 'Qatar mobile must be exactly 8 digits',
    }),
  otherMobileCode: optionalString,
  otherMobileNumber: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || mobileRegex.test(val), {
      message: 'Invalid mobile number format',
    }),
  personalEmail: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || emailRegex.test(val), {
      message: 'Invalid email address',
    }),
  qatarZone: optionalString,
  qatarStreet: optionalString,
  qatarBuilding: optionalString,
  qatarUnit: optionalString,
  homeCountryAddress: optionalString,

  // Emergency Contacts - Local (Qatar)
  localEmergencyName: optionalString,
  localEmergencyRelation: optionalString,
  localEmergencyPhoneCode: optionalString,
  localEmergencyPhone: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || mobileRegex.test(val), {
      message: 'Invalid phone number format',
    }),

  // Emergency Contacts - Home Country
  homeEmergencyName: optionalString,
  homeEmergencyRelation: optionalString,
  homeEmergencyPhoneCode: optionalString,
  homeEmergencyPhone: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || mobileRegex.test(val), {
      message: 'Invalid phone number format',
    }),

  // Identification & Legal
  qidNumber: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || qidRegex.test(val), {
      message: 'QID must be exactly 11 digits',
    }),
  qidExpiry: optionalDateString,
  passportNumber: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || passportRegex.test(val), {
      message: 'Invalid passport number format (5-20 alphanumeric characters)',
    }),
  passportExpiry: optionalDateString,
  // passportCountry removed - QID serves as unique identifier
  // healthCardNumber removed - QID serves as unique identifier
  healthCardExpiry: optionalDateString,
  sponsorshipType: optionalString,

  // Employment Information
  employeeId: optionalString,
  designation: optionalString,
  dateOfJoining: optionalDateString,

  // Bank & Payroll
  bankName: optionalString,
  iban: z.string()
    .optional()
    .nullable()
    .refine((val) => !val || ibanRegex.test(val.replace(/\s/g, '')), {
      message: 'Invalid IBAN format (e.g., QA12ABCD123456789012345678901)',
    }),

  // Education
  highestQualification: optionalString,
  specialization: optionalString,
  institutionName: optionalString,
  graduationYear: z.coerce.number().int().min(1950).max(new Date().getFullYear()).optional().nullable(),

  // Documents (URLs)
  qidUrl: optionalString,
  passportCopyUrl: optionalString,
  photoUrl: optionalString,
  contractCopyUrl: optionalString,
  contractExpiry: optionalDateString, // Employment contract / work permit expiry

  // Additional Info
  hasDrivingLicense: z.boolean().optional().default(false),
  // licenseNumber removed - QID serves as unique identifier
  licenseExpiry: optionalDateString,
  languagesKnown: optionalString, // JSON array as string
  skillsCertifications: optionalString, // JSON array as string

  // Onboarding tracking
  onboardingStep: z.coerce.number().int().min(0).max(10).optional(),
  onboardingComplete: z.boolean().optional(),

  // Leave settings
  bypassNoticeRequirement: z.boolean().optional(),
}).passthrough(); // Allow extra fields (like id, userId, workEmail, etc.) to pass through

// Schema for admin update (includes employeeId)
export const hrProfileAdminSchema = hrProfileSchema;

// Schema for employee update (excludes employeeId modification)
export const hrProfileEmployeeSchema = hrProfileSchema.omit({ employeeId: true }).passthrough();

export type HRProfileInput = z.infer<typeof hrProfileSchema>;
export type HRProfileEmployeeInput = z.infer<typeof hrProfileEmployeeSchema>;

// Validation helpers for individual fields
export const validateQID = (qid: string): boolean => qidRegex.test(qid);
export const validateQatarMobile = (mobile: string): boolean => qatarMobileRegex.test(mobile);
export const validateIBAN = (iban: string): boolean => ibanRegex.test(iban.replace(/\s/g, ''));
export const validatePassportNumber = (passport: string): boolean => passportRegex.test(passport);
