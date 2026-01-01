'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Mail, Shield, Calendar, Image as ImageIcon, FileText, Loader2, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/date-format';
import { HRProfileForm } from '@/components/domains/hr/profile';
import { EmployeeProfileViewOnly } from '@/components/domains/hr/employees';
import { OnboardingWizard } from '@/components/domains/hr/onboarding';
import { ExpiryAlertsWidget } from '@/components/dashboard';
import { Progress } from '@/components/ui/progress';
import { calculateProfileCompletion, HR_REQUIRED_FIELDS } from '@/lib/hr-utils';
import { toast } from 'sonner';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
  isEmployee: boolean;
  isOnWps: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    assets: number;
    subscriptions: number;
  };
}

interface HRProfileData {
  id: string;
  userId: string;
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
  licenseExpiry: string | null;
  languagesKnown: string | null;
  skillsCertifications: string | null;
  workEmail?: string;
  isAdmin?: boolean;
  onboardingStep?: number;
  onboardingComplete?: boolean;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hrProfile, setHRProfile] = useState<HRProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingHR, setIsLoadingHR] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingMinimized, setOnboardingMinimized] = useState(false);
  const [profileImageError, setProfileImageError] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Only fetch once when session becomes available, not on every session update
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (session?.user && !hasFetched) {
      setHasFetched(true);
      fetchProfile();
      fetchHRProfile();
    }
  }, [session, hasFetched]);

  // Separate effect to trigger onboarding when both profile and hrProfile are loaded
  useEffect(() => {
    if (profile && hrProfile !== null && !isLoadingHR) {
      // Only show onboarding for EMPLOYEES who haven't completed it
      // Non-employees (system/service accounts) skip onboarding entirely
      if (profile.isEmployee && !hrProfile.onboardingComplete) {
        setShowOnboarding(true);
      }
    }
  }, [profile, hrProfile, isLoadingHR]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/users/me');

      if (!response.ok) {
        throw new Error('Failed to fetch profile');
      }

      const data = await response.json();
      setProfile(data);
      setName(data.name || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHRProfile = async () => {
    try {
      setIsLoadingHR(true);
      const response = await fetch('/api/users/me/hr-profile');

      if (!response.ok) {
        // If 401, user not authenticated - will be handled by session check
        if (response.status === 401) {
          console.log('HR Profile: Not authenticated');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        console.error('HR Profile fetch error:', response.status, errorData);
        return;
      }

      const data = await response.json();
      console.log('HR Profile loaded:', { onboardingComplete: data.onboardingComplete, onboardingStep: data.onboardingStep });
      setHRProfile(data);
    } catch (err) {
      console.error('Error fetching HR profile:', err);
    } finally {
      setIsLoadingHR(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        e.target.value = '';
        return;
      }

      // Validate file type (only JPEG/PNG)
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
        setError('Only JPEG and PNG images are allowed');
        e.target.value = '';
        return;
      }

      setImageFile(file);
      setProfileImageError(false); // Reset error state for new image

      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      setError(null);
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;

    const formData = new FormData();
    formData.append('file', imageFile);

    try {
      setIsUploading(true);
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading image:', error);
      setError('Failed to upload image');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      // Upload image if a new one is present
      let finalImageUrl = profile?.image || null; // Keep existing image by default
      if (imageFile) {
        const uploadedUrl = await uploadImage();
        if (!uploadedUrl) {
          throw new Error('Failed to upload image');
        }
        finalImageUrl = uploadedUrl;
      }

      const response = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          image: finalImageUrl,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to update profile');
      }

      const result = await response.json();
      setProfile(result.user);
      setSuccess('Profile updated successfully');
      setIsEditing(false);
      setImageFile(null);
      setImagePreview(null);

      // Reload the page to update the session
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setName(profile?.name || '');
    setImageFile(null);
    setImagePreview(null);
    setIsEditing(false);
    setError(null);
    setSuccess(null);
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Alert variant="error">
          <AlertDescription>Failed to load profile. Please try again.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'destructive';
      case 'EMPLOYEE':
        return 'default';
      case 'EMPLOYEE':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'Administrator';
      case 'EMPLOYEE':
        return 'Employee';
      case 'EMPLOYEE':
        return 'Temporary Staff';
      default:
        return role;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Profile</h1>
            <p className="text-gray-600">View and manage your personal and HR information</p>
          </div>

          {/* Incomplete Profile Alert - Top of page (employees only) */}
          {profile.isEmployee && !isLoadingHR && !hrProfile?.onboardingComplete && (
            <Alert className="mb-6 bg-orange-50 border-orange-300">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 flex items-center justify-between">
                <span>
                  <strong>Action Required:</strong> Your HR profile is incomplete. Please complete the onboarding process.
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-4 border-orange-400 text-orange-700 hover:bg-orange-100"
                  onClick={() => {
                    setOnboardingMinimized(false);
                    setShowOnboarding(true);
                  }}
                >
                  Complete Now
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="error" className="mb-6">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 bg-green-50 border-green-200">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
              <TabsTrigger value="basic" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Basic Info
              </TabsTrigger>
              <TabsTrigger value="hr" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                HR Details
              </TabsTrigger>
            </TabsList>

            {/* Basic Info Tab */}
            <TabsContent value="basic" className="space-y-6">
              {/* Profile Information Card */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>Profile Information</CardTitle>
                      <CardDescription>Your personal details and contact information</CardDescription>
                    </div>
                    {!isEditing && (
                      <Button onClick={() => setIsEditing(true)} size="sm">
                        Edit Profile
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profile Picture */}
                  <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {(imagePreview || profile.image) && !profileImageError ? (
                          <img
                            src={imagePreview || profile.image!}
                            alt="Profile"
                            className="h-full w-full object-cover"
                            onError={() => setProfileImageError(true)}
                          />
                        ) : (
                          <User className="h-10 w-10 text-gray-400" />
                        )}
                      </div>
                      {isEditing && profile.isEmployee ? (
                        <div className="flex-1">
                          <Label htmlFor="imageFile" className="text-sm font-medium">Upload Profile Picture</Label>
                          <Input
                            id="imageFile"
                            type="file"
                            accept="image/jpeg,image/png"
                            onChange={handleImageChange}
                            className="mt-1"
                            disabled={isSaving || isUploading}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            JPG or PNG, max 5MB
                          </p>
                        </div>
                      ) : isEditing && !profile.isEmployee ? (
                        <div className="flex-1">
                          <p className="text-sm text-gray-600">
                            System/service accounts use the organization logo as their profile picture.
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            This cannot be changed for non-employee accounts.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Name */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">Full Name</span>
                    </div>
                    {isEditing ? (
                      <>
                        <Input
                          type="text"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Enter your name"
                          maxLength={100}
                        />
                        <p className="text-sm text-gray-500">This is your display name</p>
                      </>
                    ) : (
                      <p className="text-lg font-medium text-gray-900">{profile.name || 'Not set'}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Mail className="h-4 w-4 mr-2" />
                      <span className="font-medium">Email Address</span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">{profile.email}</p>
                    <p className="text-sm text-gray-500">Your email cannot be changed</p>
                  </div>

                  {/* Role */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Shield className="h-4 w-4 mr-2" />
                      <span className="font-medium">Role</span>
                    </div>
                    <Badge variant={getRoleBadgeVariant(profile.role)}>
                      {getRoleLabel(profile.role)}
                    </Badge>
                  </div>

                  {/* Joined */}
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-gray-500 mb-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      <span className="font-medium">Joined</span>
                    </div>
                    <p className="text-lg font-medium text-gray-900">
                      {hrProfile?.dateOfJoining
                        ? formatDate(new Date(hrProfile.dateOfJoining))
                        : <span className="text-gray-400">Not set</span>
                      }
                    </p>
                  </div>

                  {isEditing && (
                    <div className="flex justify-end space-x-2 pt-4 border-t">
                      <Button variant="outline" onClick={handleCancel} disabled={isSaving || isUploading}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} disabled={isSaving || isUploading}>
                        {isUploading ? 'Uploading...' : isSaving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Profile Completion Card (employees only) */}
              {profile.isEmployee && hrProfile && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Profile Completion</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const completion = calculateProfileCompletion(hrProfile as unknown as Record<string, unknown>, HR_REQUIRED_FIELDS);
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-600">
                              {completion.filledFields} of {completion.totalFields} fields completed
                            </span>
                            <span className={`font-semibold ${completion.percentage >= 80 ? 'text-green-600' : completion.percentage >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {completion.percentage}%
                            </span>
                          </div>
                          <Progress
                            value={completion.percentage}
                            className={`h-2 ${completion.percentage >= 80 ? '[&>div]:bg-green-500' : completion.percentage >= 50 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-red-500'}`}
                          />
                          {!completion.isComplete && completion.missingFields.length > 0 && (
                            <p className="text-xs text-gray-500">
                              Missing: {completion.missingFields.slice(0, 3).map(f => f.replace(/([A-Z])/g, ' $1').trim()).join(', ')}
                              {completion.missingFields.length > 3 && ` +${completion.missingFields.length - 3} more`}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              )}

              {/* Activity Summary Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Activity Summary</CardTitle>
                  <CardDescription>Your assets and subscriptions</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-900">{profile._count.assets}</div>
                      <div className="text-sm text-blue-600">Assigned Assets</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="text-2xl font-bold text-green-900">{profile._count.subscriptions}</div>
                      <div className="text-sm text-green-600">Assigned Subscriptions</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Document Expiry Alerts (employees only) */}
              {profile.isEmployee && hrProfile?.onboardingComplete && (
                <ExpiryAlertsWidget isAdmin={false} />
              )}
            </TabsContent>

            {/* HR Details Tab */}
            <TabsContent value="hr">
              {isLoadingHR ? (
                <Card>
                  <CardContent className="py-12">
                    <div className="flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-gray-400 mb-4" />
                      <p className="text-gray-600">Loading HR profile...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : !profile.isEmployee ? (
                // Non-employees (system/service accounts) don't have HR profiles
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <Shield className="h-12 w-12 mx-auto mb-4 text-blue-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        System/Service Account
                      </h3>
                      <p className="text-gray-600 mb-4 max-w-md mx-auto">
                        This account is registered as a system or service account and does not require an HR profile.
                      </p>
                      <div className="bg-gray-50 rounded-lg p-4 max-w-sm mx-auto text-left">
                        <p className="text-sm text-gray-500 mb-2">Account details:</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          <li><strong>Type:</strong> System/Service Account</li>
                          <li><strong>Email:</strong> {profile.email}</li>
                          <li><strong>Profile Picture:</strong> Organization logo</li>
                        </ul>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : profile.role === 'ADMIN' ? (
                // Admins can always edit
                <HRProfileForm
                  initialData={hrProfile ? { ...hrProfile, workEmail: profile.email } : { workEmail: profile.email }}
                  isAdmin={true}
                  onSave={() => {
                    toast.success('HR Profile saved');
                    fetchHRProfile();
                  }}
                />
              ) : hrProfile?.onboardingComplete ? (
                // Employees with completed onboarding see view-only mode
                <EmployeeProfileViewOnly
                  hrProfile={hrProfile}
                  workEmail={profile.email}
                />
              ) : (
                // Employees without completed onboarding
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center">
                      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-orange-400" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        Complete Your Onboarding
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Please complete your HR profile onboarding to view your information.
                      </p>
                      <Button onClick={() => setShowOnboarding(true)}>
                        Start Onboarding
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Incomplete Profile Warning Banner - Only for employees with incomplete profile */}
          {profile.isEmployee && !isLoadingHR && !hrProfile?.onboardingComplete && !showOnboarding && (
            <div className="fixed bottom-4 right-4 left-4 md:left-auto md:w-96 bg-orange-50 border border-orange-200 rounded-lg p-4 shadow-lg z-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-orange-800">Profile Incomplete</p>
                  <p className="text-sm text-orange-600">
                    {onboardingMinimized
                      ? 'Continue your HR profile to complete onboarding.'
                      : 'Please complete your HR profile onboarding.'}
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setOnboardingMinimized(false);
                    setShowOnboarding(true);
                  }}
                >
                  {onboardingMinimized ? 'Resume' : 'Start'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Wizard Modal */}
      {showOnboarding && !onboardingMinimized && profile && (
        <OnboardingWizard
          initialData={(hrProfile as unknown as Record<string, unknown>) || {}}
          workEmail={profile.email}
          currentStep={hrProfile?.onboardingStep || 0}
          onComplete={() => {
            setShowOnboarding(false);
            setOnboardingMinimized(false);
            fetchHRProfile();
          }}
          onMinimize={() => {
            setOnboardingMinimized(true);
            setShowOnboarding(false);
            // Re-fetch HR profile to get the latest saved data
            fetchHRProfile();
          }}
        />
      )}

    </div>
  );
}
