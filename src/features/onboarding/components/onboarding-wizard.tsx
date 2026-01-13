/**
 * @file onboarding-wizard.tsx
 * @description Multi-step onboarding wizard for new employee profile completion
 * @module components/domains/hr
 */
'use client';

import { useState, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { Progress } from '@/components/ui/progress';
import { PhoneInput, QatarPhoneInput, DocumentUpload, MultiSelectTags, TagsInput } from '@/components/domains/hr/profile';
import {
  COUNTRIES,
  COUNTRY_CODES,
  QATAR_BANKS,
  RELATIONSHIPS,
  QUALIFICATIONS,
  SPONSORSHIP_TYPES,
  GENDERS,
  MARITAL_STATUS,
  LANGUAGES,
} from '@/lib/data/constants';

// Find phone code by country name (for auto-setting phone codes based on nationality)
function getPhoneCodeByCountry(countryName: string): string {
  const match = COUNTRY_CODES.find(
    (c) => c.country.toLowerCase() === countryName.toLowerCase()
  );
  return match?.code || '+91'; // Fallback to India if not found
}
import {
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  Phone,
  AlertTriangle,
  CreditCard,
  Building2,
  GraduationCap,
  FileText,
  Info,
  Loader2,
} from 'lucide-react';

// Field name to label mapping for user-friendly error messages
const FIELD_LABELS: Record<string, string> = {
  dateOfBirth: 'Date of Birth',
  dateOfJoining: 'Date of Joining',
  gender: 'Gender',
  nationality: 'Nationality',
  qatarMobile: 'Qatar Mobile',
  otherMobileNumber: 'Other Mobile Number',
  personalEmail: 'Personal Email',
  localEmergencyName: 'Local Emergency Contact Name',
  localEmergencyRelation: 'Local Emergency Contact Relation',
  localEmergencyPhone: 'Local Emergency Contact Phone',
  homeEmergencyName: 'Home Emergency Contact Name',
  homeEmergencyRelation: 'Home Emergency Contact Relation',
  homeEmergencyPhone: 'Home Emergency Contact Phone',
  qidNumber: 'QID Number',
  qidExpiry: 'QID Expiry Date',
  passportNumber: 'Passport Number',
  passportExpiry: 'Passport Expiry Date',
  bankName: 'Bank Name',
  iban: 'IBAN',
  qidUrl: 'QID Document',
  passportCopyUrl: 'Passport Copy',
};

// Required fields by step
const REQUIRED_FIELDS_BY_STEP: Record<number, string[]> = {
  0: ['dateOfBirth', 'dateOfJoining', 'gender', 'nationality'], // Personal
  1: ['qatarMobile'], // Contact
  2: ['localEmergencyName', 'localEmergencyRelation', 'localEmergencyPhone', 'homeEmergencyName', 'homeEmergencyRelation', 'homeEmergencyPhone'], // Emergency
  3: ['qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry'], // Identification (passportCountry removed)
  4: ['bankName', 'iban'], // Bank
  5: [], // Education - optional
  6: ['qidUrl', 'passportCopyUrl'], // Documents
  7: [], // Additional - optional
};

// Validation rules (format validation for fields that have values)
const VALIDATION_RULES: Record<string, (value: unknown) => string | null> = {
  qatarMobile: (v) => {
    if (!v) return null;
    return /^\d{8}$/.test(String(v)) ? null : 'Must be exactly 8 digits';
  },
  otherMobileNumber: (v) => {
    if (!v) return null;
    return /^\d{5,15}$/.test(String(v)) ? null : 'Must be 5-15 digits';
  },
  personalEmail: (v) => {
    if (!v) return null;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v)) ? null : 'Invalid email format';
  },
  qidNumber: (v) => {
    if (!v) return null;
    return /^\d{11}$/.test(String(v)) ? null : 'Must be exactly 11 digits';
  },
  passportNumber: (v) => {
    if (!v) return null;
    return /^[A-Z0-9]{5,20}$/i.test(String(v)) ? null : 'Must be 5-20 alphanumeric characters';
  },
  healthCardNumber: (v) => {
    if (!v) return null;
    return /^[A-Z0-9]{5,20}$/i.test(String(v)) ? null : 'Must be 5-20 alphanumeric characters';
  },
  iban: (v) => {
    if (!v) return null;
    const cleaned = String(v).replace(/\s/g, '');
    return /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i.test(cleaned) ? null : 'Invalid IBAN format';
  },
  licenseNumber: (v) => {
    if (!v) return null;
    return /^[A-Z0-9-]{3,20}$/i.test(String(v)) ? null : 'Must be 3-20 alphanumeric characters';
  },
  localEmergencyPhone: (v) => {
    if (!v) return null;
    return /^\d{5,15}$/.test(String(v)) ? null : 'Must be 5-15 digits';
  },
  homeEmergencyPhone: (v) => {
    if (!v) return null;
    return /^\d{5,15}$/.test(String(v)) ? null : 'Must be 5-15 digits';
  },
  graduationYear: (v) => {
    if (!v) return null;
    const year = Number(v);
    if (isNaN(year)) return 'Must be a valid year';
    if (year < 1950 || year > new Date().getFullYear()) return `Must be between 1950 and ${new Date().getFullYear()}`;
    return null;
  },
};

