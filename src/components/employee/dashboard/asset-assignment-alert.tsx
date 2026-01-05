'use client';

import Link from 'next/link';
import { Laptop, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface AssetAssignmentAlertProps {
  pendingCount: number;
  className?: string;
}

export function AssetAssignmentAlert({ pendingCount, className }: AssetAssignmentAlertProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || pendingCount === 0) return null;

  return (
    <div
      className={cn(
        'p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3',
        className
      )}
    >
      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
        <Laptop className="h-4 w-4 text-yellow-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-yellow-800">
          {pendingCount} asset{pendingCount > 1 ? 's' : ''} assigned to you - awaiting acceptance
        </p>
      </div>
      <Link
        href="/employee/asset-requests"
        className="text-yellow-700 hover:text-yellow-800 text-sm font-medium whitespace-nowrap flex items-center gap-1"
      >
        Review
        <span className="ml-1">&rarr;</span>
      </Link>
      <button
        onClick={() => setDismissed(true)}
        className="p-1 text-yellow-400 hover:text-yellow-600 rounded"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
