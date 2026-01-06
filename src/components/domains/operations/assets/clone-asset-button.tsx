/**
 * @file clone-asset-button.tsx
 * @description Button component with confirmation dialog for cloning assets
 * @module components/domains/operations/assets
 *
 * Features:
 * - Confirmation dialog before cloning to prevent accidental duplicates
 * - Shows what will be copied vs. reset (new tag, cleared serial, SPARE status)
 * - Loading state during clone operation
 * - Redirects to cloned asset's edit page on success
 * - Toast notifications for success/error feedback
 *
 * Props:
 * - assetId: ID of the asset to clone
 * - assetModel: Display name shown in confirmation dialog
 *
 * Behavior:
 * - Cloned asset gets new auto-generated asset tag
 * - Status is reset to SPARE
 * - Serial number is cleared (must be manually added)
 * - User assignment is removed
 * - All other fields are copied from original
 *
 * API Dependencies:
 * - POST /api/assets/[id]/clone - Creates a duplicate of the asset
 *
 * Usage:
 * - Used on asset detail page (/admin/assets/[id])
 * - Provides quick way to add similar assets
 *
 * Access: Admin only
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface CloneAssetButtonProps {
  assetId: string;
  assetModel: string;
}

export function CloneAssetButton({ assetId, assetModel }: CloneAssetButtonProps) {
  const router = useRouter();
  const [isCloning, setIsCloning] = useState(false);

  const handleClone = async () => {
    setIsCloning(true);

    try {
      const response = await fetch(`/api/assets/${assetId}/clone`, {
        method: 'POST',
      });

      if (response.ok) {
        const clonedAsset = await response.json();
        // Redirect to the edit page of the cloned asset
        router.push(`/admin/assets/${clonedAsset.id}/edit`);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to clone asset: ${errorData.error || 'Unknown error'}`, { duration: 10000 });
        setIsCloning(false);
      }
    } catch (error) {
      console.error('Error cloning asset:', error);
      toast.error('Error cloning asset. Please try again.', { duration: 10000 });
      setIsCloning(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline" disabled={isCloning}>
          {isCloning ? 'Cloning...' : 'Clone Asset'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Clone this asset?</AlertDialogTitle>
          <AlertDialogDescription>
            This will create a duplicate of <strong>{assetModel}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-700 mb-2">The cloned asset will have:</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>A new asset tag</li>
            <li>Status set to SPARE</li>
            <li>Serial number cleared (you&apos;ll need to add it)</li>
            <li>No user assignment</li>
            <li>All other details copied from the original</li>
          </ul>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleClone}>
            Clone Asset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
