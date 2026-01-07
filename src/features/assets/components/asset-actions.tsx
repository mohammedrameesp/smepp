/**
 * @file asset-actions.tsx
 * @description Action buttons component for asset table rows
 * @module components/domains/operations/assets
 *
 * Features:
 * - Renders a "View" button linking to asset detail page
 * - Used in asset list tables to provide row-level actions
 *
 * Props:
 * - assetId: The unique identifier of the asset to link to
 *
 * Usage:
 * - Used in AssetListTableServerSearch for admin asset list
 * - Used in EmployeeAssetListTable for employee asset list
 *
 * Access: Admin and Employee (navigation target differs by context)
 */
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AssetActions({ assetId }: { assetId: string }) {
  return (
    <Link href={`/admin/assets/${assetId}`}>
      <Button variant="outline" size="sm">
        View
      </Button>
    </Link>
  );
}
