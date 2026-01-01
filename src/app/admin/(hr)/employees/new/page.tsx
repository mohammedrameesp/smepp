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
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { createUserSchema, type CreateUserInput } from '@/lib/validations/users';

export default function NewEmployeePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [nextEmployeeCode, setNextEmployeeCode] = useState<string>('');

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

  // Generate next employee code on mount
  useEffect(() => {
    generateNextEmployeeCode();
  }, []);

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

  return (
    <>
      <PageHeader
        title="Add New Employee"
        subtitle="Add a new employee to the system. They will authenticate using Azure AD or the configured provider."
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: 'New Employee' },
        ]}
      />

      <PageContent className="max-w-2xl">
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
            <CardHeader>
              <CardTitle>Employee Information</CardTitle>
              <CardDescription>
                Enter the employee&apos;s details below. All fields are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    type="text"
                    {...register('name')}
                    placeholder="John Doe"
                    maxLength={100}
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500">{errors.name.message}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    The employee&apos;s full name as it should appear in the system
                  </p>
                </div>

                {/* Email - only shown when canLogin is true */}
                {canLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register('email')}
                      placeholder="john.doe@company.com"
                      className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500">{errors.email.message}</p>
                    )}
                    <p className="text-sm text-gray-500">
                      This email must match their Azure AD or OAuth provider email
                    </p>
                  </div>
                )}

                {/* Employee Code */}
                <div className="space-y-2">
                  <Label htmlFor="employeeId">Employee Code</Label>
                  <div className="flex gap-2">
                    <Input
                      id="employeeId"
                      type="text"
                      {...register('employeeId')}
                      placeholder="BCE-2024-001"
                      className={`flex-1 ${errors.employeeId ? 'border-red-500' : ''}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={generateNextEmployeeCode}
                      title="Generate next code"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  {errors.employeeId && (
                    <p className="text-sm text-red-500">{errors.employeeId.message}</p>
                  )}
                  <p className="text-sm text-gray-500">
                    Auto-generated employee code. You can edit if needed.
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
                  <p className="text-sm text-gray-500">
                    The employee&apos;s job title or position
                  </p>
                </div>

                {/* Role */}
                <div className="space-y-2">
                  <Label htmlFor="role">Role *</Label>
                  <Select
                    value={watch('role') || ''}
                    onValueChange={(value) => setValue('role', value as any)}
                  >
                    <SelectTrigger id="role" className={errors.role ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EMPLOYEE">Employee</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="EMPLOYEE">Temporary Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  {errors.role && (
                    <p className="text-sm text-red-500">{errors.role.message}</p>
                  )}
                  <div className="text-sm text-gray-500 space-y-1">
                    <div><strong>Employee:</strong> Can view and manage their own assigned assets/subscriptions</div>
                    <div><strong>Admin:</strong> Full access to all features and user management</div>
                    <div><strong>Temporary Staff:</strong> No login access, only appears in assignment dropdowns</div>
                  </div>
                </div>

                {/* User Type Toggles */}
                <div className="space-y-4 rounded-lg border p-4 bg-gray-50">
                  <h4 className="font-medium text-gray-900">User Type Settings</h4>

                  {/* Is Employee Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="isEmployee" className="text-base">Is an Employee</Label>
                      <p className="text-sm text-gray-500">
                        Appears in HR features (payroll, leave, employee lists)
                      </p>
                    </div>
                    <Switch
                      id="isEmployee"
                      checked={isEmployee}
                      onCheckedChange={(checked) => setValue('isEmployee', checked)}
                    />
                  </div>

                  {/* Can Login Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="canLogin" className="text-base">Can Log In</Label>
                      <p className="text-sm text-gray-500">
                        {canLogin
                          ? 'Will authenticate via Azure AD or OAuth'
                          : 'No login access - a system ID will be auto-generated'}
                      </p>
                    </div>
                    <Switch
                      id="canLogin"
                      checked={canLogin}
                      onCheckedChange={(checked) => {
                        setValue('canLogin', checked);
                        // Clear email when disabling login
                        if (!checked) {
                          setValue('email', '');
                        }
                      }}
                    />
                  </div>

                  {/* WPS Toggle - only show for employees */}
                  {isEmployee && (
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="isOnWps" className="text-base">On WPS</Label>
                        <p className="text-sm text-gray-500">
                          {isOnWps
                            ? 'Included in WPS (Wage Protection System) payroll files'
                            : 'Not included in WPS files - paid outside WPS'}
                        </p>
                      </div>
                      <Switch
                        id="isOnWps"
                        checked={isOnWps}
                        onCheckedChange={(checked) => setValue('isOnWps', checked)}
                      />
                    </div>
                  )}
                </div>

                {/* Warning Alerts */}
                {!isEmployee && (
                  <Alert className="border-amber-200 bg-amber-50">
                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-800">
                      <strong>Non-Employee User:</strong> This user will NOT appear in HR features like payroll, leave balances, or employee lists.
                      They will only appear in team management.
                    </AlertDescription>
                  </Alert>
                )}

                {!canLogin && (
                  <Alert>
                    <AlertDescription>
                      <strong>Non-Login Employee:</strong> This person will appear in dropdowns and HR features but cannot log in to the system.
                      Useful for drivers, laborers, or other staff who don&apos;t need system access.
                    </AlertDescription>
                  </Alert>
                )}

                {canLogin && isEmployee && (
                  <Alert>
                    <AlertDescription>
                      <strong>Note:</strong> This employee will authenticate using Azure AD or the configured OAuth provider.
                      On first login, their account will be activated and they will be prompted to complete their HR profile.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Buttons */}
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push('/admin/employees')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating...' : 'Create Employee'}
                  </Button>
                </div>
              </form>
            </CardContent>
        </Card>
      </PageContent>
    </>
  );
}
