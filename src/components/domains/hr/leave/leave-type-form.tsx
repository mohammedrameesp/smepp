/**
 * @file leave-type-form.tsx
 * @description Form component for creating and editing leave type configurations
 * @module components/domains/hr
 */
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createLeaveTypeSchema } from '@/lib/validations/leave';
import { useState } from 'react';
import { toast } from 'sonner';

// Define form data type that matches form structure (with defaults applied)
interface FormData {
  name: string;
  description?: string | null;
  color: string;
  defaultDays: number;
  requiresApproval: boolean;
  requiresDocument: boolean;
  isPaid: boolean;
  isActive: boolean;
  maxConsecutiveDays?: number | null;
  minNoticeDays: number;
  allowCarryForward: boolean;
  maxCarryForwardDays?: number | null;
}

interface LeaveTypeFormProps {
  onSuccess?: () => void;
  initialData?: Partial<FormData>;
  isEdit?: boolean;
  leaveTypeId?: string;
}

export function LeaveTypeForm({ onSuccess, initialData, isEdit, leaveTypeId }: LeaveTypeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(createLeaveTypeSchema) as never,
    defaultValues: {
      name: initialData?.name ?? '',
      description: initialData?.description ?? '',
      color: initialData?.color ?? '#3B82F6',
      defaultDays: initialData?.defaultDays ?? 0,
      requiresApproval: initialData?.requiresApproval ?? true,
      requiresDocument: initialData?.requiresDocument ?? false,
      isPaid: initialData?.isPaid ?? true,
      isActive: initialData?.isActive ?? true,
      maxConsecutiveDays: initialData?.maxConsecutiveDays ?? null,
      minNoticeDays: initialData?.minNoticeDays ?? 0,
      allowCarryForward: initialData?.allowCarryForward ?? false,
      maxCarryForwardDays: initialData?.maxCarryForwardDays ?? null,
    },
  });

  const watchAllowCarryForward = form.watch('allowCarryForward');

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEdit ? `/api/leave/types/${leaveTypeId}` : '/api/leave/types';
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save leave type');
      }

      form.reset();
      toast.success(isEdit ? 'Leave type updated successfully' : 'Leave type created successfully');
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name *</Label>
        <Input
          id="name"
          placeholder="e.g., Annual Leave"
          {...form.register('name')}
        />
        {form.formState.errors.name && (
          <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Optional description"
          {...form.register('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="color">Color</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              className="w-12 h-10 p-1"
              {...form.register('color')}
            />
            <Input
              placeholder="#3B82F6"
              {...form.register('color')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="defaultDays">Default Days</Label>
          <Input
            id="defaultDays"
            type="number"
            min="0"
            {...form.register('defaultDays', { valueAsNumber: true })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minNoticeDays">Min Notice Days</Label>
          <Input
            id="minNoticeDays"
            type="number"
            min="0"
            {...form.register('minNoticeDays', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxConsecutiveDays">Max Consecutive Days</Label>
          <Input
            id="maxConsecutiveDays"
            type="number"
            min="1"
            placeholder="No limit"
            {...form.register('maxConsecutiveDays', {
              setValueAs: (v: string) => (v === '' ? null : parseInt(v, 10)),
            })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <Label htmlFor="requiresApproval" className="cursor-pointer">Requires Approval</Label>
          <Switch
            id="requiresApproval"
            checked={form.watch('requiresApproval')}
            onCheckedChange={(checked: boolean) => form.setValue('requiresApproval', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <Label htmlFor="requiresDocument" className="cursor-pointer">Requires Document</Label>
          <Switch
            id="requiresDocument"
            checked={form.watch('requiresDocument')}
            onCheckedChange={(checked: boolean) => form.setValue('requiresDocument', checked)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <Label htmlFor="isPaid" className="cursor-pointer">Paid Leave</Label>
          <Switch
            id="isPaid"
            checked={form.watch('isPaid')}
            onCheckedChange={(checked: boolean) => form.setValue('isPaid', checked)}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
          <Label htmlFor="isActive" className="cursor-pointer">Active</Label>
          <Switch
            id="isActive"
            checked={form.watch('isActive')}
            onCheckedChange={(checked: boolean) => form.setValue('isActive', checked)}
          />
        </div>
      </div>

      <div className="space-y-4 p-4 bg-gray-50 rounded-md">
        <div className="flex items-center justify-between">
          <Label htmlFor="allowCarryForward" className="cursor-pointer">Allow Carry Forward</Label>
          <Switch
            id="allowCarryForward"
            checked={watchAllowCarryForward}
            onCheckedChange={(checked: boolean) => form.setValue('allowCarryForward', checked)}
          />
        </div>

        {watchAllowCarryForward && (
          <div className="space-y-2">
            <Label htmlFor="maxCarryForwardDays">Max Carry Forward Days *</Label>
            <Input
              id="maxCarryForwardDays"
              type="number"
              min="0"
              {...form.register('maxCarryForwardDays', {
                setValueAs: (v: string) => (v === '' ? null : parseInt(v, 10)),
              })}
            />
            {form.formState.errors.maxCarryForwardDays && (
              <p className="text-sm text-red-500">{form.formState.errors.maxCarryForwardDays.message}</p>
            )}
          </div>
        )}
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Saving...' : isEdit ? 'Update Leave Type' : 'Create Leave Type'}
      </Button>
    </form>
  );
}
