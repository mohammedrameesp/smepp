'use client';

import type { TenantBranding } from '@/lib/types/tenant-branding';

interface TenantBrandedPanelProps {
  branding: TenantBranding | null;
  isLoading: boolean;
  variant: 'super-admin' | 'tenant';
}

// Inspiring quotes for the login page
const quotes = [
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
  { text: "Your time is limited, don't waste it living someone else's life.", author: "Steve Jobs" },
];

// Get a consistent quote based on the day
function getDailyQuote() {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return quotes[dayOfYear % quotes.length];
}

/**
 * Branded left panel for login pages
 */
export function TenantBrandedPanel({ branding, isLoading, variant }: TenantBrandedPanelProps) {
  const quote = getDailyQuote();

  // Super admin panel - fixed Durj branding (main domain)
  if (variant === 'super-admin') {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* Subtle decorative orb */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-between px-12 py-16 h-full w-full">
          {/* Spacer */}
          <div />

          {/* Center content - Logo and welcome */}
          <div>
            <div className="flex items-center gap-3 mb-8">
              <img src="/sme-icon-shield-512.png" alt="Durj" className="h-12 w-12" />
              <span className="text-3xl font-bold text-white">
                Durj
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              All-in-One Business<br />
              <span className="text-blue-400">Management Platform</span>
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Streamline your operations, empower your team, and accelerate growth.
            </p>
          </div>

          {/* Quote at bottom */}
          <div className="pt-6 border-t border-white/10">
            <blockquote className="text-slate-300 italic text-base">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="text-slate-500 text-sm mt-2">— {quote.author}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse" />
    );
  }

  // Tenant panel - dynamic branding
  const primaryColor = branding?.primaryColor || '#1E40AF';
  const secondaryColor = branding?.secondaryColor;
  const backgroundImage = branding?.loginBackgroundUrl;
  const welcomeTitle = branding?.welcomeTitle || 'Welcome back';
  const welcomeSubtitle = branding?.welcomeSubtitle || 'Sign in to access your workspace';
  const orgName = branding?.organizationName || 'Durj';
  const logoUrl = branding?.logoUrl;

  const backgroundStyle = backgroundImage
    ? `url(${backgroundImage}) center/cover no-repeat`
    : secondaryColor
      ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      : primaryColor;

  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      style={{ background: backgroundStyle }}
    >
      {/* Subtle decorative orb */}
      <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />

      {/* Overlay */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: backgroundImage ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)' }}
      />

      <div className="relative z-10 flex flex-col justify-between px-12 py-16 h-full w-full">
        {/* Spacer */}
        <div />

        {/* Center content - Logo and welcome */}
        <div>
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName}
              className="h-16 w-auto object-contain mb-8"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          ) : (
            <h1 className="text-3xl font-bold text-white mb-8">{orgName}</h1>
          )}

          <h2 className="text-4xl font-bold text-white mb-4">{welcomeTitle}</h2>
          <p className="text-xl text-white/80">{welcomeSubtitle}</p>
        </div>

        {/* Quote at bottom */}
        <div className="pt-6 border-t border-white/20">
          <blockquote className="text-white/80 italic text-base">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <p className="text-white/50 text-sm mt-2">— {quote.author}</p>
        </div>
      </div>
    </div>
  );
}
