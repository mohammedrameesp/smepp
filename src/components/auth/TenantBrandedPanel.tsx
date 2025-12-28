'use client';

import type { TenantBranding } from '@/lib/types/tenant-branding';

interface TenantBrandedPanelProps {
  branding: TenantBranding | null;
  isLoading: boolean;
  variant: 'super-admin' | 'tenant';
}

/**
 * Branded left panel for login pages
 *
 * - For super-admin: Shows fixed SME++ platform branding
 * - For tenant: Shows dynamic organization branding
 */
export function TenantBrandedPanel({ branding, isLoading, variant }: TenantBrandedPanelProps) {
  // Super admin panel - fixed SME++ branding
  if (variant === 'super-admin') {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10" />
        {/* Decorative grid pattern */}
        <div className="absolute inset-0 opacity-5">
          <div
            className="h-full w-full"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>
        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <div className="max-w-md">
            {/* Logo */}
            <div className="mb-6">
              <img src="/sme-wordmark-white.png" alt="SME++" className="h-12 w-auto" />
            </div>

            <h1 className="text-5xl font-extrabold text-white mb-4">
              SME<span className="text-blue-400">++</span>
            </h1>
            <p className="text-xl text-gray-300 mb-6">Platform Administration</p>
            <p className="text-gray-400 text-base leading-relaxed">
              Access the platform administration dashboard to manage organizations, users, and
              system settings.
            </p>

            <div className="mt-12 grid grid-cols-2 gap-4 text-gray-400 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                Organization Management
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                User Administration
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                System Settings
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-blue-400" />
                Platform Analytics
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Loading state for tenant panel
  if (isLoading) {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 relative overflow-hidden animate-pulse">
        <div className="relative z-10 flex flex-col justify-center px-16 py-24">
          <div className="max-w-md">
            <div className="h-16 w-48 bg-gray-300 rounded mb-4" />
            <div className="h-6 w-64 bg-gray-300 rounded mb-6" />
            <div className="h-20 w-full bg-gray-300 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Tenant panel - dynamic branding
  const primaryColor = branding?.primaryColor || '#1E40AF';
  const secondaryColor = branding?.secondaryColor || '#3B82F6';
  const backgroundImage = branding?.loginBackgroundUrl;
  const welcomeTitle = branding?.welcomeTitle || 'Welcome back';
  const welcomeSubtitle = branding?.welcomeSubtitle || 'Sign in to your account';
  const orgName = branding?.organizationName || 'SME++';
  const logoUrl = branding?.logoUrl;

  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      style={{
        background: backgroundImage
          ? `url(${backgroundImage}) center/cover no-repeat`
          : `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
      }}
    >
      {/* Overlay for better text readability */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: backgroundImage ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)',
        }}
      />

      <div className="relative z-10 flex flex-col justify-center px-16 py-24">
        <div className="max-w-md">
          {/* Logo or Organization Name */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName}
              className="h-16 w-auto object-contain mb-6"
              onError={(e) => {
                // Hide image on error and show text instead
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <h1 className="text-5xl font-extrabold text-white mb-4">{orgName}</h1>
          )}

          <p className="text-xl text-white/90 mb-6">{welcomeTitle}</p>
          <p className="text-white/70 text-base leading-relaxed">{welcomeSubtitle}</p>
        </div>
      </div>
    </div>
  );
}
