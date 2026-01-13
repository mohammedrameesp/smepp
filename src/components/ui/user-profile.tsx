/**
 * @file user-profile.tsx
 * @description User avatar and info display component
 * @module components/ui
 */

import * as React from 'react';
import { cn } from '@/lib/core/utils';

const sizeStyles = {
  sm: {
    container: 'gap-2',
    avatar: 'w-8 h-8 text-xs',
    name: 'text-sm font-medium',
    email: 'text-xs',
  },
  md: {
    container: 'gap-3',
    avatar: 'w-10 h-10 text-sm',
    name: 'text-sm font-semibold',
    email: 'text-xs',
  },
  lg: {
    container: 'gap-3',
    avatar: 'w-12 h-12 text-base',
    name: 'font-semibold',
    email: 'text-sm',
  },
} as const;

export interface UserProfileProps {
  name: string | null;
  email: string;
  avatar?: string | null;
  size?: keyof typeof sizeStyles;
  showEmail?: boolean;
  className?: string;
}

function getInitials(name: string | null): string {
  if (!name || !name.trim()) return '??';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '??';
  return parts.map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export function UserProfile({
  name,
  email,
  avatar,
  size = 'md',
  showEmail = true,
  className,
}: UserProfileProps) {
  const styles = sizeStyles[size];

  return (
    <div className={cn('flex items-center', styles.container, className)}>
      {avatar ? (
        <img
          src={avatar}
          alt={name || email}
          className={cn('rounded-full object-cover', styles.avatar)}
        />
      ) : (
        <div
          className={cn(
            'bg-indigo-100 rounded-full flex items-center justify-center font-semibold text-indigo-600',
            styles.avatar
          )}
        >
          {getInitials(name)}
        </div>
      )}
      <div className="min-w-0">
        <p className={cn('text-slate-900 truncate', styles.name)}>
          {name || 'Unknown User'}
        </p>
        {showEmail && (
          <p className={cn('text-slate-500 truncate', styles.email)}>
            {email}
          </p>
        )}
      </div>
    </div>
  );
}

export interface UserProfileCardProps extends UserProfileProps {
  children?: React.ReactNode;
}

export function UserProfileCard({
  name,
  email,
  avatar,
  size: _size = 'lg',
  showEmail = true,
  children,
  className,
}: UserProfileCardProps) {
  return (
    <div className={cn('text-center py-4', className)}>
      {avatar ? (
        <img
          src={avatar}
          alt={name || email}
          className="w-16 h-16 rounded-full object-cover mx-auto mb-3"
        />
      ) : (
        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-indigo-600 font-semibold text-lg">
            {getInitials(name)}
          </span>
        </div>
      )}
      <p className="font-semibold text-slate-900 mb-1">{name || 'Unknown User'}</p>
      {showEmail && (
        <p className="text-sm text-slate-500">{email}</p>
      )}
      {children}
    </div>
  );
}
