'use client';

/**
 * @file EmployeeOnboardingClient.tsx
 * @description Main client component for employee self-service onboarding wizard
 * @module employee-onboarding
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';

const LOCALSTORAGE_KEY = 'employee-onboarding-draft';

import { StepTransition } from './components/StepTransition';
import { WizardProgress } from './components/WizardProgress';
import { PersonalStep } from './components/steps/PersonalStep';
import { ContactEmergencyStep } from './components/steps/ContactEmergencyStep';
import { IdentificationStep } from './components/steps/IdentificationStep';
import { BankingDocumentsStep } from './components/steps/BankingDocumentsStep';
import { EducationSkillsStep } from './components/steps/EducationSkillsStep';
import { ReviewStep } from './components/steps/ReviewStep';
import { COUNTRY_CODES } from '@/lib/data/constants';
import { VALIDATION_PATTERNS, PATTERN_MESSAGES } from '@/lib/validations/patterns';

/**
 * Get the phone country code for a given nationality.
 * Handles common naming differences between COUNTRIES and COUNTRY_CODES.
 */
function getCountryCodeFromNationality(nationality: string | null): string | null {
  if (!nationality) return null;

  // Normalize for matching
  const normalizedNationality = nationality.toLowerCase().trim();

  // Handle common naming differences
  const nationalityToCountryMap: Record<string, string> = {
    'united kingdom': 'uk',
    'united states': 'usa/canada',
    'united arab emirates': 'uae',
  };

  const mappedCountry = nationalityToCountryMap[normalizedNationality];

  const match = COUNTRY_CODES.find((c) => {
    const countryLower = c.country.toLowerCase();
    return countryLower === normalizedNationality || countryLower === mappedCountry;
  });

  return match?.code || null;
}

const STEPS = [
  { title: 'Personal', description: 'Basic information' },
  { title: 'Contact', description: 'Contact & emergency' },
  { title: 'ID & Legal', description: 'Documents' },
  { title: 'Banking', description: 'Bank & uploads' },
  { title: 'Education', description: 'Skills & qualifications' },
  { title: 'Review', description: 'Confirm details' },
];

const TOTAL_STEPS = 6;

/**
 * Mandatory fields configuration grouped by step
 * These are the fields users should fill, but won't block navigation
 */
const MANDATORY_FIELDS: Record<number, { field: string; label: string }[]> = {
  1: [
    { field: 'dateOfBirth', label: 'Date of Birth' },
    { field: 'gender', label: 'Gender' },
    { field: 'nationality', label: 'Nationality' },
    { field: 'maritalStatus', label: 'Marital Status' },
  ],
  2: [
    { field: 'qatarMobile', label: 'Qatar Mobile' },
    { field: 'personalEmail', label: 'Personal Email' },
    { field: 'qatarZone', label: 'Qatar Zone' },
  ],
  3: [
    { field: 'qidNumber', label: 'QID Number' },
    { field: 'qidExpiry', label: 'QID Expiry' },
    { field: 'passportNumber', label: 'Passport Number' },
    { field: 'passportExpiry', label: 'Passport Expiry' },
  ],
  4: [
    { field: 'bankName', label: 'Bank Name' },
    { field: 'iban', label: 'IBAN' },
    { field: 'photoUrl', label: 'Profile Photo' },
  ],
};

/**
 * Get all missing mandatory fields across all steps
 */
function getMissingMandatoryFields(formData: FormData): { step: number; field: string; label: string }[] {
  const missing: { step: number; field: string; label: string }[] = [];

  for (const [stepStr, fields] of Object.entries(MANDATORY_FIELDS)) {
    const step = parseInt(stepStr);
    for (const { field, label } of fields) {
      const value = formData[field];
      if (!value || (typeof value === 'string' && value.trim() === '')) {
        missing.push({ step, field, label });
      }
    }
  }

  return missing;
}

interface FormData {
  [key: string]: string | null;
  // Step 1: Personal
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  maritalStatus: string | null;
  // Step 2: Contact & Emergency
  qatarMobile: string | null;
  otherMobileCode: string | null;
  otherMobileNumber: string | null;
  personalEmail: string | null;
  qatarZone: string | null;
  qatarStreet: string | null;
  qatarBuilding: string | null;
  qatarUnit: string | null;
  homeCountryAddress: string | null;
  localEmergencyName: string | null;
  localEmergencyRelation: string | null;
  localEmergencyPhoneCode: string | null;
  localEmergencyPhone: string | null;
  homeEmergencyName: string | null;
  homeEmergencyRelation: string | null;
  homeEmergencyPhoneCode: string | null;
  homeEmergencyPhone: string | null;
  // Step 3: Identification
  qidNumber: string | null;
  qidExpiry: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  healthCardExpiry: string | null;
  // Step 4: Banking & Documents
  bankName: string | null;
  iban: string | null;
  qidUrl: string | null;
  passportCopyUrl: string | null;
  photoUrl: string | null;
  // Step 5: Education & Skills
  highestQualification: string | null;
  specialization: string | null;
  institutionName: string | null;
  graduationYear: string | null;
  languagesKnown: string | null;
  skillsCertifications: string | null;
  licenseExpiry: string | null;
}

