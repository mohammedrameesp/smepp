/**
 * @file delete-button.tsx
 * @description Delete button with confirmation dialog (legacy - prefer shared/delete-button)
 * @module components
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Trash2 } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface DeleteButtonProps {
  id: string;
  entityType: 'asset' | 'subscription' | 'user';
  entityName: string;
  onDeleteSuccess?: () => void;
}

export function DeleteButton({
  id,
  entityType,
  entityName,
  onDeleteSuccess,
}: DeleteButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getApiEndpoint = () => {
    switch (entityType) {
      case 'asset':
        return `/api/assets/${id}`;
      case 'subscription':
        return `/api/subscriptions/${id}`;
      case 'user':
        return `/api/users/${id}`;
    }
  };

  const getEntityLabel = () => {
    switch (entityType) {
      case 'asset':
        return 'asset';
      case 'subscription':
        return 'subscription';
      case 'user':
        return 'user';
    }
  };

  const getRedirectPath = () => {
    switch (entityType) {
      case 'asset':
        return '/admin/assets';
      case 'subscription':
        return '/admin/subscriptions';
      case 'user':
        return '/admin/users';
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(getApiEndpoint(), {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to delete ${getEntityLabel()}`);
      }

      // Success!
      if (onDeleteSuccess) {
        onDeleteSuccess();
      } else {
        // Default: redirect to the list page
        router.push(getRedirectPath());
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  };

  // PageHeaderButton-consistent styling
  const buttonClassName = 'inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed';

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            disabled={isDeleting}
            className={buttonClassName}
          >
            <Trash2 className={ICON_SIZES.sm} />
            Delete
          </button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the {getEntityLabel()}{' '}
              <strong>&quot;{entityName}&quot;</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {error && (
        <div className="mt-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </>
  );
}
