/**
 * @file asset-return-dialog.tsx
 * @description Dialog component for employees to submit asset return requests
 * @module components/domains/operations/asset-requests
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

interface Asset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  type: string;
}

interface AssetReturnDialogProps {
  asset: Asset;
  trigger?: React.ReactNode;
}

export function AssetReturnDialog({ asset, trigger }: AssetReturnDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError('Please provide a reason for the return');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/asset-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId: asset.id,
          type: 'RETURN_REQUEST',
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit return request');
      }

      setOpen(false);
      setReason('');
      toast.success('Return request submitted successfully');
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to submit return request';
      setError(message);
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <button className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all bg-transparent text-slate-300 hover:text-white border border-slate-500 hover:border-slate-400 outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 focus-visible:ring-slate-400">
            <RotateCcw className="h-4 w-4" />
            Return
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Return Asset</DialogTitle>
          <DialogDescription>
            Submit a return request for this asset. An admin will review and approve the return.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium text-sm text-gray-700">Asset Details</h4>
            <div className="mt-2 space-y-1 text-sm">
              <p><span className="text-gray-500">Model:</span> {asset.model}</p>
              {asset.brand && <p><span className="text-gray-500">Brand:</span> {asset.brand}</p>}
              <p><span className="text-gray-500">Type:</span> {asset.type}</p>
              {asset.assetTag && <p><span className="text-gray-500">Asset Tag:</span> {asset.assetTag}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Return *</Label>
            <Textarea
              id="reason"
              placeholder="Please explain why you are returning this asset..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              disabled={isSubmitting}
            />
            <p className="text-xs text-gray-500">
              Provide a brief explanation of why you are returning this asset.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Return Request'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
