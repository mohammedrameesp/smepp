'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Loader2, Shield, Calendar, ArrowLeft } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { HRProfileForm } from '@/components/domains/hr/profile';
import { toast } from 'sonner';
import Link from 'next/link';

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
}

const ROLES = [
  { value: 'EMPLOYEE', label: 'Employee', description: 'Can view and manage their own assigned assets/subscriptions' },
  { value: 'ADMIN', label: 'Admin', description: 'Full access to all features and user management' },
  { value: 'TEMP_STAFF', label: 'Temporary Staff', description: 'No login access, only appears in assignment dropdowns' },
];

export default function AdminEmployeeEditPage() {
  const params = useParams();
  const router = useRouter();
  const [hrProfile, setHRProfile] = useState<HRProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [bypassNotice, setBypassNotice] = useState(false);
  const [isUpdatingBypass, setIsUpdatingBypass] = useState(false);

  const employeeId = params?.id as string;

  useEffect(() => {
    if (employeeId) {
      fetchHRProfile();
    }
  }, [employeeId]);

  const fetchHRProfile = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load HR profile');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

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
      fetchHRProfile(true); // Refresh the data without showing full loading state
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
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                <p className="text-gray-600">Loading profile...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <Alert variant="error" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Profile"
        subtitle={hrProfile?.user?.name || hrProfile?.user?.email || 'Employee'}
        breadcrumbs={[
          { label: 'Employees', href: '/admin/employees' },
          { label: hrProfile?.user?.name || 'Employee', href: `/admin/employees/${employeeId}` },
          { label: 'Edit' },
        ]}
        badge={hrProfile?.user?.role ? { text: hrProfile.user.role, variant: getRoleBadgeVariant(hrProfile.user.role) as any } : undefined}
      />

      <PageContent className="max-w-5xl">

          {/* Role Management */}
          {hrProfile?.user && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Role & Permissions
                </CardTitle>
                <CardDescription>
                  Manage the employee&apos;s system role and access level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="role">System Role</Label>
                    <Select
                      value={selectedRole}
                      onValueChange={(value) => {
                        setSelectedRole(value);
                        updateRole(value);
                      }}
                      disabled={isUpdatingRole}
                    >
                      <SelectTrigger id="role" className="w-full md:w-[300px]">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {ROLES.map((role) => (
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
                    {ROLES.map((role) => (
                      <div key={role.value} className={selectedRole === role.value ? 'font-medium text-gray-700' : ''}>
                        <span className="font-semibold">{role.label}:</span> {role.description}
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Leave Settings */}
          {hrProfile && (
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

        {/* HR Form */}
        {hrProfile && (
          <HRProfileForm
            initialData={{
              ...hrProfile,
              workEmail: hrProfile.workEmail || hrProfile.user?.email,
            }}
            isAdmin={true}
            userId={employeeId} // Pass the employee ID so form saves to correct user
            onSave={() => {
              toast.success('Profile saved');
              fetchHRProfile(true); // Refresh without showing full loading state
            }}
          />
        )}
      </PageContent>
    </>
  );
}
