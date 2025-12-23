import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

export default async function ForbiddenPage() {
  const session = await getServerSession(authOptions);

  // If not authenticated, redirect to login
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="container mx-auto py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <ShieldAlert className="h-12 w-12 text-red-600" />
              <div>
                <CardTitle className="text-2xl text-red-900">Access Forbidden</CardTitle>
                <p className="text-sm text-red-700 mt-1">Error 403</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-800">
              You do not have permission to access this page. This area is restricted to administrators only.
            </p>
            <div className="flex gap-3 pt-4">
              <Link href="/">
                <Button variant="default">
                  Go to Dashboard
                </Button>
              </Link>
              <Link href="/employee">
                <Button variant="outline">
                  Employee Portal
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
