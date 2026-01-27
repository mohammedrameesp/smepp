'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, AlertTriangle, User, Briefcase, Shield, Mail, Building2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { DepartmentSelect } from '@/components/ui/department-select';
import { ICON_SIZES } from '@/lib/constants';
import { cn } from '@/lib/core/utils';
import { createUserSchema, type CreateUserInput, USER_ROLES, ROLE_CONFIG, type UserRole } from '@/features/users/validations/users';
import { VALIDATION_PATTERNS } from '@/lib/validations/patterns';
import { DatePicker } from '@/components/ui/date-picker';
import { SPONSORSHIP_TYPES } from '@/lib/data/constants';
import { LocationSelect } from '@/components/ui/location-select';

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

interface EmailCheckResult {
  available: boolean;
  valid: boolean;
  reason?: string;
  message?: string;
  canProceed?: boolean;
}

interface AuthConfig {
  allowedMethods: string[];
  hasCredentials: boolean;
  hasSSO: boolean;
  hasCustomGoogleOAuth: boolean;
  hasCustomAzureOAuth: boolean;
}

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [, setNextEmployeeCode] = useState<string>('');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [authConfig, setAuthConfig] = useState<AuthConfig | null>(null);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  const [, setLoadingModules] = useState(true);
  const [managers, setManagers] = useState<{ id: string; name: string | null; email: string }[]>([]);

  // Email availability check state
  const [emailCheckResult, setEmailCheckResult] = useState<EmailCheckResult | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as Resolver<CreateUserInput>,
    defaultValues: {
      name: '',
      email: '',
      role: 'EMPLOYEE',
      employeeId: '',
      designation: '',
      department: '',
      dateOfJoining: '',
      workLocation: '',
      sponsorshipType: '',
      reportingToId: '',
      isEmployee: true,
      canLogin: true,
      isOnWps: true,
    },
    mode: 'onChange',
  });

  const role = watch('role');
  const isEmployee = watch('isEmployee');
  const canLogin = watch('canLogin');
  const isOnWps = watch('isOnWps');
  const email = watch('email');

  // Debounce email for availability check
  const debouncedEmail = useDebounce(email, 500);

  // Check if payroll module is enabled
  const isPayrollEnabled = enabledModules.includes('payroll');

  // Check email availability when email changes
  useEffect(() => {
    async function checkEmail() {
      if (!debouncedEmail || !canLogin) {
        setEmailCheckResult(null);
        return;
      }

      // Basic format validation before API call
      if (!VALIDATION_PATTERNS.email.test(debouncedEmail)) {
        setEmailCheckResult({
          available: false,
          valid: false,
          message: 'Please enter a valid email address',
        });
        return;
      }

      setCheckingEmail(true);
      try {
        const response = await fetch(`/api/admin/team/check-email?email=${encodeURIComponent(debouncedEmail)}`);
        if (response.ok) {
          const result = await response.json();
          setEmailCheckResult(result);
        }
      } catch (err) {
        console.error('Email check failed:', err);
      } finally {
        setCheckingEmail(false);
      }
    }

    checkEmail();
  }, [debouncedEmail, canLogin]);

  // Fetch organization settings (modules and auth config) on mount
  useEffect(() => {
    async function fetchOrgSettings() {
      try {
        const response = await fetch('/api/admin/organization', { cache: 'no-store' });
        if (response.ok) {
          const data = await response.json();
          setEnabledModules(data.organization?.enabledModules || []);
          setAuthConfig(data.authConfig || null);
          setHasMultipleLocations(data.organization?.hasMultipleLocations || false);
          // For SSO orgs, canLogin is always true (they need to authenticate)
          if (data.authConfig?.hasSSO) {
            setValue('canLogin', true);
          }
        }
      } catch (err) {
        console.error('Failed to fetch organization settings:', err);
      } finally {
        setLoadingModules(false);
      }
    }
    fetchOrgSettings();
  }, [setValue]);

  // Fetch managers (employees who can approve) for "Reports To" dropdown
  useEffect(() => {
    async function fetchManagers() {
      try {
        const response = await fetch('/api/employees?canApprove=true');
        if (response.ok) {
          const data = await response.json();
          setManagers(
            (data.employees || []).map((m: { id: string; name: string | null; email: string }) => ({
              id: m.id,
              name: m.name,
              email: m.email,
            }))
          );
        }
      } catch (err) {
        console.error('Failed to fetch managers:', err);
      }
    }
    fetchManagers();
  }, []);

  const generateNextEmployeeCode = useCallback(async () => {
    try {
      const response = await fetch('/api/employees/next-code');
      if (response.ok) {
        const data = await response.json();
        setNextEmployeeCode(data.nextCode);
        setValue('employeeId', data.nextCode);
      }
    } catch (err) {
      console.error('Failed to generate employee code:', err);
    }
  }, [setValue]);

  // Use ref to track if we've already generated the code
  const hasGeneratedCodeRef = useRef(false);

  // Generate next employee code when isEmployee is enabled
  useEffect(() => {
    if (isEmployee && !hasGeneratedCodeRef.current) {
      hasGeneratedCodeRef.current = true;
      generateNextEmployeeCode();
    }
  }, [isEmployee, generateNextEmployeeCode]);

  const onSubmit = async (data: CreateUserInput) => {
    setError(null);

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.details ? `${result.error}: ${result.details}` : result.error;
        throw new Error(errorMessage || 'Failed to create employee');
      }

      // Redirect to employees list
      router.push('/admin/employees');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create employee');
    }
  };


  return (
    <>
      <PageHeader
        title="Add New Team Member"
        subtitle="Add a new person to your organization"
        breadcrumbs={[
          { label: 'Team', href: '/admin/employees' },
          { label: 'New' },
        ]}
      />

      <PageContent className="max-w-2xl">
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Section 1: Basic Information */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <User className={cn(ICON_SIZES.md, "text-slate-600")} />
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  type="text"
                  {...register('name')}
                  placeholder="Enter full name"
                  maxLength={100}
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              {/* Can Login Toggle - Only show for credentials-only orgs */}
              {/* For SSO orgs, canLogin is always true (they authenticate via SSO) */}
              {!authConfig?.hasSSO && (
                <div className="flex items-center justify-between py-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="canLogin" className="text-base font-medium">System Access</Label>
                    <p className="text-sm text-muted-foreground">
                      Can this person log in to the system?
                    </p>
                  </div>
                  <Switch
                    id="canLogin"
                    checked={canLogin}
                    onCheckedChange={(checked) => {
                      setValue('canLogin', checked);
                      if (!checked) {
                        setValue('email', '');
                        setEmailCheckResult(null);
                      }
                    }}
                  />
                </div>
              )}

              {/* Email - only shown when canLogin is true */}
              {canLogin && (
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <div className="flex items-center gap-2">
                      <Mail className={ICON_SIZES.sm} />
                      Email Address <span className="text-red-500">*</span>
                    </div>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="name@company.com"
                      className={`pr-10 ${
                        errors.email || (emailCheckResult && !emailCheckResult.available && !emailCheckResult.canProceed)
                          ? 'border-red-500'
                          : emailCheckResult?.available
                          ? 'border-green-500'
                          : ''
                      }`}
                    />
                    {/* Email check status indicator */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      {checkingEmail ? (
                        <Loader2 className={cn(ICON_SIZES.sm, "animate-spin text-muted-foreground")} />
                      ) : emailCheckResult?.available ? (
                        <CheckCircle className={cn(ICON_SIZES.sm, "text-green-500")} />
                      ) : emailCheckResult && !emailCheckResult.available && !emailCheckResult.canProceed ? (
                        <XCircle className={cn(ICON_SIZES.sm, "text-red-500")} />
                      ) : null}
                    </div>
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                  {/* Email check result message */}
                  {emailCheckResult && !errors.email && (
                    <p className={`text-sm ${
                      emailCheckResult.available
                        ? 'text-green-600'
                        : emailCheckResult.canProceed
                        ? 'text-amber-600'
                        : 'text-red-500'
                    }`}>
                      {emailCheckResult.available
                        ? 'Email is available'
                        : emailCheckResult.message
                      }
                    </p>
                  )}
                  {!emailCheckResult && !errors.email && (
                    <p className="text-sm text-muted-foreground">
                      {authConfig?.hasSSO
                        ? `Used for login via ${authConfig.hasCustomGoogleOAuth && authConfig.hasCustomAzureOAuth ? 'Google or Microsoft' : authConfig.hasCustomGoogleOAuth ? 'Google' : 'Microsoft'}`
                        : 'Used for login (email will receive password setup link)'
                      }
                    </p>
                  )}
                </div>
              )}

              {!canLogin && (
                <Alert className="bg-slate-50 border-slate-200">
                  <AlertDescription className="text-slate-700">
                    This person won&apos;t have system access. Useful for staff who don&apos;t need to log in (drivers, labourers, etc.)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Section 2: Employee Settings */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Briefcase className={cn(ICON_SIZES.md, "text-slate-600")} />
                <CardTitle className="text-lg">Employee Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Is Employee Checkbox */}
              <div className="flex items-start gap-3 py-2">
                <Checkbox
                  id="isEmployee"
                  checked={isEmployee}
                  onCheckedChange={(checked) => {
                    setValue('isEmployee', checked as boolean);
                    // Reset WPS when unchecking employee
                    if (!checked) {
                      setValue('isOnWps', false);
                      // If current role is EMPLOYEE, switch to OPERATIONS (service account default)
                      if (role === 'EMPLOYEE') {
                        setValue('role', 'OPERATIONS');
                      }
                    } else {
                      setValue('isOnWps', true);
                    }
                  }}
                  className="mt-0.5"
                />
                <div className="space-y-1">
                  <Label htmlFor="isEmployee" className="text-base font-medium cursor-pointer">
                    Add as Employee
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Include in HR features: employee list, leave management, payroll
                  </p>
                </div>
              </div>

              {/* Employee-specific fields - only shown when isEmployee is true */}
              {isEmployee && (
                <div className="space-y-4 pt-2 border-t">
                  {/* Employee Code */}
                  <div className="space-y-2 pt-4">
                    <Label htmlFor="employeeId">Employee Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="employeeId"
                        type="text"
                        {...register('employeeId')}
                        placeholder="Auto-generated"
                        className={`flex-1 ${errors.employeeId ? 'border-red-500' : ''}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={generateNextEmployeeCode}
                        title="Regenerate code"
                      >
                        <RefreshCw className={ICON_SIZES.sm} />
                      </Button>
                    </div>
                    {errors.employeeId && (
                      <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Auto-generated. Edit if needed.
                    </p>
                  </div>

                  {/* Designation & Department */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="designation">Designation</Label>
                      <Input
                        id="designation"
                        type="text"
                        {...register('designation')}
                        placeholder="e.g. Software Engineer"
                        className={errors.designation ? 'border-red-500' : ''}
                      />
                      {errors.designation && (
                        <p className="text-sm text-red-500">{errors.designation.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="department">Department</Label>
                      <DepartmentSelect
                        id="department"
                        value={watch('department') || ''}
                        onChange={(val) => setValue('department', val)}
                        placeholder="Select or type department"
                        className={errors.department ? 'border-red-500' : ''}
                      />
                      {errors.department && (
                        <p className="text-sm text-red-500">{errors.department.message}</p>
                      )}
                    </div>
                  </div>

                  {/* Date of Joining & Work Location */}
                  <div className={`grid grid-cols-1 ${hasMultipleLocations ? 'md:grid-cols-2' : ''} gap-4`}>
                    <div className="space-y-2">
                      <Label htmlFor="dateOfJoining">Date of Joining</Label>
                      <DatePicker
                        id="dateOfJoining"
                        value={watch('dateOfJoining') || ''}
                        onChange={(val) => setValue('dateOfJoining', val)}
                        placeholder="DD/MM/YYYY"
                        maxDate={new Date()}
                      />
                    </div>
                    {hasMultipleLocations && (
                      <div className="space-y-2">
                        <Label htmlFor="workLocation">Work Location</Label>
                        <LocationSelect
                          id="workLocation"
                          value={watch('workLocation') || ''}
                          onChange={(val) => setValue('workLocation', val)}
                          placeholder="Select location"
                        />
                      </div>
                    )}
                  </div>

                  {/* Sponsorship Type */}
                  <div className="space-y-2">
                    <Label htmlFor="sponsorshipType">Sponsorship Type</Label>
                    <Select
                      value={watch('sponsorshipType') || ''}
                      onValueChange={(val) => setValue('sponsorshipType', val)}
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

                  {/* Reports To - only show if there are managers */}
                  {managers.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="reportingToId">Reports To</Label>
                      <Select
                        value={watch('reportingToId') || 'none'}
                        onValueChange={(val) => setValue('reportingToId', val === 'none' ? '' : val)}
                      >
                        <SelectTrigger id="reportingToId">
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No manager</SelectItem>
                          {managers.map((manager) => (
                            <SelectItem key={manager.id} value={manager.id}>
                              {manager.name || 'Unnamed'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">
                        Who does this person report to?
                      </p>
                    </div>
                  )}

                  {/* WPS Checkbox - only show if payroll module is enabled */}
                  {isPayrollEnabled && (
                    <div className="flex items-start gap-3 py-2">
                      <Checkbox
                        id="isOnWps"
                        checked={isOnWps}
                        onCheckedChange={(checked) => setValue('isOnWps', checked as boolean)}
                        className="mt-0.5"
                      />
                      <div className="space-y-1">
                        <Label htmlFor="isOnWps" className="text-base font-medium cursor-pointer">
                          On WPS
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          Include in Wage Protection System payroll
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!isEmployee && (
                <Alert className="border-amber-200 bg-amber-50">
                  <AlertTriangle className={cn(ICON_SIZES.sm, "text-amber-600")} />
                  <AlertDescription className="text-amber-800">
                    Service accounts only appear in team management, not in HR features like payroll or leave.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Role & Permissions - only show when system access is enabled */}
          {canLogin && (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Shield className={cn(ICON_SIZES.md, "text-slate-600")} />
                <CardTitle className="text-lg">Role & Permissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select
                  value={role}
                  onValueChange={(value) => setValue('role', value as UserRole)}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    {USER_ROLES
                      .filter((roleOption) => isEmployee || roleOption !== 'EMPLOYEE')
                      .map((roleOption) => (
                      <SelectItem key={roleOption} value={roleOption}>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${ROLE_CONFIG[roleOption].color}`} />
                          <span>{ROLE_CONFIG[roleOption].label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {role && (
                  <p className="text-sm text-muted-foreground">
                    {ROLE_CONFIG[role as UserRole]?.description}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
          )}

          {/* Info Alert */}
          {canLogin && isEmployee && (
            <Alert className="bg-slate-50 border-slate-200">
              <Building2 className={cn(ICON_SIZES.sm, "text-slate-600")} />
              <AlertDescription className="text-slate-700">
                {authConfig?.hasSSO
                  ? `An invitation email will be sent. They can join by logging in with ${authConfig.hasCustomGoogleOAuth && authConfig.hasCustomAzureOAuth ? 'Google or Microsoft' : authConfig.hasCustomGoogleOAuth ? 'Google' : 'Microsoft'}.`
                  : 'A password setup email will be sent. On first login, they\'ll be prompted to complete their profile.'
                }
              </AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/employees')}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                checkingEmail ||
                !!(canLogin && emailCheckResult && !emailCheckResult.available && !emailCheckResult.canProceed)
              }
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
