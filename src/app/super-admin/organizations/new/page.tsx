'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Loader2,
  Building2,
  Globe,
  Mail,
  User,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Send,
  Copy,
  Check,
  Briefcase,
  Users,
  FileText,
  Boxes,
} from 'lucide-react';
import { generateSlug } from '@/lib/multi-tenant/subdomain';
import { generateCodePrefixFromName } from '@/lib/utils/code-prefix';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Industry options
const INDUSTRIES = [
  { value: 'technology', label: 'Technology' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'construction', label: 'Construction' },
  { value: 'education', label: 'Education' },
  { value: 'finance', label: 'Finance & Banking' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospitality', label: 'Hospitality' },
  { value: 'professional-services', label: 'Professional Services' },
  { value: 'other', label: 'Other' },
];

// Company size options
const COMPANY_SIZES = [
  { value: '1-10', label: '1-10 employees' },
  { value: '11-50', label: '11-50 employees' },
  { value: '51-200', label: '51-200 employees' },
  { value: '201-500', label: '201-500 employees' },
  { value: '500+', label: '500+ employees' },
];

// Available modules (Company Documents first, then others alphabetically by category)
const MODULES = [
  { id: 'documents', label: 'Company Documents', description: 'Manage company documents and policies', defaultEnabled: true },
  { id: 'assets', label: 'Assets', description: 'Track and manage company assets', defaultEnabled: true },
  { id: 'subscriptions', label: 'Subscriptions', description: 'Manage software subscriptions', defaultEnabled: true },
  { id: 'suppliers', label: 'Suppliers', description: 'Vendor management', defaultEnabled: true },
  { id: 'employees', label: 'Employees', description: 'HR and employee profiles', defaultEnabled: false },
  { id: 'leave', label: 'Leave Management', description: 'Leave requests and approvals', defaultEnabled: false },
  { id: 'payroll', label: 'Payroll', description: 'Salary and payroll processing', defaultEnabled: false },
  { id: 'purchase-requests', label: 'Purchase Requests', description: 'Manage purchase approvals', defaultEnabled: false },
];

export default function CreateOrganizationPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [createdOrg, setCreatedOrg] = useState<{ name: string; slug: string } | null>(null);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [codePrefix, setCodePrefix] = useState('');
  const [codePrefixEdited, setCodePrefixEdited] = useState(false);
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>(
    MODULES.filter(m => m.defaultEnabled).map(m => m.id)
  );
  const [internalNotes, setInternalNotes] = useState('');

  // Subdomain validation
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Email availability check
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
    available: boolean;
    error?: string;
  } | null>(null);

  // Auto-generate subdomain and code prefix from org name
  useEffect(() => {
    if (organizationName) {
      if (!subdomainEdited) {
        setSubdomain(generateSlug(organizationName));
      }
      if (!codePrefixEdited) {
        setCodePrefix(generateCodePrefixFromName(organizationName));
      }
    }
  }, [organizationName, subdomainEdited, codePrefixEdited]);

  // Check subdomain availability
  const checkSubdomain = useCallback(async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSubdomainStatus(null);
      return;
    }

    setCheckingSubdomain(true);
    try {
      const response = await fetch(`/api/subdomains/check?slug=${encodeURIComponent(slug)}`);
      const data = await response.json();
      setSubdomainStatus({
        available: data.available,
        valid: data.valid,
        error: data.error,
      });
    } catch {
      setSubdomainStatus(null);
    } finally {
      setCheckingSubdomain(false);
    }
  }, []);

  // Debounced subdomain check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (subdomain) {
        checkSubdomain(subdomain);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subdomain, checkSubdomain]);

  // Check email availability
  const checkEmailAvailability = useCallback(async (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailStatus(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailStatus({
        available: data.available,
        error: data.available ? undefined : 'This email is already registered',
      });
    } catch {
      setEmailStatus(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (adminEmail) {
        checkEmailAvailability(adminEmail.trim().toLowerCase());
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [adminEmail, checkEmailAvailability]);

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9]/g, '');
    setSubdomain(cleaned);
    setSubdomainEdited(true);
    setSubdomainStatus(null);
  };

  const handleCodePrefixChange = (value: string) => {
    const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    setCodePrefix(cleaned);
    setCodePrefixEdited(true);
  };

  const handleModuleToggle = (moduleId: string, checked: boolean) => {
    if (checked) {
      setEnabledModules(prev => [...prev, moduleId]);
    } else {
      setEnabledModules(prev => prev.filter(id => id !== moduleId));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (organizationName.trim().length < 2) {
      setError('Organization name must be at least 2 characters');
      return;
    }

    if (subdomain.length < 3) {
      setError('Subdomain must be at least 3 characters');
      return;
    }

    if (subdomainStatus && !subdomainStatus.available) {
      setError(subdomainStatus.error || 'This subdomain is not available');
      return;
    }

    if (!/^[A-Z0-9]{3}$/.test(codePrefix)) {
      setError('Organization code must be exactly 3 uppercase letters/numbers');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail || !emailRegex.test(adminEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    if (emailStatus && !emailStatus.available) {
      setError('This email is already registered');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/super-admin/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: subdomain,
          codePrefix,
          adminEmail: adminEmail.trim().toLowerCase(),
          adminName: adminName.trim() || undefined,
          industry: industry || undefined,
          companySize: companySize || undefined,
          enabledModules,
          internalNotes: internalNotes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setSuccess(true);
      setInviteUrl(data.invitation?.inviteUrl || null);
      setCreatedOrg({ name: organizationName.trim(), slug: subdomain });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyInviteUrl = async () => {
    if (inviteUrl) {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Organization Created!</h2>
            <p className="text-slate-500 mb-6">
              {createdOrg?.name} has been set up successfully
            </p>

            {/* Org Details */}
            <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Subdomain</p>
                  <p className="font-medium text-slate-900">{createdOrg?.slug}.{APP_DOMAIN.split(':')[0]}</p>
                </div>
                <div>
                  <p className="text-slate-500">Modules</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {enabledModules.map(mod => (
                      <span key={mod} className="text-xs bg-slate-200 text-slate-700 px-2 py-0.5 rounded">
                        {MODULES.find(m => m.id === mod)?.label || mod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Invitation Link */}
            {inviteUrl && (
              <div className="mb-6">
                <Label className="text-sm font-medium text-slate-700">Invitation Link for {adminEmail}</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={inviteUrl}
                    readOnly
                    className="font-mono text-xs bg-slate-50"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyInviteUrl}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  This link expires in 7 days. Copy and send it to the admin.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Link href="/super-admin/organizations" className="flex-1">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Organizations
                </Button>
              </Link>
              <Button
                className="flex-1 bg-slate-900 hover:bg-slate-800"
                onClick={() => {
                  setSuccess(false);
                  setOrganizationName('');
                  setSubdomain('');
                  setSubdomainEdited(false);
                  setCodePrefix('');
                  setCodePrefixEdited(false);
                  setIndustry('');
                  setCompanySize('');
                  setAdminEmail('');
                  setAdminName('');
                  setEmailStatus(null);
                  setEnabledModules(MODULES.filter(m => m.defaultEnabled).map(m => m.id));
                  setInternalNotes('');
                  setInviteUrl(null);
                  setCreatedOrg(null);
                }}
              >
                Create Another
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Back Link */}
      <div className="mb-6">
        <Link
          href="/super-admin/organizations"
          className="inline-flex items-center text-sm text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Organizations
        </Link>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create New Organization</h1>
            <p className="text-sm text-slate-500">Set up a new organization and invite the first admin</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Organization Details Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
            Organization Details
          </h2>

          <div className="space-y-4">
            {/* Organization Name */}
            <div className="space-y-2">
              <Label htmlFor="organizationName" className="text-sm text-slate-700">
                Organization Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="organizationName"
                  placeholder="Acme Corporation"
                  value={organizationName}
                  onChange={(e) => {
                    setOrganizationName(e.target.value);
                    setError(null);
                  }}
                  className="pl-10 bg-slate-50 border-slate-200 focus:ring-slate-900"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Subdomain */}
            <div className="space-y-2">
              <Label htmlFor="subdomain" className="text-sm text-slate-700">
                Subdomain <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="subdomain"
                    placeholder="acme"
                    value={subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    className="pl-10 pr-10 font-mono bg-slate-50 border-slate-200 focus:ring-slate-900"
                    required
                    disabled={isLoading}
                  />
                  <div className="absolute right-3 top-3">
                    {checkingSubdomain ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : subdomainStatus ? (
                      subdomainStatus.available ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      )
                    ) : null}
                  </div>
                </div>
                <span className="text-sm text-slate-500 whitespace-nowrap">
                  .{APP_DOMAIN.split(':')[0]}
                </span>
              </div>
              {subdomainStatus && (
                <p className={`text-xs ${subdomainStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                  {subdomainStatus.available
                    ? 'This subdomain is available!'
                    : subdomainStatus.error || 'This subdomain is not available'}
                </p>
              )}
            </div>

            {/* Organization Code */}
            <div className="space-y-2">
              <Label htmlFor="codePrefix" className="text-sm text-slate-700">
                Organization Code <span className="text-red-500">*</span>
                <span className="text-slate-400 font-normal ml-1">(3 letters)</span>
              </Label>
              <div className="relative max-w-[200px]">
                <Input
                  id="codePrefix"
                  placeholder="ABC"
                  value={codePrefix}
                  onChange={(e) => handleCodePrefixChange(e.target.value)}
                  maxLength={3}
                  className="font-mono tracking-widest uppercase bg-slate-50 border-slate-200 focus:ring-slate-900 pr-10"
                  required
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-3">
                  {/^[A-Z0-9]{3}$/.test(codePrefix) ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : codePrefix.length > 0 ? (
                    <AlertCircle className="h-4 w-4 text-amber-500" />
                  ) : null}
                </div>
              </div>
              {/^[A-Z0-9]{3}$/.test(codePrefix) && (
                <p className="text-xs text-slate-500">
                  Employee IDs will look like: <span className="font-mono font-medium">{codePrefix}-{new Date().getFullYear()}-001</span>
                </p>
              )}
            </div>

            {/* Industry & Company Size */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-700">Industry</Label>
                <Select value={industry} onValueChange={setIndustry} disabled={isLoading}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <Briefcase className="h-4 w-4 text-slate-400 mr-2" />
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value}>
                        {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm text-slate-700">Company Size</Label>
                <Select value={companySize} onValueChange={setCompanySize} disabled={isLoading}>
                  <SelectTrigger className="bg-slate-50 border-slate-200">
                    <Users className="h-4 w-4 text-slate-400 mr-2" />
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size.value} value={size.value}>
                        {size.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Modules Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Boxes className="h-4 w-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Modules
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Select which modules to enable for this organization
          </p>

          <div className="grid grid-cols-2 gap-3">
            {MODULES.map((module) => (
              <label
                key={module.id}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  enabledModules.includes(module.id)
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <Checkbox
                  checked={enabledModules.includes(module.id)}
                  onCheckedChange={(checked) => handleModuleToggle(module.id, checked as boolean)}
                  disabled={isLoading}
                  className="mt-0.5"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">{module.label}</p>
                  <p className="text-xs text-slate-500">{module.description}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* First Admin Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-4 w-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              First Admin
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            This person will receive an invitation to set up their account as the organization owner
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="adminEmail" className="text-sm text-slate-700">
                Email <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  id="adminEmail"
                  type="email"
                  placeholder="admin@acme.com"
                  value={adminEmail}
                  onChange={(e) => {
                    setAdminEmail(e.target.value);
                    setError(null);
                    setEmailStatus(null);
                  }}
                  className="pl-10 pr-10 bg-slate-50 border-slate-200 focus:ring-slate-900"
                  required
                  disabled={isLoading}
                />
                <div className="absolute right-3 top-3">
                  {checkingEmail ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : emailStatus ? (
                    emailStatus.available ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )
                  ) : null}
                </div>
              </div>
              {emailStatus && (
                <p className={`text-xs ${emailStatus.available ? 'text-green-600' : 'text-red-600'}`}>
                  {emailStatus.available ? 'This email is available!' : emailStatus.error}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adminName" className="text-sm text-slate-700">
                Name <span className="text-slate-400">(optional)</span>
              </Label>
              <Input
                id="adminName"
                placeholder="John Smith"
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className="bg-slate-50 border-slate-200 focus:ring-slate-900"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        {/* Internal Notes Section */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-4 w-4 text-slate-500" />
            <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Internal Notes
            </h2>
          </div>
          <p className="text-sm text-slate-500 mb-4">
            Private notes only visible to super admins (sales info, special requirements, etc.)
          </p>

          <Textarea
            placeholder="Add any internal notes about this organization..."
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            className="bg-slate-50 border-slate-200 focus:ring-slate-900 min-h-[100px]"
            disabled={isLoading}
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-3">
          <Link href="/super-admin/organizations" className="flex-1">
            <Button type="button" variant="outline" className="w-full" disabled={isLoading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1 bg-slate-900 hover:bg-slate-800"
            disabled={
              isLoading ||
              organizationName.trim().length < 2 ||
              subdomain.length < 3 ||
              checkingSubdomain ||
              (subdomainStatus !== null && !subdomainStatus.available) ||
              !adminEmail
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Create & Send Invitation
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
