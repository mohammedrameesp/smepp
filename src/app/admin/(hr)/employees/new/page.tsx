'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw, AlertTriangle, User, Briefcase, Shield, Mail, Building2 } from 'lucide-react';
import { createUserSchema, type CreateUserInput } from '@/lib/validations/users';

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [nextEmployeeCode, setNextEmployeeCode] = useState<string>('');
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateUserInput>({
    resolver: zodResolver(createUserSchema) as any,
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

  // Check if payroll module is enabled
  const isPayrollEnabled = enabledModules.includes('payroll');

  // Fetch enabled modules on mount
  useEffect(() => {
    async function fetchModules() {
      try {
        const response = await fetch('/api/admin/organization');
        if (response.ok) {
          const data = await response.json();
          setEnabledModules(data.enabledModules || []);
        }
      } catch (err) {
        console.error('Failed to fetch organization settings:', err);
      } finally {
        setLoadingModules(false);
      }
    }
    fetchModules();
  }, []);

  // Generate next employee code when isEmployee is enabled
  useEffect(() => {
    if (isEmployee && !nextEmployeeCode) {
      generateNextEmployeeCode();
    }
  }, [isEmployee]);

  const generateNextEmployeeCode = async () => {
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
  };

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
          { label: 'Employees', href: '/admin/employees' },
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

              {/* Can Login Toggle */}
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

              {/* Email - only shown when canLogin is true */}
              {canLogin && (
                <div className="space-y-2">
                  <Label htmlFor="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Address <span className="text-red-500">*</span>
                    </div>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="name@company.com"
                    className={errors.email ? 'border-red-500' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-red-500">{errors.email.message}</p>
                  )}
                  <p className="text-sm text-muted-foreground">
                    Used for login (email/password or Google/Microsoft)
                  </p>
                </div>
              )}

              {!canLogin && (
                <Alert className="bg-slate-50 border-slate-200">
                  <AlertDescription className="text-slate-700">
                    This person won&apos;t have system access. Useful for staff who don&apos;t need to log in (drivers, laborers, etc.)
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
                  onValueChange={(value) => setValue('role', value as any)}
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
                This employee can log in using the authentication method configured for your organization. On first login, they&apos;ll be prompted to complete their profile.
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
