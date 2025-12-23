'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DatePicker } from '@/components/ui/date-picker';
import { BirthDatePicker } from '@/components/ui/birth-date-picker';
import { ChevronDown, ChevronUp, User, Phone, AlertTriangle, CreditCard, Briefcase, Building2, GraduationCap, FileText, Info, Loader2 } from 'lucide-react';

import { hrProfileSchema, type HRProfileInput } from '@/lib/validations/hr-profile';
import {
  COUNTRIES,
  QATAR_BANKS,
  RELATIONSHIPS,
  QUALIFICATIONS,
  SPONSORSHIP_TYPES,
  GENDERS,
  MARITAL_STATUS,
  LANGUAGES,
} from '@/lib/data/constants';
import { PhoneInput, QatarPhoneInput } from './phone-input';
import { DocumentUpload } from './document-upload';
import { MultiSelectTags, TagsInput } from './multi-select-tags';
import { ExpiryBadge, ExpiryIndicator } from './expiry-badge';

interface HRProfileFormProps {
  initialData?: Partial<HRProfileInput> & { workEmail?: string; isAdmin?: boolean; userId?: string };
  isAdmin?: boolean;
  userId?: string; // If provided, save to this user's profile (admin editing another user)
  onSave?: () => void;
}

// Helper to format date for DatePicker
const formatDateForPicker = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
};

