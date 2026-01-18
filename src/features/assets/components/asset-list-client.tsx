/**
 * @file asset-list-client.tsx
 * @description Client wrapper that fetches all assets and renders the filterable table
 * @module components/domains/operations/assets
 */
'use client';

import { useState, useEffect } from 'react';
import { AssetListTable } from './asset-list-table';
import { type AdminAsset } from './asset-shared';
import { Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function AssetListClient() {
  const [assets, setAssets] = useState<AdminAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all assets (large page size, no pagination)
      const response = await fetch('/api/assets?ps=10000');
      if (!response.ok) throw new Error('Failed to fetch assets');
      const data = await response.json();
      setAssets(data.assets);
    } catch (err) {
      console.error('Error fetching assets:', err);
      setError('Failed to load assets. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-3" />
        <p className="text-gray-500">Loading assets...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-8 w-8 text-red-400 mb-3" />
        <p className="text-red-600 mb-3">{error}</p>
        <Button variant="outline" onClick={fetchAssets}>
          Try Again
        </Button>
      </div>
    );
  }

  return <AssetListTable assets={assets} />;
}
