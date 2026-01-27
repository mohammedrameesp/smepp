/**
 * @file icon.tsx
 * @description Standardized Icon wrapper component for consistent icon sizing.
 *              Uses centralized ICON_SIZES from @/lib/constants for uniformity.
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES, type IconSize } from '@/lib/constants';

export interface IconProps {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** Size preset from ICON_SIZES (xs, sm, md, lg, xl, 2xl, 3xl) */
  size?: IconSize;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label for screen readers */
  'aria-label'?: string;
  /** Whether to hide from assistive technology (default: true) */
  'aria-hidden'?: boolean;
}

/**
 * Icon wrapper component providing consistent sizing via ICON_SIZES constants.
 *
 * @example
 * // Basic usage
 * <Icon icon={CheckIcon} size="sm" />
 *
 * @example
 * // With additional classes
 * <Icon icon={Loader2} size="sm" className="animate-spin mr-2" />
 *
 * @example
 * // With accessibility
 * <Icon icon={AlertCircle} size="md" aria-label="Warning" aria-hidden={false} />
 */
export function Icon({
  icon: IconComponent,
  size = 'sm',
  className,
  'aria-label': ariaLabel,
  'aria-hidden': ariaHidden = true,
}: IconProps) {
  return (
    <IconComponent
      className={cn(ICON_SIZES[size], className)}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
    />
  );
}

export { ICON_SIZES };
export type { IconSize };
