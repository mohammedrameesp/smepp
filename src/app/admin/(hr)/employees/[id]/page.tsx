import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { redirect, notFound } from 'next/navigation';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { formatDate, formatDateTime } from '@/lib/date-format';
import { ArrowLeft, Edit, User, AlertTriangle, CheckCircle, XCircle, Package, CreditCard, FileText, Trash2, Calendar } from 'lucide-react';
import { EmployeeHRViewSection } from '@/components/employees/employee-hr-view';
import { getUserSubscriptionHistory } from '@/lib/subscription-lifecycle';
import { getUserAssetHistory } from '@/lib/asset-lifecycle';
import { UserSubscriptionHistory } from '@/components/users/user-subscription-history';
import { UserAssetHistory } from '@/components/users/user-asset-history';
import { DeleteUserButton } from '@/components/users/delete-user-button';
import { ExportUserPDFButton } from '@/components/users/export-user-pdf-button';
import { EmployeeLeaveSection } from '@/components/employees/employee-leave-section';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminEmployeeDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (process.env.NODE_ENV !== 'development' && session.user.role !== Role.ADMIN) {
    redirect('/forbidden');
  }

  const { id } = await params;

  const employee = await prisma.user.findUnique({
    where: { id },
    include: {
      hrProfile: true,
      _count: {
        select: {
          assets: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!employee) {
    notFound();
  }

  const hr = employee.hrProfile;

  // Get asset and subscription history
  const subscriptionHistory = await getUserSubscriptionHistory(id);
  const assetHistory = await getUserAssetHistory(id);

  // Calculate profile completion
  const requiredFields = [
    'dateOfBirth', 'gender', 'nationality', 'qatarMobile',
    'localEmergencyName', 'localEmergencyPhone',
    'qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry',
    'designation',
  ];

  let filledFields = 0;
  if (hr) {
    requiredFields.forEach((field) => {
      if (hr[field as keyof typeof hr]) filledFields++;
    });
  }
  const completionPercentage = Math.round((filledFields / requiredFields.length) * 100);

  // Check expiry status
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const thirtyDaysFromNow = new Date(today);
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  const getExpiryStatus = (date: Date | null) => {
    if (!date) return null;
    if (date < today) return 'expired';
    if (date <= thirtyDaysFromNow) return 'expiring';
    return 'valid';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'EMPLOYEE':
      case 'TEMP_STAFF':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const isSelf = session.user.id === employee.id;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/admin/employees">
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Employees
                </Button>
              </Link>
            </div>

            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                  {hr?.photoUrl || employee.image ? (
                    <img
                      src={hr?.photoUrl || employee.image || ''}
                      alt={employee.name || employee.email}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <User className="h-8 w-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">{employee.name || 'No name'}</h1>
                  <p className="text-gray-600">{employee.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={getRoleBadgeVariant(employee.role)}>
                      {employee.role}
                    </Badge>
                    {hr?.employeeId && (
                      <Badge variant="outline" className="font-mono">
                        ID: {hr.employeeId}
                      </Badge>
                    )}
                    {employee.isSystemAccount && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                        System Account
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                <ExportUserPDFButton
                  userId={employee.id}
                  userName={employee.name || ''}
                  userEmail={employee.email}
                />
                <Link href={`/admin/employees/${id}/edit`}>
                  <Button variant="outline">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </Link>
                {!isSelf && !employee.isSystemAccount && (
                  <DeleteUserButton
                    userId={employee.id}
                    userName={employee.name || employee.email}
                  />
                )}
              </div>
            </div>
          </div>

          {/* Profile Completion Alert */}
          {completionPercentage < 80 && !employee.isSystemAccount && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium text-orange-800">Profile Incomplete ({completionPercentage}%)</p>
                <p className="text-sm text-orange-600">
                  This employee's profile is missing some required information.
                </p>
              </div>
              <Link href={`/admin/employees/${id}/edit`} className="ml-auto">
                <Button size="sm" variant="outline">Complete Profile</Button>
              </Link>
            </div>
          )}

          <div className="grid gap-6">
            {/* Overview Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Assets
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employee._count.assets}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Subscriptions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{employee._count.subscriptions}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Profile Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{completionPercentage}%</div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${completionPercentage >= 80 ? 'bg-green-500' : 'bg-orange-500'}`}
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Joined</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-medium">
                    {hr?.dateOfJoining ? formatDate(hr.dateOfJoining) : <span className="text-gray-400">Not set</span>}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabbed Content */}
            <Tabs defaultValue="hr" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="hr" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Assets ({employee._count.assets})
                </TabsTrigger>
                <TabsTrigger value="subscriptions" className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Subscriptions ({employee._count.subscriptions})
                </TabsTrigger>
                <TabsTrigger value="leave" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Leave
                </TabsTrigger>
              </TabsList>

              <TabsContent value="hr" className="mt-6">
                <EmployeeHRViewSection hrProfile={hr} employee={employee} />
              </TabsContent>

              <TabsContent value="assets" className="mt-6">
                <UserAssetHistory assets={assetHistory as any} />
              </TabsContent>

              <TabsContent value="subscriptions" className="mt-6">
                <UserSubscriptionHistory subscriptions={subscriptionHistory as any} />
              </TabsContent>

              <TabsContent value="leave" className="mt-6">
                <EmployeeLeaveSection userId={id} />
              </TabsContent>
            </Tabs>

            {/* System Information */}
            <Card>
              <CardHeader>
                <CardTitle>System Information</CardTitle>
                <CardDescription>
                  System timestamps and tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Account Created</div>
                    <div>{formatDateTime(employee.createdAt)}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700 mb-1">Last Updated</div>
                    <div>{formatDateTime(employee.updatedAt)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
