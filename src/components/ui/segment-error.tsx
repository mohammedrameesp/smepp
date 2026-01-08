'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  segment?: string;
  homeUrl?: string;
}

/**
 * Scoped error boundary component for route segments.
 * Displays error within the layout context without crashing the entire app.
 * Uses card-based design appropriate for inline segment errors.
 */
export function SegmentError({
  error,
  reset,
  segment = 'this section',
  homeUrl = '/admin',
}: SegmentErrorProps) {
  useEffect(() => {
    console.error(`[${segment}] Error:`, error);
  }, [error, segment]);

  return (
    <div className="flex items-center justify-center min-h-[50vh] p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto flex items-center justify-center h-14 w-14 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-7 w-7 text-red-500" aria-hidden="true" />
          </div>
          <CardTitle className="text-xl font-bold text-gray-900">
            Something went wrong
          </CardTitle>
          <CardDescription className="text-gray-600 mt-2">
            We encountered an error loading {segment}. You can try again or navigate
            elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {error.digest && (
            <p className="text-xs text-gray-500 font-mono text-center bg-gray-100 p-2 rounded">
              Error ID: {error.digest}
            </p>
          )}
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-red-50 rounded overflow-auto max-h-32 text-red-600 text-xs">
                {error.message}
              </pre>
            </details>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-2">
          <Button
            onClick={reset}
            className="w-full h-11 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold rounded-lg"
            aria-label="Try loading again"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => (window.location.href = homeUrl)}
            className="w-full h-11 font-semibold rounded-lg border-2"
            aria-label="Go to dashboard"
          >
            <Home className="mr-2 h-4 w-4" aria-hidden="true" />
            Go to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
