import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { SupplierListTableServerSearch } from '@/components/suppliers/supplier-list-table-server-search';

export default async function AdminSuppliersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  // Fetch only statistics (not all suppliers - table component fetches its own data)
  const [totalSuppliers, categories, totalEngagements] = await Promise.all([
    prisma.supplier.count(),
    prisma.supplier.findMany({
      select: { category: true },
      distinct: ['category'],
    }),
    prisma.supplierEngagement.count(),
  ]);

  const uniqueCategories = categories.length;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Suppliers</h1>
              <p className="text-gray-600">
                View, approve, and manage all supplier registrations
              </p>
            </div>
            <Link href="/suppliers/register" target="_blank">
              <Button>+ Register Supplier</Button>
            </Link>
          </div>

          {/* Key Figures */}
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Total Suppliers</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-gray-900">{totalSuppliers}</div>
                <p className="text-xs text-gray-500">Registered in database</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Categories</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-blue-600">{uniqueCategories}</div>
                <p className="text-xs text-gray-500">Unique supplier categories</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-1 pt-3 px-4">
                <CardTitle className="text-xs font-medium text-gray-600">Total Engagements</CardTitle>
              </CardHeader>
              <CardContent className="pb-3 px-4">
                <div className="text-2xl font-bold text-purple-600">{totalEngagements}</div>
                <p className="text-xs text-gray-500">Recorded interactions</p>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Suppliers</CardTitle>
            <CardDescription>
              Complete list of registered suppliers with status and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SupplierListTableServerSearch />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
