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
  type LucideIcon,
} from 'lucide-react';

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
  'spend-requests': 'Spend Requests',
  'company-documents': 'Company Documents',
};

const TIER_NAMES: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  PROFESSIONAL: 'Professional',
  ENTERPRISE: 'Enterprise',
};

interface ReasonConfig {
  title: string;
  description: string;
  gradientColors: [string, string]; // shadow gradient
  dividerColors: [string, string]; // divider gradient
  numberColor: string;
  primaryButtonColor: string;
  primaryButtonHover: string;
  icon: LucideIcon;
  primaryAction: { label: string; icon: LucideIcon; path: string };
  helpText: string;
}

function ForbiddenContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const reason = (searchParams.get('reason') as ForbiddenReason) || 'permission_denied';
  const moduleId = searchParams.get('module');
  const requiredTier = searchParams.get('required_tier');
  const fromPath = searchParams.get('from');

  const moduleName = moduleId ? MODULE_NAMES[moduleId] || moduleId : 'this module';
  const tierName = requiredTier ? TIER_NAMES[requiredTier] || requiredTier : 'a higher';

  const configs: Record<ForbiddenReason, ReasonConfig> = {
    admin_only: {
      title: 'Admin Access Required',
      description: 'This area is restricted to administrators.',
      gradientColors: ['#92400e', '#d97706'],
      dividerColors: ['#f59e0b', '#fbbf24'],
      numberColor: '#fef3c7',
      primaryButtonColor: '#d97706',
      primaryButtonHover: '#b45309',
      icon: ShieldAlert,
      primaryAction: { label: 'Go to Dashboard', icon: Home, path: '/employee' },
      helpText: 'Contact your organization admin if you need access to this area.',
    },
    owner_only: {
      title: 'Owner Access Required',
      description: 'Only the organization owner can access this feature.',
      gradientColors: ['#92400e', '#d97706'],
      dividerColors: ['#f59e0b', '#fbbf24'],
      numberColor: '#fef3c7',
      primaryButtonColor: '#d97706',
      primaryButtonHover: '#b45309',
      icon: Crown,
      primaryAction: { label: 'Go to Dashboard', icon: Home, path: '/admin' },
      helpText: 'This feature is restricted to the organization owner.',
    },
    module_disabled: {
      title: 'Module Not Enabled',
      description: `The ${moduleName} module is not enabled for your organization.`,
      gradientColors: ['#1e40af', '#3b82f6'],
      dividerColors: ['#3b82f6', '#60a5fa'],
      numberColor: '#dbeafe',
      primaryButtonColor: '#2563eb',
      primaryButtonHover: '#1d4ed8',
      icon: Package,
      primaryAction: {
        label: 'Manage Modules',
        icon: Settings,
        path: moduleId ? `/admin/modules?install=${moduleId}` : '/admin/modules',
      },
      helpText: 'Contact your administrator to enable this module.',
    },
    tier_required: {
      title: 'Upgrade Required',
      description: `This feature requires the ${tierName} plan or higher.`,
      gradientColors: ['#6b21a8', '#9333ea'],
      dividerColors: ['#a855f7', '#c084fc'],
      numberColor: '#f3e8ff',
      primaryButtonColor: '#7c3aed',
      primaryButtonHover: '#6d28d9',
      icon: Lock,
      primaryAction: { label: 'View Plans', icon: Sparkles, path: '/admin/settings/billing' },
      helpText: 'Upgrade your subscription to unlock premium features.',
    },
    permission_denied: {
      title: 'Access Forbidden',
      description: 'You do not have permission to access this resource.',
      gradientColors: ['#991b1b', '#dc2626'],
      dividerColors: ['#ef4444', '#f97316'],
      numberColor: '#fecaca',
      primaryButtonColor: '#dc2626',
      primaryButtonHover: '#b91c1c',
      icon: ShieldAlert,
      primaryAction: { label: 'Go to Dashboard', icon: Home, path: '/' },
      helpText: 'Contact your administrator if you believe this is an error.',
    },
  };

  const config = configs[reason] || configs.permission_denied;
  const IconComponent = config.icon;
  const PrimaryIcon = config.primaryAction.icon;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#fafafa' }}
    >
      {/* 403 Text with Shadow Effect */}
      <div className="relative select-none mb-6">
        {/* Shadow layer */}
        <span
          className="absolute inset-0"
          style={{
            fontSize: 'clamp(120px, 20vw, 200px)',
            fontWeight: 800,
            lineHeight: 1,
            background: `linear-gradient(135deg, ${config.gradientColors[0]}, ${config.gradientColors[1]})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.1,
            transform: 'translate(4px, 4px)',
          }}
          aria-hidden="true"
        >
          403
        </span>
        {/* Main text */}
        <span
          className="relative"
          style={{
            fontSize: 'clamp(120px, 20vw, 200px)',
            fontWeight: 800,
            lineHeight: 1,
            color: config.numberColor,
          }}
        >
          403
        </span>
      </div>

      {/* Icon */}
      <div className="mb-6">
        <IconComponent
          size={48}
          style={{ color: config.gradientColors[1] }}
          strokeWidth={1.5}
        />
      </div>

      {/* Gradient Divider */}
      <div
        className="rounded-full mb-8"
        style={{
          width: '60px',
          height: '4px',
          background: `linear-gradient(90deg, ${config.dividerColors[0]}, ${config.dividerColors[1]})`,
        }}
      />

      {/* Title */}
      <h1
        className="mb-4 text-center"
        style={{
          fontSize: '24px',
          fontWeight: 600,
          color: '#1e293b',
        }}
      >
        {config.title}
      </h1>

      {/* Description */}
      <p
        className="text-center max-w-md mb-2"
        style={{
          fontSize: '15px',
          color: '#64748b',
          lineHeight: 1.7,
        }}
      >
        {config.description}
      </p>

      {/* From path */}
      {fromPath && (
        <p
          className="text-center mb-8"
          style={{
            fontSize: '13px',
            color: '#94a3b8',
            fontFamily: 'monospace',
          }}
        >
          Attempted: {fromPath}
        </p>
      )}

      {!fromPath && <div className="mb-8" />}

      {/* Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={() => router.push(config.primaryAction.path)}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            minWidth: '160px',
            backgroundColor: config.primaryButtonColor,
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = config.primaryButtonHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = config.primaryButtonColor;
          }}
        >
          <PrimaryIcon size={18} />
          {config.primaryAction.label}
        </button>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400"
          style={{
            minWidth: '140px',
            backgroundColor: '#ffffff',
            color: '#1e293b',
            border: '1px solid #e2e8f0',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f8fafc';
            e.currentTarget.style.borderColor = '#cbd5e1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#e2e8f0';
          }}
        >
          <ArrowLeft size={18} />
          Go Back
        </button>
      </div>

      {/* Help text */}
      <p
        className="mt-10 text-center"
        style={{
          fontSize: '13px',
          color: '#94a3b8',
        }}
      >
        {config.helpText}
      </p>
    </div>
  );
}

export default function ForbiddenPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: '#fafafa' }}
        >
          <div className="animate-pulse text-gray-400">Loading...</div>
        </div>
      }
    >
      <ForbiddenContent />
    </Suspense>
  );
}
