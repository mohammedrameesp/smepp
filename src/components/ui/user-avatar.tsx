/**
 * @file user-avatar.tsx
 * @description Centralized avatar component that handles employee vs non-employee display
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
  /** User's name for generating initials */
  name?: string | null;
  /** User's profile image URL */
  image?: string | null;
  /** Whether the user is an employee (true) or system/service account (false) */
  isEmployee?: boolean;
  /** Organization logo URL (used for non-employees) */
  organizationLogoUrl?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional class names */
  className?: string;
  /** Background color for the avatar when showing initials */
  bgColor?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-9 h-9 text-xs',
  lg: 'w-12 h-12 text-sm',
};

const iconSizes = {
  sm: 'h-4 w-4',
  md: 'h-4 w-4',
  lg: 'h-6 w-6',
};

/**
 * UserAvatar component displays user's avatar based on their type:
 * - Employees: Shows user image if available, or initials from name
 * - Non-employees (system/service accounts): Shows organization logo
 */
export function UserAvatar({
  name,
  image,
  isEmployee = true,
  organizationLogoUrl,
  size = 'md',
  className,
  bgColor = 'bg-blue-500',
}: UserAvatarProps) {
  const [imageError, setImageError] = React.useState(false);

  // Reset error state when image changes
  React.useEffect(() => {
    setImageError(false);
  }, [image, organizationLogoUrl]);

  // Get initials from name
  const getInitials = (name?: string | null): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  // For non-employees, use organization logo
  if (!isEmployee) {
    if (organizationLogoUrl && !imageError) {
      return (
        <div
          className={cn(
            'rounded-full flex items-center justify-center overflow-hidden bg-white ring-2 ring-slate-200',
            sizeClasses[size],
            className
          )}
          title="System/Service Account"
        >
          <img
            src={organizationLogoUrl}
            alt="Organization"
            className="h-full w-full object-contain p-0.5"
            onError={() => setImageError(true)}
          />
        </div>
      );
    }
    // Fallback for non-employee without org logo
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center bg-slate-200',
          sizeClasses[size],
          className
        )}
        title="System/Service Account"
      >
        <User className={cn('text-slate-500', iconSizes[size])} />
      </div>
    );
  }

  // For employees, use user image or initials
  if (image && !imageError) {
    return (
      <div
        className={cn(
          'rounded-full flex items-center justify-center overflow-hidden',
          sizeClasses[size],
          className
        )}
      >
        <img
          src={image}
          alt={name || 'User'}
          className="h-full w-full object-cover"
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  // Fallback to initials
  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-medium text-white',
        sizeClasses[size],
        bgColor,
        className
      )}
    >
      {getInitials(name)}
    </div>
  );
}

export default UserAvatar;