const initialFormData: FormData = {
  dateOfBirth: null,
  gender: null,
  nationality: null,
  maritalStatus: null,
  qatarMobile: null,
  otherMobileCode: '+91',
  otherMobileNumber: null,
  personalEmail: null,
  qatarZone: null,
  qatarStreet: null,
  qatarBuilding: null,
  qatarUnit: null,
  homeCountryAddress: null,
  localEmergencyName: null,
  localEmergencyRelation: null,
  localEmergencyPhoneCode: '+974',
  localEmergencyPhone: null,
  homeEmergencyName: null,
  homeEmergencyRelation: null,
  homeEmergencyPhoneCode: '+91',
  homeEmergencyPhone: null,
  qidNumber: null,
  qidExpiry: null,
  passportNumber: null,
  passportExpiry: null,
  healthCardExpiry: null,
  bankName: null,
  iban: null,
  qidUrl: null,
  passportCopyUrl: null,
  photoUrl: null,
  highestQualification: null,
  specialization: null,
  institutionName: null,
  graduationYear: null,
  languagesKnown: '[]',
  skillsCertifications: '[]',
  licenseExpiry: null,
};

export function EmployeeOnboardingClient() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form data
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [workEmail, setWorkEmail] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const isInitialLoad = useRef(true);

  // Load draft from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCALSTORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.formData) {
          setFormData((prev) => ({ ...prev, ...parsed.formData }));
        }
        if (parsed.currentStep) {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Auto-save to localStorage when formData or currentStep changes
  useEffect(() => {
    // Skip initial load to avoid overwriting with empty data
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    try {
      localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify({ formData, currentStep }));
    } catch {
      // Ignore localStorage errors (quota exceeded, etc.)
    }
  }, [formData, currentStep]);

  // Load existing profile data
  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch('/api/users/me/hr-profile');
        if (response.ok) {
          const data = await response.json();
          setWorkEmail(data.workEmail || '');

          // Check if already completed
          if (data.onboardingComplete) {
            setIsCompleted(true);
            return;
          }

          // Check if user has previously saved any mandatory fields (returning user)
          const mandatoryFieldKeys = ['dateOfBirth', 'gender', 'nationality', 'maritalStatus',
            'qatarMobile', 'personalEmail', 'qatarZone', 'qidNumber', 'qidExpiry',
            'passportNumber', 'passportExpiry', 'bankName', 'iban', 'photoUrl'];
          const hasExistingData = mandatoryFieldKeys.some(key => data[key]);
          if (hasExistingData) {
            setIsReturningUser(true);
          }

          // Map API data to form data
          setFormData((prev) => ({
            ...prev,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split('T')[0] : null,
            gender: data.gender || null,
            nationality: data.nationality || null,
            maritalStatus: data.maritalStatus || null,
            qatarMobile: data.qatarMobile || null,
            otherMobileCode: data.otherMobileCode || '+91',
            otherMobileNumber: data.otherMobileNumber || null,
            personalEmail: data.personalEmail || null,
            qatarZone: data.qatarZone || null,
            qatarStreet: data.qatarStreet || null,
            qatarBuilding: data.qatarBuilding || null,
            qatarUnit: data.qatarUnit || null,
            homeCountryAddress: data.homeCountryAddress || null,
            localEmergencyName: data.localEmergencyName || null,
            localEmergencyRelation: data.localEmergencyRelation || null,
            localEmergencyPhoneCode: data.localEmergencyPhoneCode || '+974',
            localEmergencyPhone: data.localEmergencyPhone || null,
            homeEmergencyName: data.homeEmergencyName || null,
            homeEmergencyRelation: data.homeEmergencyRelation || null,
            homeEmergencyPhoneCode: data.homeEmergencyPhoneCode || '+91',
            homeEmergencyPhone: data.homeEmergencyPhone || null,
            qidNumber: data.qidNumber || null,
            qidExpiry: data.qidExpiry ? new Date(data.qidExpiry).toISOString().split('T')[0] : null,
            passportNumber: data.passportNumber || null,
            passportExpiry: data.passportExpiry ? new Date(data.passportExpiry).toISOString().split('T')[0] : null,
            healthCardExpiry: data.healthCardExpiry ? new Date(data.healthCardExpiry).toISOString().split('T')[0] : null,
            bankName: data.bankName || null,
            iban: data.iban || null,
            qidUrl: data.qidUrl || null,
            passportCopyUrl: data.passportCopyUrl || null,
            photoUrl: data.photoUrl || null,
            highestQualification: data.highestQualification || null,
            specialization: data.specialization || null,
            institutionName: data.institutionName || null,
            graduationYear: data.graduationYear?.toString() || null,
            languagesKnown: data.languagesKnown || '[]',
            skillsCertifications: data.skillsCertifications || '[]',
            licenseExpiry: data.licenseExpiry ? new Date(data.licenseExpiry).toISOString().split('T')[0] : null,
          }));
        }
      } catch {
        // Ignore errors, use defaults
      }
    }

    if (session?.user) {
      loadProfile();
    }
  }, [session?.user]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Update phone country codes when nationality changes
  useEffect(() => {
    const countryCode = getCountryCodeFromNationality(formData.nationality);
    if (countryCode) {
      setFormData((prev) => {
        // Only update if the current codes are defaults or empty
        const shouldUpdateOtherMobile = !prev.otherMobileCode || prev.otherMobileCode === '+91';
        const shouldUpdateHomeEmergency = !prev.homeEmergencyPhoneCode || prev.homeEmergencyPhoneCode === '+91';

        if (!shouldUpdateOtherMobile && !shouldUpdateHomeEmergency) {
          return prev;
        }

        return {
          ...prev,
          ...(shouldUpdateOtherMobile && { otherMobileCode: countryCode }),
          ...(shouldUpdateHomeEmergency && { homeEmergencyPhoneCode: countryCode }),
        };
      });
    }
  }, [formData.nationality]);

  // Update field helper
  const updateField = useCallback((field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value as string | null }));
    // Clear error for this field
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // Validate format only (not required fields) - soft validation allows proceeding
  const validateFormat = useCallback(() => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 2:
        // Validate Qatar mobile format if provided
        if (formData.qatarMobile && !VALIDATION_PATTERNS.qatarMobile.test(formData.qatarMobile)) {
          newErrors.qatarMobile = PATTERN_MESSAGES.qatarMobile;
        }
        // Validate other mobile format if provided
        if (formData.otherMobileNumber && !VALIDATION_PATTERNS.mobile.test(formData.otherMobileNumber)) {
          newErrors.otherMobileNumber = PATTERN_MESSAGES.mobile;
        }
        // Validate personal email format if provided
        if (formData.personalEmail && !VALIDATION_PATTERNS.email.test(formData.personalEmail)) {
          newErrors.personalEmail = PATTERN_MESSAGES.email;
        }
        // Validate local emergency phone format if provided
        if (formData.localEmergencyPhone && !VALIDATION_PATTERNS.phone.test(formData.localEmergencyPhone)) {
          newErrors.localEmergencyPhone = PATTERN_MESSAGES.phone;
        }
        // Validate home emergency phone format if provided
        if (formData.homeEmergencyPhone && !VALIDATION_PATTERNS.phone.test(formData.homeEmergencyPhone)) {
          newErrors.homeEmergencyPhone = PATTERN_MESSAGES.phone;
        }
        break;
      case 3:
        // Validate QID format if provided
        if (formData.qidNumber && !VALIDATION_PATTERNS.qatarId.test(formData.qidNumber)) {
          newErrors.qidNumber = PATTERN_MESSAGES.qatarId;
        }
        // Validate passport format if provided
        if (formData.passportNumber && !VALIDATION_PATTERNS.passport.test(formData.passportNumber)) {
          newErrors.passportNumber = PATTERN_MESSAGES.passport;
        }
        break;
      case 4:
        // Validate IBAN format if provided
        if (formData.iban) {
          const cleanedIban = formData.iban.replace(/\s/g, '');
          if (!VALIDATION_PATTERNS.iban.test(cleanedIban)) {
            newErrors.iban = PATTERN_MESSAGES.iban;
          }
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [currentStep, formData]);

  // Calculate missing mandatory fields for the banner
  const missingFields = getMissingMandatoryFields(formData);

  // Only show banner for returning users (those who have previously saved data)
  // This gives first-time users a clean experience without alarming warnings
  const showMissingFieldsBanner = missingFields.length > 0 && isReturningUser;

  // Save current step data
  const saveStepData = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me/hr-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();

        // Map API validation errors to field-specific errors
        if (data.details && Array.isArray(data.details)) {
          const fieldErrors: Record<string, string> = {};
          for (const detail of data.details) {
            // API returns path as array like ['iban'] or string
            const fieldName = Array.isArray(detail.path) ? detail.path[0] : detail.path;
            if (fieldName) {
              fieldErrors[fieldName] = detail.message;
            }
          }
          if (Object.keys(fieldErrors).length > 0) {
            setErrors((prev) => ({ ...prev, ...fieldErrors }));
            return false;
          }
        }

        throw new Error(data.error || 'Failed to save');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save data');
      return false;
    } finally {
      setIsSaving(false);
    }

    return true;
  }, [formData]);

  // Navigation functions
  const goNext = useCallback(async () => {
    // Only block on format errors, not missing fields
    if (!validateFormat()) return;

    // Save data before proceeding (even if incomplete)
    const saved = await saveStepData();
    if (!saved) return;

    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, [validateFormat, saveStepData]);

  const goBack = useCallback(() => {
    setError(null);
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Complete onboarding
  const completeOnboarding = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/me/hr-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          onboardingComplete: true,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to complete onboarding');
      }

      // Clear localStorage draft on successful completion
      try {
        localStorage.removeItem(LOCALSTORAGE_KEY);
      } catch {
        // Ignore localStorage errors
      }

      // Redirect to dashboard
      router.push('/employee');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle next button click
  const handleNext = async () => {
    if (currentStep === TOTAL_STEPS) {
      await completeOnboarding();
    } else {
      await goNext();
    }
  };

  // Skip onboarding (go directly to dashboard)
  const handleSkip = () => {
    router.push('/employee');
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // Already completed
  if (isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Onboarding Already Complete
          </h3>
          <p className="text-slate-600 mb-6">
            You&apos;ve already completed your employee onboarding.
          </p>
          <Button
            onClick={() => router.push('/employee')}
            className="bg-slate-900 hover:bg-slate-800"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Render current step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <PersonalStep
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        );
      case 2:
        return (
          <ContactEmergencyStep
            formData={formData}
            updateField={updateField}
            errors={errors}
            workEmail={workEmail}
          />
        );
      case 3:
        return (
          <IdentificationStep
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        );
      case 4:
        return (
          <BankingDocumentsStep
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        );
      case 5:
        return (
          <EducationSkillsStep
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        );
      case 6:
        return (
          <ReviewStep
            formData={formData}
            workEmail={workEmail}
            onEdit={(step) => {
              setDirection(-1);
              setCurrentStep(step);
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="py-6 px-4 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {session?.user?.organizationLogoUrl ? (
              <img
                src={session.user.organizationLogoUrl}
                alt={session.user.organizationName || 'Organization'}
                className="h-10 w-10 rounded-lg object-contain"
              />
            ) : (
              <div className="h-10 w-10 rounded-lg bg-slate-200 flex items-center justify-center">
                <span className="text-lg font-bold text-slate-600">
                  {session?.user?.organizationName?.charAt(0) || 'O'}
                </span>
              </div>
            )}
            <div>
              <span className="text-xl font-semibold text-slate-900">Employee Onboarding</span>
              <p className="text-sm text-slate-500">Complete your profile</p>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Skip for now
          </button>
        </div>
      </header>

      {/* Progress */}
      <WizardProgress
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        steps={STEPS}
      />

      {/* Missing Fields Banner - only shown after user starts filling or moves past step 1 */}
      {showMissingFieldsBanner && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-amber-800">
                  {missingFields.length} required {missingFields.length === 1 ? 'field' : 'fields'} incomplete
                </p>
                <p className="text-sm text-amber-700 mt-1">
                  Missing: {missingFields.map(f => f.label).join(', ')}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  You can continue, but please complete all fields before your profile is finalized.
                </p>
              </div>
              <button
                onClick={() => {
                  // Navigate to the first step with missing fields
                  const firstMissing = missingFields[0];
                  if (firstMissing && firstMissing.step !== currentStep) {
                    setDirection(firstMissing.step > currentStep ? 1 : -1);
                    setCurrentStep(firstMissing.step);
                  }
                }}
                className="text-sm font-medium text-amber-700 hover:text-amber-900 whitespace-nowrap"
              >
                Go to Step {missingFields[0]?.step}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {error && (
            <Alert variant="error" className="mb-6 max-w-lg mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <StepTransition step={currentStep} direction={direction}>
            {renderStep()}
          </StepTransition>

          {/* Navigation */}
          <div className="flex justify-between mt-8 max-w-2xl mx-auto">
            {currentStep > 1 ? (
              <Button
                variant="ghost"
                onClick={goBack}
                className="text-slate-600 hover:text-slate-900"
                disabled={isSaving || isLoading}
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back
              </Button>
            ) : (
              <div />
            )}

            <Button
              onClick={handleNext}
              disabled={isSaving || isLoading}
              className="bg-slate-900 hover:bg-slate-800 rounded-xl px-8"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Completing...
                </>
              ) : currentStep === TOTAL_STEPS ? (
                <>
                  Complete Onboarding
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
