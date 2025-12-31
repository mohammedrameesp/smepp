'use client';

import { SegmentError } from '@/components/ui/segment-error';

export default function HRError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <SegmentError error={error} reset={reset} segment="HR module" homeUrl="/admin" />;
}
