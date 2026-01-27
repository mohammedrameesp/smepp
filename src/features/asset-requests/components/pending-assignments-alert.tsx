/**
 * @file pending-assignments-alert.tsx
 * @description Alert banner component showing pending asset assignments awaiting acceptance
 * @module components/domains/operations/asset-requests
 */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowRight, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICON_SIZES } from '@/lib/constants';

interface PendingAssignment {
  id: string;
  requestNumber: string;
  asset: {
    model: string;
    assetTag: string | null;
  };
  assignedByUser: {
    name: string | null;
  } | null;
}

interface PendingAssignmentsAlertProps {
  basePath?: string;
}

export function PendingAssignmentsAlert({ basePath = '/employee/asset-requests' }: PendingAssignmentsAlertProps) {
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchPendingAssignments();
  }, []);

  const fetchPendingAssignments = async () => {
    try {
      const response = await fetch('/api/asset-requests/my-pending');
      if (response.ok) {
        const data = await response.json();
        setPendingAssignments(data.pendingAssignments || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending assignments:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || dismissed || pendingAssignments.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <AlertCircle className={`${ICON_SIZES.md} text-yellow-600 flex-shrink-0 mt-0.5`} />
          <div className="flex-1">
            <h3 className="font-medium text-yellow-800">
              You have {pendingAssignments.length} pending asset{pendingAssignments.length > 1 ? 's' : ''} to accept
            </h3>
            <div className="mt-2 space-y-1">
              {pendingAssignments.slice(0, 3).map((assignment) => (
                <div key={assignment.id} className="text-sm text-yellow-700">
                  <span className="font-medium">{assignment.asset.model}</span>
                  {assignment.asset.assetTag && (
                    <span className="text-yellow-600 ml-1">({assignment.asset.assetTag})</span>
                  )}
                  {assignment.assignedByUser?.name && (
                    <span className="text-yellow-600"> - assigned by {assignment.assignedByUser.name}</span>
                  )}
                </div>
              ))}
              {pendingAssignments.length > 3 && (
                <div className="text-sm text-yellow-600">
                  and {pendingAssignments.length - 3} more...
                </div>
              )}
            </div>
            <div className="mt-3">
              <Link href={basePath}>
                <Button size="sm" variant="outline" className="bg-white hover:bg-yellow-100">
                  View Pending Assignments
                  <ArrowRight className={`${ICON_SIZES.sm} ml-2`} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800 p-1"
          aria-label="Dismiss"
        >
          <X className={ICON_SIZES.sm} />
        </button>
      </div>
    </div>
  );
}
