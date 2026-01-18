/**
 * @file subscription-list-client.tsx
 * @description Client wrapper that fetches all subscriptions and renders the filterable table
 * @module features/subscriptions/components/data-tables
 */
'use client';

import { useState, useEffect } from 'react';
import { SubscriptionListTable, type SubscriptionListItem } from './subscription-list-table';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function SubscriptionListClient() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSubscriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all subscriptions (large page size, no pagination)
      const response = await fetch('/api/subscriptions?ps=10000');
      if (!response.ok) throw new Error('Failed to fetch subscriptions');
      const data = await response.json();
      setSubscriptions(data.subscriptions);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError('Failed to load subscriptions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-gray-500">Loading subscriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
        <p className="text-red-600 mb-3">{error}</p>
        <Button variant="outline" onClick={fetchSubscriptions}>
          Try Again
        </Button>
      </div>
    );
  }

  return <SubscriptionListTable subscriptions={subscriptions} />;
}
