'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, Building2 } from 'lucide-react';
import { createSupplierSchema, type CreateSupplierRequest } from '@/features/suppliers';
import { useSubdomain } from '@/hooks/use-subdomain';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// Country list (commonly used countries in the region)
const COUNTRIES = [
  'Qatar',
  'Saudi Arabia',
  'United Arab Emirates',
  'Kuwait',
  'Bahrain',
  'Oman',
  'Jordan',
  'Egypt',
  'Lebanon',
  'India',
  'Pakistan',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'China',
  'Japan',
].sort();

// Country codes
const COUNTRY_CODES = [
  { code: '+974', country: 'Qatar', flag: '🇶🇦' },
  { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦' },
  { code: '+971', country: 'UAE', flag: '🇦🇪' },
  { code: '+965', country: 'Kuwait', flag: '🇰🇼' },
  { code: '+973', country: 'Bahrain', flag: '🇧🇭' },
  { code: '+968', country: 'Oman', flag: '🇴🇲' },
  { code: '+962', country: 'Jordan', flag: '🇯🇴' },
  { code: '+20', country: 'Egypt', flag: '🇪🇬' },
  { code: '+961', country: 'Lebanon', flag: '🇱🇧' },
  { code: '+91', country: 'India', flag: '🇮🇳' },
  { code: '+92', country: 'Pakistan', flag: '🇵🇰' },
  { code: '+1', country: 'USA/Canada', flag: '🇺🇸' },
  { code: '+44', country: 'UK', flag: '🇬🇧' },
  { code: '+49', country: 'Germany', flag: '🇩🇪' },
  { code: '+33', country: 'France', flag: '🇫🇷' },
  { code: '+86', country: 'China', flag: '🇨🇳' },
  { code: '+81', country: 'Japan', flag: '🇯🇵' },
];

export default function SupplierRegistrationPage() {
  const { subdomain, isLoading: subdomainLoading } = useSubdomain();
  const { branding, isLoading: brandingLoading } = useTenantBranding(subdomain);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const isLoading = subdomainLoading || brandingLoading;
  const primaryColor = branding?.primaryColor || '#0f172a';
  const secondaryColor = branding?.secondaryColor;
  const orgName = branding?.organizationName || 'Our Organization';
  const logoUrl = branding?.logoUrl;

  // Background gradient for header
  const isDefaultColor = primaryColor === '#0f172a' && !secondaryColor;
  const headerBackground = isDefaultColor
    ? 'linear-gradient(to right, #0f172a, #1e293b)'
    : secondaryColor
      ? `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`
      : primaryColor;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateSupplierRequest>({
    resolver: zodResolver(createSupplierSchema) as any,
    mode: 'onChange',
    defaultValues: {
      name: '',
      category: '',
      address: '',
      city: '',
      country: 'Qatar',
      website: '',
      primaryContactName: '',
      primaryContactTitle: '',
      primaryContactEmail: '',
      primaryContactMobile: '',
      primaryContactMobileCode: '+974',
      secondaryContactName: '',
      secondaryContactTitle: '',
      secondaryContactEmail: '',
      secondaryContactMobile: '',
      secondaryContactMobileCode: '+974',
      paymentTerms: '',
      additionalInfo: '',
    },
  });

  const categoryValue = watch('category');
  const countryValue = watch('country');
  const primaryContactMobileCodeValue = watch('primaryContactMobileCode');
  const secondaryContactMobileCodeValue = watch('secondaryContactMobileCode');

  // Fetch category suggestions
  useEffect(() => {
    if (categoryValue && categoryValue.length > 0) {
      fetchCategories(categoryValue);
    } else {
      setCategorySuggestions([]);
    }
  }, [categoryValue]);

  const fetchCategories = async (query: string) => {
    try {
      const response = await fetch(`/api/suppliers/categories?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setCategorySuggestions(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const onSubmit = async (data: CreateSupplierRequest) => {
    setError(null);

    try {
      const response = await fetch('/api/suppliers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorMessage = responseData.details
          ? `${responseData.error}: ${responseData.details.map((d: any) => d.message).join(', ')}`
          : responseData.error;
        throw new Error(errorMessage || 'Failed to register supplier');
      }

      setSuccess(true);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register supplier');
    }
  };

  // Branded header component
  const BrandedHeader = () => (
    <header
      className="w-full py-6 px-6 md:px-12"
      style={{ background: headerBackground }}
    >
      <div className="max-w-4xl mx-auto flex items-center gap-4">
        {isLoading ? (
          <div className="h-10 w-32 bg-white/20 animate-pulse rounded" />
        ) : logoUrl ? (
          <img
            src={branding?.logoUrlInverse || logoUrl}
            alt={orgName}
            className="h-10 w-auto object-contain"
            style={!branding?.logoUrlInverse ? { filter: 'brightness(0) invert(1)' } : undefined}
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-white" />
            <span className="text-xl font-bold text-white">{orgName}</span>
          </div>
        )}
      </div>
    </header>
  );

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <BrandedHeader />

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full">
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <CheckCircle2 className="h-16 w-16 text-green-600" />
                  <h2 className="text-2xl font-bold text-green-900">
                    Registration Submitted!
                  </h2>
                  <p className="text-green-800">
                    Thank you for registering as a supplier with {orgName}.
                  </p>

                  {/* What happens next */}
                  <div className="text-left bg-white/50 rounded-lg p-4 w-full">
                    <p className="font-medium text-green-900 mb-2">What happens next:</p>
                    <ol className="list-decimal list-inside text-green-800 text-sm space-y-1">
                      <li>Our team will review your submission</li>
                      <li>You&apos;ll receive an email with the outcome</li>
                      <li>If approved, you&apos;ll be added to our vendor database</li>
                    </ol>
                  </div>

                  <Button
                    onClick={() => setSuccess(false)}
                    style={{ backgroundColor: primaryColor }}
                    className="mt-4 hover:opacity-90"
                  >
                    Register Another Supplier
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Branded Header */}
      <BrandedHeader />

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 md:p-12 max-w-4xl mx-auto">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Supplier Registration</h1>
            <p className="text-gray-600">
              Register your company as a supplier for {orgName}. All submissions are subject to approval.
            </p>
          </div>

          {error && (
            <Alert variant="error" className="mb-6">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit(onSubmit as any)} className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic information about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Company Name *</Label>
                    <Input
                      id="name"
                      {...register('name')}
                      placeholder="ABC Corporation"
                    />
                    {errors.name && (
                      <p className="text-sm text-red-600">{errors.name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="category">Category *</Label>
                    <Input
                      id="category"
                      {...register('category')}
                      onFocus={() => setShowCategorySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      placeholder="e.g., IT Equipment, Office Supplies"
                      autoComplete="off"
                    />
                    <p className="text-xs text-gray-500">
                      e.g., IT Equipment, Office Supplies, Construction, Catering, Consulting
                    </p>
                    {errors.category && (
                      <p className="text-sm text-red-600">{errors.category.message}</p>
                    )}
                    {showCategorySuggestions && categorySuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {categorySuggestions.map((category, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setValue('category', category);
                              setShowCategorySuggestions(false);
                            }}
                          >
                            {category}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...register('address')}
                    placeholder="Street address"
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600">{errors.address.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder="City"
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600">{errors.city.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="country">Country</Label>
                    <Select
                      value={countryValue || ''}
                      onValueChange={(value) => setValue('country', value)}
                    >
                      <SelectTrigger id="country">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.country && (
                      <p className="text-sm text-red-600">{errors.country.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="text"
                      {...register('website')}
                      placeholder="example.com or example.qa"
                    />
                    {errors.website && (
                      <p className="text-sm text-red-600">{errors.website.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="establishmentYear">Establishment Year</Label>
                    <Input
                      id="establishmentYear"
                      type="number"
                      min="1800"
                      max={new Date().getFullYear()}
                      {...register('establishmentYear', {
                        setValueAs: (v) => v === '' ? undefined : parseInt(v, 10)
                      })}
                      placeholder="2020"
                    />
                    {errors.establishmentYear && (
                      <p className="text-sm text-red-600">{errors.establishmentYear.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Primary Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Contact</CardTitle>
                <CardDescription>
                  Main point of contact for business inquiries. Either email or phone is required.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactName">Contact Name *</Label>
                    <Input
                      id="primaryContactName"
                      {...register('primaryContactName')}
                      placeholder="John Doe"
                    />
                    {errors.primaryContactName && (
                      <p className="text-sm text-red-600">{errors.primaryContactName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactTitle">Title/Position</Label>
                    <Input
                      id="primaryContactTitle"
                      {...register('primaryContactTitle')}
                      placeholder="Sales Manager"
                    />
                    {errors.primaryContactTitle && (
                      <p className="text-sm text-red-600">{errors.primaryContactTitle.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactEmail">Email</Label>
                    <Input
                      id="primaryContactEmail"
                      type="email"
                      {...register('primaryContactEmail')}
                      placeholder="contact@example.com"
                    />
                    {errors.primaryContactEmail && (
                      <p className="text-sm text-red-600">{errors.primaryContactEmail.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactMobile">Mobile</Label>
                    <div className="flex gap-2">
                      <Select
                        value={primaryContactMobileCodeValue || ''}
                        onValueChange={(value) => setValue('primaryContactMobileCode', value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((item) => (
                            <SelectItem key={item.code} value={item.code}>
                              {item.flag} {item.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="primaryContactMobile"
                        type="tel"
                        {...register('primaryContactMobile')}
                        placeholder="1234 5678"
                        className="flex-1"
                      />
                    </div>
                    {errors.primaryContactMobile && (
                      <p className="text-sm text-red-600">{errors.primaryContactMobile.message}</p>
                    )}
                    {errors.primaryContactMobileCode && (
                      <p className="text-sm text-red-600">{errors.primaryContactMobileCode.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secondary Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Secondary Contact (Optional)</CardTitle>
                <CardDescription>
                  Alternative contact person
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactName">Contact Name</Label>
                    <Input
                      id="secondaryContactName"
                      {...register('secondaryContactName')}
                      placeholder="Jane Smith"
                    />
                    {errors.secondaryContactName && (
                      <p className="text-sm text-red-600">{errors.secondaryContactName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactTitle">Title/Position</Label>
                    <Input
                      id="secondaryContactTitle"
                      {...register('secondaryContactTitle')}
                      placeholder="Account Manager"
                    />
                    {errors.secondaryContactTitle && (
                      <p className="text-sm text-red-600">{errors.secondaryContactTitle.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactEmail">Email</Label>
                    <Input
                      id="secondaryContactEmail"
                      type="email"
                      {...register('secondaryContactEmail')}
                      placeholder="secondary@example.com"
                    />
                    {errors.secondaryContactEmail && (
                      <p className="text-sm text-red-600">{errors.secondaryContactEmail.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactMobile">Mobile</Label>
                    <div className="flex gap-2">
                      <Select
                        value={secondaryContactMobileCodeValue || ''}
                        onValueChange={(value) => setValue('secondaryContactMobileCode', value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COUNTRY_CODES.map((item) => (
                            <SelectItem key={item.code} value={item.code}>
                              {item.flag} {item.code}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        id="secondaryContactMobile"
                        type="tel"
                        {...register('secondaryContactMobile')}
                        placeholder="1234 5678"
                        className="flex-1"
                      />
                    </div>
                    {errors.secondaryContactMobile && (
                      <p className="text-sm text-red-600">{errors.secondaryContactMobile.message}</p>
                    )}
                    {errors.secondaryContactMobileCode && (
                      <p className="text-sm text-red-600">{errors.secondaryContactMobileCode.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Terms */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Terms</CardTitle>
                <CardDescription>
                  Your standard payment terms and conditions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    {...register('paymentTerms')}
                    placeholder="Net 30, Net 60, etc."
                  />
                  {errors.paymentTerms && (
                    <p className="text-sm text-red-600">{errors.paymentTerms.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
                <CardDescription>
                  Share any additional details about your company (portfolio, certifications, specializations, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    {...register('additionalInfo')}
                    placeholder="e.g., Portfolio links, certifications (ISO 9001, etc.), areas of specialization, major clients, awards, or any other relevant information..."
                    rows={6}
                    className="resize-y"
                  />
                  {errors.additionalInfo && (
                    <p className="text-sm text-red-600">{errors.additionalInfo.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end gap-4 pb-8">
              <Button
                type="submit"
                disabled={isSubmitting}
                size="lg"
                style={{ backgroundColor: primaryColor }}
                className="hover:opacity-90"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Registration'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
