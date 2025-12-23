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
