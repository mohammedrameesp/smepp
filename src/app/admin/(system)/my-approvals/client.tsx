'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { format, formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Calendar,
  Clock,
  Check,
  X,
  ChevronRight,
  Palmtree,
  ShoppingCart,
  Package,
  User,
  DollarSign,
  ArrowUpRight,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/core/utils';

interface ApprovalItem {
  id: string;
  entityType: 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';
  entityId: string;
  createdAt: string;
  entityDetails: Record<string, unknown>;
}

interface MyApprovalsClientProps {
  approvals: ApprovalItem[];
  grouped: {
    LEAVE_REQUEST: ApprovalItem[];
    PURCHASE_REQUEST: ApprovalItem[];
    ASSET_REQUEST: ApprovalItem[];
  };
}

const TYPE_CONFIG = {
  LEAVE_REQUEST: {
    icon: Palmtree,
    label: 'Leave',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    href: '/admin/leave/requests',
  },
  PURCHASE_REQUEST: {
    icon: ShoppingCart,
    label: 'Purchase',
    color: 'emerald',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    href: '/admin/purchase-requests',
  },
  ASSET_REQUEST: {
    icon: Package,
    label: 'Asset',
    color: 'violet',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-700',
    borderColor: 'border-violet-200',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    href: '/admin/asset-requests',
  },
};

// Avatar color palette based on name hash
const AVATAR_COLORS = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
  'bg-indigo-500',
  'bg-teal-500',
];

