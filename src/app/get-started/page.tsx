'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Loader2,
  Building2,
  Globe,
  Mail,
  User,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Check,
  Briefcase,
  Users,
  Boxes,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import './get-started.css';

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

// Available modules
const MODULES = [
  { id: 'assets', label: 'Assets', description: 'Track and manage company assets', defaultEnabled: true },
  { id: 'subscriptions', label: 'Subscriptions', description: 'Manage software subscriptions', defaultEnabled: true },
  { id: 'suppliers', label: 'Suppliers', description: 'Vendor management', defaultEnabled: true },
  { id: 'employees', label: 'Employees', description: 'HR and employee profiles', defaultEnabled: false },
  { id: 'leave', label: 'Leave Management', description: 'Leave requests and approvals', defaultEnabled: false },
  { id: 'payroll', label: 'Payroll', description: 'Salary and payroll processing', defaultEnabled: false },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63);
}

export default function GetStartedPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');
  const [enabledModules, setEnabledModules] = useState<string[]>(
    MODULES.filter(m => m.defaultEnabled).map(m => m.id)
  );

  // Subdomain validation
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Auto-generate subdomain from org name
  useEffect(() => {
    if (!subdomainEdited && organizationName) {
      setSubdomain(generateSlug(organizationName));
    }
  }, [organizationName, subdomainEdited]);

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

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    setSubdomainEdited(true);
    setSubdomainStatus(null);
  };

  const handleModuleToggle = (moduleId: string) => {
    setEnabledModules(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const canProceedStep1 =
    organizationName.trim().length >= 2 &&
    subdomain.length >= 3 &&
    !checkingSubdomain &&
    (subdomainStatus === null || subdomainStatus.available);

  const canProceedStep2 = industry && companySize;

  const handleSubmit = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!adminEmail || !emailRegex.test(adminEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/organizations/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: subdomain,
          adminEmail: adminEmail.trim().toLowerCase(),
          adminName: adminName.trim() || undefined,
          industry: industry || undefined,
          companySize: companySize || undefined,
          enabledModules,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="get-started-page">
        <nav className="gs-nav">
          <div className="gs-nav-inner">
            <Link href="/" className="gs-logo">Durj</Link>
          </div>
        </nav>

        <main className="gs-main">
          <div className="gs-success">
            <div className="gs-success-icon">
              <CheckCircle />
            </div>
            <h1>Check Your Email!</h1>
            <p>
              We&apos;ve sent an invitation link to <strong>{adminEmail}</strong>
            </p>
            <div className="gs-success-details">
              <div className="gs-success-item">
                <span className="gs-success-label">Organization</span>
                <span className="gs-success-value">{organizationName}</span>
              </div>
              <div className="gs-success-item">
                <span className="gs-success-label">Your Portal</span>
                <span className="gs-success-value">{subdomain}.{APP_DOMAIN.split(':')[0]}</span>
              </div>
            </div>
            <p className="gs-success-note">
              Click the link in the email to set up your password and access your dashboard.
              The link expires in 7 days.
            </p>
            <Link href="/" className="gs-btn gs-btn-outline">
              <ArrowLeft className="gs-btn-icon" />
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="get-started-page">
      {/* Navigation */}
      <nav className="gs-nav">
        <div className="gs-nav-inner">
          <Link href="/" className="gs-logo">Durj</Link>
          <div className="gs-nav-right">
            <span className="gs-nav-text">Already have an account?</span>
            <Link href="/login" className="gs-nav-link">Sign in</Link>
          </div>
        </div>
      </nav>

      <main className="gs-main">
        {/* Progress Steps */}
        <div className="gs-progress">
          <div className={`gs-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="gs-step-number">{step > 1 ? <Check /> : '1'}</div>
            <span className="gs-step-label">Company</span>
          </div>
          <div className="gs-step-line" data-active={step > 1} />
          <div className={`gs-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="gs-step-number">{step > 2 ? <Check /> : '2'}</div>
            <span className="gs-step-label">Details</span>
          </div>
          <div className="gs-step-line" data-active={step > 2} />
          <div className={`gs-step ${step >= 3 ? 'active' : ''}`}>
            <div className="gs-step-number">3</div>
            <span className="gs-step-label">Features</span>
          </div>
        </div>

        {/* Form Container */}
        <div className="gs-form-container">
          {error && (
            <div className="gs-error">
              <AlertCircle />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Company Info */}
          {step === 1 && (
            <div className="gs-form-step">
              <div className="gs-form-header">
                <div className="gs-form-icon">
                  <Building2 />
                </div>
                <h1>Let&apos;s set up your company</h1>
                <p>Tell us about your organization to get started</p>
              </div>

              <div className="gs-form-fields">
                <div className="gs-field">
                  <label htmlFor="organizationName">
                    Company Name <span className="required">*</span>
                  </label>
                  <div className="gs-input-wrapper">
                    <Building2 className="gs-input-icon" />
                    <input
                      id="organizationName"
                      type="text"
                      placeholder="Acme Corporation"
                      value={organizationName}
                      onChange={(e) => {
                        setOrganizationName(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="gs-field">
                  <label htmlFor="subdomain">
                    Your Portal URL <span className="required">*</span>
                  </label>
                  <div className="gs-subdomain-wrapper">
                    <div className="gs-input-wrapper gs-subdomain-input">
                      <Globe className="gs-input-icon" />
                      <input
                        id="subdomain"
                        type="text"
                        placeholder="acme"
                        value={subdomain}
                        onChange={(e) => handleSubdomainChange(e.target.value)}
                      />
                      <div className="gs-subdomain-status">
                        {checkingSubdomain ? (
                          <Loader2 className="spinning" />
                        ) : subdomainStatus ? (
                          subdomainStatus.available ? (
                            <CheckCircle className="success" />
                          ) : (
                            <AlertCircle className="error" />
                          )
                        ) : null}
                      </div>
                    </div>
                    <span className="gs-subdomain-suffix">.{APP_DOMAIN.split(':')[0]}</span>
                  </div>
                  {subdomainStatus && (
                    <span className={`gs-field-hint ${subdomainStatus.available ? 'success' : 'error'}`}>
                      {subdomainStatus.available
                        ? 'This subdomain is available!'
                        : subdomainStatus.error || 'This subdomain is not available'}
                    </span>
                  )}
                </div>
              </div>

              <div className="gs-form-actions">
                <button
                  type="button"
                  className="gs-btn gs-btn-primary"
                  disabled={!canProceedStep1}
                  onClick={() => setStep(2)}
                >
                  Continue
                  <ArrowRight className="gs-btn-icon-right" />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Company Details */}
          {step === 2 && (
            <div className="gs-form-step">
              <div className="gs-form-header">
                <div className="gs-form-icon">
                  <Briefcase />
                </div>
                <h1>A bit more about you</h1>
                <p>This helps us customize your experience</p>
              </div>

              <div className="gs-form-fields">
                <div className="gs-field">
                  <label htmlFor="industry">
                    Industry <span className="required">*</span>
                  </label>
                  <div className="gs-select-wrapper">
                    <Briefcase className="gs-input-icon" />
                    <select
                      id="industry"
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                    >
                      <option value="">Select your industry</option>
                      {INDUSTRIES.map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="gs-field">
                  <label htmlFor="companySize">
                    Company Size <span className="required">*</span>
                  </label>
                  <div className="gs-select-wrapper">
                    <Users className="gs-input-icon" />
                    <select
                      id="companySize"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                    >
                      <option value="">Select company size</option>
                      {COMPANY_SIZES.map((size) => (
                        <option key={size.value} value={size.value}>
                          {size.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="gs-field">
                  <label htmlFor="adminEmail">
                    Your Email <span className="required">*</span>
                  </label>
                  <div className="gs-input-wrapper">
                    <Mail className="gs-input-icon" />
                    <input
                      id="adminEmail"
                      type="email"
                      placeholder="you@company.com"
                      value={adminEmail}
                      onChange={(e) => {
                        setAdminEmail(e.target.value);
                        setError(null);
                      }}
                    />
                  </div>
                </div>

                <div className="gs-field">
                  <label htmlFor="adminName">
                    Your Name <span className="optional">(optional)</span>
                  </label>
                  <div className="gs-input-wrapper">
                    <User className="gs-input-icon" />
                    <input
                      id="adminName"
                      type="text"
                      placeholder="John Smith"
                      value={adminName}
                      onChange={(e) => setAdminName(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="gs-form-actions gs-form-actions-split">
                <button
                  type="button"
                  className="gs-btn gs-btn-outline"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="gs-btn-icon" />
                  Back
                </button>
                <button
                  type="button"
                  className="gs-btn gs-btn-primary"
                  disabled={!canProceedStep2 || !adminEmail}
                  onClick={() => setStep(3)}
                >
                  Continue
                  <ArrowRight className="gs-btn-icon-right" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Features Selection */}
          {step === 3 && (
            <div className="gs-form-step">
              <div className="gs-form-header">
                <div className="gs-form-icon">
                  <Boxes />
                </div>
                <h1>Choose your features</h1>
                <p>Select the modules you want to use. You can change these later.</p>
              </div>

              <div className="gs-modules-grid">
                {MODULES.map((module) => (
                  <button
                    key={module.id}
                    type="button"
                    className={`gs-module-card ${enabledModules.includes(module.id) ? 'selected' : ''}`}
                    onClick={() => handleModuleToggle(module.id)}
                  >
                    <div className="gs-module-check">
                      {enabledModules.includes(module.id) && <Check />}
                    </div>
                    <div className="gs-module-content">
                      <span className="gs-module-label">{module.label}</span>
                      <span className="gs-module-desc">{module.description}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="gs-summary">
                <div className="gs-summary-row">
                  <span>Company</span>
                  <strong>{organizationName}</strong>
                </div>
                <div className="gs-summary-row">
                  <span>Portal</span>
                  <strong>{subdomain}.{APP_DOMAIN.split(':')[0]}</strong>
                </div>
                <div className="gs-summary-row">
                  <span>Email</span>
                  <strong>{adminEmail}</strong>
                </div>
              </div>

              <div className="gs-form-actions gs-form-actions-split">
                <button
                  type="button"
                  className="gs-btn gs-btn-outline"
                  onClick={() => setStep(2)}
                >
                  <ArrowLeft className="gs-btn-icon" />
                  Back
                </button>
                <button
                  type="button"
                  className="gs-btn gs-btn-primary gs-btn-submit"
                  disabled={isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="gs-btn-icon spinning" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="gs-btn-icon" />
                      Create My Account
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gs-footer">
          <p>By continuing, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a></p>
        </div>
      </main>
    </div>
  );
}
