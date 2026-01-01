'use client';

import Link from 'next/link';
import { AlertTriangle, IdCard, FileText, HeartPulse, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface DocumentAlert {
  type: string;
  expiry: Date;
  daysLeft: number;
}

interface AlertBannerProps {
  alerts: DocumentAlert[];
  className?: string;
}

const iconMap: Record<string, typeof IdCard> = {
  QID: IdCard,
  Passport: FileText,
  'Health Card': HeartPulse,
};

export function AlertBanner({ alerts, className }: AlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || alerts.length === 0) return null;

  const primaryAlert = alerts[0];
  const Icon = iconMap[primaryAlert.type] || AlertTriangle;
  const isExpired = primaryAlert.daysLeft <= 0;

  return (
    <div
      className={cn(
        'p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3',
        className
      )}
    >
      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-amber-800">
          {primaryAlert.type} {isExpired ? 'has expired' : `expires in ${primaryAlert.daysLeft} days`}
        </p>
        {alerts.length > 1 && (
          <p className="text-xs text-amber-600">+{alerts.length - 1} more document{alerts.length > 2 ? 's' : ''} expiring soon</p>
        )}
      </div>
      <Link
        href="/profile"
        className="text-amber-700 hover:text-amber-800 text-sm font-medium whitespace-nowrap flex items-center gap-1"
      >
        Update
        <span className="hidden sm:inline">Documents</span>
        <span className="ml-1">&rarr;</span>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-amber-400 hover:text-amber-600 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
