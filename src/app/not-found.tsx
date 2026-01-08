'use client';

import { useRouter } from 'next/navigation';
import { Home, ArrowLeft } from 'lucide-react';
import { ErrorPageLayout } from '@/components/ui/error-page-layout';

export default function NotFound() {
  const router = useRouter();

  return (
    <ErrorPageLayout
      statusCode="404"
      statusCodeColor="text-gray-200"
      title="Page Not Found"
      description={
        <>
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          <br />
          Let&apos;s get you back on track.
        </>
      }
      primaryAction={{
        label: 'Go to Home',
        icon: Home,
        onClick: () => router.push('/'),
      }}
      secondaryAction={{
        label: 'Go Back',
        icon: ArrowLeft,
        onClick: () => router.back(),
      }}
      helpText="Need help? Contact your administrator or check the navigation menu."
    />
  );
}
