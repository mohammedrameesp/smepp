'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
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
import {
  FileText,
  ShoppingCart,
  Package,
  Check,
  X,
  User,
  Calendar,
  Clock,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ApprovalStep {
  id: string;
  entityType: 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';
  entityId: string;
  levelOrder: number;
  requiredRole: string;
  createdAt: string;
  entityDetails: Record<string, unknown>;
}

interface MyApprovalsClientProps {
  approvals: ApprovalStep[];
  grouped: {
    LEAVE_REQUEST: ApprovalStep[];
    PURCHASE_REQUEST: ApprovalStep[];
    ASSET_REQUEST: ApprovalStep[];
  };
}

const ROLE_LABELS: Record<string, string> = {
  MANAGER: 'Manager',
  HR_MANAGER: 'HR Manager',
  FINANCE_MANAGER: 'Finance Manager',
  DIRECTOR: 'Director',
  ADMIN: 'Admin',
};

const MODULE_ICONS = {
  LEAVE_REQUEST: FileText,
  PURCHASE_REQUEST: ShoppingCart,
  ASSET_REQUEST: Package,
};

const MODULE_HREFS = {
  LEAVE_REQUEST: '/admin/leave/requests',
  PURCHASE_REQUEST: '/admin/purchase-requests',
  ASSET_REQUEST: '/admin/assets/requests',
};

export function MyApprovalsClient({ approvals, grouped }: MyApprovalsClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);
  const [notes, setNotes] = useState('');

  const handleAction = async () => {
    if (!selectedStep || !actionType) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/approval-steps/${selectedStep.id}/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${actionType} request`);
      }

      toast.success(actionType === 'approve' ? 'Request approved' : 'Request rejected');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${actionType} request`);
    } finally {
      setIsSubmitting(false);
      setActionType(null);
      setSelectedStep(null);
      setNotes('');
    }
  };

  const openActionDialog = (step: ApprovalStep, action: 'approve' | 'reject') => {
    setSelectedStep(step);
    setActionType(action);
    setNotes('');
  };

  const renderApprovalCard = (step: ApprovalStep) => {
    const Icon = MODULE_ICONS[step.entityType];
    const details = step.entityDetails;
    const href = `${MODULE_HREFS[step.entityType]}/${step.entityId}`;

    return (
      <Card key={step.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base">
                  {step.entityType === 'LEAVE_REQUEST' && (
                    <>
                      {String(details.type || '')} - {String(details.totalDays || 0)} day(s)
                    </>
                  )}
                  {step.entityType === 'PURCHASE_REQUEST' && (
                    <>{String(details.title || 'Untitled')}</>
                  )}
                  {step.entityType === 'ASSET_REQUEST' && (
                    <>
                      {String(details.assetName || 'Unknown Asset')}
                      {details.assetTag && (
                        <span className="text-muted-foreground ml-2">
                          ({String(details.assetTag)})
                        </span>
                      )}
                    </>
                  )}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span>{String(details.requester || 'Unknown')}</span>
                </div>
              </div>
            </div>
            <Badge variant="outline">
              Level {step.levelOrder}: {ROLE_LABELS[step.requiredRole] || step.requiredRole}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Entity-specific details */}
            {step.entityType === 'LEAVE_REQUEST' && (
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>
                    {format(new Date(details.startDate as string), 'MMM d')} -{' '}
                    {format(new Date(details.endDate as string), 'MMM d, yyyy')}
                  </span>
                </div>
              </div>
            )}

            {step.entityType === 'PURCHASE_REQUEST' && (
              <div className="flex items-center gap-4 text-sm">
                {details.totalAmount ? (
                  <Badge variant="secondary">
                    {String(details.currency || 'QAR')} {Number(details.totalAmount).toLocaleString()}
                  </Badge>
                ) : null}
                {details.priority ? (
                  <Badge
                    variant="outline"
                    className={cn(
                      String(details.priority) === 'HIGH' && 'border-red-500 text-red-500',
                      String(details.priority) === 'MEDIUM' && 'border-yellow-500 text-yellow-500',
                      String(details.priority) === 'LOW' && 'border-green-500 text-green-500'
                    )}
                  >
                    {String(details.priority)}
                  </Badge>
                ) : null}
              </div>
            )}

            {step.entityType === 'ASSET_REQUEST' && details.type ? (
              <Badge variant="secondary">{String(details.type)}</Badge>
            ) : null}

            {/* Reason/Justification */}
            {(details.reason || details.justification) ? (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {String(details.reason || details.justification)}
              </p>
            ) : null}

            {/* Submitted time */}
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>Submitted {format(new Date(step.createdAt), 'MMM d, yyyy h:mm a')}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={() => openActionDialog(step, 'approve')}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => openActionDialog(step, 'reject')}
              >
                <X className="h-4 w-4 mr-1" />
                Reject
              </Button>
              <Button size="sm" variant="outline" asChild className="ml-auto">
                <Link href={href}>
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View Details
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            All ({approvals.length})
          </TabsTrigger>
          <TabsTrigger value="leave" disabled={grouped.LEAVE_REQUEST.length === 0}>
            <FileText className="h-4 w-4 mr-1" />
            Leave ({grouped.LEAVE_REQUEST.length})
          </TabsTrigger>
          <TabsTrigger value="purchase" disabled={grouped.PURCHASE_REQUEST.length === 0}>
            <ShoppingCart className="h-4 w-4 mr-1" />
            Purchase ({grouped.PURCHASE_REQUEST.length})
          </TabsTrigger>
          <TabsTrigger value="asset" disabled={grouped.ASSET_REQUEST.length === 0}>
            <Package className="h-4 w-4 mr-1" />
            Asset ({grouped.ASSET_REQUEST.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          {approvals.map(renderApprovalCard)}
        </TabsContent>

        <TabsContent value="leave" className="space-y-4">
          {grouped.LEAVE_REQUEST.map(renderApprovalCard)}
        </TabsContent>

        <TabsContent value="purchase" className="space-y-4">
          {grouped.PURCHASE_REQUEST.map(renderApprovalCard)}
        </TabsContent>

        <TabsContent value="asset" className="space-y-4">
          {grouped.ASSET_REQUEST.map(renderApprovalCard)}
        </TabsContent>
      </Tabs>

      {/* Action confirmation dialog */}
      <AlertDialog open={actionType !== null} onOpenChange={() => setActionType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionType === 'approve' ? 'Approve Request' : 'Reject Request'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve'
                ? 'Are you sure you want to approve this request?'
                : 'Are you sure you want to reject this request? This will cancel the entire approval chain.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="py-4">
            <label className="text-sm font-medium">
              Notes {actionType === 'reject' && <span className="text-red-500">*</span>}
            </label>
            <Textarea
              placeholder={
                actionType === 'approve'
                  ? 'Optional notes for approval...'
                  : 'Please provide a reason for rejection...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-2"
              rows={3}
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isSubmitting || (actionType === 'reject' && !notes.trim())}
              className={cn(
                actionType === 'approve'
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {isSubmitting ? 'Processing...' : actionType === 'approve' ? 'Approve' : 'Reject'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