// Helper to parse JSON array from string
const parseJsonArray = (value: string | null | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export function HRProfileForm({ initialData, isAdmin = false, userId, onSave }: HRProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    contact: false,
    emergency: false,
    identification: false,
    employment: false,
    bank: false,
    education: false,
    documents: false,
    additional: false,
  });

  const form = useForm<HRProfileInput>({
    resolver: zodResolver(hrProfileSchema) as any,
    mode: 'onChange',
    defaultValues: {
      dateOfBirth: formatDateForPicker(initialData?.dateOfBirth),
      gender: initialData?.gender || '',
      maritalStatus: initialData?.maritalStatus || '',
      nationality: initialData?.nationality || '',
      qatarMobile: initialData?.qatarMobile || '',
      otherMobileCode: initialData?.otherMobileCode || '+961',
      otherMobileNumber: initialData?.otherMobileNumber || '',
      personalEmail: initialData?.personalEmail || '',
      qatarZone: initialData?.qatarZone || '',
      qatarStreet: initialData?.qatarStreet || '',
      qatarBuilding: initialData?.qatarBuilding || '',
      qatarUnit: initialData?.qatarUnit || '',
      homeCountryAddress: initialData?.homeCountryAddress || '',
      localEmergencyName: initialData?.localEmergencyName || '',
      localEmergencyRelation: initialData?.localEmergencyRelation || '',
      localEmergencyPhoneCode: initialData?.localEmergencyPhoneCode || '+974',
      localEmergencyPhone: initialData?.localEmergencyPhone || '',
      homeEmergencyName: initialData?.homeEmergencyName || '',
      homeEmergencyRelation: initialData?.homeEmergencyRelation || '',
      homeEmergencyPhoneCode: initialData?.homeEmergencyPhoneCode || '+961',
      homeEmergencyPhone: initialData?.homeEmergencyPhone || '',
      qidNumber: initialData?.qidNumber || '',
      qidExpiry: formatDateForPicker(initialData?.qidExpiry),
      passportNumber: initialData?.passportNumber || '',
      passportExpiry: formatDateForPicker(initialData?.passportExpiry),
      healthCardExpiry: formatDateForPicker(initialData?.healthCardExpiry),
      sponsorshipType: initialData?.sponsorshipType || '',
      employeeId: initialData?.employeeId || '',
      designation: initialData?.designation || '',
      dateOfJoining: formatDateForPicker(initialData?.dateOfJoining),
      bankName: initialData?.bankName || '',
      iban: initialData?.iban || '',
      highestQualification: initialData?.highestQualification || '',
      specialization: initialData?.specialization || '',
      institutionName: initialData?.institutionName || '',
      graduationYear: initialData?.graduationYear || null,
      qidUrl: initialData?.qidUrl || '',
      passportCopyUrl: initialData?.passportCopyUrl || '',
      photoUrl: initialData?.photoUrl || '',
      contractCopyUrl: initialData?.contractCopyUrl || '',
      hasDrivingLicense: initialData?.hasDrivingLicense || false,
      licenseExpiry: formatDateForPicker(initialData?.licenseExpiry),
      languagesKnown: initialData?.languagesKnown || '[]',
      skillsCertifications: initialData?.skillsCertifications || '[]',
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = form;

  // Watch values for conditional rendering
  const hasDrivingLicense = watch('hasDrivingLicense');
  const qidExpiry = watch('qidExpiry');
  const passportExpiry = watch('passportExpiry');
  const healthCardExpiry = watch('healthCardExpiry');
  const licenseExpiry = watch('licenseExpiry');

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const onSubmit = async (data: HRProfileInput) => {
    setIsLoading(true);
    try {
      // Use the specific user's endpoint if userId is provided (admin editing another user)
      // Otherwise use the current user's endpoint
      const endpoint = userId ? `/api/users/${userId}/hr-profile` : '/api/users/me/hr-profile';
      const response = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save profile');
      }

      toast.success('Profile saved successfully');
      onSave?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save profile');
    } finally {
      setIsLoading(false);
    }
  };

  const SectionCard = ({
    id,
    title,
    description,
    icon: Icon,
    children,
    badge,
  }: {
    id: string;
    title: string;
    description: string;
    icon: React.ElementType;
    children: React.ReactNode;
    badge?: React.ReactNode;
  }) => (
    <Card>
      <Collapsible open={openSections[id]} onOpenChange={() => toggleSection(id)}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Icon className="h-5 w-5 text-gray-600" />
                <div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {badge}
                {openSections[id] ? (
                  <ChevronUp className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">{children}</CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-4">
      {/* Section 1: Personal Information */}
      <SectionCard
        id="personal"
        title="Personal Information"
        description="Basic personal details"
        icon={User}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <BirthDatePicker
              id="dateOfBirth"
              value={watch('dateOfBirth') || ''}
              onChange={(val) => setValue('dateOfBirth', val, { shouldDirty: true })}
              placeholder="Select date of birth"
              maxDate={new Date()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Gender</Label>
            <Select
              value={watch('gender') || ''}
              onValueChange={(val) => setValue('gender', val, { shouldDirty: true })}
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
              value={watch('maritalStatus') || ''}
              onValueChange={(val) => setValue('maritalStatus', val, { shouldDirty: true })}
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
            <Label htmlFor="nationality">Nationality</Label>
            <Select
              value={watch('nationality') || ''}
              onValueChange={(val) => setValue('nationality', val, { shouldDirty: true })}
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
      </SectionCard>

      {/* Section 2: Contact Information */}
      <SectionCard
        id="contact"
        title="Contact Information"
        description="Phone numbers and addresses"
        icon={Phone}
      >
        <div className="space-y-6">
          {/* Phone Numbers */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Qatar Mobile Number</Label>
              <QatarPhoneInput
                value={watch('qatarMobile') || ''}
                onChange={(val) => setValue('qatarMobile', val, { shouldDirty: true })}
                placeholder="12345678"
                error={errors.qatarMobile?.message}
              />
            </div>

            <div className="space-y-2">
              <Label>Other Mobile Number</Label>
              <PhoneInput
                codeValue={watch('otherMobileCode') || '+91'}
                numberValue={watch('otherMobileNumber') || ''}
                onCodeChange={(val) => setValue('otherMobileCode', val, { shouldDirty: true })}
                onNumberChange={(val) => setValue('otherMobileNumber', val, { shouldDirty: true })}
                numberPlaceholder="Phone number"
                error={errors.otherMobileNumber?.message}
              />
            </div>
          </div>

          {/* Email */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="personalEmail">Personal Email</Label>
              <Input
                id="personalEmail"
                type="email"
                {...register('personalEmail')}
                placeholder="personal@email.com"
              />
              {errors.personalEmail && (
                <p className="text-sm text-red-600">{errors.personalEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Work Email</Label>
              <Input
                value={initialData?.workEmail || ''}
                disabled
                className="bg-gray-50"
              />
              <p className="text-xs text-gray-500">From authentication (read-only)</p>
            </div>
          </div>

          {/* Qatar Address */}
          <div>
            <Label className="text-base font-medium mb-3 block">Qatar Address</Label>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qatarZone" className="text-sm">Zone</Label>
                <Input id="qatarZone" {...register('qatarZone')} placeholder="e.g., 45" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qatarStreet" className="text-sm">Street No.</Label>
                <Input id="qatarStreet" {...register('qatarStreet')} placeholder="e.g., 123" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qatarBuilding" className="text-sm">Building No.</Label>
                <Input id="qatarBuilding" {...register('qatarBuilding')} placeholder="e.g., 15" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qatarUnit" className="text-sm">Unit/Flat</Label>
                <Input id="qatarUnit" {...register('qatarUnit')} placeholder="e.g., 5A" />
              </div>
            </div>
          </div>

          {/* Home Country Address */}
          <div className="space-y-2">
            <Label htmlFor="homeCountryAddress">Home Country Address</Label>
            <Textarea
              id="homeCountryAddress"
              {...register('homeCountryAddress')}
              placeholder="Full address in home country"
              rows={3}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 3: Emergency Contacts */}
      <SectionCard
        id="emergency"
        title="Emergency Contacts"
        description="Local and home country contacts"
        icon={AlertTriangle}
      >
        <div className="space-y-6">
          {/* Local Emergency Contact */}
          <div>
            <Label className="text-base font-medium mb-3 block">Local Emergency Contact (Qatar)</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="localEmergencyName" className="text-sm">Contact Name</Label>
                <Input
                  id="localEmergencyName"
                  {...register('localEmergencyName')}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="localEmergencyRelation" className="text-sm">Relationship</Label>
                <Select
                  value={watch('localEmergencyRelation') || ''}
                  onValueChange={(val) => setValue('localEmergencyRelation', val, { shouldDirty: true })}
                >
                  <SelectTrigger id="localEmergencyRelation">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm">Phone</Label>
                <PhoneInput
                  codeValue={watch('localEmergencyPhoneCode') || '+974'}
                  numberValue={watch('localEmergencyPhone') || ''}
                  onCodeChange={(val) => setValue('localEmergencyPhoneCode', val, { shouldDirty: true })}
                  onNumberChange={(val) => setValue('localEmergencyPhone', val, { shouldDirty: true })}
                  error={errors.localEmergencyPhone?.message}
                />
              </div>
            </div>
          </div>

          {/* Home Country Emergency Contact */}
          <div>
            <Label className="text-base font-medium mb-3 block">Home Country Emergency Contact</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="homeEmergencyName" className="text-sm">Contact Name</Label>
                <Input
                  id="homeEmergencyName"
                  {...register('homeEmergencyName')}
                  placeholder="Full name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="homeEmergencyRelation" className="text-sm">Relationship</Label>
                <Select
                  value={watch('homeEmergencyRelation') || ''}
                  onValueChange={(val) => setValue('homeEmergencyRelation', val, { shouldDirty: true })}
                >
                  <SelectTrigger id="homeEmergencyRelation">
                    <SelectValue placeholder="Select relationship" />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIPS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm">Phone</Label>
                <PhoneInput
                  codeValue={watch('homeEmergencyPhoneCode') || '+91'}
                  numberValue={watch('homeEmergencyPhone') || ''}
                  onCodeChange={(val) => setValue('homeEmergencyPhoneCode', val, { shouldDirty: true })}
                  onNumberChange={(val) => setValue('homeEmergencyPhone', val, { shouldDirty: true })}
                  error={errors.homeEmergencyPhone?.message}
                />
              </div>
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 4: Identification & Legal */}
      <SectionCard
        id="identification"
        title="Identification & Legal"
        description="QID, passport, and visa details"
        icon={CreditCard}
        badge={
          <>
            <ExpiryIndicator date={qidExpiry} />
            <ExpiryIndicator date={passportExpiry} />
            <ExpiryIndicator date={healthCardExpiry} />
          </>
        }
      >
        <div className="space-y-6">
          {/* QID */}
          <div>
            <Label className="text-base font-medium mb-3 block">Qatar ID (QID)</Label>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qidNumber" className="text-sm">QID Number</Label>
                <Input
                  id="qidNumber"
                  {...register('qidNumber')}
                  placeholder="28412345678"
                  maxLength={11}
                />
                {errors.qidNumber && (
                  <p className="text-sm text-red-600">{errors.qidNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="qidExpiry" className="text-sm">QID Expiry Date</Label>
                <div className="flex items-center gap-2">
                  <DatePicker
                    id="qidExpiry"
                    value={watch('qidExpiry') || ''}
                    onChange={(val) => setValue('qidExpiry', val, { shouldDirty: true })}
                    placeholder="DD/MM/YYYY"
                  />
                  <ExpiryBadge date={qidExpiry} />
                </div>
              </div>
            </div>
          </div>

          {/* Passport */}
          <div>
            <Label className="text-base font-medium mb-3 block">Passport</Label>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passportNumber" className="text-sm">Passport Number</Label>
                <Input
                  id="passportNumber"
                  {...register('passportNumber')}
                  placeholder="AB1234567"
                />
                {errors.passportNumber && (
                  <p className="text-sm text-red-600">{errors.passportNumber.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="passportExpiry" className="text-sm">Expiry Date</Label>
                <div className="flex items-center gap-2">
                  <DatePicker
                    id="passportExpiry"
                    value={watch('passportExpiry') || ''}
                    onChange={(val) => setValue('passportExpiry', val, { shouldDirty: true })}
                    placeholder="DD/MM/YYYY"
                  />
                  <ExpiryBadge date={passportExpiry} />
                </div>
              </div>
            </div>
          </div>

          {/* Health Card */}
          <div>
            <Label className="text-base font-medium mb-3 block">Health Card</Label>
            <div className="space-y-2">
              <Label htmlFor="healthCardExpiry" className="text-sm">Expiry Date</Label>
              <div className="flex items-center gap-2">
                <DatePicker
                  id="healthCardExpiry"
                  value={watch('healthCardExpiry') || ''}
                  onChange={(val) => setValue('healthCardExpiry', val, { shouldDirty: true })}
                  placeholder="DD/MM/YYYY"
                />
                <ExpiryBadge date={healthCardExpiry} />
              </div>
            </div>
          </div>

          {/* Sponsorship */}
          <div className="space-y-2">
            <Label htmlFor="sponsorshipType">Sponsorship Type</Label>
            <Select
              value={watch('sponsorshipType') || ''}
              onValueChange={(val) => setValue('sponsorshipType', val, { shouldDirty: true })}
            >
              <SelectTrigger id="sponsorshipType">
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
      </SectionCard>

      {/* Section 5: Employment Information */}
      <SectionCard
        id="employment"
        title="Employment Information"
        description="Job details"
        icon={Briefcase}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              {...register('employeeId')}
              placeholder="EMP001"
              disabled={!isAdmin}
              className={!isAdmin ? 'bg-gray-50' : ''}
            />
            {!isAdmin && (
              <p className="text-xs text-gray-500">Admin only field</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="designation">Designation</Label>
            <Input
              id="designation"
              {...register('designation')}
              placeholder="e.g., Software Engineer"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfJoining">Date of Joining</Label>
            <DatePicker
              id="dateOfJoining"
              value={watch('dateOfJoining') || ''}
              onChange={(val) => setValue('dateOfJoining', val, { shouldDirty: true })}
              placeholder="DD/MM/YYYY"
              maxDate={new Date()}
            />
          </div>
        </div>
      </SectionCard>

      {/* Section 6: Bank & Payroll */}
      <SectionCard
        id="bank"
        title="Bank & Payroll"
        description="Banking details for salary"
        icon={Building2}
      >
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Select
              value={watch('bankName') || ''}
              onValueChange={(val) => setValue('bankName', val, { shouldDirty: true })}
            >
              <SelectTrigger id="bankName">
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
            <Label htmlFor="iban">IBAN</Label>
            <Input
              id="iban"
              {...register('iban')}
              placeholder="QA12ABCD123456789012345678901"
            />
            {errors.iban && (
              <p className="text-sm text-red-600">{errors.iban.message}</p>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Section 7: Education */}
      <SectionCard
        id="education"
        title="Education"
        description="Qualifications and academic background"
        icon={GraduationCap}
      >
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="highestQualification">Highest Qualification</Label>
              <Select
                value={watch('highestQualification') || ''}
                onValueChange={(val) => setValue('highestQualification', val, { shouldDirty: true })}
              >
                <SelectTrigger id="highestQualification">
                  <SelectValue placeholder="Select qualification" />
                </SelectTrigger>
                <SelectContent>
                  {QUALIFICATIONS.map((q) => (
                    <SelectItem key={q} value={q}>{q}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specialization">Specialization/Major</Label>
              <Input
                id="specialization"
                {...register('specialization')}
                placeholder="e.g., Computer Science"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="institutionName">Institution Name</Label>
              <Input
                id="institutionName"
                {...register('institutionName')}
                placeholder="e.g., University of Qatar"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="graduationYear">Year of Graduation</Label>
              <Input
                id="graduationYear"
                type="number"
                min={1950}
                max={new Date().getFullYear()}
                {...register('graduationYear', { valueAsNumber: true })}
                placeholder={`e.g., ${new Date().getFullYear() - 5}`}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Section 8: Documents */}
      <SectionCard
        id="documents"
        title="Documents"
        description="Upload required documents"
        icon={FileText}
      >
        <div className="grid md:grid-cols-2 gap-6">
          <DocumentUpload
            id="qidCopy"
            label="QID Copy"
            value={watch('qidUrl')}
            onChange={(url) => setValue('qidUrl', url, { shouldDirty: true })}
            accept="image/jpeg,image/png,application/pdf"
            description="JPG, PNG or PDF, max 5MB"
          />

          <DocumentUpload
            id="passportCopy"
            label="Passport Copy"
            value={watch('passportCopyUrl')}
            onChange={(url) => setValue('passportCopyUrl', url, { shouldDirty: true })}
            accept="image/jpeg,image/png,application/pdf"
            description="JPG, PNG or PDF, max 5MB"
          />

          <DocumentUpload
            id="photo"
            label="Photo (Passport Size)"
            value={watch('photoUrl')}
            onChange={(url) => setValue('photoUrl', url, { shouldDirty: true })}
            accept="image/jpeg,image/png"
            description="JPG or PNG, max 5MB"
          />

          {/* Contract hidden for now - will be added later
          <DocumentUpload
            id="contractCopy"
            label="Contract Copy"
            value={watch('contractCopyUrl')}
            onChange={(url) => setValue('contractCopyUrl', url, { shouldDirty: true })}
            accept="application/pdf"
            description="PDF only, max 5MB"
          />
          */}
        </div>
      </SectionCard>

      {/* Section 9: Additional Info */}
      <SectionCard
        id="additional"
        title="Additional Information"
        description="Driving license, languages, and skills"
        icon={Info}
        badge={hasDrivingLicense && <ExpiryIndicator date={licenseExpiry} />}
      >
        <div className="space-y-6">
          {/* Driving License */}
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                id="hasDrivingLicense"
                checked={hasDrivingLicense}
                onCheckedChange={(checked) =>
                  setValue('hasDrivingLicense', checked as boolean, { shouldDirty: true })
                }
              />
              <Label htmlFor="hasDrivingLicense">I have a Qatar Driving License</Label>
            </div>

            {hasDrivingLicense && (
              <div className="pl-6 border-l-2 border-gray-200">
                <div className="space-y-2">
                  <Label htmlFor="licenseExpiry">License Expiry Date</Label>
                  <div className="flex items-center gap-2">
                    <DatePicker
                      id="licenseExpiry"
                      value={watch('licenseExpiry') || ''}
                      onChange={(val) => setValue('licenseExpiry', val, { shouldDirty: true })}
                      placeholder="DD/MM/YYYY"
                    />
                    <ExpiryBadge date={licenseExpiry} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Languages */}
          <div className="space-y-2">
            <Label>Languages Known</Label>
            <MultiSelectTags
              options={LANGUAGES}
              value={parseJsonArray(watch('languagesKnown'))}
              onChange={(values) =>
                setValue('languagesKnown', JSON.stringify(values), { shouldDirty: true })
              }
              placeholder="Select or type languages"
              allowCustom
            />
          </div>

          {/* Skills & Certifications */}
          <div className="space-y-2">
            <Label>Skills & Certifications</Label>
            <TagsInput
              value={parseJsonArray(watch('skillsCertifications'))}
              onChange={(values) =>
                setValue('skillsCertifications', JSON.stringify(values), { shouldDirty: true })
              }
              placeholder="Type skill and press Enter"
            />
            <p className="text-xs text-gray-500">
              Add certifications like PMP, AWS, CPA, etc.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Save Button */}
      <div className="flex justify-end gap-4 pt-4">
        <Button
          type="submit"
          disabled={isLoading || !isDirty}
          className="min-w-[120px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </div>
    </form>
  );
}
