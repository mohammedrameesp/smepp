'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { ErrorPageLayout } from '@/components/ui/error-page-layout';
import logger from '@/lib/core/log';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    logger.error(
      {
        error: error.message,
        stack: error.stack,
        digest: error.digest,
      },
      'Application error boundary triggered'
    );

    // Report to backend for super admin visibility (non-blocking)
    fetch('/api/errors/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        source: 'error-boundary',
        digest: error.digest,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {}); // Non-blocking - ignore failures
  }, [error]);

  return (
    <ErrorPageLayout
      statusCode="500"
      statusCodeColor="text-red-200"
      title="Something Went Wrong"
      description={
        <>
          We encountered an unexpected error.
          <br />
          Our team has been notified and is working on a fix.
        </>
      }
      icon={AlertTriangle}
      iconColor="text-red-400"
      errorId={error.digest}
      primaryAction={{
        label: 'Try Again',
        icon: RefreshCw,
        onClick: reset,
      }}
      secondaryAction={{
        label: 'Go to Home',
        icon: Home,
        onClick: () => router.push('/'),
      }}
      helpText="If the problem persists, please contact support."
    />
  );
}