const WIZARD_STEPS = [
  { id: 'personal', title: 'Personal Information', icon: User, shortTitle: 'Personal' },
  { id: 'contact', title: 'Contact Information', icon: Phone, shortTitle: 'Contact' },
  { id: 'emergency', title: 'Emergency Contacts', icon: AlertTriangle, shortTitle: 'Emergency' },
  { id: 'identification', title: 'Identification & Legal', icon: CreditCard, shortTitle: 'ID & Legal' },
  { id: 'bank', title: 'Bank Details', icon: Building2, shortTitle: 'Bank' },
  { id: 'education', title: 'Education', icon: GraduationCap, shortTitle: 'Education' },
  { id: 'documents', title: 'Document Uploads', icon: FileText, shortTitle: 'Documents' },
  { id: 'additional', title: 'Additional Info', icon: Info, shortTitle: 'Additional' },
];

interface OnboardingWizardProps {
  initialData?: Record<string, unknown>;
  workEmail: string;
  onComplete: () => void;
  onMinimize: () => void;
  currentStep?: number;
}

const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const formatDateForPicker = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

export function OnboardingWizard({
  initialData,
  workEmail,
  onComplete,
  onMinimize,
  currentStep: savedStep = 0,
}: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(savedStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<Record<string, unknown>>(initialData || {});
  const formDataRef = useRef<Record<string, unknown>>(initialData || {});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Validate a single field (format validation)
  const validateField = useCallback((field: string, value: unknown): string | null => {
    const validator = VALIDATION_RULES[field];
    if (validator) {
      return validator(value);
    }
    return null;
  }, []);

  // Check if a value is empty
  const isEmpty = (value: unknown): boolean => {
    if (value === null || value === undefined) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    return false;
  };

  // Validate all fields in current data and return errors (format validation only)
  const validateAllFields = useCallback((data: Record<string, unknown>): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    Object.keys(VALIDATION_RULES).forEach((field) => {
      const error = validateField(field, data[field]);
      if (error) {
        newErrors[field] = error;
      }
    });
    return newErrors;
  }, [validateField]);

  // Validate required fields for current step
  const validateStepRequiredFields = useCallback((data: Record<string, unknown>, step: number): Record<string, string> => {
    const newErrors: Record<string, string> = {};
    const requiredFields = REQUIRED_FIELDS_BY_STEP[step] || [];

    requiredFields.forEach((field) => {
      if (isEmpty(data[field])) {
        newErrors[field] = 'This field is required';
      }
    });

    return newErrors;
  }, []);

  // Update form data with real-time validation
  const updateFormData = useCallback((field: string, value: unknown) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      formDataRef.current = updated; // Keep ref in sync (avoids stale closure)
      return updated;
    });

    // Real-time validation
    const error = validateField(field, value);
    setErrors((prev) => {
      if (error) {
        return { ...prev, [field]: error };
      } else {
        const { [field]: _, ...rest } = prev;
        return rest;
      }
    });
  }, [validateField]);

  const saveProgress = async (data: Record<string, unknown>, step: number, validateRequired = true, stepToValidate?: number) => {
    // Validate format errors
    const formatErrors = validateAllFields(data);

    // Validate required fields for current step
    const currentStepToValidate = stepToValidate ?? (step > 0 ? step - 1 : 0);
    const requiredErrors = validateRequired ? validateStepRequiredFields(data, currentStepToValidate) : {};

    // Combine errors
    const allErrors = { ...formatErrors, ...requiredErrors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // List the specific fields with errors
      const errorFields = Object.keys(allErrors).map(field => FIELD_LABELS[field] || field).join(', ');
      toast.error(`Please fix: ${errorFields}`, { duration: 5000 });
      return false;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/users/me/hr-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          onboardingStep: step,
          onboardingComplete: false,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('HR Profile save error:', error);
        // Show detailed validation errors from server
        if (error.details && Array.isArray(error.details)) {
          const serverErrors: Record<string, string> = {};
          error.details.forEach((issue: { path: string[]; message: string }) => {
            const field = issue.path?.[0];
            if (field) {
              serverErrors[field] = issue.message;
            }
          });
          setErrors(serverErrors);
        }
        throw new Error(error.error || 'Failed to save progress');
      }

      setFormData((prev) => ({ ...prev, ...data }));
      toast.success('Progress saved');
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const submitOnboarding = async () => {
    // Use ref to get latest data (avoids stale closure)
    const currentFormData = formDataRef.current;

    // Validate format errors
    const formatErrors = validateAllFields(currentFormData);

    // Validate all required fields from all steps
    let allRequiredErrors: Record<string, string> = {};
    for (let step = 0; step < WIZARD_STEPS.length; step++) {
      const stepErrors = validateStepRequiredFields(currentFormData, step);
      allRequiredErrors = { ...allRequiredErrors, ...stepErrors };
    }

    // Combine all errors
    const allErrors = { ...formatErrors, ...allRequiredErrors };

    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // List the specific fields with errors
      const errorFields = Object.keys(allErrors).map(field => FIELD_LABELS[field] || field).join(', ');
      toast.error(`Please fix: ${errorFields}`, { duration: 5000 });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/users/me/hr-profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...currentFormData,
          onboardingStep: WIZARD_STEPS.length,
          onboardingComplete: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // Show detailed validation errors from server
        if (error.details && Array.isArray(error.details)) {
          const serverErrors: Record<string, string> = {};
          error.details.forEach((issue: { path: string[]; message: string }) => {
            const field = issue.path?.[0];
            if (field) {
              serverErrors[field] = issue.message;
            }
          });
          setErrors(serverErrors);
        }
        throw new Error(error.error || 'Failed to submit');
      }

      toast.success('Onboarding complete!');
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < WIZARD_STEPS.length - 1) {
      // Use ref to get latest data (avoids stale closure)
      const saved = await saveProgress(formDataRef.current, currentStep + 1, true, currentStep);
      if (saved) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSaveAndContinue = async () => {
    // Save without enforcing required fields (user can continue later)
    // Use ref to get latest data (avoids stale closure)
    const saved = await saveProgress(formDataRef.current, currentStep, false);
    if (saved) {
      onMinimize();
    }
  };

  const progressPercentage = Math.round(((currentStep + 1) / WIZARD_STEPS.length) * 100);
  const currentStepData = WIZARD_STEPS[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 overflow-auto">
      <div className="min-h-screen py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Complete Your Profile</h1>
                <p className="text-gray-600">Please complete all sections to finish onboarding</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveAndContinue}
                disabled={isSaving}
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save & Exit
              </Button>
            </div>

            {/* Progress Section */}
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">{progressPercentage}% complete</span>
                </div>
                <Progress value={progressPercentage} className="h-2" />

                {/* Step Indicators */}
                <div className="flex justify-between mt-4 overflow-x-auto pb-2">
                  {WIZARD_STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = index === currentStep;
                    const isCompleted = index < currentStep;

                    return (
                      <button
                        key={step.id}
                        onClick={() => setCurrentStep(index)}
                        className={`flex flex-col items-center min-w-[60px] px-2 transition-colors ${
                          isActive
                            ? 'text-blue-600'
                            : isCompleted
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`}
                      >
                        <div
                          className={`h-8 w-8 rounded-full flex items-center justify-center mb-1 ${
                            isActive
                              ? 'bg-blue-100 text-blue-600'
                              : isCompleted
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {isCompleted ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Icon className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-xs font-medium text-center hidden sm:block">
                          {step.shortTitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Form Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <StepIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>{currentStepData.title}</CardTitle>
                  <CardDescription>
                    Step {currentStep + 1} of {WIZARD_STEPS.length}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Step Content */}
              <div className="space-y-6">
                {currentStep === 0 && <PersonalInfoStep formData={formData} updateField={updateFormData} errors={errors} />}
                {currentStep === 1 && <ContactInfoStep formData={formData} updateField={updateFormData} errors={errors} workEmail={workEmail} />}
                {currentStep === 2 && <EmergencyContactStep formData={formData} updateField={updateFormData} errors={errors} />}
                {currentStep === 3 && <IdentificationStep formData={formData} updateField={updateFormData} errors={errors} />}
                {currentStep === 4 && <BankDetailsStep formData={formData} updateField={updateFormData} errors={errors} />}
                {currentStep === 5 && <EducationStep formData={formData} updateField={updateFormData} errors={errors} />}
                {currentStep === 6 && <DocumentsStep formData={formData} updateField={updateFormData} errors={errors} />}
                {currentStep === 7 && <AdditionalInfoStep formData={formData} updateField={updateFormData} errors={errors} />}
              </div>

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 mt-6 border-t">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                {currentStep < WIZARD_STEPS.length - 1 ? (
                  <Button onClick={handleNext}>
                    Continue
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={submitOnboarding}
                    disabled={isSubmitting}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4 mr-2" />
                    )}
                    Complete Profile
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Step Components - Common interface
interface StepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
}

// Field error display component
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="text-sm text-red-600 mt-1">{error}</p>;
}

function PersonalInfoStep({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Please provide your basic personal information.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateOfBirth">Date of Birth <span className="text-red-500">*</span></Label>
          <DatePicker
            id="dateOfBirth"
            value={formatDateForPicker(formData.dateOfBirth as string)}
            onChange={(val) => updateField('dateOfBirth', val)}
            placeholder="DD/MM/YYYY"
            maxDate={new Date()}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="dateOfJoining">Date of Joining <span className="text-red-500">*</span></Label>
          <DatePicker
            id="dateOfJoining"
            value={formatDateForPicker(formData.dateOfJoining as string)}
            onChange={(val) => updateField('dateOfJoining', val)}
            placeholder="DD/MM/YYYY"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="gender">Gender <span className="text-red-500">*</span></Label>
          <Select
            value={(formData.gender as string) || ''}
            onValueChange={(val) => updateField('gender', val)}
          >
            <SelectTrigger id="gender">
              <SelectValue placeholder="Select gender" />
            </SelectTrigger>
            <SelectContent>
              {GENDERS.map((g) => (
                <SelectItem key={g} value={g}>{g}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="maritalStatus">Marital Status</Label>
          <Select
            value={(formData.maritalStatus as string) || ''}
            onValueChange={(val) => updateField('maritalStatus', val)}
          >
            <SelectTrigger id="maritalStatus">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {MARITAL_STATUS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="nationality">Nationality <span className="text-red-500">*</span></Label>
          <Select
            value={(formData.nationality as string) || ''}
            onValueChange={(val) => {
              updateField('nationality', val);
              // Auto-update phone codes based on nationality
              const phoneCode = getPhoneCodeByCountry(val);
              updateField('otherMobileCode', phoneCode);
              updateField('homeEmergencyCode', phoneCode);
            }}
          >
            <SelectTrigger id="nationality">
              <SelectValue placeholder="Select country" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function ContactInfoStep({ formData, updateField, errors, workEmail }: StepProps & { workEmail: string }) {
  return (
    <div className="space-y-6">
      {/* Phone Numbers */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Phone Numbers</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Qatar Mobile <span className="text-red-500">*</span></Label>
            <QatarPhoneInput
              value={(formData.qatarMobile as string) || ''}
              onChange={(val) => updateField('qatarMobile', val)}
              placeholder="12345678"
              error={errors.qatarMobile}
            />
          </div>

          <div className="space-y-2">
            <Label>Other Mobile</Label>
            <PhoneInput
              codeValue={(formData.otherMobileCode as string) || '+91'}
              numberValue={(formData.otherMobileNumber as string) || ''}
              onCodeChange={(val) => updateField('otherMobileCode', val)}
              onNumberChange={(val) => updateField('otherMobileNumber', val)}
              numberPlaceholder="Phone number"
              error={errors.otherMobileNumber}
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Email Addresses</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="personalEmail">Personal Email</Label>
            <Input
              id="personalEmail"
              type="email"
              value={(formData.personalEmail as string) || ''}
              onChange={(e) => updateField('personalEmail', e.target.value)}
              placeholder="personal@email.com"
              className={errors.personalEmail ? 'border-red-500' : ''}
            />
            <FieldError error={errors.personalEmail} />
          </div>

          <div className="space-y-2">
            <Label>Work Email</Label>
            <Input value={workEmail} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-500">From your login (read-only)</p>
          </div>
        </div>
      </div>

      {/* Qatar Address */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Qatar Address</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="qatarZone" className="text-sm">Zone</Label>
            <Input
              id="qatarZone"
              value={(formData.qatarZone as string) || ''}
              onChange={(e) => updateField('qatarZone', e.target.value)}
              placeholder="45"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qatarStreet" className="text-sm">Street</Label>
            <Input
              id="qatarStreet"
              value={(formData.qatarStreet as string) || ''}
              onChange={(e) => updateField('qatarStreet', e.target.value)}
              placeholder="123"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qatarBuilding" className="text-sm">Building</Label>
            <Input
              id="qatarBuilding"
              value={(formData.qatarBuilding as string) || ''}
              onChange={(e) => updateField('qatarBuilding', e.target.value)}
              placeholder="15"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="qatarUnit" className="text-sm">Unit</Label>
            <Input
              id="qatarUnit"
              value={(formData.qatarUnit as string) || ''}
              onChange={(e) => updateField('qatarUnit', e.target.value)}
              placeholder="5A"
            />
          </div>
        </div>
      </div>

      {/* Home Address */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Home Country Address</h4>
        <div className="space-y-2">
          <Textarea
            id="homeCountryAddress"
            value={(formData.homeCountryAddress as string) || ''}
            onChange={(e) => updateField('homeCountryAddress', e.target.value)}
            placeholder="Full address in home country"
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

function EmergencyContactStep({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-6">
      {/* Local Emergency */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-orange-500" />
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Local Emergency Contact (Qatar) <span className="text-red-500">*</span>
          </h4>
        </div>
        <p className="text-sm text-gray-600">
          Provide a contact in Qatar who can be reached in case of emergency.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Contact Name</Label>
            <Input
              value={(formData.localEmergencyName as string) || ''}
              onChange={(e) => updateField('localEmergencyName', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Relationship</Label>
            <Select
              value={(formData.localEmergencyRelation as string) || ''}
              onValueChange={(val) => updateField('localEmergencyRelation', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-sm">Phone Number</Label>
            <PhoneInput
              codeValue={(formData.localEmergencyPhoneCode as string) || '+974'}
              numberValue={(formData.localEmergencyPhone as string) || ''}
              onCodeChange={(val) => updateField('localEmergencyPhoneCode', val)}
              onNumberChange={(val) => updateField('localEmergencyPhone', val)}
              error={errors.localEmergencyPhone}
            />
          </div>
        </div>
      </div>

      {/* Home Country Emergency */}
      <div className="space-y-4 pt-4 border-t">
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-blue-500" />
          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
            Home Country Emergency Contact <span className="text-red-500">*</span>
          </h4>
        </div>
        <p className="text-sm text-gray-600">
          Provide a contact in your home country who can be reached in case of emergency.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Contact Name</Label>
            <Input
              value={(formData.homeEmergencyName as string) || ''}
              onChange={(e) => updateField('homeEmergencyName', e.target.value)}
              placeholder="Full name"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Relationship</Label>
            <Select
              value={(formData.homeEmergencyRelation as string) || ''}
              onValueChange={(val) => updateField('homeEmergencyRelation', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label className="text-sm">Phone Number</Label>
            <PhoneInput
              codeValue={(formData.homeEmergencyPhoneCode as string) || '+91'}
              numberValue={(formData.homeEmergencyPhone as string) || ''}
              onCodeChange={(val) => updateField('homeEmergencyPhoneCode', val)}
              onNumberChange={(val) => updateField('homeEmergencyPhone', val)}
              error={errors.homeEmergencyPhone}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function IdentificationStep({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-6">
      {/* QID */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Qatar ID (QID) <span className="text-red-500">*</span>
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">QID Number <span className="text-red-500">*</span></Label>
            <Input
              value={(formData.qidNumber as string) || ''}
              onChange={(e) => updateField('qidNumber', e.target.value)}
              placeholder="284XXXXXXXX"
              maxLength={11}
              className={errors.qidNumber ? 'border-red-500' : ''}
            />
            <FieldError error={errors.qidNumber} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Expiry Date <span className="text-red-500">*</span></Label>
            <DatePicker
              value={formatDateForPicker(formData.qidExpiry as string)}
              onChange={(val) => updateField('qidExpiry', val)}
              placeholder="DD/MM/YYYY"
              className={errors.qidExpiry ? 'border-red-500' : ''}
            />
            <FieldError error={errors.qidExpiry} />
          </div>
        </div>
      </div>

      {/* Passport */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Passport <span className="text-red-500">*</span>
        </h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">Number <span className="text-red-500">*</span></Label>
            <Input
              value={(formData.passportNumber as string) || ''}
              onChange={(e) => updateField('passportNumber', e.target.value)}
              placeholder="AB1234567"
              className={errors.passportNumber ? 'border-red-500' : ''}
            />
            <FieldError error={errors.passportNumber} />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">Expiry <span className="text-red-500">*</span></Label>
            <DatePicker
              value={formatDateForPicker(formData.passportExpiry as string)}
              onChange={(val) => updateField('passportExpiry', val)}
              placeholder="DD/MM/YYYY"
              className={errors.passportExpiry ? 'border-red-500' : ''}
            />
            <FieldError error={errors.passportExpiry} />
          </div>
        </div>
      </div>

      {/* Health Card */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Health Card</h4>
        <div className="space-y-2">
          <Label className="text-sm">Expiry Date</Label>
          <DatePicker
            value={formatDateForPicker(formData.healthCardExpiry as string)}
            onChange={(val) => updateField('healthCardExpiry', val)}
            placeholder="DD/MM/YYYY"
          />
        </div>
      </div>

      {/* Visa & Sponsorship */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Visa & Sponsorship</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Sponsorship Type</Label>
            <Select
              value={(formData.sponsorshipType as string) || ''}
              onValueChange={(val) => updateField('sponsorshipType', val)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {SPONSORSHIP_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function BankDetailsStep({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Provide your bank details for salary payments.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Bank Name <span className="text-red-500">*</span></Label>
          <Select
            value={(formData.bankName as string) || ''}
            onValueChange={(val) => updateField('bankName', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select bank" />
            </SelectTrigger>
            <SelectContent>
              {QATAR_BANKS.map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>IBAN <span className="text-red-500">*</span></Label>
          <Input
            value={(formData.iban as string) || ''}
            onChange={(e) => updateField('iban', e.target.value)}
            placeholder="QA00XXXX0000000000XXXXXXXXXXX"
            className={errors.iban ? 'border-red-500' : ''}
          />
          <FieldError error={errors.iban} />
        </div>
      </div>
    </div>
  );
}

function EducationStep({ formData, updateField, errors }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Provide your educational background.
      </p>

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Highest Qualification</Label>
          <Select
            value={(formData.highestQualification as string) || ''}
            onValueChange={(val) => updateField('highestQualification', val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>
              {QUALIFICATIONS.map((q) => (
                <SelectItem key={q} value={q}>{q}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Specialization</Label>
          <Input
            value={(formData.specialization as string) || ''}
            onChange={(e) => updateField('specialization', e.target.value)}
            placeholder="e.g., Computer Science"
          />
        </div>

        <div className="space-y-2">
          <Label>Institution</Label>
          <Input
            value={(formData.institutionName as string) || ''}
            onChange={(e) => updateField('institutionName', e.target.value)}
            placeholder="University name"
          />
        </div>

        <div className="space-y-2">
          <Label>Graduation Year</Label>
          <Input
            type="number"
            min={1950}
            max={new Date().getFullYear()}
            value={(formData.graduationYear as string) || ''}
            onChange={(e) => updateField('graduationYear', parseInt(e.target.value) || null)}
            placeholder={`${new Date().getFullYear() - 5}`}
            className={errors.graduationYear ? 'border-red-500' : ''}
          />
          <FieldError error={errors.graduationYear} />
        </div>
      </div>
    </div>
  );
}

function DocumentsStep({ formData, updateField }: StepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 mb-4">
        Upload required documents. Accepted formats: JPG, PNG, PDF (max 5MB each).
      </p>

      <div className="grid sm:grid-cols-2 gap-6">
        <DocumentUpload
          id="qidCopy"
          label="QID Copy *"
          value={(formData.qidUrl as string) || ''}
          onChange={(url) => updateField('qidUrl', url)}
          accept="image/jpeg,image/png,application/pdf"
          description="QID document"
        />

        <DocumentUpload
          id="passportCopy"
          label="Passport Copy *"
          value={(formData.passportCopyUrl as string) || ''}
          onChange={(url) => updateField('passportCopyUrl', url)}
          accept="image/jpeg,image/png,application/pdf"
          description="Main passport page"
        />

        <DocumentUpload
          id="photo"
          label="Photo"
          value={(formData.photoUrl as string) || ''}
          onChange={(url) => updateField('photoUrl', url)}
          accept="image/jpeg,image/png"
          description="Passport-size photo"
        />

        {/* Contract upload hidden for now - will be added later
        <DocumentUpload
          id="contractCopy"
          label="Contract Copy"
          value={(formData.contractCopyUrl as string) || ''}
          onChange={(url) => updateField('contractCopyUrl', url)}
          accept="image/jpeg,image/png,application/pdf"
          description="Employment contract"
        />
        */}
      </div>
    </div>
  );
}

function AdditionalInfoStep({ formData, updateField }: StepProps) {
  const hasDrivingLicense = (formData.hasDrivingLicense as boolean) || false;
  const languages = parseJsonArray(formData.languagesKnown as string);
  const skills = parseJsonArray(formData.skillsCertifications as string);

  return (
    <div className="space-y-6">
      {/* Driving License */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Driving License</h4>
        <div className="flex items-center space-x-3">
          <Checkbox
            id="hasDrivingLicense"
            checked={hasDrivingLicense}
            onCheckedChange={(checked) => updateField('hasDrivingLicense', checked as boolean)}
          />
          <Label htmlFor="hasDrivingLicense" className="cursor-pointer">
            I have a Qatar Driving License
          </Label>
        </div>

        {hasDrivingLicense && (
          <div className="pl-7 border-l-2 border-gray-200">
            <div className="space-y-2">
              <Label className="text-sm">License Expiry Date</Label>
              <DatePicker
                value={formatDateForPicker(formData.licenseExpiry as string)}
                onChange={(val) => updateField('licenseExpiry', val)}
                placeholder="DD/MM/YYYY"
              />
            </div>
          </div>
        )}
      </div>

      {/* Languages */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Languages</h4>
        <div className="space-y-2">
          <Label>Languages Known</Label>
          <MultiSelectTags
            options={LANGUAGES as unknown as string[]}
            value={languages}
            onChange={(values) => updateField('languagesKnown', JSON.stringify(values))}
            placeholder="Select languages"
            allowCustom
          />
        </div>
      </div>

      {/* Skills */}
      <div className="space-y-4 pt-4 border-t">
        <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Skills & Certifications</h4>
        <div className="space-y-2">
          <Label>Professional Certifications</Label>
          <TagsInput
            value={skills}
            onChange={(values) => updateField('skillsCertifications', JSON.stringify(values))}
            placeholder="Type and press Enter"
          />
          <p className="text-xs text-gray-500">
            Add certifications like PMP, AWS, CPA, etc.
          </p>
        </div>
      </div>

      {/* Final Notice */}
      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-start gap-3">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Check className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Almost Done!</h4>
            <p className="text-sm text-gray-600">
              Click &ldquo;Complete Profile&rdquo; to finish your onboarding. Your profile will be submitted for review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
