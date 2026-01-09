'use client';

import type { TenantBranding } from '@/lib/types/tenant-branding';
import { CheckCircle2, Loader2 } from 'lucide-react';

interface SupplierRegistrationPanelProps {
  branding: TenantBranding | null;
  isLoading: boolean;
}

const benefits = [
  {
    title: 'Streamlined Registration',
    description: 'Quick and easy registration process',
  },
  {
    title: 'Direct Communication',
    description: 'Connect directly with procurement teams',
  },
  {
    title: 'Transparent Process',
    description: 'Clear and fair procurement procedures',
  },
  {
    title: 'Timely Payments',
    description: 'Reliable payment terms and schedules',
  },
];

/**
 * Branded left panel for supplier registration page
 * Shows organization branding and benefits of becoming a supplier
 */
export function SupplierRegistrationPanel({ branding, isLoading }: SupplierRegistrationPanelProps) {
  // Loading state
  if (isLoading) {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-200 to-gray-300 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const primaryColor = branding?.primaryColor || '#0f172a';
  const secondaryColor = branding?.secondaryColor;
  const orgName = branding?.organizationName || 'Our Organization';
  const logoUrl = branding?.logoUrl;

  // Use gradient when falling back to default slate color (no custom branding)
  const isDefaultColor = primaryColor === '#0f172a' && !secondaryColor;

  const backgroundStyle = isDefaultColor
    ? 'linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)'
    : secondaryColor
      ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      : primaryColor;

  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      style={{ background: backgroundStyle }}
    >
      {/* Subtle decorative orbs */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-20 w-60 h-60 bg-white/5 rounded-full blur-2xl" />

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/10" />

      <div className="relative z-10 flex flex-col justify-between px-12 py-16 h-full w-full">
        {/* Spacer */}
        <div />

        {/* Center content - Logo and welcome */}
        <div>
          {/* Organization Logo or Name */}
          {logoUrl ? (
            <img
              src={branding?.logoUrlInverse || logoUrl}
              alt={orgName}
              className="h-16 w-auto object-contain mb-8"
              style={!branding?.logoUrlInverse ? { filter: 'brightness(0) invert(1)' } : undefined}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <h1 className="text-3xl font-bold text-white mb-8">{orgName}</h1>
          )}

          {/* Welcome message */}
          <h2 className="text-4xl font-bold text-white mb-4">Become a Supplier</h2>
          <p className="text-xl text-white/80 mb-10">
            Join our trusted vendor network and grow your business with us
          </p>

          {/* Benefits list */}
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle2 className="h-6 w-6 text-white/90 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-medium">{benefit.title}</h3>
                  <p className="text-white/70 text-sm">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-white/20">
          <p className="text-white/60 text-sm">
            Already registered? Our team will contact you after reviewing your submission.
          </p>
        </div>
      </div>
    </div>
  );
}
