'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users, Loader2, Shield, ArrowLeft, Banknote } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { HRProfileForm } from '@/components/domains/hr/profile';
import { toast } from 'sonner';

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
}

interface ManagerOption {
  id: string;
  name: string | null;
  email: string;
}

interface HRProfileData {
  id: string;
  userId: string;
  user?: UserInfo;
  dateOfBirth: string | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  qatarMobile: string | null;
  otherMobileCode: string | null;
  otherMobileNumber: string | null;
  personalEmail: string | null;
  qatarZone: string | null;
  qatarStreet: string | null;
  qatarBuilding: string | null;
  qatarUnit: string | null;
  homeCountryAddress: string | null;
  localEmergencyName: string | null;
  localEmergencyRelation: string | null;
  localEmergencyPhoneCode: string | null;
  localEmergencyPhone: string | null;
  homeEmergencyName: string | null;
  homeEmergencyRelation: string | null;
  homeEmergencyPhoneCode: string | null;
  homeEmergencyPhone: string | null;
  qidNumber: string | null;
  qidExpiry: string | null;
  passportNumber: string | null;
  passportExpiry: string | null;
  passportCountry: string | null;
  healthCardNumber: string | null;
  healthCardExpiry: string | null;
  sponsorshipType: string | null;
  employeeId: string | null;
  designation: string | null;
  dateOfJoining: string | null;
  bankName: string | null;
  iban: string | null;
  highestQualification: string | null;
  specialization: string | null;
  institutionName: string | null;
  graduationYear: number | null;
  qidUrl: string | null;
  passportCopyUrl: string | null;
  photoUrl: string | null;
  contractCopyUrl: string | null;
  hasDrivingLicense: boolean;
  licenseNumber: string | null;
  licenseExpiry: string | null;
  languagesKnown: string | null;
  skillsCertifications: string | null;
  workEmail?: string;
  // Permission flags
  isAdmin?: boolean;
  hasOperationsAccess?: boolean;
  hasHRAccess?: boolean;
  hasFinanceAccess?: boolean;
  canApprove?: boolean;
  reportingToId?: string | null;
  // Other settings
  isOnWps?: boolean;
  isEmployee?: boolean;
}

