import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { EmployeeSupplierListTable } from '@/components/suppliers/employee-supplier-list-table';

export default async function EmployeeSuppliersPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  // Fetch all approved suppliers with related data
  const suppliers = await prisma.supplier.findMany({
    where: {
      status: 'APPROVED',
    },
    include: {
      _count: {
        select: {
          engagements: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  // Calculate stats
  const totalEngagements = suppliers.reduce((sum, s) => sum + s._count.engagements, 0);
  const uniqueCategories = new Set(suppliers.map(s => s.category)).size;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">All Suppliers</h1>
              <p className="text-gray-600">
                Browse and search approved company suppliers
              </p>
            </div>
            <Link href="/">
              <Button variant="outline">Back to Home</Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">Company Suppliers</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-blue-600">
                  {suppliers.length}
                </div>
                <p className="text-sm text-gray-500">Approved suppliers</p>
                {suppliers.length > 0 && (
                  <p className="text-xs text-gray-600 mt-2 truncate">
                    {suppliers.slice(0, 3).map(s => s.name).join(', ')}
                    {suppliers.length > 3 && '...'}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 pt-4 px-5">
                <CardTitle className="text-sm font-medium text-gray-600">Total Engagements</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-5">
                <div className="text-3xl font-bold text-green-600">
                  {totalEngagements}
                </div>
                <p className="text-sm text-gray-500">Across {uniqueCategories} categories</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Suppliers List with Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Company Suppliers ({suppliers.length})</CardTitle>
            <CardDescription>
              Search, filter, and browse all approved suppliers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {suppliers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-4">📦</div>
                <p>No suppliers found</p>
              </div>
            ) : (
              <EmployeeSupplierListTable suppliers={suppliers} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
