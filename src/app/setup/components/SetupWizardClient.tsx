'use client';

/**
 * @file SetupWizardClient.tsx
 * @description Main client component for the Linear-style setup wizard
 * @module setup/components
 */

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowRight, ArrowLeft, AlertCircle, Loader2 } from 'lucide-react';

import { StepTransition } from './StepTransition';
import { WizardProgress } from './WizardProgress';
import { OrgNameStep } from './steps/OrgNameStep';
import { CurrencyStep } from './steps/CurrencyStep';
import { LogoStep } from './steps/LogoStep';
import { ColorStep } from './steps/ColorStep';
import { ModuleStep } from './steps/ModuleStep';
import { WelcomeStep } from './steps/WelcomeStep';

const APP_DOMAIN = process.env.NEXT_PUBLIC_APP_DOMAIN || 'localhost:3000';

// Normalize URL by adding https:// if no protocol is present
function normalizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Validate website URL format
function isValidWebsite(url: string): boolean {
  if (!url.trim()) return true; // Empty is valid (optional field)
  let urlToTest = url.trim();
  if (!/^https?:\/\//i.test(urlToTest)) {
    urlToTest = `https://${urlToTest}`;
  }
  try {
    const parsed = new URL(urlToTest);
    return parsed.hostname.includes('.');
  } catch {
    return false;
  }
}

// Validate hex color format
function isValidHexColor(color: string): boolean {
  if (!color) return true; // Empty is valid (optional)
  return /^#[0-9A-Fa-f]{6}$/.test(color) || /^#[0-9A-Fa-f]{3}$/.test(color);
}

const STEPS = [
  { title: 'Organization', description: 'Name your workspace' },
  { title: 'Currencies', description: 'Additional currencies' },
  { title: 'Logo', description: 'Upload your logo' },
  { title: 'Colors', description: 'Brand colors' },
  { title: 'Modules', description: 'Choose features' },
  { title: 'Complete', description: 'All done!' },
];

const TOTAL_STEPS = 6;


