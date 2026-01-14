'use client';

/**
 * @file organization-tabs.tsx
 * @description Client component for organization settings with tabbed layout
 * @module admin/organization
 */

import { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Building2,
  Palette,
  Settings2,
  Globe,
  Camera,
  Loader2,
  AlertCircle,
  Coins,
  LayoutGrid,
  MapPin,
  Lock,
  GitBranch,
} from 'lucide-react';
import { format } from 'date-fns';
import { useAutoSave, AutoSaveIndicator } from '@/hooks/use-auto-save';
import { AssetCategoriesSettings, AssetTypeMappingsSettings, CodeFormatSettings, DepreciationCategoriesSettings, LocationsSettings, ExchangeRateSettings, PayrollSettings, LeaveTypesSettings } from '@/features/settings/components';
import { CurrencySelector } from '@/components/currency-selector';
import type { OrgRole } from '@prisma/client';
import type { CodeFormatConfig } from '@/lib/utils/code-prefix';

// Types
interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  codePrefix: string | null;
  codeFormats: CodeFormatConfig;
  subscriptionTier: string;
  createdAt: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  website: string | null;
  additionalCurrencies: string[];
  enabledModules: string[];
  hasMultipleLocations: boolean;
  _count: { teamMembers: number };
}

interface OrganizationTabsProps {
  organization: Organization;
  currentUserRole: OrgRole;
  isOwner: boolean;
}

// Constants
const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

const AVAILABLE_MODULES = [
  { id: 'assets', name: 'Assets', description: 'Track company assets' },
  { id: 'subscriptions', name: 'Subscriptions', description: 'Manage subscriptions' },
  { id: 'suppliers', name: 'Suppliers', description: 'Vendor management' },
  { id: 'employees', name: 'Employees', description: 'HR management' },
  { id: 'leave', name: 'Leave', description: 'Leave management' },
  { id: 'payroll', name: 'Payroll', description: 'Salary & payslips' },
  { id: 'purchase-requests', name: 'Purchase Requests', description: 'Procurement' },
  { id: 'documents', name: 'Documents', description: 'Company documents' },
];

// Placeholder component for disabled modules
function ModuleRequiredPlaceholder({
  moduleName,
  onEnableClick,
}: {
  moduleName: string;
  onEnableClick: () => void;
}) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12 text-center">
        <Lock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">Enable {moduleName} Module</h3>
        <p className="text-muted-foreground mb-4">
          These settings require the {moduleName} module to be enabled.
        </p>
        <Button variant="outline" onClick={onEnableClick}>
          Enable in General Settings
        </Button>
      </CardContent>
    </Card>
  );
}

