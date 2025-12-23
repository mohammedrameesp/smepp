'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';
import { ArrowLeft, RefreshCw } from 'lucide-react';
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
    },
    mode: 'onChange',
  });

  const role = watch('role');

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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Link href="/admin/employees">
              <Button variant="outline" size="sm" className="mb-4">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Employees
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Add New Employee</h1>
            <p className="text-gray-600">
              Add a new employee to the system. They will authenticate using Azure AD or the configured provider.
            </p>
          </div>

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

                {/* Email */}
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
                      <SelectItem value="TEMP_STAFF">Temporary Staff</SelectItem>
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

                {/* Info Alert */}
                {role !== 'TEMP_STAFF' && (
                  <Alert>
                    <AlertDescription>
                      <strong>Note:</strong> Employees will authenticate using Azure AD or the configured OAuth provider.
                      No password is set here. On first login, their account will be activated and they will be prompted to complete their HR profile.
                    </AlertDescription>
                  </Alert>
                )}

                {role === 'TEMP_STAFF' && (
                  <Alert>
                    <AlertDescription>
                      <strong>Temporary Staff:</strong> This employee will appear in assignment dropdowns but will not be able to log in to the system.
                      Use a placeholder email (e.g., temp.name@company.local) if they don&apos;t have an actual company email.
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
        </div>
      </div>
    </div>
  );
}
