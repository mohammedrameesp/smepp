'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { projectCreateSchema, type ProjectCreateInput } from '@/lib/validations/projects/project';

const PROJECT_STATUSES = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'ON_HOLD', label: 'On Hold' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const CLIENT_TYPES = [
  { value: 'INTERNAL', label: 'Internal' },
  { value: 'EXTERNAL', label: 'External Client' },
  { value: 'SUPPLIER', label: 'Supplier Project' },
];

export default function NewProjectPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm({
    resolver: zodResolver(projectCreateSchema) as any,
    defaultValues: {
      code: '',
      name: '',
      description: '',
      status: 'PLANNING',
      clientType: 'INTERNAL',
      supplierId: null,
      clientName: '',
      clientContact: '',
      startDate: undefined,
      endDate: undefined,
      managerId: '',
      documentHandler: '',
    },
  });

  const watchedClientType = watch('clientType');
  const watchedStartDate = watch('startDate');

  useEffect(() => {
    fetchUsers();
    fetchSuppliers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await fetch('/api/suppliers?status=APPROVED');
      if (response.ok) {
        const result = await response.json();
        setSuppliers(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
    }
  };

  const onSubmit = async (data: any) => {
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success('Project created successfully');
        router.push(`/admin/projects/${result.data.id}`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create project: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Error creating project. Please try again.');
    }
  };

  return (
    <>
      <PageHeader
        title="Create New Project"
        subtitle="Set up a new project with timeline and team"
        breadcrumbs={[
          { label: 'Projects', href: '/admin/projects' },
          { label: 'New Project' },
        ]}
      />

      <PageContent className="max-w-2xl">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Project identification and details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Project Code</Label>
                  <Input
                    id="code"
                    {...register('code')}
                    placeholder="Auto-generated if empty"
                  />
                  <p className="text-xs text-gray-500">Leave empty for auto-generation (PRJ-2024-001)</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watch('status') || 'PLANNING'}
                    onValueChange={(value) => setValue('status', value as any)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROJECT_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter project name"
                  className={errors.name ? 'border-red-500' : ''}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  {...register('description')}
                  placeholder="Project description and objectives..."
                  className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="managerId">Project Manager *</Label>
                  <Select
                    value={watch('managerId') || undefined}
                    onValueChange={(value) => setValue('managerId', value)}
                  >
                    <SelectTrigger className={errors.managerId ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select manager..." />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name || user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.managerId && (
                    <p className="text-sm text-red-500">{errors.managerId.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentHandler">Document Handler</Label>
                  <Input
                    id="documentHandler"
                    {...register('documentHandler')}
                    placeholder="Person handling documents"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
              <CardDescription>Who is this project for?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="clientType">Client Type *</Label>
                <Select
                  value={watchedClientType || 'INTERNAL'}
                  onValueChange={(value) => setValue('clientType', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CLIENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {watchedClientType === 'SUPPLIER' && (
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <Select
                    value={watch('supplierId') || undefined}
                    onValueChange={(value) => setValue('supplierId', value || null as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier..." />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {watchedClientType === 'EXTERNAL' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="clientName">Client Name *</Label>
                    <Input
                      id="clientName"
                      {...register('clientName')}
                      placeholder="Enter client name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientContact">Client Contact</Label>
                    <Input
                      id="clientContact"
                      {...register('clientContact')}
                      placeholder="Contact person or email"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
              <CardDescription>Project start and end dates</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startDate">Start Date</Label>
                  <DatePicker
                    id="startDate"
                    value={watchedStartDate ? new Date(watchedStartDate).toISOString().split('T')[0] : ''}
                    onChange={(value) => setValue('startDate', value ? new Date(value) : undefined as any)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endDate">End Date</Label>
                  <DatePicker
                    id="endDate"
                    value={watch('endDate') ? new Date(watch('endDate')!).toISOString().split('T')[0] : ''}
                    onChange={(value) => setValue('endDate', value ? new Date(value) : undefined as any)}
                    minDate={watchedStartDate ? new Date(watchedStartDate) : undefined}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/admin/projects')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Project'}
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
