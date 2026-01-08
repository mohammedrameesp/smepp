'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import {
  ShieldAlert,
  Lock,
  Package,
  Crown,
  Home,
  ArrowLeft,
  Settings,
  Sparkles,
} from 'lucide-react';
import { ErrorPageLayout } from '@/components/ui/error-page-layout';

type ForbiddenReason =
  | 'admin_only'
  | 'owner_only'
  | 'module_disabled'
  | 'tier_required'
  | 'permission_denied';

const MODULE_NAMES: Record<string, string> = {
  assets: 'Asset Management',
  subscriptions: 'Subscription Tracking',
  suppliers: 'Supplier Management',
  employees: 'Employee Management',
  leave: 'Leave Management',
  payroll: 'Payroll',
  tasks: 'Task Management',
  'purchase-requests': 'Purchase Requests',
  'company-documents': 'Company Documents',
};

const TIER_NAMES: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reason = (searchParams.get('reason') as ForbiddenReason) || 'permission_denied';
  const moduleId = searchParams.get('module');
  const requiredTier = searchParams.get('required_tier');
  const fromPath = searchParams.get('from');

  const moduleName = moduleId ? MODULE_NAMES[moduleId] || moduleId : 'this module';
  const tierName = requiredTier ? TIER_NAMES[requiredTier] || requiredTier : 'a higher';

  const configs: Record<
    ForbiddenReason,
    {
      title: string;
      description: React.ReactNode;
      statusCodeColor: string;
      icon: typeof ShieldAlert;
      iconColor: string;
      primaryAction: { label: string; icon: typeof Home; onClick: () => void };
      secondaryAction?: { label: string; icon: typeof ArrowLeft; onClick: () => void };
      helpText: string;
    }
  > = {
    admin_only: {
      title: 'Admin Access Required',
      description: (
        <>
          This area is restricted to administrators.
          {fromPath && (
            <>
              <br />
              <span className="text-gray-500 text-base">
                Attempted to access: {fromPath}
              </span>
            </>
          )}
        </>
      ),
      statusCodeColor: 'text-amber-200',
      icon: ShieldAlert,
      iconColor: 'text-amber-400',
      primaryAction: {
        label: 'Go to Dashboard',
        icon: Home,
        onClick: () => router.push('/employee'),
      },
      secondaryAction: {
        label: 'Go Back',
        icon: ArrowLeft,
        onClick: () => router.back(),
      },
      helpText: 'Contact your organization admin if you need access to this area.',
    },
    owner_only: {
      title: 'Owner Access Required',
      description: (
        <>
          Only the organization owner can access this feature.
          {fromPath && (
            <>
              <br />
              <span className="text-gray-500 text-base">
                Attempted to access: {fromPath}
              </span>
            </>
          )}
        </>
      ),
      statusCodeColor: 'text-amber-200',
      icon: Crown,
      iconColor: 'text-amber-400',
      primaryAction: {
        label: 'Go to Dashboard',
        icon: Home,
        onClick: () => router.push('/admin'),
      },
      secondaryAction: {
        label: 'Go Back',
        icon: ArrowLeft,
        onClick: () => router.back(),
      },
      helpText: 'This feature is restricted to the organization owner.',
    },
    module_disabled: {
      title: 'Module Not Enabled',
      description: (
        <>
          The <strong>{moduleName}</strong> module is not enabled for your organization.
          {fromPath && (
            <>
              <br />
              <span className="text-gray-500 text-base">
                Attempted to access: {fromPath}
              </span>
            </>
          )}
        </>
      ),
      statusCodeColor: 'text-blue-200',
      icon: Package,
      iconColor: 'text-blue-400',
      primaryAction: {
        label: 'Manage Modules',
        icon: Settings,
        onClick: () =>
          router.push(moduleId ? `/admin/modules?install=${moduleId}` : '/admin/modules'),
      },
      secondaryAction: {
        label: 'Go Back',
        icon: ArrowLeft,
        onClick: () => router.back(),
      },
      helpText: 'Contact your administrator to enable this module.',
    },
    tier_required: {
      title: 'Upgrade Required',
      description: (
        <>
          This feature requires the <strong>{tierName}</strong> plan or higher.
          {fromPath && (
            <>
              <br />
              <span className="text-gray-500 text-base">
                Attempted to access: {fromPath}
              </span>
            </>
          )}
        </>
      ),
      statusCodeColor: 'text-purple-200',
      icon: Lock,
      iconColor: 'text-purple-400',
      primaryAction: {
        label: 'View Plans',
        icon: Sparkles,
        onClick: () => router.push('/admin/settings/billing'),
      },
      secondaryAction: {
        label: 'Go Back',
        icon: ArrowLeft,
        onClick: () => router.back(),
      },
      helpText: 'Upgrade your subscription to unlock premium features.',
    },
    permission_denied: {
      title: 'Access Forbidden',
      description: (
        <>
          You do not have permission to access this resource.
          {fromPath && (
            <>
              <br />
              <span className="text-gray-500 text-base">
                Attempted to access: {fromPath}
              </span>
            </>
          )}
        </>
      ),
      statusCodeColor: 'text-red-200',
      icon: ShieldAlert,
      iconColor: 'text-red-400',
      primaryAction: {
        label: 'Go to Dashboard',
        icon: Home,
        onClick: () => router.push('/'),
      },
      secondaryAction: {
        label: 'Go Back',
        icon: ArrowLeft,
        onClick: () => router.back(),
      },
      helpText: 'Contact your administrator if you believe this is an error.',
    },
  };

  const config = configs[reason] || configs.permission_denied;

  return (
    <ErrorPageLayout
      statusCode="403"
      statusCodeColor={config.statusCodeColor}
      title={config.title}
      description={config.description}
      icon={config.icon}
      iconColor={config.iconColor}
      primaryAction={config.primaryAction}
      secondaryAction={config.secondaryAction}
      helpText={config.helpText}
    />
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <ForbiddenContent />
    </Suspense>
  );
}
