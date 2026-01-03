import Link from 'next/link';
import { Package, Laptop, Smartphone, Monitor, CreditCard, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Asset {
  id: string;
  name: string;
  code: string;
  type?: string;
}

interface HoldingsCardProps {
  assets: Asset[];
  subscriptionCount: number;
  className?: string;
}

function getAssetIcon(type?: string) {
  switch (type?.toLowerCase()) {
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

export function HoldingsCard({ assets, subscriptionCount, className }: HoldingsCardProps) {
  return (
    <div className={cn('bg-white border border-gray-200 rounded-xl p-4', className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Package className="h-5 w-5 text-gray-500" />
          My Holdings
        </h3>
        <Link href="/employee/my-assets" className="text-sm text-gray-600 font-medium hover:text-gray-800">
          View All
        </Link>
      </div>

      <div className="flex items-center gap-4 mb-3 pb-3 border-b">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-gray-900">{assets.length}</span>
          <span className="text-gray-500">Assets</span>
        </div>
        <div className="w-px h-4 bg-gray-200" />
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold text-gray-900">{subscriptionCount}</span>
          <span className="text-gray-500">Subscriptions</span>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No assets assigned</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assets.slice(0, 3).map((asset) => {
            const Icon = getAssetIcon(asset.type);
            return (
              <div key={asset.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 bg-gray-200 rounded flex items-center justify-center">
                  <Icon className="h-4 w-4 text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{asset.name}</p>
                  <p className="text-xs text-gray-500">{asset.code}</p>
                </div>
              </div>
            );
          })}
          {assets.length > 3 && (
            <Link
              href="/employee/my-assets"
              className="block text-center text-xs text-gray-600 hover:text-gray-800 py-1"
            >
              +{assets.length - 3} more
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
