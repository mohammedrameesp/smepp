/**
 * @file segment-error.tsx
 * @description Scoped error boundary component for route segments
 * @module components/ui
 */

'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface SegmentErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
  segment?: string;
  homeUrl?: string;
}

/**
 * Scoped error boundary component for route segments.
 * Displays error within the layout context without crashing the entire app.
 */
export function SegmentError({
  error,
  reset,
  segment = 'this section',
  homeUrl = '/admin',
}: SegmentErrorProps) {
  useEffect(() => {
    // Log the error to console in development
    console.error(`[${segment}] Error:`, error);
  }, [error, segment]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <CardTitle>Something went wrong</CardTitle>
          <CardDescription>
            We encountered an error loading {segment}. You can try again or navigate elsewhere.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono text-center bg-muted p-2 rounded">
              Error ID: {error.digest}
            </p>
          )}
          {process.env.NODE_ENV === 'development' && error.message && (
            <details className="mt-4 text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Error details
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-32 text-destructive">
                {error.message}
              </pre>
            </details>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button onClick={reset} className="w-full" aria-label="Try loading again">
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
            Try again
          </Button>
          <Button
            variant="outline"
            onClick={() => window.location.href = homeUrl}
            className="w-full"
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
