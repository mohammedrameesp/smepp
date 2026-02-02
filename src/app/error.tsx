/**
 * @module app/error
 * @description Application-level error boundary component.
 *
 * This component catches and handles runtime errors that occur within the
 * application. It provides:
 * - Error logging to the application logger
 * - Automatic error reporting to backend API for super admin visibility
 * - User-friendly 500 error page with branded styling
 * - Recovery options (retry, navigate home)
 * - Error digest display for support reference
 *
 * Note: This error boundary does NOT catch errors in:
 * - The root layout (use global-error.tsx for that)
 * - Server-side rendering errors
 *
 * @see {@link module:app/global-error} - For root layout errors
 * @see {@link module:lib/core/log} - Application logger
 */
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Home } from 'lucide-react';
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
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#fafafa' }}
    >
      {/* 500 Text with Shadow Effect */}
      <div className="relative select-none mb-8">
        {/* Shadow layer */}
        <span
          className="absolute inset-0"
          style={{
            fontSize: 'clamp(120px, 20vw, 200px)',
            fontWeight: 800,
            lineHeight: 1,
            background: 'linear-gradient(135deg, #991b1b, #dc2626)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            opacity: 0.1,
            transform: 'translate(4px, 4px)',
          }}
          aria-hidden="true"
        >
          500
        </span>
        {/* Main text */}
        <span
          className="relative"
          style={{
            fontSize: 'clamp(120px, 20vw, 200px)',
            fontWeight: 800,
            lineHeight: 1,
            color: '#fecaca',
          }}
        >
          500
        </span>
      </div>

      {/* Gradient Divider - Red to Orange for errors */}
      <div
        className="rounded-full mb-8"
        style={{
          width: '60px',
          height: '4px',
          background: 'linear-gradient(90deg, #ef4444, #f97316)',
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
        Something Went Wrong
      </h1>

      {/* Description */}
      <p
        className="text-center max-w-md mb-6"
        style={{
          fontSize: '15px',
          color: '#64748b',
          lineHeight: 1.7,
        }}
      >
        We encountered an unexpected error. Our team has been notified and is
        working on a fix.
      </p>

      {/* Error ID */}
      {error.digest && (
        <p
          className="text-center mb-8"
          style={{
            fontSize: '13px',
            color: '#94a3b8',
            fontFamily: 'monospace',
          }}
        >
          Error ID: {error.digest}
        </p>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-4 justify-center">
        <button
          onClick={reset}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          style={{
            minWidth: '140px',
            backgroundColor: '#dc2626',
            color: '#ffffff',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#b91c1c';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#dc2626';
          }}
        >
          <RefreshCw size={18} />
          Try Again
        </button>
        <button
          onClick={() => router.push('/')}
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
          <Home size={18} />
          Go to Home
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
        If the problem persists, please contact support.
      </p>
    </div>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Application-level error boundary that catches runtime errors and displays
 * a user-friendly error page with recovery options.
 *
 * Key Features:
 * - Error logging to application logger with full context
 * - Async error reporting to /api/errors/report (non-blocking)
 * - Error digest display for support reference
 * - Retry button using Next.js reset() function
 * - Navigation to home page option
 * - Branded 500 error styling with gradient effects
 *
 * Security Considerations:
 * - Error stack traces are sent to backend but not displayed to users
 * - Error reporting is fire-and-forget to prevent UI blocking
 * - Only error.message and digest shown to end users
 *
 * Potential Improvements:
 * - Add user feedback form for error context
 * - Implement error rate limiting to prevent spam
 * - Add error categorization for analytics
 * - Consider Sentry or similar service integration
 *
 * Dependencies:
 * - @/lib/core/log: Application logger
 * - lucide-react: Icons
 * - next/navigation: Router for home navigation
 */
