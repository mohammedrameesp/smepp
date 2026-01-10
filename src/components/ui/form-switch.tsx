/**
 * @file form-switch.tsx
 * @description Switch toggle with label for form fields
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/core/utils';

export interface FormSwitchProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  description?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Switch toggle with label in a styled container.
 * Common pattern in settings and form dialogs.
 *
 * @example
 * ```tsx
 * <FormSwitch
 *   id="requiresApproval"
 *   label="Requires Approval"
 *   checked={form.watch('requiresApproval')}
 *   onCheckedChange={(checked) => form.setValue('requiresApproval', checked)}
 *   description="Enable to require manager approval"
 * />
 * ```
 */
export function FormSwitch({
  id,
  label,
  checked,
  onCheckedChange,
  description,
  disabled,
  className,
}: FormSwitchProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
        <Label htmlFor={id} className="cursor-pointer">
          {label}
        </Label>
        <Switch
          id={id}
          checked={checked}
          onCheckedChange={onCheckedChange}
          disabled={disabled}
        />
      </div>
      {description && (
        <p className="text-xs text-gray-500 px-3">{description}</p>
      )}
    </div>
  );
}

/**
 * Compact switch without background (for inline use)
 */
export function InlineSwitch({
  id,
  label,
  checked,
  onCheckedChange,
  disabled,
  className,
}: Omit<FormSwitchProps, 'description'>) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
      <Label htmlFor={id} className="cursor-pointer text-sm">
        {label}
      </Label>
    </div>
  );
}
