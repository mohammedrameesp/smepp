'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Loader2,
  Check,
  AlertCircle,
  Calendar,
  Globe,
  Camera,
  Palette,
  Coins,
  LayoutGrid,
} from 'lucide-react';
import { format } from 'date-fns';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  subscriptionTier: string;
  createdAt: string;
  // Branding
  primaryColor: string | null;
  secondaryColor: string | null;
  // Currency settings
  additionalCurrencies: string[];
  // Module settings
  enabledModules: string[];
}

// Available currencies
const AVAILABLE_CURRENCIES = [
  { code: 'USD', name: 'US Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'SAR', name: 'Saudi Riyal' },
  { code: 'AED', name: 'UAE Dirham' },
  { code: 'KWD', name: 'Kuwaiti Dinar' },
];

// Available modules
const AVAILABLE_MODULES = [
  { id: 'assets', name: 'Assets', description: 'Track company assets' },
  { id: 'subscriptions', name: 'Subscriptions', description: 'Manage subscriptions' },
  { id: 'suppliers', name: 'Suppliers', description: 'Vendor management' },
  { id: 'employees', name: 'Employees', description: 'HR management' },
  { id: 'leave', name: 'Leave', description: 'Leave management' },
  { id: 'payroll', name: 'Payroll', description: 'Salary & payslips' },
  { id: 'purchase-requests', name: 'Purchase Requests', description: 'Procurement' },
];

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

  // Branding state
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState('');

  // Currency state
  const [additionalCurrencies, setAdditionalCurrencies] = useState<string[]>([]);

  // Module state
  const [enabledModules, setEnabledModules] = useState<string[]>([]);

  // Logo upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Section-specific saving states
  const [savingBranding, setSavingBranding] = useState(false);
  const [savingCurrencies, setSavingCurrencies] = useState(false);
  const [savingModules, setSavingModules] = useState(false);

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
        setPrimaryColor(data.organization.primaryColor || '#3B82F6');
        setSecondaryColor(data.organization.secondaryColor || '');
        setAdditionalCurrencies(data.organization.additionalCurrencies || []);
        setEnabledModules(data.organization.enabledModules || ['assets', 'subscriptions', 'suppliers']);
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

  async function handleSaveBranding() {
    setSavingBranding(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          primaryColor,
          secondaryColor: secondaryColor || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess('Branding updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save branding');
    } finally {
      setSavingBranding(false);
    }
  }

  async function handleSaveCurrencies() {
    setSavingCurrencies(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalCurrencies }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess('Currencies updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save currencies');
    } finally {
      setSavingCurrencies(false);
    }
  }

  async function handleSaveModules() {
    setSavingModules(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledModules }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess('Modules updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save modules');
    } finally {
      setSavingModules(false);
    }
  }

  function toggleCurrency(code: string) {
    setAdditionalCurrencies(prev =>
      prev.includes(code)
        ? prev.filter(c => c !== code)
        : [...prev, code]
    );
  }

  function toggleModule(id: string) {
    setEnabledModules(prev =>
      prev.includes(id)
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
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

  return (
    <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">
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
                  <div className="flex gap-3">
                    {/* Original Logo */}
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
                    {/* White Version (for dark backgrounds) */}
                    {logoPreview && (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Organization logo (white)"
                          className="h-20 w-20 rounded-xl object-contain bg-slate-800 border border-slate-700"
                          style={{ filter: 'brightness(0) invert(1)' }}
                        />
                        <span className="absolute -bottom-5 left-0 right-0 text-center text-[10px] text-muted-foreground">
                          Header preview
                        </span>
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

        {/* Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>
              Your subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Plan */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Plan</p>
                <p className="text-2xl font-bold">Free</p>
              </div>
              <Badge variant="secondary" className="text-lg px-4 py-1">
                FREE
              </Badge>
            </div>

            {/* Created Date */}
            <div className="pt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                Created {format(new Date(org.createdAt), 'MMMM d, yyyy')}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Branding Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Branding
          </CardTitle>
          <CardDescription>
            Customize your organization&apos;s colors
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryColor">Primary Color</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                  disabled={!isAdmin}
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  placeholder="#3B82F6"
                  className="font-mono"
                  disabled={!isAdmin}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondaryColor">Secondary Color (optional)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="secondaryColor"
                  value={secondaryColor || '#6B7280'}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-14 rounded border cursor-pointer"
                  disabled={!isAdmin}
                />
                <Input
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  placeholder="#6B7280"
                  className="font-mono"
                  disabled={!isAdmin}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground mb-2">Preview</p>
            <div className="flex gap-2">
              <div
                className="h-8 w-8 rounded"
                style={{ backgroundColor: primaryColor }}
                title="Primary"
              />
              {secondaryColor && (
                <div
                  className="h-8 w-8 rounded"
                  style={{ backgroundColor: secondaryColor }}
                  title="Secondary"
                />
              )}
            </div>
          </div>

          {isAdmin && (
            <Button onClick={handleSaveBranding} disabled={savingBranding}>
              {savingBranding ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Branding'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Additional Currencies Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Additional Currencies
          </CardTitle>
          <CardDescription>
            Select currencies your organization works with (besides QAR)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {AVAILABLE_CURRENCIES.map((currency) => (
              <label
                key={currency.code}
                className={`flex items-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                  additionalCurrencies.includes(currency.code)
                    ? 'border-blue-500 bg-blue-50'
                    : 'hover:bg-muted'
                } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={additionalCurrencies.includes(currency.code)}
                  onChange={() => toggleCurrency(currency.code)}
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <div>
                  <p className="font-medium">{currency.code}</p>
                  <p className="text-xs text-muted-foreground">{currency.name}</p>
                </div>
              </label>
            ))}
          </div>

          {isAdmin && (
            <Button onClick={handleSaveCurrencies} disabled={savingCurrencies}>
              {savingCurrencies ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Currencies'
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Enabled Modules Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LayoutGrid className="h-5 w-5" />
            Enabled Modules
          </CardTitle>
          <CardDescription>
            Select which features are available in your organization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {AVAILABLE_MODULES.map((module) => (
              <label
                key={module.id}
                className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                  enabledModules.includes(module.id)
                    ? 'border-green-500 bg-green-50'
                    : 'hover:bg-muted'
                } ${!isAdmin ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={enabledModules.includes(module.id)}
                  onChange={() => toggleModule(module.id)}
                  disabled={!isAdmin}
                  className="h-4 w-4 rounded border-gray-300 mt-0.5"
                />
                <div>
                  <p className="font-medium">{module.name}</p>
                  <p className="text-xs text-muted-foreground">{module.description}</p>
                </div>
              </label>
            ))}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Disabling a module will hide it from the dashboard, but existing data will be preserved.
            </AlertDescription>
          </Alert>

          {isAdmin && (
            <Button onClick={handleSaveModules} disabled={savingModules}>
              {savingModules ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Modules'
              )}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
