/**
 * @file supplier-list-client.tsx
 * @description Client wrapper that fetches all suppliers and renders the filterable table
 * @module features/suppliers/components
 */
'use client';

import { useState, useEffect } from 'react';
import { SupplierListTableFiltered, type SupplierListItem } from './supplier-list-table-filtered';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ICON_SIZES } from '@/lib/constants';

export function SupplierListClient() {
  const [suppliers, setSuppliers] = useState<SupplierListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all suppliers (large page size, no pagination)
      const response = await fetch('/api/suppliers?ps=10000');
      if (!response.ok) throw new Error('Failed to fetch suppliers');
      const data = await response.json();
      setSuppliers(data.suppliers);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      setError('Failed to load suppliers. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className={`${ICON_SIZES.xl} animate-spin text-gray-400 mb-3`} />
        <p className="text-gray-500">Loading suppliers...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className={`${ICON_SIZES.xl} text-red-400 mb-3`} />
        <p className="text-red-600 mb-3">{error}</p>
        <Button variant="outline" onClick={fetchSuppliers}>
          Try Again
        </Button>
      </div>
    );
  }

  return <SupplierListTableFiltered suppliers={suppliers} />;
}
