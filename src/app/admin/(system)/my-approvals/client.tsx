'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
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
  Calendar,
  Clock,
  ExternalLink,
  ChevronRight,
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

const MODULE_CONFIG = {
  LEAVE_REQUEST: {
    icon: FileText,
    label: 'Leave Request',
    gradient: 'from-blue-400 to-indigo-500',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    href: '/admin/leave/requests',
  },
  PURCHASE_REQUEST: {
    icon: ShoppingCart,
    label: 'Purchase Request',
    gradient: 'from-emerald-400 to-teal-500',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    href: '/admin/purchase-requests',
  },
  ASSET_REQUEST: {
    icon: Package,
    label: 'Asset Request',
    gradient: 'from-purple-400 to-violet-500',
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    href: '/admin/assets/requests',
  },
};

export function MyApprovalsClient({ approvals, grouped }: MyApprovalsClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedStep, setSelectedStep] = useState<ApprovalStep | null>(null);
  const [notes, setNotes] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'leave' | 'purchase' | 'asset'>('all');

  const handleAction = async () => {
    if (!selectedStep || !actionType) return;

    setIsSubmitting(true);
    try {
      // Determine the correct API endpoint based on entity type
      let apiUrl = '';
      if (selectedStep.entityType === 'LEAVE_REQUEST') {
        apiUrl = `/api/leave/requests/${selectedStep.entityId}/${actionType}`;
      } else if (selectedStep.entityType === 'ASSET_REQUEST') {
        apiUrl = `/api/assets/requests/${selectedStep.entityId}/${actionType}`;
      } else if (selectedStep.entityType === 'PURCHASE_REQUEST') {
        apiUrl = `/api/purchase-requests/${selectedStep.entityId}/${actionType}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || undefined,
          reason: notes.trim() || undefined, // Some APIs use 'reason' instead of 'notes'
        }),
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

  const getDisplayApprovals = () => {
    switch (activeTab) {
      case 'leave':
        return grouped.LEAVE_REQUEST;
      case 'purchase':
        return grouped.PURCHASE_REQUEST;
      case 'asset':
        return grouped.ASSET_REQUEST;
      default:
        return approvals;
    }
  };

  const renderApprovalCard = (step: ApprovalStep) => {
    const config = MODULE_CONFIG[step.entityType];
    const Icon = config.icon;
    const details = step.entityDetails;
    const href = `${config.href}/${step.entityId}`;

    // Get initials from requester name
    const requesterName = String(details.requester || 'Unknown');
    const initials = requesterName
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div
        key={step.id}
        className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-all"
      >
        <div className="flex items-start gap-4">
          {/* Avatar */}
          <div className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-gradient-to-br text-white font-semibold text-sm',
            config.gradient
          )}>
            {initials}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div>
                <h3 className="font-semibold text-slate-900">{requesterName}</h3>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Icon className="h-3.5 w-3.5" />
                  <span>
                    {step.entityType === 'LEAVE_REQUEST' && (
                      <>{String(details.type || 'Leave')} - {String(details.totalDays || 0)} day(s)</>
                    )}
                    {step.entityType === 'PURCHASE_REQUEST' && (
                      <>{String(details.title || 'Untitled')}</>
                    )}
                    {step.entityType === 'ASSET_REQUEST' && (
                      <>{String(details.type || 'Request')} - {String(details.assetName || 'Asset')}</>
                    )}
                  </span>
                </div>
              </div>
              <span className="text-xs text-slate-400 flex-shrink-0">
                {format(new Date(step.createdAt), 'MMM d')}
              </span>
            </div>

            {/* Details */}
            <div className="mt-2 space-y-1">
              {step.entityType === 'LEAVE_REQUEST' && (
                <div className="flex items-center gap-1 text-sm text-slate-600">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    {format(new Date(details.startDate as string), 'MMM d')} - {format(new Date(details.endDate as string), 'MMM d, yyyy')}
                  </span>
                </div>
              )}

              {step.entityType === 'PURCHASE_REQUEST' && details.totalAmount && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">
                    {String(details.currency || 'QAR')} {Number(details.totalAmount).toLocaleString()}
                  </span>
                  {details.priority && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full font-medium',
                      String(details.priority) === 'HIGH' && 'bg-red-100 text-red-600',
                      String(details.priority) === 'MEDIUM' && 'bg-amber-100 text-amber-600',
                      String(details.priority) === 'LOW' && 'bg-green-100 text-green-600'
                    )}>
                      {String(details.priority)}
                    </span>
                  )}
                </div>
              )}

              {(details.reason || details.justification) && (
                <p className="text-sm text-slate-500 line-clamp-1">
                  {String(details.reason || details.justification)}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => openActionDialog(step, 'approve')}
                className="bg-emerald-500 hover:bg-emerald-600 text-white h-8"
              >
                <Check className="h-3.5 w-3.5 mr-1" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => openActionDialog(step, 'reject')}
                className="text-red-600 border-red-200 hover:bg-red-50 h-8"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reject
              </Button>
              <Link
                href={href}
                className="ml-auto text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                Details
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'all', label: 'All', count: approvals.length },
    { id: 'leave', label: 'Leave', count: grouped.LEAVE_REQUEST.length, icon: FileText },
    { id: 'purchase', label: 'Purchase', count: grouped.PURCHASE_REQUEST.length, icon: ShoppingCart },
    { id: 'asset', label: 'Asset', count: grouped.ASSET_REQUEST.length, icon: Package },
  ];

  return (
    <>
      {/* Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 mb-4">
        <div className="flex border-b border-slate-100">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              disabled={tab.count === 0 && tab.id !== 'all'}
              className={cn(
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700',
                tab.count === 0 && tab.id !== 'all' && 'opacity-50 cursor-not-allowed'
              )}
            >
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
              <span className={cn(
                'text-xs px-1.5 py-0.5 rounded-full',
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-600'
                  : 'bg-slate-100 text-slate-500'
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Approval Cards */}
      <div className="space-y-3">
        {getDisplayApprovals().map(renderApprovalCard)}
      </div>

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
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-red-500 hover:bg-red-600'
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
