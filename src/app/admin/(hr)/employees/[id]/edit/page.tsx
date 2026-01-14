'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users, Loader2, Shield, Calendar, ArrowLeft, Banknote } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { HRProfileForm } from '@/components/domains/hr/profile';
import { toast } from 'sonner';

interface UserInfo {
  id: string;
  name: string | null;
  email: string;
  role: string;
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
  isAdmin?: boolean;
  bypassNoticeRequirement?: boolean;
  isOnWps?: boolean;
  isEmployee?: boolean;
}

const APPROVAL_ROLES = [
  { value: 'EMPLOYEE', label: 'Employee', description: 'No approval authority - can only submit requests' },
  { value: 'MANAGER', label: 'Manager', description: 'Can approve leave and general requests for their team' },
  { value: 'HR_MANAGER', label: 'HR Manager', description: 'Can approve leave and HR-related requests' },
  { value: 'FINANCE_MANAGER', label: 'Finance Manager', description: 'Can approve purchase requests and budget items' },
  { value: 'DIRECTOR', label: 'Director', description: 'Can approve high-value and executive-level requests' },
  { value: 'ADMIN', label: 'Admin', description: 'Full approval authority for all request types' },
];

export default function AdminEmployeeEditPage() {
  const params = useParams();
  const router = useRouter();
  const [hrProfile, setHRProfile] = useState<HRProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [bypassNotice, setBypassNotice] = useState(false);
  const [isUpdatingBypass, setIsUpdatingBypass] = useState(false);
  const [isOnWps, setIsOnWps] = useState(false);
  const [isUpdatingWps, setIsUpdatingWps] = useState(false);
  const [isEmployee, setIsEmployee] = useState(true);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [payrollEnabled, setPayrollEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isUpdatingAdmin, setIsUpdatingAdmin] = useState(false);

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
      if (data.user?.role) {
        setSelectedRole(data.user.role);
      }
      setBypassNotice(data.bypassNoticeRequirement === true);
      setIsOnWps(data.isOnWps === true);
      setIsEmployee(data.isEmployee !== false); // Default to true
      setIsAdmin(data.isAdmin === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HR profile');
    } finally {
      setIsLoading(false);
    }
  }, [employeeId]);

  const fetchEnabledModules = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/organization');
      if (response.ok) {
        const data = await response.json();
        setPayrollEnabled(data.organization?.enabledModules?.includes('payroll') ?? false);
      }
    } catch {
      // Ignore error - payroll toggle just won't show
    }
  }, []);

  useEffect(() => {
    if (employeeId) {
      fetchHRProfile();
      fetchEnabledModules();
    }
  }, [employeeId, fetchHRProfile, fetchEnabledModules]);

  const updateRole = async (newRole: string) => {
    if (!newRole || newRole === hrProfile?.user?.role) return;

    setIsUpdatingRole(true);
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update role');
      }

      toast.success(`Role updated to ${newRole}`);
      fetchHRProfile(false); // Refresh the data without showing full loading state
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
      // Reset to original role on error
      if (hrProfile?.user?.role) {
        setSelectedRole(hrProfile.user.role);
      }
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const updateBypassNotice = async (enabled: boolean) => {
    setIsUpdatingBypass(true);
    try {
      const response = await fetch(`/api/users/${employeeId}/hr-profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bypassNoticeRequirement: enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update setting');
      }

      setBypassNotice(enabled);
      toast.success(enabled
        ? 'Notice requirement bypass enabled'
        : 'Notice requirement bypass disabled'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update setting');
      setBypassNotice(!enabled); // Revert on error
    } finally {
      setIsUpdatingBypass(false);
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
        : 'Marked as non-employee'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update employee status');
      setIsEmployee(!enabled); // Revert on error
    } finally {
      setIsUpdatingEmployee(false);
    }
  };

  const updateAdminAccess = async (enabled: boolean) => {
    setIsUpdatingAdmin(true);
    try {
      const response = await fetch(`/api/users/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAdmin: enabled }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update admin access');
      }

      setIsAdmin(enabled);
      toast.success(enabled
        ? 'Admin access granted - user must log out and back in'
        : 'Admin access revoked - user must log out and back in'
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update admin access');
      setIsAdmin(!enabled); // Revert on error
    } finally {
      setIsUpdatingAdmin(false);
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'EMPLOYEE':
        return 'default';
      default:
        return 'secondary';
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
        badge={hrProfile?.user?.role ? { text: hrProfile.user.role, variant: getRoleBadgeVariant(hrProfile.user.role) as 'default' | 'success' | 'warning' | 'destructive' | 'info' | 'error' } : undefined}
      />

      <PageContent className="max-w-5xl">

          {/* Admin Access */}
          {hrProfile?.user && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Dashboard Access
                </CardTitle>
                <CardDescription>
                  Control whether this user can access the admin dashboard or only the employee portal
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="admin-access">Admin Access</Label>
                    <p className="text-sm text-gray-500">
                      Enable to grant access to the admin dashboard (/admin). Disable for employee-only access (/employee).
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdatingAdmin && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <Switch
                      id="admin-access"
                      checked={isAdmin}
                      onCheckedChange={updateAdminAccess}
                      disabled={isUpdatingAdmin}
                    />
                  </div>
                </div>
                {isAdmin && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-800">
                      This user has admin access. They can manage assets, employees, and organization settings. The user must log out and log back in for changes to take effect.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Approval Role Management */}
          {hrProfile?.user && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Approval Role
                </CardTitle>
                <CardDescription>
                  Assign an approval role to allow this employee to approve requests (leave, purchases, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">Approval Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) => {
                        setSelectedRole(value);
                        updateRole(value);
                      }}
                      disabled={isUpdatingRole}
                    >
                      <SelectTrigger id="role" className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select approval role" />
                      </SelectTrigger>
                      <SelectContent>
                        {APPROVAL_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {isUpdatingRole && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Updating role...
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 space-y-1 bg-gray-50 p-3 rounded-md">
                    {APPROVAL_ROLES.map((role) => (
                      <div key={role.value} className={selectedRole === role.value ? 'font-medium text-gray-700' : ''}>
                        <span className="font-semibold">{role.label}:</span> {role.description}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leave Settings - only for employees */}
          {hrProfile && isEmployee && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Leave Settings
                </CardTitle>
                <CardDescription>
                  Configure leave-related settings for this employee
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="bypass-notice">Bypass Advance Notice Requirement</Label>
                    <p className="text-sm text-gray-500">
                      Allow this employee to submit leave requests without meeting the advance notice requirement (e.g., 7 days for Annual Leave)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUpdatingBypass && (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    )}
                    <Switch
                      id="bypass-notice"
                      checked={bypassNotice}
                      onCheckedChange={updateBypassNotice}
                      disabled={isUpdatingBypass}
                    />
                  </div>
                </div>
                {bypassNotice && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-md">
                    <p className="text-sm text-amber-800">
                      This employee can submit leave requests without advance notice. Remember to disable this after their immediate need is resolved.
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
