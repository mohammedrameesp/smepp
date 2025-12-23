'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Home, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-[150px] font-bold text-gray-200 leading-none">
            404
          </h1>
        </div>

        {/* Message */}
        <div className="mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Page Not Found
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
            <br />
            Let&apos;s get you back on track.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <Button
            onClick={() => router.push('/')}
            className="w-full h-14 bg-[#2F2F2F] hover:bg-[#1a1a1a] text-white font-semibold text-base rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Home className="h-5 w-5 mr-2" />
            Go to Home
          </Button>

          <Button
            onClick={() => router.back()}
            variant="outline"
            className="w-full h-14 font-semibold text-base rounded-lg border-2 hover:bg-gray-50 transition-all duration-200"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Help Text */}
        <p className="mt-8 text-sm text-gray-500">
          Need help? Contact your administrator or check the navigation menu.
        </p>
      </div>
    </div>
  );
}