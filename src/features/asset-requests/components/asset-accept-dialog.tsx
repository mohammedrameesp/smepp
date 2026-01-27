/**
 * @file asset-accept-dialog.tsx
 * @description Dialog component for employees to accept or decline assigned assets
 * @module components/domains/operations/asset-requests
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { ICON_SIZES } from '@/lib/constants';

interface Asset {
  id: string;
  assetTag: string | null;
  model: string;
  brand: string | null;
  type: string;
  configuration?: string | null;
  location?: { id: string; name: string } | null;
}

interface AssignedBy {
  name: string | null;
  email: string;
}

interface AssetAcceptDialogProps {
  requestId: string;
  asset: Asset;
  assignedBy?: AssignedBy | null;
  notes?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  initialMode?: 'view' | 'accept' | 'decline';
}

export function AssetAcceptDialog({
  requestId,
  asset,
  assignedBy,
  notes,
  open,
  onOpenChange,
  onSuccess,
  initialMode = 'view',
}: AssetAcceptDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'view' | 'accept' | 'decline'>(initialMode);
  const [userNotes, setUserNotes] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync mode with initialMode when dialog opens
  useEffect(() => {
    if (open) {
      setMode(initialMode);
    }
  }, [open, initialMode]);

  const handleAccept = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/asset-requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: userNotes.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to accept assignment');
      }

      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError('Please provide a reason for declining');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/asset-requests/${requestId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to decline assignment');
      }

      onOpenChange(false);
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to decline assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetState = () => {
    setMode(initialMode);
    setUserNotes('');
    setDeclineReason('');
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetState();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'view' && 'Asset Assignment'}
            {mode === 'accept' && 'Accept Assignment'}
            {mode === 'decline' && 'Decline Assignment'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'view' && 'You have been assigned the following asset. Please accept or decline this assignment.'}
            {mode === 'accept' && 'Confirm that you accept this asset assignment.'}
            {mode === 'decline' && 'Please provide a reason for declining this assignment.'}
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
              {asset.configuration && <p><span className="text-gray-500">Configuration:</span> {asset.configuration}</p>}
              {asset.location && <p><span className="text-gray-500">Location:</span> {asset.location.name}</p>}
            </div>
          </div>

          {assignedBy && (
            <div className="text-sm">
              <span className="text-gray-500">Assigned by:</span>{' '}
              <span className="font-medium">{assignedBy.name || 'Unknown'}</span>
            </div>
          )}

          {notes && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-700">
                <span className="font-medium">Note from admin:</span> {notes}
              </p>
            </div>
          )}

          {mode === 'accept' && (
            <div className="space-y-2">
              <Label htmlFor="acceptNotes">Notes (optional)</Label>
              <Textarea
                id="acceptNotes"
                placeholder="Add any notes about accepting this assignment..."
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          )}

          {mode === 'decline' && (
            <div className="space-y-2">
              <Label htmlFor="declineReason">Reason for Declining *</Label>
              <Textarea
                id="declineReason"
                placeholder="Please explain why you cannot accept this assignment..."
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                disabled={isSubmitting}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className={`${ICON_SIZES.sm} flex-shrink-0`} />
              {error}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {mode === 'view' && (
            <>
              <Button
                variant={initialMode === 'decline' ? 'destructive' : 'outline'}
                onClick={() => setMode('decline')}
                disabled={isSubmitting}
              >
                <XCircle className={`${ICON_SIZES.sm} mr-2`} />
                Decline
              </Button>
              <Button
                variant={initialMode === 'accept' ? 'default' : 'outline'}
                onClick={() => setMode('accept')}
                disabled={isSubmitting}
              >
                <CheckCircle className={`${ICON_SIZES.sm} mr-2`} />
                Accept
              </Button>
            </>
          )}

          {mode === 'accept' && (
            <>
              <Button
                variant="outline"
                onClick={() => setMode('view')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button onClick={handleAccept} disabled={isSubmitting}>
                {isSubmitting ? 'Accepting...' : 'Confirm Accept'}
              </Button>
            </>
          )}

          {mode === 'decline' && (
            <>
              <Button
                variant="outline"
                onClick={() => setMode('view')}
                disabled={isSubmitting}
              >
                Back
              </Button>
              <Button
                variant="destructive"
                onClick={handleDecline}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Declining...' : 'Confirm Decline'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
