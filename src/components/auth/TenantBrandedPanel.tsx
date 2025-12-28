'use client';

import type { TenantBranding } from '@/lib/types/tenant-branding';
import { Shield, Users, BarChart3, Settings, Zap, Clock, Lock, TrendingUp } from 'lucide-react';

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
 *
 * - For super-admin: Shows fixed SME++ platform branding
 * - For tenant: Shows dynamic organization branding
 */
export function TenantBrandedPanel({ branding, isLoading, variant }: TenantBrandedPanelProps) {
  const quote = getDailyQuote();

  // Super admin panel - fixed SME++ branding (main domain)
  if (variant === 'super-admin') {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Glowing orbs */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        <div className="relative z-10 flex flex-col justify-between px-12 py-16 h-full w-full">
          {/* Top section - Logo and headline */}
          <div>
            <div className="flex items-center gap-3 mb-12">
              <img src="/sme-icon-shield-512.png" alt="SME++" className="h-10 w-10" />
              <span className="text-2xl font-bold text-white">
                SME<span className="text-blue-400">++</span>
              </span>
            </div>

            <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
              All-in-One Business<br />
              <span className="text-blue-400">Management Platform</span>
            </h1>
            <p className="text-lg text-slate-300 mb-8 leading-relaxed">
              Streamline your operations, empower your team, and accelerate growth with our comprehensive business management solution.
            </p>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-blue-500/20">
                  <Zap className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Lightning Fast</p>
                  <p className="text-slate-400 text-xs">Optimized for speed</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-green-500/20">
                  <Shield className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Enterprise Security</p>
                  <p className="text-slate-400 text-xs">Bank-grade protection</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-purple-500/20">
                  <Users className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Team Collaboration</p>
                  <p className="text-slate-400 text-xs">Work together seamlessly</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 backdrop-blur-sm">
                <div className="p-2 rounded-lg bg-orange-500/20">
                  <BarChart3 className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Smart Analytics</p>
                  <p className="text-slate-400 text-xs">Data-driven insights</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom section - Quote */}
          <div className="mt-12 pt-8 border-t border-white/10">
            <blockquote className="text-slate-300 italic text-base leading-relaxed">
              &ldquo;{quote.text}&rdquo;
            </blockquote>
            <p className="text-slate-500 text-sm mt-2">— {quote.author}</p>
          </div>
        </div>
      </div>
    );
  }

  // Loading state for tenant panel
  if (isLoading) {
    return (
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-gray-200 via-gray-100 to-gray-200 relative overflow-hidden animate-pulse">
        <div className="relative z-10 flex flex-col justify-center px-12 py-16">
          <div className="max-w-md">
            <div className="h-16 w-48 bg-gray-300 rounded mb-4" />
            <div className="h-8 w-72 bg-gray-300 rounded mb-4" />
            <div className="h-6 w-64 bg-gray-300 rounded mb-8" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-20 bg-gray-300 rounded-lg" />
              <div className="h-20 bg-gray-300 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Tenant panel - dynamic branding (organization subdomain)
  const primaryColor = branding?.primaryColor || '#1E40AF';
  const secondaryColor = branding?.secondaryColor;
  const backgroundImage = branding?.loginBackgroundUrl;
  const welcomeTitle = branding?.welcomeTitle || 'Welcome back';
  const welcomeSubtitle = branding?.welcomeSubtitle || 'Sign in to access your workspace';
  const orgName = branding?.organizationName || 'SME++';
  const logoUrl = branding?.logoUrl;

  // Use gradient only if secondary color is explicitly set, otherwise solid primary color
  const backgroundStyle = backgroundImage
    ? `url(${backgroundImage}) center/cover no-repeat`
    : secondaryColor
      ? `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`
      : `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}dd 100%)`;

  return (
    <div
      className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
      style={{ background: backgroundStyle }}
    >
      {/* Decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Glowing orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-black/10 rounded-full blur-3xl" />
        {/* Subtle pattern */}
        <div className="absolute inset-0 opacity-[0.05]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }} />
      </div>

      {/* Overlay for better text readability */}
      <div
        className="absolute inset-0"
        style={{
          backgroundColor: backgroundImage ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.15)',
        }}
      />

      <div className="relative z-10 flex flex-col justify-between px-12 py-16 h-full w-full">
        {/* Top section - Logo and welcome */}
        <div>
          {/* Logo or Organization Name */}
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName}
              className="h-14 w-auto object-contain mb-10"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <h1 className="text-3xl font-bold text-white mb-10">{orgName}</h1>
          )}

          <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
            {welcomeTitle}
          </h2>
          <p className="text-xl text-white/80 mb-10 leading-relaxed">
            {welcomeSubtitle}
          </p>

          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-white/20">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Save Time</p>
                <p className="text-white/60 text-sm">Automate repetitive tasks and focus on what matters</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-white/20">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Secure Access</p>
                <p className="text-white/60 text-sm">Your data is protected with enterprise-grade security</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/10 backdrop-blur-sm">
              <div className="p-2 rounded-lg bg-white/20">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-white font-medium">Drive Growth</p>
                <p className="text-white/60 text-sm">Make informed decisions with real-time insights</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom section - Quote */}
        <div className="mt-10 pt-8 border-t border-white/20">
          <blockquote className="text-white/80 italic text-base leading-relaxed">
            &ldquo;{quote.text}&rdquo;
          </blockquote>
          <p className="text-white/50 text-sm mt-2">— {quote.author}</p>
        </div>
      </div>
    </div>
  );
}
