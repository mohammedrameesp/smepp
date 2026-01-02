'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * Onboarding page - DEPRECATED
 *
 * The self-service onboarding flow has been replaced with a super admin managed flow:
 * 1. Super admin creates organization and invites first admin
 * 2. Admin accepts invitation and goes to /setup
 * 3. Users without org go to /pending (waiting for invitation)
 *
 * This page now redirects to /pending for backwards compatibility.
 */
export default function OnboardingPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to pending page - the new flow doesn't use self-service onboarding
    router.replace('/pending');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
    </div>
  );
}
