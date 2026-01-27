/**
 * @file expiry-badge.tsx
 * @description Badge components for displaying document expiry status with visual indicators
 * @module components/domains/hr
 */
'use client';

import { Badge } from '@/components/ui/badge';
import { AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
import { formatDate } from '@/lib/core/datetime';
import {
  getExpiryStatus as getExpiryStatusUtil,
  getDaysRemaining,
} from '@/features/employees/lib/hr-utils';

interface ExpiryBadgeProps {
  date: Date | string | null | undefined;
  label?: string;
  showDays?: boolean;
}

// Re-export from hr-utils for backwards compatibility
export const getExpiryStatus = getExpiryStatusUtil;
export const getDaysUntilExpiry = getDaysRemaining;

export function ExpiryBadge({ date, label, showDays = true }: ExpiryBadgeProps) {
  const status = getExpiryStatus(date);
  const days = getDaysUntilExpiry(date);

  if (!status || days === null) {
    return null;
  }

  if (status === 'expired') {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className={ICON_SIZES.xs} />
        {label ? `${label} ` : ''}Expired
        {showDays && ` (${Math.abs(days)} days ago)`}
      </Badge>
    );
  }

  if (status === 'expiring') {
    return (
      <Badge variant="outline" className="flex items-center gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
        <AlertTriangle className={ICON_SIZES.xs} />
        {label ? `${label} ` : ''}Expiring
        {showDays && ` (${days} days)`}
      </Badge>
    );
  }

  // Valid status - optionally show for completeness
  return (
    <Badge variant="outline" className="flex items-center gap-1 bg-green-50 text-green-700 border-green-300">
      <CheckCircle className={ICON_SIZES.xs} />
      {label ? `${label} ` : ''}Valid
    </Badge>
  );
}

// Compact version for inline use
export function ExpiryIndicator({ date }: { date: Date | string | null | undefined }) {
  const status = getExpiryStatus(date);
  const days = getDaysUntilExpiry(date);

  if (!status || days === null) return null;

  if (status === 'expired') {
    return (
      <span className="inline-flex items-center text-red-600 text-sm font-medium">
        <XCircle className={`${ICON_SIZES.sm} mr-1`} />
        Expired
      </span>
    );
  }

  if (status === 'expiring') {
    return (
      <span className="inline-flex items-center text-yellow-600 text-sm font-medium">
        <AlertTriangle className={`${ICON_SIZES.sm} mr-1`} />
        {days} days left
      </span>
    );
  }

  return null;
}

// Full date display with badge
interface ExpiryDateDisplayProps {
  date: Date | string | null | undefined;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ExpiryDateDisplay({
  date,
  label,
  placeholder = 'Not provided',
  className = '',
}: ExpiryDateDisplayProps) {
  if (!date) {
    return <span className="text-gray-400">{placeholder}</span>;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const status = getExpiryStatus(dateObj);
  getDaysUntilExpiry(dateObj);

  if (!status) {
    return <span className="text-gray-400">{placeholder}</span>;
  }

  const configs = {
    expired: {
      className: 'bg-red-100 text-red-800 border-red-300',
      icon: <XCircle className={`${ICON_SIZES.xs} mr-1`} />,
      text: 'Expired',
    },
    expiring: {
      className: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      icon: <AlertTriangle className={`${ICON_SIZES.xs} mr-1`} />,
      text: 'Expiring Soon',
    },
    valid: {
      className: 'bg-green-100 text-green-800 border-green-300',
      icon: <CheckCircle className={`${ICON_SIZES.xs} mr-1`} />,
      text: 'Valid',
    },
  };

  const config = configs[status];

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      <span>{formatDate(dateObj)}</span>
      <Badge variant="outline" className={`flex items-center ${config.className}`}>
        {config.icon}
        {label || config.text}
      </Badge>
    </div>
  );
}