export function OrganizationTabs({
  organization: initialOrg,
  currentUserRole,
}: OrganizationTabsProps) {
  const { update: updateSession } = useSession();
  const isAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  // State
  const [org, setOrg] = useState(initialOrg);
  const [configTab, setConfigTab] = useState('general');

  // Form state for auto-save
  const [name, setName] = useState(org.name);
  const [codePrefix, setCodePrefix] = useState(org.codePrefix || 'ORG');
  const [primaryColor, setPrimaryColor] = useState(org.primaryColor || '#3B82F6');
  const [secondaryColor, setSecondaryColor] = useState(org.secondaryColor || '');
  const [website, setWebsite] = useState(org.website || '');
  const [additionalCurrencies, setAdditionalCurrencies] = useState<string[]>(org.additionalCurrencies || []);
  const [enabledModules, setEnabledModules] = useState<string[]>(org.enabledModules || ['assets', 'subscriptions', 'suppliers']);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(org.hasMultipleLocations || false);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(org.logoUrl);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-save hooks
  const nameAutoSave = useAutoSave({
    value: name,
    enabled: isAdmin && name !== org.name,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, name: value }));
      await updateSession();
    },
  });

  const codePrefixAutoSave = useAutoSave({
    value: codePrefix,
    enabled: isAdmin && codePrefix !== org.codePrefix && codePrefix.length >= 2 && codePrefix.length <= 3,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codePrefix: value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, codePrefix: value }));
    },
  });

  const brandingAutoSave = useAutoSave({
    value: { primaryColor, secondaryColor },
    enabled: isAdmin,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(value),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, ...value }));
    },
  });

  const websiteAutoSave = useAutoSave({
    value: website,
    enabled: isAdmin && website !== org.website,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website: value || null }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, website: value || null }));
    },
  });

  const currenciesAutoSave = useAutoSave({
    value: additionalCurrencies,
    enabled: isAdmin,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ additionalCurrencies: value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, additionalCurrencies: value }));
    },
  });

  const modulesAutoSave = useAutoSave({
    value: enabledModules,
    enabled: isAdmin,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabledModules: value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, enabledModules: value }));
    },
  });

  const locationsAutoSave = useAutoSave({
    value: hasMultipleLocations,
    enabled: isAdmin,
    onSave: async (value) => {
      const res = await fetch('/api/admin/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hasMultipleLocations: value }),
      });
      if (!res.ok) throw new Error('Failed to save');
      setOrg(prev => ({ ...prev, hasMultipleLocations: value }));
    },
  });

  // Logo upload handler
  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setLogoError('Invalid file type. Allowed: PNG, JPEG, WebP, SVG');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('File too large. Maximum size is 2MB');
      return;
    }

    setUploadingLogo(true);
    setLogoError(null);

    try {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);

      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch('/api/organizations/logo', {
        method: 'POST',
        body: formData,
      });

      // Handle empty or non-JSON responses
      const text = await response.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        console.error('Logo upload response:', text);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      if (!response.ok) throw new Error(data.error || 'Failed to upload');

      setLogoPreview(data.logoUrl);
      setOrg(prev => ({ ...prev, logoUrl: data.logoUrl }));
      await updateSession();
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : 'Failed to upload logo');
      setLogoPreview(org.logoUrl);
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function toggleModule(id: string) {
    setEnabledModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Profile & Branding
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings2 className="h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Profile & Branding Tab */}
        <TabsContent value="profile" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Profile Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Organization Profile</CardTitle>
                    <CardDescription>Update your organization name and logo</CardDescription>
                  </div>
                  <AutoSaveIndicator status={nameAutoSave.status} error={nameAutoSave.error} />
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo */}
                <div className="space-y-2">
                  <Label>Logo</Label>
                  <div className="flex items-center gap-4">
                    <div className="flex gap-3">
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
                      {logoPreview && (
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview on dark"
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
                      <p className="text-xs text-muted-foreground">PNG, JPEG, WebP, SVG. Max 2MB.</p>
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
                  {logoError && (
                    <p className="text-sm text-red-600">{logoError}</p>
                  )}
                </div>

                {/* Name */}
                <div className="space-y-2">
                  <Label htmlFor="name">Organization Name</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Organization"
                    disabled={!isAdmin}
                    minLength={2}
                  />
                </div>

                {/* Website */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="website">Website URL</Label>
                    <AutoSaveIndicator status={websiteAutoSave.status} error={websiteAutoSave.error} />
                  </div>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="website"
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://yourcompany.com"
                      disabled={!isAdmin}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Shown to suppliers after registration</p>
                </div>

                {/* Subdomain */}
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
                    <span className="text-sm text-muted-foreground">.{APP_DOMAIN.split(':')[0]}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Subdomain cannot be changed</p>
                </div>
              </CardContent>
            </Card>

            {/* Plan Card */}
            <Card>
              <CardHeader>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your subscription details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="text-2xl font-bold">Free</p>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-1">FREE</Badge>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Team Members</p>
                    <p className="text-lg font-semibold">{org._count.teamMembers}</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">Created</p>
                    <p className="text-lg font-semibold">{format(new Date(org.createdAt), 'MMM yyyy')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branding Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="h-5 w-5" />
                    Branding
                  </CardTitle>
                  <CardDescription>Customize your organization&apos;s colors</CardDescription>
                </div>
                <AutoSaveIndicator status={brandingAutoSave.status} error={brandingAutoSave.error} />
              </div>
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
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground mb-2">Preview</p>
                <div className="flex gap-2">
                  <div className="h-8 w-8 rounded" style={{ backgroundColor: primaryColor }} title="Primary" />
                  {secondaryColor && (
                    <div className="h-8 w-8 rounded" style={{ backgroundColor: secondaryColor }} title="Secondary" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <Tabs value={configTab} onValueChange={setConfigTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="assets">Assets</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="hr">HR</TabsTrigger>
              <TabsTrigger value="approvals">Approvals</TabsTrigger>
            </TabsList>

            {/* General Sub-Tab */}
            <TabsContent value="general" className="space-y-6 mt-6">
              {/* Code Prefix */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Settings2 className="h-5 w-5" />
                        Reference Code Prefix
                      </CardTitle>
                      <CardDescription>2-3 character prefix used for employee IDs, asset tags, and other codes</CardDescription>
                    </div>
                    <AutoSaveIndicator status={codePrefixAutoSave.status} error={codePrefixAutoSave.error} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Input
                      value={codePrefix}
                      onChange={(e) => setCodePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3))}
                      placeholder="ORG"
                      className="w-24 font-mono text-center text-lg uppercase"
                      maxLength={3}
                      disabled={!isAdmin}
                    />
                    <div className="text-sm text-muted-foreground">
                      <p>Example: <code className="px-2 py-1 bg-muted rounded">{codePrefix}-2024-001</code></p>
                      {(codePrefix.length < 2 || codePrefix.length > 3) && (
                        <p className="text-amber-600 mt-1">Must be 2-3 characters</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Code Formats */}
              <CodeFormatSettings
                organizationId={org.id}
                codePrefix={codePrefix}
                initialFormats={org.codeFormats || {}}
                enabledModules={enabledModules}
              />

              {/* Modules */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <LayoutGrid className="h-5 w-5" />
                        Enabled Modules
                      </CardTitle>
                      <CardDescription>Select which features are available in your organization</CardDescription>
                    </div>
                    <AutoSaveIndicator status={modulesAutoSave.status} error={modulesAutoSave.error} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      Disabling a module will hide it from navigation, but existing data is preserved.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Assets Sub-Tab */}
            <TabsContent value="assets" className="space-y-6 mt-6">
              {enabledModules.includes('assets') ? (
                <>
                  <AssetCategoriesSettings
                    codePrefix={codePrefix}
                    isAdmin={isAdmin}
                  />
                  <AssetTypeMappingsSettings
                    organizationId={org.id}
                    isAdmin={isAdmin}
                  />
                  <DepreciationCategoriesSettings
                    isAdmin={isAdmin}
                  />

                  {/* Multiple Locations Toggle */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <MapPin className="h-5 w-5" />
                            Multiple Locations
                          </CardTitle>
                          <CardDescription>
                            Enable this if your organization has assets in multiple locations
                          </CardDescription>
                        </div>
                        <AutoSaveIndicator status={locationsAutoSave.status} error={locationsAutoSave.error} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            When enabled, you can define locations and assign assets to specific locations.
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={hasMultipleLocations}
                            onChange={() => setHasMultipleLocations(!hasMultipleLocations)}
                            disabled={!isAdmin}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Locations - only show when multiple locations is enabled */}
                  {hasMultipleLocations && (
                    <LocationsSettings
                      isAdmin={isAdmin}
                    />
                  )}
                </>
              ) : (
                <ModuleRequiredPlaceholder
                  moduleName="Assets"
                  onEnableClick={() => setConfigTab('general')}
                />
              )}
            </TabsContent>

            {/* Financial Sub-Tab */}
            <TabsContent value="financial" className="space-y-6 mt-6">
              {/* Currencies */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Additional Currencies
                      </CardTitle>
                      <CardDescription>Select currencies your organization works with (besides QAR)</CardDescription>
                    </div>
                    <AutoSaveIndicator status={currenciesAutoSave.status} error={currenciesAutoSave.error} />
                  </div>
                </CardHeader>
                <CardContent>
                  <CurrencySelector
                    selectedCurrencies={additionalCurrencies}
                    onChange={setAdditionalCurrencies}
                    disabled={!isAdmin}
                    showSuggestions={true}
                  />
                </CardContent>
              </Card>

              {/* Exchange Rates */}
              <ExchangeRateSettings />
            </TabsContent>

            {/* HR Sub-Tab */}
            <TabsContent value="hr" className="space-y-6 mt-6">
              {enabledModules.includes('leave') && (
                <LeaveTypesSettings />
              )}
              {enabledModules.includes('payroll') && (
                <PayrollSettings />
              )}
              {!enabledModules.includes('leave') && !enabledModules.includes('payroll') && (
                <ModuleRequiredPlaceholder
                  moduleName="Leave or Payroll"
                  onEnableClick={() => setConfigTab('general')}
                />
              )}
            </TabsContent>

            {/* Approvals Sub-Tab */}
            <TabsContent value="approvals" className="space-y-6 mt-6">
              {(enabledModules.includes('leave') || enabledModules.includes('assets') || enabledModules.includes('purchase-requests')) ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <GitBranch className="h-5 w-5" />
                      Approval Policies
                    </CardTitle>
                    <CardDescription>
                      Configure multi-level approval chains for leave, purchase, and asset requests
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Define approval workflows based on request type, amount thresholds, or leave duration.
                      Requests matching a policy will follow the defined approval chain instead of going to all admins.
                    </p>
                    <div className="flex gap-2">
                      <Button asChild>
                        <a href="/admin/settings/approvals">
                          Manage Approval Policies
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <ModuleRequiredPlaceholder
                  moduleName="Leave, Assets, or Purchase Requests"
                  onEnableClick={() => setConfigTab('general')}
                />
              )}
            </TabsContent>
          </Tabs>
        </TabsContent>
      </Tabs>
    </div>
  );
}
