/**
 * @file profile-card.tsx
 * @description Reusable profile card component for displaying user info with avatar
 * @module components/ui
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/core/utils';
import { UserAvatar } from './user-avatar';

export interface ProfileCardProps {
  /** User's name */
  name?: string | null;
  /** User's email */
  email?: string | null;
  /** User's profile image URL */
  image?: string | null;
  /** Secondary line text (defaults to email if not provided) */
  subtitle?: string | null;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Whether to show the avatar */
  showAvatar?: boolean;
  /** Avatar background color */
  avatarBgColor?: string;
  /** Additional class names for the container */
  className?: string;
  /** Additional class names for the name */
  nameClassName?: string;
  /** Additional class names for the subtitle */
  subtitleClassName?: string;
  /** Click handler */
  onClick?: () => void;
}

const sizeConfig = {
  sm: {
    avatar: 'sm' as const,
    container: 'gap-2',
    name: 'text-sm font-medium',
    subtitle: 'text-xs text-slate-500',
  },
  md: {
    avatar: 'md' as const,
    container: 'gap-3',
    name: 'text-sm font-semibold',
    subtitle: 'text-sm text-slate-500',
  },
  lg: {
    avatar: 'lg' as const,
    container: 'gap-3',
    name: 'text-base font-semibold',
    subtitle: 'text-sm text-slate-500',
  },
};

/**
 * ProfileCard displays a user's avatar alongside their name and email/subtitle.
 *
 * @example
 * ```tsx
 * <ProfileCard
 *   name="John Doe"
 *   email="john@example.com"
 *   image="/avatars/john.jpg"
 *   size="md"
 * />
 * ```
 *
 * @example With custom subtitle
 * ```tsx
 * <ProfileCard
 *   name="Jane Smith"
 *   subtitle="Engineering Manager"
 *   size="lg"
 * />
 * ```
 */
export function ProfileCard({
  name,
  email,
  image,
  subtitle,
  size = 'md',
  showAvatar = true,
  avatarBgColor = 'bg-indigo-500',
  className,
  nameClassName,
  subtitleClassName,
  onClick,
}: ProfileCardProps) {
  const config = sizeConfig[size];
  const displaySubtitle = subtitle ?? email;

  const Container = onClick ? 'button' : 'div';

  return (
    <Container
      className={cn(
        'flex items-center',
        config.container,
        onClick && 'cursor-pointer hover:opacity-80 transition-opacity',
        className
      )}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {showAvatar && (
        <UserAvatar
          name={name}
          image={image}
          size={config.avatar}
          bgColor={avatarBgColor}
        />
      )}
      <div className="min-w-0 flex-1">
        <p className={cn(config.name, 'truncate', nameClassName)}>
          {name || 'Unknown'}
        </p>
        {displaySubtitle && (
          <p className={cn(config.subtitle, 'truncate', subtitleClassName)}>
            {displaySubtitle}
          </p>
        )}
      </div>
    </Container>
  );
}

/**
 * Compact profile card that shows avatar with name only (no subtitle)
 */
export function ProfileCardCompact({
  name,
  image,
  size = 'sm',
  avatarBgColor = 'bg-indigo-500',
  className,
}: Pick<ProfileCardProps, 'name' | 'image' | 'size' | 'avatarBgColor' | 'className'>) {
  const config = sizeConfig[size];

  return (
    <div className={cn('flex items-center', config.container, className)}>
      <UserAvatar
        name={name}
        image={image}
        size={config.avatar}
        bgColor={avatarBgColor}
      />
      <span className={cn(config.name, 'truncate')}>
        {name || 'Unknown'}
      </span>
    </div>
  );
}

export default ProfileCard;