export default function AdminEmployeeEditPage() {
  const params = useParams();
  const router = useRouter();
  const [hrProfile, setHRProfile] = useState<HRProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnWps, setIsOnWps] = useState(false);
  const [isUpdatingWps, setIsUpdatingWps] = useState(false);
  const [isEmployee, setIsEmployee] = useState(true);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [payrollEnabled, setPayrollEnabled] = useState(false);

  // Permission flags
  const [isAdmin, setIsAdmin] = useState(false);
  const [hasOperationsAccess, setHasOperationsAccess] = useState(false);
  const [hasHRAccess, setHasHRAccess] = useState(false);
  const [hasFinanceAccess, setHasFinanceAccess] = useState(false);
  const [canApprove, setCanApprove] = useState(false);
  const [reportingToId, setReportingToId] = useState<string | null>(null);
  const [isUpdatingPermission, setIsUpdatingPermission] = useState(false);

  // Manager options for "Reports To" dropdown
  const [managers, setManagers] = useState<ManagerOption[]>([]);

  const employeeId = params?.id as string;

  const fetchHRProfile = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(null);
      const response = await fetch(`/api/users/${employeeId}/hr-profile`);

      if (!response.ok) {
        if (response.status === 403) {
          throw new Error('You do not have permission to edit this profile');
        }
        if (response.status === 404) {
          throw new Error('Employee not found');
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setHRProfile(data);
      setIsOnWps(data.isOnWps === true);
      setIsEmployee(data.isEmployee !== false); // Default to true
      // Permission flags
      setIsAdmin(data.isAdmin === true);
      setHasOperationsAccess(data.hasOperationsAccess === true);
      setHasHRAccess(data.hasHRAccess === true);
      setHasFinanceAccess(data.hasFinanceAccess === true);
      setCanApprove(data.canApprove === true);
      setReportingToId(data.reportingToId || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HR profile');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  const fetchEnabledModules = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/organization', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setPayrollEnabled(data.organization?.enabledModules?.includes('payroll') ?? false);
      }
    } catch {
      // Ignore error - payroll toggle just won't show
    }
  }, []);

  const fetchManagers = useCallback(async () => {
    try {
      const response = await fetch('/api/employees?canApprove=true');
      if (response.ok) {
        const data = await response.json();
        // Filter out the current employee from the list
        const filteredManagers = (data.employees || [])
          .filter((m: ManagerOption) => m.id !== employeeId)
          .map((m: ManagerOption) => ({
            id: m.id,
            name: m.name,
            email: m.email,
          }));
        setManagers(filteredManagers);
      }
    } catch {
      // Ignore error - dropdown just won't have options
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchHRProfile();
      fetchEnabledModules();
      fetchManagers();
    }
  }, [employeeId, fetchHRProfile, fetchEnabledModules, fetchManagers]);

  const updateBooleanPermission = async (
    field: 'isAdmin' | 'hasOperationsAccess' | 'hasHRAccess' | 'hasFinanceAccess' | 'canApprove',
    value: boolean,
    setter: (val: boolean) => void,
    successMessage: string
  ) => {
    setIsUpdatingPermission(true);
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update permission');
      }

      setter(value);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update permission');
      fetchHRProfile(false);
    } finally {
      setIsUpdatingPermission(false);
    }
  };

  const updateReportingTo = async (value: string | null, successMessage: string) => {
    setIsUpdatingPermission(true);
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportingToId: value }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update manager');
      }

      setReportingToId(value);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update manager');
      fetchHRProfile(false);
    } finally {
      setIsUpdatingPermission(false);
    }
  };

  const updateWps = async (enabled: boolean) => {
    setIsUpdatingWps(true);
    try {
      const response = await fetch(`/api/users/${employeeId}/hr-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnWps: enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update WPS setting');
      }

      setIsOnWps(enabled);
      toast.success(enabled
        ? 'Employee added to WPS'
        : 'Employee removed from WPS'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update WPS setting');
      setIsOnWps(!enabled); // Revert on error
    } finally {
      setIsUpdatingWps(false);
    }
  };

  const updateEmployeeStatus = async (enabled: boolean) => {
    setIsUpdatingEmployee(true);
    try {
      const response = await fetch(`/api/users/${employeeId}/hr-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isEmployee: enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update employee status');
      }

      setIsEmployee(enabled);
      // If marking as non-employee, also disable WPS
      if (!enabled) {
        setIsOnWps(false);
      }
      toast.success(enabled
        ? 'Marked as employee'
        : 'Marked as service account'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update employee status');
      setIsEmployee(!enabled); // Revert on error
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Edit Profile" subtitle="Loading..." />
        <PageContent>
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p className="text-gray-600">Loading profile...</p>
              </div>
            </CardContent>
          </Card>
        </PageContent>
      </>
    );
  }

  if (error) {
    return (
      <>
        <PageHeader title="Edit Profile" subtitle="Error" />
        <PageContent>
          <Alert variant="error" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Profile"
        subtitle={hrProfile?.user?.name || hrProfile?.user?.email || 'Employee'}
        breadcrumbs={[
          { label: 'Team', href: '/admin/employees' },
          { label: hrProfile?.user?.name || 'Employee', href: `/admin/employees/${employeeId}` },
          { label: 'Edit' },
        ]}
        badge={isAdmin ? { text: 'Admin', variant: 'error' } : undefined}
      />

      <PageContent className="max-w-5xl">

          {/* Permissions */}
          {hrProfile?.user && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Permissions
                </CardTitle>
                <CardDescription>
                  Control what this user can access and manage. Changes take effect on next login.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Full Admin Access */}
                <div className="flex items-center justify-between pb-4 border-b">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-admin" className="text-base font-medium">Full Admin Access</Label>
                    <p className="text-sm text-gray-500">
                      Complete access to all modules and settings. Can approve any request.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdatingPermission && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                    <Switch
                      id="is-admin"
                      checked={isAdmin}
                      onCheckedChange={(checked) => updateBooleanPermission('isAdmin', checked, setIsAdmin, checked ? 'Admin access granted' : 'Admin access revoked')}
                      disabled={isUpdatingPermission}
                    />
                  </div>
                </div>

                {/* Module Access - only show if not admin */}
                {!isAdmin && (
                  <>
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-gray-700">Module Access</h4>

                      {/* Operations Access */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="ops-access">Operations</Label>
                          <p className="text-sm text-gray-500">
                            Assets, Subscriptions, Suppliers
                          </p>
                        </div>
                        <Switch
                          id="ops-access"
                          checked={hasOperationsAccess}
                          onCheckedChange={(checked) => updateBooleanPermission('hasOperationsAccess', checked, setHasOperationsAccess, checked ? 'Operations access granted' : 'Operations access revoked')}
                          disabled={isUpdatingPermission}
                        />
                      </div>

                      {/* HR Access */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="hr-access">HR</Label>
                          <p className="text-sm text-gray-500">
                            Employees, Leave management
                          </p>
                        </div>
                        <Switch
                          id="hr-access"
                          checked={hasHRAccess}
                          onCheckedChange={(checked) => updateBooleanPermission('hasHRAccess', checked, setHasHRAccess, checked ? 'HR access granted' : 'HR access revoked')}
                          disabled={isUpdatingPermission}
                        />
                      </div>

                      {/* Finance Access */}
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="finance-access">Finance</Label>
                          <p className="text-sm text-gray-500">
                            Payroll, Purchase Requests
                          </p>
                        </div>
                        <Switch
                          id="finance-access"
                          checked={hasFinanceAccess}
                          onCheckedChange={(checked) => updateBooleanPermission('hasFinanceAccess', checked, setHasFinanceAccess, checked ? 'Finance access granted' : 'Finance access revoked')}
                          disabled={isUpdatingPermission}
                        />
                      </div>
                    </div>

                    {/* Approval Authority */}
                    <div className="space-y-4 pt-4 border-t">
                      <h4 className="text-sm font-medium text-gray-700">Approval Authority</h4>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label htmlFor="can-approve">Can Approve Requests</Label>
                          <p className="text-sm text-gray-500">
                            Can approve leave, purchase requests, etc. from direct reports
                          </p>
                        </div>
                        <Switch
                          id="can-approve"
                          checked={canApprove}
                          onCheckedChange={(checked) => updateBooleanPermission('canApprove', checked, setCanApprove, checked ? 'Approval authority granted' : 'Approval authority revoked')}
                          disabled={isUpdatingPermission}
                        />
                      </div>

                      {/* Reports To - only show if canApprove is enabled */}
                      {canApprove && managers.length > 0 && (
                        <div className="space-y-2">
                          <Label htmlFor="reports-to">Reports To (Optional)</Label>
                          <Select
                            value={reportingToId || 'none'}
                            onValueChange={(value) => {
                              const newValue = value === 'none' ? null : value;
                              updateReportingTo(newValue, 'Manager updated');
                            }}
                            disabled={isUpdatingPermission}
                          >
                            <SelectTrigger id="reports-to" className="w-full md:w-[300px]">
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No manager</SelectItem>
                              {managers.map((manager) => (
                                <SelectItem key={manager.id} value={manager.id}>
                                  {manager.name || manager.email}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-gray-500">
                            Who does this person report to? Their manager can also approve their requests.
                          </p>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {isAdmin && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      Full admin access is enabled. This user has complete access to all modules and can approve any request.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Employee Status */}
          {hrProfile && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Employee Status
                </CardTitle>
                <CardDescription>
                  Determines if this person is an employee with HR features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="is-employee">Is Employee</Label>
                    <p className="text-sm text-gray-500">
                      Employees have access to leave requests, payroll, and employee portal
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdatingEmployee && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <Switch
                      id="is-employee"
                      checked={isEmployee}
                      onCheckedChange={updateEmployeeStatus}
                      disabled={isUpdatingEmployee}
                    />
                  </div>
                </div>

                {/* WPS toggle - only show if employee and payroll enabled */}
                {isEmployee && payrollEnabled && (
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-0.5">
                      <Label htmlFor="is-on-wps">On WPS (Wage Protection System)</Label>
                      <p className="text-sm text-gray-500">
                        Employee&apos;s salary is paid through the Wage Protection System
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isUpdatingWps && (
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      )}
                      <Switch
                        id="is-on-wps"
                        checked={isOnWps}
                        onCheckedChange={updateWps}
                        disabled={isUpdatingWps}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

        {/* HR Form - only for employees */}
        {hrProfile && isEmployee && (
          <HRProfileForm
            initialData={{
              ...hrProfile,
              workEmail: hrProfile.workEmail || hrProfile.user?.email,
            }}
            isAdmin={true}
            userId={employeeId} // Pass the employee ID so form saves to correct user
            onSave={() => {
              toast.success('Profile saved');
              fetchHRProfile(false); // Refresh without showing full loading state
            }}
          />
        )}
      </PageContent>
    </>
  );
}
