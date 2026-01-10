/**
 * @file form-section.tsx
 * @description Reusable form section components for consistent form layouts
 * @module components/forms
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/core/utils';

export interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional description below title */
  description?: string;
  /** Optional icon component */
  icon?: React.ReactNode;
  /** Form fields */
  children: React.ReactNode;
  /** Additional className for CardContent */
  className?: string;
}

/**
 * A form section wrapped in a Card with optional icon and description.
 *
 * @example
 * <FormSection
 *   title="Basic Information"
 *   description="Enter the asset details"
 *   icon={<Package className="h-5 w-5 text-slate-500" />}
 * >
 *   <FormGrid cols={2}>
 *     <Input ... />
 *     <Input ... />
 *   </FormGrid>
 * </FormSection>
 */
export function FormSection({
  title,
  description,
  icon,
  children,
  className,
}: FormSectionProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          {icon && <div className="text-slate-500">{icon}</div>}
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-4', className)}>
        {children}
      </CardContent>
    </Card>
  );
}

export interface FormGridProps {
  /** Number of columns (1, 2, or 3) */
  cols?: 1 | 2 | 3;
  /** Form fields */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Grid layout for form fields.
 *
 * @example
 * <FormGrid cols={2}>
 *   <Input ... />
 *   <Input ... />
 * </FormGrid>
 */
export function FormGrid({ cols = 2, children, className }: FormGridProps) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-3',
  }[cols];

  return (
    <div className={cn('grid gap-4', gridClass, className)}>
      {children}
    </div>
  );
}

export interface FormActionsProps {
  /** Action buttons */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Container for form action buttons (Submit, Cancel).
 *
 * @example
 * <FormActions>
 *   <Button variant="outline" onClick={onCancel}>Cancel</Button>
 *   <Button type="submit" disabled={isSubmitting}>Save</Button>
 * </FormActions>
 */
export function FormActions({ children, className }: FormActionsProps) {
  return (
    <div className={cn('flex items-center justify-end gap-3 pt-6', className)}>
      {children}
    </div>
  );
}
