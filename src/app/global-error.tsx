/**
 * @module app/global-error
 * @description Global error boundary for critical application failures.
 *
 * This component catches errors that occur in the root layout or when the
 * standard error boundary fails. It renders a completely standalone error
 * page with its own <html> and <body> tags since the root layout may be
 * unavailable.
 *
 * Key differences from error.tsx:
 * - Renders full HTML document (including <html> and <body>)
 * - Uses inline styles only (CSS may not be available)
 * - Uses console.error instead of logger (logger may not be available)
 * - No navigation to home (router may not be available)
 * - Minimal dependencies to maximize reliability
 *
 * @see {@link module:app/error} - Standard error boundary
 */
'use client';

import { useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in global error since logger may not be available
    console.error('Global error boundary triggered:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            backgroundColor: '#fafafa',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          {/* 500 Text with Shadow Effect */}
          <div style={{ position: 'relative', userSelect: 'none', marginBottom: '32px' }}>
            {/* Shadow layer */}
            <span
              style={{
                position: 'absolute',
                inset: 0,
                fontSize: 'min(200px, 20vw)',
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
              style={{
                position: 'relative',
                fontSize: 'min(200px, 20vw)',
                fontWeight: 800,
                lineHeight: 1,
                color: '#fecaca',
              }}
            >
              500
            </span>
          </div>

          {/* Gradient Divider */}
          <div
            style={{
              width: '60px',
              height: '4px',
              borderRadius: '9999px',
              background: 'linear-gradient(90deg, #ef4444, #f97316)',
              marginBottom: '32px',
            }}
          />

          {/* Title */}
          <h1
            style={{
              fontSize: '24px',
              fontWeight: 600,
              color: '#1e293b',
              marginBottom: '16px',
              textAlign: 'center',
            }}
          >
            Critical Error
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: '15px',
              color: '#64748b',
              lineHeight: 1.7,
              textAlign: 'center',
              maxWidth: '400px',
              marginBottom: '24px',
            }}
          >
            A critical error occurred while loading the application. Please try refreshing the page.
          </p>

          {/* Error ID */}
          {error.digest && (
            <p
              style={{
                fontSize: '13px',
                color: '#94a3b8',
                fontFamily: 'monospace',
                textAlign: 'center',
                marginBottom: '32px',
              }}
            >
              Error ID: {error.digest}
            </p>
          )}

          {/* Button */}
          <button
            onClick={reset}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: 500,
              fontSize: '15px',
              minWidth: '160px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 0.2s',
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

          {/* Help text */}
          <p
            style={{
              marginTop: '40px',
              fontSize: '13px',
              color: '#94a3b8',
              textAlign: 'center',
            }}
          >
            If the problem persists, please contact support.
          </p>
        </div>
      </body>
    </html>
  );
}

/*
 * CODE REVIEW SUMMARY
 *
 * Purpose:
 * Global error boundary that catches critical errors in the root layout
 * or when the standard error boundary fails. This is the last line of
 * defense for unhandled errors.
 *
 * Key Features:
 * - Renders complete HTML document (not dependent on root layout)
 * - Uses only inline styles (CSS may not be available)
 * - Uses console.error instead of logger (may be unavailable)
 * - Minimal external dependencies for maximum reliability
 * - Error digest display for support reference
 * - Single retry button (no home navigation - router may fail)
 *
 * Design Decisions:
 * - No router.push() - uses reset() only to avoid potential failures
 * - Inline styles - no Tailwind classes that require CSS
 * - System font stack - no custom font loading
 * - Only lucide-react icon (RefreshCw) - minimal dependency
 *
 * Security Considerations:
 * - Only error.digest exposed to user, no stack traces
 * - No external API calls (network may be down)
 *
 * Potential Improvements:
 * - Add offline detection and messaging
 * - Consider adding a "report issue" link with mailto:
 * - Add browser console logging instructions for users
 *
 * Dependencies:
 * - lucide-react: RefreshCw icon only
 */
