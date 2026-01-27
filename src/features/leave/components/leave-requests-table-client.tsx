/**
 * @file leave-requests-table-client.tsx
 * @description Client wrapper that fetches all leave requests and renders the filterable table
 * @module features/leave/components
 */
'use client';

import { useState, useEffect } from 'react';
import { LeaveRequestsTableFiltered, type LeaveRequestItem } from './leave-requests-table-filtered';
import { Loader2, AlertCircle, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICON_SIZES } from '@/lib/constants';

interface LeaveRequestsTableClientProps {
  showUser?: boolean;
  memberId?: string;
  basePath?: string;
}

export function LeaveRequestsTableClient({
  showUser = true,
  memberId,
  basePath = '/admin/leave/requests'
}: LeaveRequestsTableClientProps) {
  const [requests, setRequests] = useState<LeaveRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all leave requests (large page size)
      const params = new URLSearchParams({ ps: '10000' });
      if (memberId) params.set('memberId', memberId);

      const response = await fetch(`/api/leave/requests?${params}`);
      if (!response.ok) throw new Error('Failed to fetch leave requests');
      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      console.error('Error fetching leave requests:', err);
      setError('Failed to load leave requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400 mb-3`} />
        <p className="text-gray-500">Loading leave requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className={`${ICON_SIZES.xl} text-red-400 mb-3`} />
        <p className="text-red-600 mb-3">{error}</p>
        <Button variant="outline" onClick={fetchRequests}>
          Try Again
        </Button>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <CalendarDays className={`${ICON_SIZES['2xl']} text-gray-300 mb-2`} />
        <p className="text-gray-500">No leave requests found</p>
      </div>
    );
  }

  return (
    <LeaveRequestsTableFiltered
      requests={requests}
      showUser={showUser}
      basePath={basePath}
    />
  );
}
