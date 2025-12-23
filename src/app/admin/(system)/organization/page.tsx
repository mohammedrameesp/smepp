'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Building2,
  Upload,
  X,
  Loader2,
  Check,
  AlertCircle,
  Users,
  Package,
  Calendar,
  Globe,
  Camera,
} from 'lucide-react';
import { format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionTier: string;
  maxUsers: number;
  maxAssets: number;
  createdAt: string;
  _count: {
    members: number;
    assets: number;
  };
}

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

export default function OrganizationSettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const [org, setOrg] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = session?.user?.orgRole === 'OWNER';
  const isAdmin = session?.user?.orgRole === 'ADMIN' || isOwner;

  useEffect(() => {
    fetchOrganization();
  }, []);

  async function fetchOrganization() {
    try {
      const response = await fetch('/api/admin/organization');
      if (response.ok) {
        const data = await response.json();
        setOrg(data.organization);
        setName(data.organization.name);
        setLogoPreview(data.organization.logoUrl);
      }
    } catch (err) {
      setError('Failed to load organization');
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      setOrg(prev => prev ? { ...prev, name: data.organization.name } : null);
      setSuccess('Organization updated successfully');

      // Update session to reflect new org name
      await updateSession();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: PNG, JPEG, WebP, SVG');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB');
      return;
    }

    setUploadingLogo(true);
    setError(null);

    try {
      // Preview
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);

      // Upload
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/organizations/logo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload');
      }

      setLogoPreview(data.logoUrl);
      setOrg(prev => prev ? { ...prev, logoUrl: data.logoUrl } : null);
      setSuccess('Logo updated successfully');

      // Update session to reflect new logo
      await updateSession();

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload logo');
      // Revert preview
      setLogoPreview(org?.logoUrl || null);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!org) {
    return (
      <Alert variant="error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Failed to load organization</AlertDescription>
      </Alert>
    );
  }

  const userUsage = (org._count.members / org.maxUsers) * 100;
  const assetUsage = (org._count.assets / org.maxAssets) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Organization Settings</h1>
        <p className="text-muted-foreground">
          Manage your organization profile and settings
        </p>
      </div>

      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert variant="success">
          <Check className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle>Organization Profile</CardTitle>
            <CardDescription>
              Update your organization name and logo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Logo */}
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {logoPreview ? (
                      <img
                        src={logoPreview}
                        alt="Organization logo"
                        className="h-20 w-20 rounded-xl object-contain bg-gray-100 border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-xl bg-blue-100 flex items-center justify-center border">
                        <Building2 className="h-8 w-8 text-blue-600" />
                      </div>
                    )}
                    {uploadingLogo && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingLogo || !isAdmin}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      {logoPreview ? 'Change' : 'Upload'}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPEG, WebP, SVG. Max 2MB.
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={uploadingLogo || !isAdmin}
                  />
                </div>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Organization Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your Organization"
                  disabled={saving || !isAdmin}
                  required
                  minLength={2}
                />
              </div>

              {/* Subdomain (readonly) */}
              <div className="space-y-2">
                <Label>Subdomain</Label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={org.slug}
                      readOnly
                      disabled
                      className="pl-10 font-mono bg-muted"
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    .{APP_DOMAIN.split(':')[0]}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Subdomain cannot be changed after creation
                </p>
              </div>

              {isAdmin && (
                <Button type="submit" disabled={saving || name === org.name}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Usage & Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Plan & Usage</CardTitle>
            <CardDescription>
              Your current subscription and usage
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Current Plan */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Current Plan</p>
                <p className="text-2xl font-bold">{org.subscriptionTier}</p>
              </div>
              <Badge variant={org.subscriptionTier === 'FREE' ? 'secondary' : 'default'} className="text-lg px-4 py-1">
                {org.subscriptionTier}
              </Badge>
            </div>

            {/* User Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  Team Members
                </span>
                <span className="font-medium">
                  {org._count.members} / {org.maxUsers}
                </span>
              </div>
              <Progress value={userUsage} className="h-2" />
            </div>

            {/* Asset Usage */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  Assets
                </span>
                <span className="font-medium">
                  {org._count.assets} / {org.maxAssets}
                </span>
              </div>
              <Progress value={assetUsage} className="h-2" />
            </div>

            {/* Created Date */}
            <div className="pt-4 border-t">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created {format(new Date(org.createdAt), 'MMMM d, yyyy')}
              </div>
            </div>

            {/* Upgrade CTA */}
            {org.subscriptionTier === 'FREE' && (
              <div className="pt-4">
                <Button className="w-full" variant="outline" disabled>
                  Upgrade Plan (Coming Soon)
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
