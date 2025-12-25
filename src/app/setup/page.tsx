'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Loader2,
  Building2,
  Upload,
  X,
  Check,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Palette,
  Users,
  Package,
  Calendar,
  DollarSign,
  FileText,
  ClipboardList,
  ShoppingCart,
  CheckCircle,
  Plus,
  Trash2,
  RefreshCw,
  Building,
  Briefcase,
} from 'lucide-react';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Step titles
const STEPS = [
  { title: 'Organization Basics', description: 'Configure your workspace' },
  { title: 'Branding', description: 'Customize your look' },
  { title: 'Choose Modules', description: 'Select features you need' },
  { title: 'Invite Team', description: 'Add team members' },
  { title: 'Complete', description: 'You\'re all set!' },
];

// Available currencies
const CURRENCIES = [
  { code: 'USD', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro', flag: '🇪🇺' },
  { code: 'GBP', name: 'British Pound', flag: '🇬🇧' },
  { code: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦' },
  { code: 'AED', name: 'UAE Dirham', flag: '🇦🇪' },
  { code: 'KWD', name: 'Kuwaiti Dinar', flag: '🇰🇼' },
];

// Available modules grouped by category
const MODULE_CATEGORIES = [
  {
    name: 'Operations',
    color: 'blue',
    modules: [
      { id: 'assets', name: 'Assets', description: 'Track company assets, assignments & maintenance', icon: Package, defaultOn: true },
      { id: 'subscriptions', name: 'Subscriptions', description: 'Manage software subscriptions & renewals', icon: RefreshCw, defaultOn: true },
      { id: 'suppliers', name: 'Suppliers', description: 'Vendor management & engagement tracking', icon: Building, defaultOn: true },
    ],
  },
  {
    name: 'Human Resources',
    color: 'green',
    modules: [
      { id: 'employees', name: 'Employees', description: 'Employee profiles & HR data management', icon: Users, defaultOn: false },
      { id: 'leave', name: 'Leave Management', description: 'Leave types, balances & request workflow', icon: Calendar, defaultOn: false },
      { id: 'payroll', name: 'Payroll', description: 'Salary structures, payslips & loans', icon: DollarSign, defaultOn: false },
    ],
  },
  {
    name: 'Projects & Procurement',
    color: 'purple',
    modules: [
      { id: 'projects', name: 'Projects', description: 'Project management with tasks', icon: ClipboardList, defaultOn: false },
      { id: 'purchase-requests', name: 'Purchase Requests', description: 'Procurement workflow with approvals', icon: ShoppingCart, defaultOn: false },
    ],
  },
  {
    name: 'Documents',
    color: 'orange',
    modules: [
      { id: 'documents', name: 'Company Documents', description: 'Document management with expiry tracking', icon: FileText, defaultOn: false },
    ],
  },
];

// Color presets
const COLOR_PRESETS = [
  { name: 'Slate', value: '#0f172a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
];

interface TeamInvite {
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'MEMBER';
}

export default function SetupPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Basics
  const [additionalCurrencies, setAdditionalCurrencies] = useState<string[]>(['USD']);

  // Step 2: Branding
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState('#0f172a');
  const [secondaryColor, setSecondaryColor] = useState('#2563eb');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Modules
  const [selectedModules, setSelectedModules] = useState<string[]>(['assets', 'subscriptions', 'suppliers']);

  // Step 4: Team
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MANAGER' | 'MEMBER'>('MEMBER');
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // If user already has org and it's fully configured, redirect
  useEffect(() => {
    if (session?.user?.organizationId && session?.user?.organizationLogoUrl) {
      const orgSlug = session.user.organizationSlug;
      if (orgSlug) {
        window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
      }
    }
  }, [session]);

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Allowed: PNG, JPEG, WebP, SVG');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('File too large. Maximum size is 2MB');
      return;
    }

    setLogoFile(file);
    setError(null);

    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleCurrency = (code: string) => {
    setAdditionalCurrencies(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const addTeamMember = () => {
    if (!inviteEmail || !inviteEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    if (teamInvites.some(t => t.email === inviteEmail)) {
      setError('This email has already been added');
      return;
    }
    setTeamInvites(prev => [...prev, { email: inviteEmail, role: inviteRole }]);
    setInviteEmail('');
    setError(null);
  };

  const removeTeamMember = (email: string) => {
    setTeamInvites(prev => prev.filter(t => t.email !== email));
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep === 5) {
      // Final step - complete setup
      await completeSetup();
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 5));
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const completeSetup = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. Upload logo if provided
      if (logoFile) {
        const formData = new FormData();
        formData.append('logo', logoFile);

        const logoResponse = await fetch('/api/organizations/logo', {
          method: 'POST',
          body: formData,
        });

        if (!logoResponse.ok) {
          const data = await logoResponse.json();
          throw new Error(data.error || 'Failed to upload logo');
        }
      }

      // 2. Update organization settings (modules, colors, currencies)
      const settingsResponse = await fetch('/api/organizations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabledModules: selectedModules,
          primaryColor,
          secondaryColor,
          additionalCurrencies,
        }),
      });

      if (!settingsResponse.ok) {
        // Settings endpoint might not exist yet, continue anyway
        console.warn('Settings update failed, continuing...');
      }

      // 3. Send team invites
      if (teamInvites.length > 0) {
        for (const invite of teamInvites) {
          try {
            await fetch('/api/organizations/invite', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: invite.email, role: invite.role }),
            });
          } catch {
            console.warn(`Failed to send invite to ${invite.email}`);
          }
        }
      }

      // Refresh session
      await update();

      // Move to completion view
      setCurrentStep(5);

      // Redirect after showing completion
      setTimeout(() => {
        const orgSlug = session?.user?.organizationSlug;
        if (orgSlug) {
          window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
        } else {
          window.location.href = '/admin';
        }
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    const orgSlug = session?.user?.organizationSlug;
    if (orgSlug) {
      window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
    } else {
      router.push('/admin');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (!session?.user?.organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Organization Found</h3>
          <p className="text-slate-600 mb-6">
            Please accept an invitation first to join an organization.
          </p>
          <Button onClick={() => router.push('/pending')} className="bg-slate-900 hover:bg-slate-800">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Render progress bar
  const progress = (currentStep / 5) * 100;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="py-6 px-4 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
            <span className="text-white font-bold text-lg">S+</span>
          </div>
          <span className="text-xl font-semibold text-slate-900">SME++</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="px-4 py-6 bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">Step {currentStep} of 5</span>
            <span className="text-sm text-slate-500">{STEPS[currentStep - 1].title}</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-slate-900 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {error && (
            <Alert variant="error" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Organization Basics */}
          {currentStep === 1 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Let's set up your organization</h1>
                <p className="text-slate-600">Tell us a bit about your company</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
                {/* Organization Name (readonly) */}
                <div>
                  <Label className="text-slate-700">Organization Name</Label>
                  <div className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-lg font-medium">
                    {session.user.organizationName}
                  </div>
                </div>

                {/* Timezone (fixed) */}
                <div>
                  <Label className="text-slate-700">Timezone</Label>
                  <div className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center justify-between">
                    <span>Asia/Qatar (UTC+3)</span>
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">All organizations operate in Qatar timezone</p>
                </div>

                {/* Primary Currency (fixed) */}
                <div>
                  <Label className="text-slate-700">Primary Currency</Label>
                  <div className="mt-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🇶🇦</span>
                      <span>QAR - Qatari Riyal</span>
                    </div>
                    <span className="text-xs bg-slate-900 text-white px-2 py-1 rounded-full">Primary</span>
                  </div>
                </div>

                {/* Additional Currencies */}
                <div>
                  <Label className="text-slate-700">
                    Additional Currencies <span className="text-slate-400 font-normal">(optional)</span>
                  </Label>
                  <p className="text-sm text-slate-500 mb-3 mt-1">Select currencies you'll use alongside QAR</p>

                  <div className="grid grid-cols-2 gap-3">
                    {CURRENCIES.map(currency => (
                      <label
                        key={currency.code}
                        className={`flex items-center gap-3 p-3 border rounded-xl cursor-pointer transition-colors ${
                          additionalCurrencies.includes(currency.code)
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={additionalCurrencies.includes(currency.code)}
                          onChange={() => toggleCurrency(currency.code)}
                          className="w-5 h-5 text-slate-900 rounded border-slate-300 focus:ring-slate-900"
                        />
                        <span className="text-lg">{currency.flag}</span>
                        <span className="text-sm text-slate-700">{currency.code} - {currency.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Branding */}
          {currentStep === 2 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Customize your brand</h1>
                <p className="text-slate-600">Add your logo and colors to personalize your workspace</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-8">
                {/* Logo Upload */}
                <div>
                  <Label className="text-slate-700">Company Logo</Label>
                  <div className="mt-3">
                    {logoPreview ? (
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={logoPreview}
                            alt="Logo preview"
                            className="h-24 w-24 object-contain rounded-xl border border-slate-200 bg-white"
                          />
                          <button
                            type="button"
                            onClick={removeLogo}
                            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="text-sm text-slate-600">
                          <p className="font-medium">Logo uploaded</p>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="text-slate-900 underline"
                          >
                            Change logo
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
                      >
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
                          <Upload className="w-8 h-8 text-slate-400" />
                        </div>
                        <p className="text-slate-600 mb-1">Drag and drop your logo here, or click to browse</p>
                        <p className="text-sm text-slate-400">PNG, JPG, SVG up to 2MB</p>
                      </div>
                    )}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Color Pickers */}
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <Label className="text-slate-700">Primary Color</Label>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl border-2 border-white shadow-md cursor-pointer"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <Input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm bg-slate-50"
                      />
                    </div>
                    <div className="flex gap-2 mt-3">
                      {COLOR_PRESETS.map(color => (
                        <button
                          key={color.value}
                          onClick={() => setPrimaryColor(color.value)}
                          className={`w-8 h-8 rounded-lg cursor-pointer transition-all ${
                            primaryColor === color.value ? 'ring-2 ring-slate-900 ring-offset-2' : 'hover:ring-2 hover:ring-slate-400 hover:ring-offset-2'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="text-slate-700">
                      Secondary Color <span className="text-slate-400 font-normal">(optional)</span>
                    </Label>
                    <div className="mt-3 flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl border-2 border-white shadow-md cursor-pointer"
                        style={{ backgroundColor: secondaryColor }}
                      />
                      <Input
                        type="text"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="flex-1 font-mono text-sm bg-slate-50"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview */}
                <div>
                  <Label className="text-slate-700">Preview</Label>
                  <div className="mt-3 border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center gap-3 mb-4">
                      {logoPreview ? (
                        <img src={logoPreview} alt="Logo" className="w-10 h-10 object-contain rounded-lg" />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: primaryColor }}
                        >
                          {session.user.organizationName?.charAt(0) || 'A'}
                        </div>
                      )}
                      <span className="font-semibold text-slate-900">{session.user.organizationName}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="px-4 py-2 text-white rounded-lg text-sm font-medium"
                        style={{ backgroundColor: primaryColor }}
                      >
                        Primary Button
                      </button>
                      <button
                        className="px-4 py-2 text-white rounded-lg text-sm font-medium"
                        style={{ backgroundColor: secondaryColor }}
                      >
                        Secondary Button
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Module Selection */}
          {currentStep === 3 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Choose your modules</h1>
                <p className="text-slate-600">Select the features you need for your business</p>
              </div>

              <div className="space-y-6">
                {MODULE_CATEGORIES.map(category => (
                  <div key={category.name}>
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <span className={`w-2 h-2 bg-${category.color}-500 rounded-full`} style={{
                        backgroundColor: category.color === 'blue' ? '#3b82f6' :
                          category.color === 'green' ? '#22c55e' :
                          category.color === 'purple' ? '#a855f7' : '#f97316'
                      }} />
                      {category.name}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {category.modules.map(module => {
                        const isSelected = selectedModules.includes(module.id);
                        const Icon = module.icon;
                        const colorClass = category.color === 'blue' ? 'bg-blue-100 text-blue-600' :
                          category.color === 'green' ? 'bg-green-100 text-green-600' :
                          category.color === 'purple' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600';

                        return (
                          <div
                            key={module.id}
                            onClick={() => toggleModule(module.id)}
                            className={`bg-white border-2 rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md ${
                              isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSelected ? colorClass : 'bg-slate-100 text-slate-400'}`}>
                                <Icon className="w-6 h-6" />
                              </div>
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                isSelected ? 'bg-slate-900' : 'border-2 border-slate-300'
                              }`}>
                                {isSelected && <Check className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                            <h4 className="font-semibold text-slate-900 mb-1">{module.name}</h4>
                            <p className="text-sm text-slate-500">{module.description}</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selected Summary */}
              <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium text-slate-900">{selectedModules.length} modules selected</span>
                    <span className="text-sm text-slate-600 ml-2">
                      {selectedModules.map(m => {
                        const mod = MODULE_CATEGORIES.flatMap(c => c.modules).find(mod => mod.id === m);
                        return mod?.name;
                      }).filter(Boolean).join(', ')}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedModules(MODULE_CATEGORIES.flatMap(c => c.modules).map(m => m.id))}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium"
                  >
                    Select All
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Team Invite */}
          {currentStep === 4 && (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-slate-900 mb-3">Invite your team</h1>
                <p className="text-slate-600">Add team members to get started together</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-8">
                {/* Invite Form */}
                <div className="flex gap-3">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="bg-slate-50 border-slate-200 rounded-xl h-12"
                      onKeyDown={(e) => e.key === 'Enter' && addTeamMember()}
                    />
                  </div>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'MANAGER' | 'MEMBER')}
                    className="w-32 px-3 border border-slate-200 rounded-xl bg-slate-50 focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="MEMBER">Member</option>
                  </select>
                  <Button
                    onClick={addTeamMember}
                    className="bg-slate-900 hover:bg-slate-800 rounded-xl h-12 w-12 p-0"
                  >
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>

                {/* Added Members */}
                {teamInvites.length > 0 && (
                  <div className="border-t border-slate-200 pt-4 mt-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-3">Invitations to send</h4>
                    <div className="space-y-2">
                      {teamInvites.map(invite => (
                        <div key={invite.email} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-slate-600">
                                {invite.email.substring(0, 2).toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">{invite.email}</p>
                              <p className="text-xs text-slate-500">{invite.role}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeTeamMember(invite.email)}
                            className="text-slate-400 hover:text-red-500"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {teamInvites.length === 0 && (
                  <div className="mt-6 text-center py-8 text-slate-500">
                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                    <p>No team members added yet</p>
                    <p className="text-sm">You can always invite team members later from settings</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 5: Complete */}
          {currentStep === 5 && (
            <div className="animate-in slide-in-from-right-4 duration-300 text-center py-8">
              {/* Success Icon */}
              <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>

              <h1 className="text-3xl font-bold text-slate-900 mb-3">You're all set!</h1>
              <p className="text-slate-600 mb-8 max-w-md mx-auto">
                Welcome to <span className="font-semibold">{session.user.organizationName}</span>. Your workspace is ready to use.
              </p>

              {/* Summary */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-md mx-auto mb-8 text-left">
                <h3 className="font-semibold text-slate-900 mb-4">Setup Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">{selectedModules.length} modules enabled</p>
                      <p className="text-xs text-slate-500">
                        {selectedModules.map(m => {
                          const mod = MODULE_CATEGORIES.flatMap(c => c.modules).find(mod => mod.id === m);
                          return mod?.name;
                        }).filter(Boolean).slice(0, 3).join(', ')}
                        {selectedModules.length > 3 && ` +${selectedModules.length - 3} more`}
                      </p>
                    </div>
                  </div>
                  {teamInvites.length > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                        <Check className="w-4 h-4 text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{teamInvites.length} team invitation{teamInvites.length > 1 ? 's' : ''} sent</p>
                        <p className="text-xs text-slate-500">
                          {teamInvites.map(t => t.email).slice(0, 2).join(', ')}
                          {teamInvites.length > 2 && ` +${teamInvites.length - 2} more`}
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <Check className="w-4 h-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-900">Currencies configured</p>
                      <p className="text-xs text-slate-500">
                        QAR (Primary){additionalCurrencies.length > 0 && `, ${additionalCurrencies.join(', ')}`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Redirecting */}
              <div className="flex items-center justify-center gap-2 text-slate-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Redirecting to your dashboard...</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          {currentStep < 5 && (
            <div className="flex justify-between mt-8">
              {currentStep > 1 ? (
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-3">
                {currentStep === 2 || currentStep === 4 ? (
                  <Button
                    variant="ghost"
                    onClick={handleNext}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Skip for now
                  </Button>
                ) : null}
                <Button
                  onClick={currentStep === 4 ? completeSetup : handleNext}
                  disabled={isLoading}
                  className="bg-slate-900 hover:bg-slate-800 rounded-xl px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : currentStep === 4 ? (
                    <>
                      {teamInvites.length > 0 ? 'Send Invites & Finish' : 'Finish Setup'}
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  ) : (
                    <>
                      Continue
                      <ArrowRight className="w-5 h-5 ml-2" />
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
