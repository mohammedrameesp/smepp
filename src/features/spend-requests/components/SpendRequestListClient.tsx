/**
 * @file SpendRequestListClient.tsx
 * @description Client wrapper that fetches all spend requests and renders the filterable table
 * @module features/spend-requests/components
 */
'use client';

import { useState, useEffect } from 'react';
import { SpendRequestListTableFiltered, type SpendRequestItem } from './SpendRequestListTableFiltered';
import { Loader2, AlertCircle, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpendRequestListClientProps {
  isAdmin?: boolean;
}

export function SpendRequestListClient({ isAdmin = false }: SpendRequestListClientProps) {
  const [requests, setRequests] = useState<SpendRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all spend requests (large page size)
      const response = await fetch('/api/spend-requests?limit=10000');
      if (!response.ok) throw new Error('Failed to fetch spend requests');
      const data = await response.json();
      setRequests(data.requests);
    } catch (err) {
      console.error('Error fetching spend requests:', err);
      setError('Failed to load spend requests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-gray-500">Loading spend requests...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
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
        <ShoppingCart className="h-10 w-10 text-gray-300 mb-2" />
        <p className="text-gray-500">No spend requests found</p>
      </div>
    );
  }

  return <SpendRequestListTableFiltered requests={requests} isAdmin={isAdmin} />;
}