function getAvatarColor(name: string): string {
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getWaitingStatus(createdAt: string): { label: string; urgent: boolean } {
  const hours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
  if (hours > 72) return { label: 'Waiting 3+ days', urgent: true };
  if (hours > 48) return { label: 'Waiting 2+ days', urgent: true };
  if (hours > 24) return { label: 'Waiting 1+ day', urgent: false };
  return { label: formatDistanceToNow(new Date(createdAt), { addSuffix: false }), urgent: false };
}

export function MyApprovalsClient({ approvals, grouped }: MyApprovalsClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [selectedItem, setSelectedItem] = useState<ApprovalItem | null>(null);
  const [notes, setNotes] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST'>('all');

  const handleAction = async () => {
    if (!selectedItem || !actionType) return;

    setIsSubmitting(true);
    setProcessingId(selectedItem.id);
    try {
      let apiUrl = '';
      if (selectedItem.entityType === 'LEAVE_REQUEST') {
        apiUrl = `/api/leave/requests/${selectedItem.entityId}/${actionType}`;
      } else if (selectedItem.entityType === 'ASSET_REQUEST') {
        apiUrl = `/api/asset-requests/${selectedItem.entityId}/${actionType}`;
      } else if (selectedItem.entityType === 'PURCHASE_REQUEST') {
        apiUrl = `/api/purchase-requests/${selectedItem.entityId}/${actionType}`;
      }

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: notes.trim() || undefined,
          reason: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${actionType} request`);
      }

      toast.success(
        actionType === 'approve' ? 'Request approved successfully' : 'Request rejected',
        { description: `${TYPE_CONFIG[selectedItem.entityType].label} request has been ${actionType}d.` }
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${actionType} request`);
    } finally {
      setIsSubmitting(false);
      setProcessingId(null);
      setActionType(null);
      setSelectedItem(null);
      setNotes('');
    }
  };

  const openActionDialog = (item: ApprovalItem, action: 'approve' | 'reject') => {
    setSelectedItem(item);
    setActionType(action);
    setNotes('');
  };

  const displayApprovals = activeFilter === 'all' ? approvals : grouped[activeFilter];

  const filterOptions: Array<{
    key: 'all' | 'LEAVE_REQUEST' | 'PURCHASE_REQUEST' | 'ASSET_REQUEST';
    label: string;
    count: number;
    icon?: typeof Palmtree;
  }> = [
    { key: 'all', label: 'All', count: approvals.length },
    { key: 'LEAVE_REQUEST', label: 'Leave', count: grouped.LEAVE_REQUEST.length, icon: Palmtree },
    { key: 'PURCHASE_REQUEST', label: 'Purchase', count: grouped.PURCHASE_REQUEST.length, icon: ShoppingCart },
    { key: 'ASSET_REQUEST', label: 'Asset', count: grouped.ASSET_REQUEST.length, icon: Package },
  ];

  return (
    <div className="space-y-6">
      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {filterOptions.map((option) => {
          const isActive = activeFilter === option.key;
          const Icon = option.icon;
          return (
            <button
              key={option.key}
              onClick={() => setActiveFilter(option.key)}
              disabled={option.count === 0 && option.key !== 'all'}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all',
                isActive
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-50',
                option.count === 0 && option.key !== 'all' && 'opacity-40 cursor-not-allowed'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {option.label}
              <span className={cn(
                'text-xs px-2 py-0.5 rounded-full',
                isActive ? 'bg-white/20' : 'bg-slate-100'
              )}>
                {option.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Approval Cards */}
      <div className="grid gap-4">
        {displayApprovals.map((item) => {
          const config = TYPE_CONFIG[item.entityType];
          const Icon = config.icon;
          const details = item.entityDetails;
          const requesterName = String(details.requester || 'Unknown');
          const waitingStatus = getWaitingStatus(item.createdAt);
          const isProcessing = processingId === item.id;

          return (
            <div
              key={item.id}
              className={cn(
                'bg-white rounded-2xl border border-slate-200 overflow-hidden transition-all hover:shadow-lg hover:border-slate-300',
                isProcessing && 'opacity-60 pointer-events-none'
              )}
            >
              {/* Type indicator bar */}
              <div className={cn('h-1', config.bgColor)} />

              <div className="p-5">
                <div className="flex gap-4">
                  {/* Avatar */}
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0',
                    getAvatarColor(requesterName)
                  )}>
                    {getInitials(requesterName)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <h3 className="font-semibold text-slate-900">{requesterName}</h3>
                          <Badge variant="secondary" className={cn('text-xs', config.bgColor, config.textColor)}>
                            <Icon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {waitingStatus.label}
                          </span>
                          {waitingStatus.urgent && (
                            <span className="text-amber-600 font-medium">Needs attention</span>
                          )}
                        </div>
                      </div>

                      {/* Quick approve/reject for desktop */}
                      <div className="hidden sm:flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => openActionDialog(item, 'approve')}
                          disabled={isProcessing}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </>
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(item, 'reject')}
                          disabled={isProcessing}
                          className="text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Request details */}
                    <div className={cn(
                      'rounded-xl p-3 mb-3',
                      config.bgColor
                    )}>
                      {item.entityType === 'LEAVE_REQUEST' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">
                              {String(details.type || 'Leave')}
                            </span>
                            <span className="text-sm font-semibold text-slate-700">
                              {String(details.totalDays || 0)} day{Number(details.totalDays) !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-slate-600">
                            <Calendar className="h-3.5 w-3.5" />
                            {format(new Date(details.startDate as string), 'MMM d')} → {format(new Date(details.endDate as string), 'MMM d, yyyy')}
                          </div>
                        </div>
                      )}

                      {item.entityType === 'PURCHASE_REQUEST' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900 line-clamp-1">
                              {String(details.title || 'Untitled Request')}
                            </span>
                            {details.priority && (
                              <Badge variant="secondary" className={cn(
                                'text-xs',
                                String(details.priority) === 'HIGH' && 'bg-red-100 text-red-700',
                                String(details.priority) === 'MEDIUM' && 'bg-amber-100 text-amber-700',
                                String(details.priority) === 'LOW' && 'bg-slate-100 text-slate-600'
                              )}>
                                {String(details.priority) as string}
                              </Badge>
                            )}
                          </div>
                          {details.totalAmount && (
                            <div className="flex items-center gap-1.5 text-sm">
                              <DollarSign className="h-3.5 w-3.5 text-slate-500" />
                              <span className="font-semibold text-slate-900">
                                {String(details.currency || 'QAR')} {Number(details.totalAmount).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {item.entityType === 'ASSET_REQUEST' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-slate-900">
                              {String(details.assetName || 'Asset')}
                            </span>
                            <Badge variant="secondary" className={cn(
                              'text-xs',
                              String(details.type) === 'Return'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            )}>
                              {String(details.type || 'Request') as string}
                            </Badge>
                          </div>
                          {details.assetTag && (
                            <div className="text-sm text-slate-600">
                              Tag: {String(details.assetTag) as string}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reason/Justification */}
                      {(details.reason || details.justification) && (
                        <p className="text-sm text-slate-600 mt-2 line-clamp-2 italic">
                          &ldquo;{String(details.reason || details.justification)}&rdquo;
                        </p>
                      )}
                    </div>

                    {/* Mobile action buttons + View details link */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 sm:hidden">
                        <Button
                          size="sm"
                          onClick={() => openActionDialog(item, 'approve')}
                          disabled={isProcessing}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(item, 'reject')}
                          disabled={isProcessing}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <Link
                        href={`${config.href}/${item.entityId}`}
                        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-900 font-medium ml-auto"
                      >
                        View details
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty state for filtered view */}
      {displayApprovals.length === 0 && activeFilter !== 'all' && (
        <div className="text-center py-12">
          <div className={cn(
            'w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4',
            TYPE_CONFIG[activeFilter].iconBg
          )}>
            {(() => {
              const Icon = TYPE_CONFIG[activeFilter].icon;
              return <Icon className={cn('h-8 w-8', TYPE_CONFIG[activeFilter].iconColor)} />;
            })()}
          </div>
          <h3 className="font-semibold text-slate-900 mb-1">No {TYPE_CONFIG[activeFilter].label.toLowerCase()} requests</h3>
          <p className="text-slate-500 text-sm">All {TYPE_CONFIG[activeFilter].label.toLowerCase()} requests have been processed.</p>
        </div>
      )}

      {/* Action confirmation dialog */}
      <AlertDialog open={actionType !== null} onOpenChange={() => !isSubmitting && setActionType(null)}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {actionType === 'approve' ? (
                <>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-600" />
                  </div>
                  Approve Request
                </>
              ) : (
                <>
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="h-4 w-4 text-red-600" />
                  </div>
                  Reject Request
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionType === 'approve'
                ? 'This will approve the request and notify the requester.'
                : 'This will reject the request. Please provide a reason below.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {selectedItem && (
            <div className={cn(
              'rounded-lg p-3 my-2',
              TYPE_CONFIG[selectedItem.entityType].bgColor
            )}>
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-slate-500" />
                <span className="font-medium">{String(selectedItem.entityDetails.requester)}</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-600">{TYPE_CONFIG[selectedItem.entityType].label}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              {actionType === 'approve' ? 'Notes (optional)' : 'Reason for rejection'}
              {actionType === 'reject' && <span className="text-red-500 ml-1">*</span>}
            </label>
            <Textarea
              placeholder={
                actionType === 'approve'
                  ? 'Add any notes for the requester...'
                  : 'Please explain why this request is being rejected...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleAction}
              disabled={isSubmitting || (actionType === 'reject' && !notes.trim())}
              className={cn(
                'gap-2',
                actionType === 'approve'
                  ? 'bg-emerald-500 hover:bg-emerald-600'
                  : 'bg-red-500 hover:bg-red-600'
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === 'approve' ? (
                <>
                  <Check className="h-4 w-4" />
                  Approve
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Reject
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
