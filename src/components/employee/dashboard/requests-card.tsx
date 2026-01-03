import Link from 'next/link';
import { ShoppingCart, Palmtree, Laptop, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/date-format';

type RequestType = 'leave' | 'purchase' | 'asset';
type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

interface UnifiedRequest {
  id: string;
  type: RequestType;
  title: string;
  referenceNumber: string;
  status: RequestStatus;
  subtitle: string;
  createdAt: Date;
  color?: string; // For leave type color
}

interface RequestsCardProps {
  requests: UnifiedRequest[];
  className?: string;
}

const typeConfig: Record<RequestType, { icon: typeof ShoppingCart; bgColor: string; iconColor: string }> = {
  purchase: {
    icon: ShoppingCart,
    bgColor: 'bg-slate-100',
    iconColor: 'text-violet-600',
  },
  leave: {
    icon: Palmtree,
    bgColor: 'bg-slate-100',
    iconColor: 'text-blue-600',
  },
  asset: {
    icon: Laptop,
    bgColor: 'bg-slate-100',
    iconColor: 'text-emerald-600',
  },
};

const statusConfig: Record<RequestStatus, { className: string }> = {
  PENDING: { className: 'bg-yellow-100 text-yellow-700' },
  APPROVED: { className: 'bg-green-100 text-green-700' },
  REJECTED: { className: 'bg-red-100 text-red-700' },
  CANCELLED: { className: 'bg-gray-100 text-gray-600' },
};

function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1d ago';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(date);
}

export function RequestsCard({ requests, className }: RequestsCardProps) {
  const hasRequests = requests.length > 0;

  return (
    <div className={cn('', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <span className="text-gray-400">📋</span>
          My Requests
        </h3>
        <Link href="/employee/purchase-requests" className="text-sm text-blue-600 font-medium hover:text-blue-700">
          View All
        </Link>
      </div>

      {!hasRequests ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-xl">
          <ShoppingCart className="h-10 w-10 mx-auto mb-2 text-gray-300" />
          <p className="text-sm font-medium">No requests yet</p>
          <p className="text-xs">Your requests will appear here</p>
        </div>
      ) : (
        <div className="space-y-2">
          {requests.slice(0, 4).map((request) => {
            const config = typeConfig[request.type];
            const Icon = config.icon;
            const statusStyle = statusConfig[request.status];

            const href =
              request.type === 'leave'
                ? `/employee/leave/${request.id}`
                : request.type === 'purchase'
                ? `/employee/purchase-requests/${request.id}`
                : `/employee/asset-requests/${request.id}`;

            return (
              <Link key={`${request.type}-${request.id}`} href={href}>
                <div
                  className="bg-white border border-gray-200 rounded-xl p-3 transition-colors cursor-pointer hover:border-gray-300 hover:bg-gray-50"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                        config.bgColor
                      )}
                    >
                      <Icon
                        className={cn('h-4 w-4', config.iconColor)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{request.title}</p>
                        <Badge className={cn('text-xs', statusStyle.className)}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">
                        {request.referenceNumber} • {request.subtitle}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {getRelativeTime(request.createdAt)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
