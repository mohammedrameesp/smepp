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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, AlertTriangle, User, Briefcase, Shield, Mail, Building2, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { createUserSchema, type CreateUserInput } from '@/features/users/validations/users';

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
  const [, setLoadingModules] = useState(true);

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
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(debouncedEmail)) {
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
        const response = await fetch('/api/admin/organization');
        if (response.ok) {
          const data = await response.json();
          setEnabledModules(data.organization?.enabledModules || []);
          setAuthConfig(data.authConfig || null);
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

  // Role descriptions - simplified
  const roleDescriptions: Record<string, string> = {
    EMPLOYEE: 'Can submit requests but cannot approve',
    MANAGER: 'Can approve team requests',
    HR_MANAGER: 'Can approve leave and HR requests',
    FINANCE_MANAGER: 'Can approve purchases and budgets',
    DIRECTOR: 'Can approve high-value requests',
    ADMIN: 'Full approval authority',
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
                <User className="h-5 w-5 text-slate-600" />
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
                      <Mail className="h-4 w-4" />
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
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      ) : emailCheckResult?.available ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : emailCheckResult && !emailCheckResult.available && !emailCheckResult.canProceed ? (
                        <XCircle className="h-4 w-4 text-red-500" />
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
                <Briefcase className="h-5 w-5 text-slate-600" />
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
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                    {errors.employeeId && (
                      <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Auto-generated. Edit if needed.
                    </p>
                  </div>

                  {/* Designation */}
                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      type="text"
                      {...register('designation')}
                      placeholder="e.g. Software Engineer, Project Manager"
                      className={errors.designation ? 'border-red-500' : ''}
                    />
                    {errors.designation && (
                      <p className="text-sm text-red-500">{errors.designation.message}</p>
                    )}
                  </div>

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
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    Non-employee users only appear in team management, not in HR features like payroll or leave.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Section 3: Role & Permissions */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-lg">Role & Permissions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Approval Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Approval Role</Label>
                <Select
                  value={watch('role') || ''}
                  onValueChange={(value) => setValue('role', value as CreateUserInput['role'])}
                >
                  <SelectTrigger id="role" className={errors.role ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                    <SelectItem value="MANAGER">Manager</SelectItem>
                    <SelectItem value="HR_MANAGER">HR Manager</SelectItem>
                    <SelectItem value="FINANCE_MANAGER">Finance Manager</SelectItem>
                    <SelectItem value="DIRECTOR">Director</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-red-500">{errors.role.message}</p>
                )}
                {role && (
                  <p className="text-sm text-muted-foreground">
                    {roleDescriptions[role]}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Info Alert */}
          {canLogin && isEmployee && (
            <Alert className="bg-slate-50 border-slate-200">
              <Building2 className="h-4 w-4 text-slate-600" />
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
