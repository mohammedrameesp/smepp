/**
 * @file delete-button.tsx
 * @description Delete button with confirmation dialog (legacy - prefer shared/delete-button)
 * @module components
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Trash2 } from 'lucide-react';

interface DeleteButtonProps {
  id: string;
  entityType: 'asset' | 'subscription' | 'user';
  entityName: string;
  onDeleteSuccess?: () => void;
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function DeleteButton({
  id,
  entityType,
  entityName,
  onDeleteSuccess,
  size = 'sm',
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

  return (
    <>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size={size}
            disabled={isDeleting}
            className="border-red-300 text-red-700 hover:bg-red-50 hover:text-red-800 hover:border-red-400"
          >
            <Trash2 className="h-4 w-4" />
            {size !== 'icon' && <span className="ml-1">Delete</span>}
          </Button>
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
