'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

export default function TestErrorPage() {
  const searchParams = useSearchParams();
  const shouldError = searchParams.get('trigger') === 'true';

  useEffect(() => {
    if (shouldError) {
      throw new Error('Test error triggered intentionally');
    }
  }, [shouldError]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Error Test Page</h1>
        <p className="text-gray-600 mb-6">Click the button to trigger a 500 error</p>
        <a
          href="/test-error?trigger=true"
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
        >
          Trigger 500 Error
        </a>
      </div>
    </div>
  );
}