export function SetupWizardClient() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Org name, code prefix, and website
  const [orgName, setOrgName] = useState('');
  const [codePrefix, setCodePrefix] = useState('');
  const [codePrefixEdited, setCodePrefixEdited] = useState(false);
  const [website, setWebsite] = useState('');

  // Step 2: Currencies
  const [primaryCurrency, setPrimaryCurrency] = useState('QAR');
  const [additionalCurrencies, setAdditionalCurrencies] = useState<string[]>([]);

  // Step 3: Logo
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Step 4: Colors (empty by default, user must select)
  const [primaryColor, setPrimaryColor] = useState('');
  const [secondaryColor, setSecondaryColor] = useState('');

  // Step 5: Modules
  const [selectedModules, setSelectedModules] = useState<string[]>([
    'employees', // Core module - always enabled
    'assets',
    'subscriptions',
    'suppliers',
  ]);

  // Initialize from session
  useEffect(() => {
    if (session?.user?.organizationName) {
      setOrgName(session.user.organizationName);
    }
  }, [session?.user?.organizationName]);

  // Load existing modules
  useEffect(() => {
    async function loadModules() {
      if (!session?.user?.organizationId) return;
      try {
        const response = await fetch('/api/organizations/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.settings?.enabledModules?.length > 0) {
            setSelectedModules(data.settings.enabledModules);
          }
        }
      } catch {
        // Ignore errors, use defaults
      }
    }
    loadModules();
  }, [session?.user?.organizationId]);

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Redirect non-admins to employee dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      const isAdmin = session?.user?.isOwner || session?.user?.isAdmin;
      if (!isAdmin) {
        router.push('/employee');
      }
    }
  }, [status, session?.user?.isOwner, session?.user?.isAdmin, router]);

  // Navigation functions
  const goNext = useCallback(() => {
    setError(null);
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  }, []);

  const goBack = useCallback(() => {
    setError(null);
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  }, []);

  // Check if current step can proceed
  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 1:
        // Org name must be at least 2 chars, code prefix must be 2-3 uppercase alphanumeric, website must be valid if provided
        return orgName.trim().length >= 2 && /^[A-Z0-9]{2,3}$/.test(codePrefix) && isValidWebsite(website);
      case 4:
        // Colors are optional, but if provided they must be valid hex
        return isValidHexColor(primaryColor) && isValidHexColor(secondaryColor);
      case 5:
        return selectedModules.length > 0;
      default:
        return true;
    }
  }, [currentStep, orgName, codePrefix, website, primaryColor, secondaryColor, selectedModules]);

  // Check if current step is skippable
  // Modules (step 5) is NOT skippable
  const isSkippable = useCallback(() => {
    return [2, 3, 4].includes(currentStep);
  }, [currentStep]);

  // Complete setup
  const completeSetup = async () => {
    setIsLoading(true);
    setError(null);

    const orgSlug = session?.user?.organizationSlug;

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
          throw new Error(data.message || data.error || 'Failed to upload logo');
        }
      }

      // 2. Update organization settings
      const settingsResponse = await fetch('/api/organizations/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName.trim(),
          codePrefix,
          enabledModules: selectedModules,
          ...(primaryColor && { primaryColor }),
          ...(secondaryColor && { secondaryColor }),
          ...(website.trim() && { website: normalizeUrl(website) }),
          currency: primaryCurrency,
          additionalCurrencies,
        }),
      });

      if (!settingsResponse.ok) {
        const errorData = await settingsResponse.json().catch(() => ({ error: 'Failed to save settings' }));
        throw new Error(errorData.error || 'Failed to save organization settings');
      }

      // 3. Initialize setup progress
      await fetch('/api/organizations/setup-progress', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            profileComplete: true,
            logoUploaded: !!logoFile,
            brandingConfigured: primaryColor !== '#0f172a',
          },
        }),
      });

      // Refresh session
      await update();

      // Move to welcome step
      setDirection(1);
      setCurrentStep(TOTAL_STEPS);
      setIsLoading(false);

      // Redirect after showing welcome
      setTimeout(() => {
        if (orgSlug) {
          window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
        } else {
          window.location.href = '/admin';
        }
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setIsLoading(false);
    }
  };

  // Handle next button click
  const handleNext = () => {
    if (currentStep === 5) {
      completeSetup();
    } else {
      goNext();
    }
  };

  // Skip setup entirely
  const handleSkipAll = () => {
    const orgSlug = session?.user?.organizationSlug;
    if (orgSlug) {
      window.location.href = `${window.location.protocol}//${orgSlug}.${APP_DOMAIN}/admin`;
    } else {
      router.push('/admin');
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  // No organization
  if (!session?.user?.organizationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            No Organization Found
          </h3>
          <p className="text-slate-600 mb-6">
            Please accept an invitation first to join an organization.
          </p>
          <Button
            onClick={() => router.push('/pending')}
            className="bg-slate-900 hover:bg-slate-800"
          >
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // Render current step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <OrgNameStep
            value={orgName}
            onChange={setOrgName}
            codePrefix={codePrefix}
            onCodePrefixChange={setCodePrefix}
            codePrefixEdited={codePrefixEdited}
            onCodePrefixEdited={setCodePrefixEdited}
            website={website}
            onWebsiteChange={setWebsite}
          />
        );
      case 2:
        return (
          <CurrencyStep
            primaryCurrency={primaryCurrency}
            additionalCurrencies={additionalCurrencies}
            onPrimaryChange={setPrimaryCurrency}
            onAdditionalChange={setAdditionalCurrencies}
          />
        );
      case 3:
        return (
          <LogoStep
            preview={logoPreview}
            onFileSelect={setLogoFile}
            onPreviewChange={setLogoPreview}
            error={error}
            onError={setError}
          />
        );
      case 4:
        return (
          <ColorStep
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            onPrimaryChange={setPrimaryColor}
            onSecondaryChange={setSecondaryColor}
            orgName={orgName}
            logoPreview={logoPreview}
          />
        );
      case 5:
        return (
          <ModuleStep selected={selectedModules} onChange={setSelectedModules} />
        );
      case 6:
        return (
          <WelcomeStep
            orgName={orgName}
            selectedModules={selectedModules}
            inviteCount={0}
            primaryCurrency={primaryCurrency}
            additionalCurrencies={additionalCurrencies}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="py-6 px-4 border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            {logoPreview ? (
              <>
                <img src={logoPreview} alt={orgName || 'Logo'} className="h-10 w-10 object-contain" />
                {orgName && <span className="text-xl font-semibold text-slate-900">{orgName}</span>}
              </>
            ) : orgName ? (
              <span className="text-2xl font-bold text-slate-900">{orgName}</span>
            ) : (
              <span className="text-2xl font-bold text-slate-900">Durj</span>
            )}
          </div>
          {currentStep < TOTAL_STEPS && (
            <button
              onClick={handleSkipAll}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Skip setup
            </button>
          )}
        </div>
      </header>

      {/* Progress */}
      {currentStep < TOTAL_STEPS && (
        <WizardProgress
          currentStep={currentStep}
          totalSteps={TOTAL_STEPS - 1}
          steps={STEPS.slice(0, -1)}
        />
      )}

      {/* Main Content */}
      <main className="px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {error && currentStep !== 3 && (
            <Alert variant="error" className="mb-6 max-w-lg mx-auto">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <StepTransition step={currentStep} direction={direction}>
            {renderStep()}
          </StepTransition>

          {/* Navigation */}
          {currentStep < TOTAL_STEPS && (
            <div className={`flex justify-between mt-8 mx-auto ${currentStep === 5 ? 'max-w-3xl' : 'max-w-lg'}`}>
              {currentStep > 1 ? (
                <Button
                  variant="ghost"
                  onClick={goBack}
                  className="text-slate-600 hover:text-slate-900"
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
              ) : (
                <div />
              )}

              <div className="flex gap-3">
                {isSkippable() && (
                  <Button
                    variant="ghost"
                    onClick={goNext}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    Skip for now
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed() || isLoading}
                  className="bg-slate-900 hover:bg-slate-800 rounded-xl px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : currentStep === 5 ? (
                    <>
                      Finish Setup
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
