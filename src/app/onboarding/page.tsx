'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Building2, ArrowRight, Check, Globe, DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const TIMEZONES = [
  { value: 'UTC', label: 'UTC' },
  { value: 'America/New_York', label: 'Eastern Time (US)' },
  { value: 'America/Chicago', label: 'Central Time (US)' },
  { value: 'America/Denver', label: 'Mountain Time (US)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Asia/Dubai', label: 'Dubai' },
  { value: 'Asia/Qatar', label: 'Qatar' },
  { value: 'Asia/Singapore', label: 'Singapore' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Australia/Sydney', label: 'Sydney' },
];

const CURRENCIES = [
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'QAR', label: 'QAR - Qatari Riyal' },
  { value: 'AED', label: 'AED - UAE Dirham' },
  { value: 'SAR', label: 'SAR - Saudi Riyal' },
  { value: 'INR', label: 'INR - Indian Rupee' },
  { value: 'SGD', label: 'SGD - Singapore Dollar' },
  { value: 'AUD', label: 'AUD - Australian Dollar' },
  { value: 'CAD', label: 'CAD - Canadian Dollar' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    organizationName: '',
    timezone: 'UTC',
    currency: 'USD',
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Check if user already has an organization
  useEffect(() => {
    if (session?.user?.organizationId) {
      router.push('/admin');
    }
  }, [session, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    setError(null);
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.organizationName,
          timezone: formData.timezone,
          currency: formData.currency,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create organization');
      }

      // Update session to include new organization
      await update();

      // Move to success step
      setStep(3);

      // Redirect after a short delay
      setTimeout(() => {
        router.push('/admin');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-xl bg-blue-600 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === 3 ? 'All set!' : 'Set up your workspace'}
          </CardTitle>
          <CardDescription>
            {step === 1 && "Let's create your organization"}
            {step === 2 && 'Configure your preferences'}
            {step === 3 && 'Your workspace is ready'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress indicator */}
          {step < 3 && (
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
            </div>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step 1: Organization Name */}
          {step === 1 && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (formData.organizationName.length >= 2) {
                  setStep(2);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="organizationName">Organization Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    placeholder="Acme Inc."
                    value={formData.organizationName}
                    onChange={handleChange}
                    className="pl-10"
                    required
                    minLength={2}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  This is your company or team name
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={formData.organizationName.length < 2}
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timezone">Timezone</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => handleSelectChange('timezone', value)}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select timezone" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz.value} value={tz.value}>
                          {tz.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground z-10" />
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => handleSelectChange('currency', value)}
                  >
                    <SelectTrigger className="pl-10">
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={isLoading}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      Create Workspace
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Welcome to {formData.organizationName}!
              </h3>
              <p className="text-muted-foreground mb-4">
                Redirecting you to your dashboard...
              </p>
              <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
