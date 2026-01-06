/**
 * @file delete-asset-button.tsx
 * @description Button component with confirmation dialog for deleting assets
 * @module components/domains/operations/assets
 *
 * Features:
 * - Confirmation dialog with destructive action styling
 * - Lists all data that will be deleted (history, maintenance, assignments)
 * - Loading state during delete operation
 * - Redirects to assets list on success
 * - Toast notifications for error feedback
 *
 * Props:
 * - assetId: ID of the asset to delete
 * - assetModel: Display name shown in confirmation dialog
 *
 * Behavior:
 * - Permanently deletes the asset and all related records
 * - Cascading delete includes: history, maintenance records, assignment history
 * - Action cannot be undone
 *
 * API Dependencies:
 * - DELETE /api/assets/[id] - Permanently removes the asset
 *
 * Usage:
 * - Used on asset detail page (/admin/assets/[id])
 * - Typically shown alongside edit/clone actions
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

interface DeleteAssetButtonProps {
  assetId: string;
  assetModel: string;
}

export function DeleteAssetButton({ assetId, assetModel }: DeleteAssetButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Redirect to assets list after successful deletion
        router.push('/admin/assets');
      } else {
        const errorData = await response.json();
        toast.error(`Failed to delete asset: ${errorData.error || 'Unknown error'}`, { duration: 10000 });
        setIsDeleting(false);
      }
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast.error('Error deleting asset. Please try again.', { duration: 10000 });
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" disabled={isDeleting}>
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <strong>{assetModel}</strong> and all its associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-700 mb-2">This includes:</p>
          <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
            <li>Asset history records</li>
            <li>Maintenance records</li>
            <li>Assignment history</li>
          </ul>
          <p className="mt-4 text-red-600 font-semibold text-sm">
            This action cannot be undone.
          </p>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
          >
            Delete Asset
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
