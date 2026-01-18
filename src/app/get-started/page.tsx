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
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { generateSlug } from '@/lib/multi-tenant/subdomain';
import { VALIDATION_PATTERNS } from '@/lib/validations/patterns';
import './get-started.css';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Industry options
const INDUSTRIES = [
  { value: 'technology', label: 'Technology / Software' },
  { value: 'retail', label: 'Retail & E-commerce' },
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'construction', label: 'Construction & Trades' },
  { value: 'education', label: 'Education' },
  { value: 'financial-services', label: 'Financial Services' },
  { value: 'real-estate', label: 'Real Estate' },
  { value: 'hospitality', label: 'Hospitality & Food Services' },
  { value: 'media-marketing', label: 'Media, Marketing & Creative' },
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

export default function GetStartedPage() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [orgCreated, setOrgCreated] = useState(false); // Track if org was already created
  const [createdOrgSlug, setCreatedOrgSlug] = useState<string | null>(null); // Store org slug for email change
  const [originalEmail, setOriginalEmail] = useState<string | null>(null); // Store original email

  // Form state
  const [organizationName, setOrganizationName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [subdomainEdited, setSubdomainEdited] = useState(false);
  const [industry, setIndustry] = useState('');
  const [otherIndustry, setOtherIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminName, setAdminName] = useState('');

  // Subdomain validation
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainStatus, setSubdomainStatus] = useState<{
    available: boolean;
    valid: boolean;
    error?: string;
  } | null>(null);

  // Email validation
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{
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

  // Check email availability
  const checkEmail = useCallback(async (email: string) => {
    if (!email || !email.includes('@')) {
      setEmailStatus(null);
      return;
    }

    setCheckingEmail(true);
    try {
      const response = await fetch(`/api/emails/check?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      setEmailStatus({
        available: data.available,
        valid: data.valid,
        error: data.error,
      });
    } catch {
      setEmailStatus(null);
    } finally {
      setCheckingEmail(false);
    }
  }, []);

  // Debounced subdomain check (skip if org already created)
  useEffect(() => {
    if (orgCreated) return; // Don't recheck if org already exists
    const timer = setTimeout(() => {
      if (subdomain) {
        checkSubdomain(subdomain);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [subdomain, checkSubdomain, orgCreated]);

  // Debounced email check
  useEffect(() => {
    const timer = setTimeout(() => {
      if (adminEmail && adminEmail.includes('@')) {
        checkEmail(adminEmail);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [adminEmail, checkEmail]);

  const handleSubdomainChange = (value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(cleaned);
    setSubdomainEdited(true);
    setSubdomainStatus(null);
  };

  const handleEmailChange = (email: string) => {
    setAdminEmail(email);
    setError(null);
    setEmailStatus(null);
  };

  const canProceedStep1 =
    organizationName.trim().length >= 2 &&
    subdomain.length >= 3 &&
    !checkingSubdomain &&
    (orgCreated || subdomainStatus === null || subdomainStatus.available);

  const canProceedStep2 = orgCreated
    ? adminEmail && !checkingEmail && (emailStatus === null || emailStatus.available)
    : industry &&
      (industry !== 'other' || otherIndustry.trim().length >= 2) &&
      companySize &&
      adminEmail &&
      !checkingEmail &&
      (emailStatus === null || emailStatus.available);

  const handleSubmit = async () => {
    if (!adminEmail || !VALIDATION_PATTERNS.email.test(adminEmail.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // If org already created, update email instead of creating new org
      if (orgCreated && createdOrgSlug) {
        const response = await fetch('/api/organizations/resend-invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: originalEmail, // Original email to find the invitation
            newEmail: adminEmail.trim().toLowerCase(), // New email to update to
            slug: createdOrgSlug, // Org slug to find the invitation
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to update email');
        }

        // Update original email reference
        setOriginalEmail(adminEmail.trim().toLowerCase());
        setSuccess(true);
        return;
      }

      // Determine the industry value to send
      const industryValue = industry === 'other' ? `other:${otherIndustry.trim()}` : industry;

      const response = await fetch('/api/organizations/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: organizationName.trim(),
          slug: subdomain,
          adminEmail: adminEmail.trim().toLowerCase(),
          adminName: adminName.trim() || undefined,
          industry: industryValue || undefined,
          companySize: companySize || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Store org slug and email for potential email change
      setCreatedOrgSlug(subdomain);
      setOriginalEmail(adminEmail.trim().toLowerCase());
      setOrgCreated(true);
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend email handler
  const handleResendEmail = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/organizations/resend-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail.trim().toLowerCase() }),
      });
      if (!response.ok) {
        const data = await response.json();
        setError(data.error || 'Failed to resend email');
      }
    } catch {
      setError('Failed to resend email');
    } finally {
      setIsLoading(false);
    }
  };

  // Change email handler - go back to step 2
  const handleChangeEmail = () => {
    setSuccess(false);
    setStep(2);
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
              We&apos;ve sent a secure sign-in link to <strong>{adminEmail}</strong>
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
            <div className="gs-didnt-receive">
              <span>Didn&apos;t receive the email?</span>
              <div className="gs-didnt-receive-actions">
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={isLoading}
                  className="gs-link-btn"
                >
                  {isLoading ? 'Sending...' : 'Resend email'}
                </button>
                <span className="gs-divider">·</span>
                <button
                  type="button"
                  onClick={handleChangeEmail}
                  className="gs-link-btn"
                >
                  Change email address
                </button>
              </div>
            </div>
            <Link href="/" className="gs-btn gs-btn-outline">
              <ArrowLeft className="gs-btn-icon" />
              Go to Homepage
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
          <div className={`gs-step ${step >= 2 ? 'active' : ''}`}>
            <div className="gs-step-number">2</div>
            <span className="gs-step-label">Details</span>
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
                        disabled={orgCreated}
                        className={orgCreated ? 'disabled' : ''}
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
                  {orgCreated ? (
                    <span className="gs-field-hint success">
                      Your workspace URL is confirmed
                    </span>
                  ) : subdomainStatus ? (
                    subdomainStatus.available ? (
                      <div className="gs-subdomain-hints">
                        <span className="gs-field-hint success">
                          Subdomain is available
                        </span>
                        <span className="gs-field-hint caution">
                          Choose carefully — this cannot be changed later
                        </span>
                      </div>
                    ) : (
                      <span className="gs-field-hint error">
                        {subdomainStatus.error || 'This subdomain is not available'}
                      </span>
                    )
                  ) : null}
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
                  {orgCreated ? <Mail /> : <Briefcase />}
                </div>
                <h1>{orgCreated ? 'Update your email address' : `A bit more about ${organizationName || 'your company'}`}</h1>
                <p>{orgCreated ? 'Enter your new email address and we\'ll send you a new invitation link' : 'This helps us customize your experience'}</p>
              </div>

              <div className="gs-form-fields">
                {!orgCreated && (
                  <>
                    <div className="gs-field">
                      <label htmlFor="industry">
                        Industry <span className="required">*</span>
                      </label>
                      <div className="gs-select-wrapper">
                        <Briefcase className="gs-input-icon" />
                        <select
                          id="industry"
                          value={industry}
                          onChange={(e) => {
                            setIndustry(e.target.value);
                            if (e.target.value !== 'other') {
                              setOtherIndustry('');
                            }
                          }}
                        >
                          <option value="">Select your industry</option>
                          {INDUSTRIES.map((ind) => (
                            <option key={ind.value} value={ind.value}>
                              {ind.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      {industry === 'other' && (
                        <div className="gs-input-wrapper gs-other-input">
                          <input
                            id="otherIndustry"
                            type="text"
                            placeholder="Please specify your industry"
                            value={otherIndustry}
                            onChange={(e) => setOtherIndustry(e.target.value)}
                            autoFocus
                          />
                        </div>
                      )}
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
                  </>
                )}

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
                      onChange={(e) => handleEmailChange(e.target.value)}
                    />
                    <div className="gs-subdomain-status">
                      {checkingEmail ? (
                        <Loader2 className="spinning" />
                      ) : emailStatus && !emailStatus.available ? (
                        <AlertCircle className="error" />
                      ) : null}
                    </div>
                  </div>
                  {emailStatus && !emailStatus.available ? (
                    <span className="gs-field-hint error">
                      {emailStatus.error || 'This email is already registered'}
                    </span>
                  ) : (
                    <span className="gs-field-hint">
                      We&apos;ll send a confirmation link to activate your account.
                    </span>
                  )}
                </div>

                {!orgCreated && (
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
                )}
              </div>

              <div className={`gs-form-actions ${orgCreated ? '' : 'gs-form-actions-split'}`}>
                {!orgCreated && (
                  <button
                    type="button"
                    className="gs-btn gs-btn-outline"
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft className="gs-btn-icon" />
                    Back
                  </button>
                )}
                <button
                  type="button"
                  className="gs-btn gs-btn-primary gs-btn-submit"
                  disabled={!canProceedStep2 || !adminEmail || isLoading}
                  onClick={handleSubmit}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="gs-btn-icon spinning" />
                      {orgCreated ? 'Updating...' : 'Creating...'}
                    </>
                  ) : orgCreated ? (
                    <>
                      <Mail className="gs-btn-icon" />
                      Update Email & Resend
                    </>
                  ) : (
                    <>
                      <Sparkles className="gs-btn-icon" />
                      Create My Workspace
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
