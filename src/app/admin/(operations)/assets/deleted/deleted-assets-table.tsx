'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Trash2,
  RotateCcw,
  Clock,
  AlertTriangle,
  Package,
  Laptop,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';
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
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { formatDate } from '@/lib/core/datetime';

interface DeletedAsset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  type: string;
  status: string;
  deletedAt: Date | null;
  recoveryDeadline: Date | null;
  daysRemaining: number;
  deletedBy: {
    id: string;
    name: string | null;
    email: string;
  } | null;
  assetCategory: {
    id: string;
    code: string;
    name: string;
  } | null;
}

interface DeletedAssetsTableProps {
  assets: DeletedAsset[];
}

function getAssetIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'laptop':
    case 'computer':
      return Laptop;
    case 'phone':
    case 'mobile':
      return Smartphone;
    case 'monitor':
    case 'display':
      return Monitor;
    default:
      return Package;
  }
}

export function DeletedAssetsTable({ assets }: DeletedAssetsTableProps) {
  const router = useRouter();
  const [isRestoring, setIsRestoring] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<DeletedAsset | null>(null);

  const handleRestore = async (assetId: string) => {
    setIsRestoring(assetId);
    try {
      const response = await fetch(`/api/assets/${assetId}/restore`, {
        method: 'POST',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to restore asset');
      }

      toast.success('Asset restored successfully');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to restore asset');
    } finally {
      setIsRestoring(null);
    }
  };

  const handlePermanentDelete = async (assetId: string) => {
    setIsDeleting(assetId);
    try {
      const response = await fetch(`/api/assets/${assetId}/permanent-delete`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete asset');
      }

      toast.success('Asset permanently deleted');
      setConfirmDelete(null);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete asset');
    } finally {
      setIsDeleting(null);
    }
  };

  if (assets.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Trash2 className={`${ICON_SIZES.xl} text-slate-400`} />
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Trash is empty</h3>
        <p className="text-slate-500 max-w-md mx-auto">
          Deleted assets will appear here. They can be restored within 7 days before being permanently removed.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
        <AlertTriangle className={`${ICON_SIZES.md} text-amber-600 flex-shrink-0 mt-0.5`} />
        <div>
          <p className="text-amber-800 font-medium">Auto-deletion enabled</p>
          <p className="text-amber-700 text-sm">
            Deleted assets are automatically removed after 7 days. Restore them before the deadline to prevent permanent deletion.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Asset</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Category</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Deleted</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Time Left</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-600 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {assets.map((asset) => {
                const Icon = getAssetIcon(asset.type);
                const isUrgent = asset.daysRemaining <= 2;
                return (
                  <tr key={asset.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                          <Icon className={`${ICON_SIZES.md} text-slate-500`} />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">{asset.model}</p>
                          <p className="text-sm text-slate-500">
                            {asset.assetTag && <span className="font-mono">{asset.assetTag} • </span>}
                            {asset.type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {asset.assetCategory ? (
                        <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded">
                          {asset.assetCategory.name}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <div>
                        <p className="text-sm text-slate-900">{asset.deletedAt ? formatDate(asset.deletedAt) : '—'}</p>
                        {asset.deletedBy && (
                          <p className="text-xs text-slate-500">by {asset.deletedBy.name || asset.deletedBy.email}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                        isUrgent
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        <Clock className="h-3.5 w-3.5" />
                        {asset.daysRemaining} day{asset.daysRemaining !== 1 ? 's' : ''} left
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRestore(asset.id)}
                          disabled={isRestoring === asset.id}
                          className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <RotateCcw className={`${ICON_SIZES.sm} mr-1`} />
                          {isRestoring === asset.id ? 'Restoring...' : 'Restore'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setConfirmDelete(asset)}
                          disabled={isDeleting === asset.id}
                          className="text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Trash2 className={`${ICON_SIZES.sm} mr-1`} />
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Permanent Delete Confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently Delete Asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{confirmDelete?.model}</strong>
              {confirmDelete?.assetTag && <> ({confirmDelete.assetTag})</>}.
              This action cannot be undone and all related history will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handlePermanentDelete(confirmDelete.id)}
              disabled={!!isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
