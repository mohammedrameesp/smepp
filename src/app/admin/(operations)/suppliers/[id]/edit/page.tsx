'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm, Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { z } from 'zod';

// Country list
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

const updateSupplierSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  category: z.string().min(1, 'Category is required'),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  website: z.string().optional(),
  establishmentYear: z.number().optional().nullable(),
  primaryContactName: z.string().optional(),
  primaryContactTitle: z.string().optional(),
  primaryContactEmail: z.string().email('Invalid email').or(z.literal('')).optional(),
  primaryContactMobile: z.string().optional(),
  primaryContactMobileCode: z.string().default('+974'),
  secondaryContactName: z.string().optional(),
  secondaryContactTitle: z.string().optional(),
  secondaryContactEmail: z.string().email('Invalid email').or(z.literal('')).optional(),
  secondaryContactMobile: z.string().optional(),
  secondaryContactMobileCode: z.string().default('+974'),
  paymentTerms: z.string().optional(),
  additionalInfo: z.string().optional(),
});

type UpdateSupplierRequest = z.infer<typeof updateSupplierSchema>;

export default function EditSupplierPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UpdateSupplierRequest>({
    resolver: zodResolver(updateSupplierSchema) as Resolver<UpdateSupplierRequest>,
    mode: 'onChange',
  });

  const categoryValue = watch('category');
  const countryValue = watch('country');
  const primaryContactMobileCodeValue = watch('primaryContactMobileCode');
  const secondaryContactMobileCodeValue = watch('secondaryContactMobileCode');

  // Fetch supplier data
  useEffect(() => {
    const fetchSupplier = async () => {
      try {
        const response = await fetch(`/api/suppliers/${params.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch supplier');
        }
        const response_data = await response.json();
        const data = response_data.supplier;

        // Extract mobile code from mobile number if it exists
        const extractMobileData = (mobile: string | null) => {
          if (!mobile) return { code: '+974', number: '' };
          const match = mobile.match(/^(\+\d+)\s*(.*)$/);
          if (match) {
            return { code: match[1], number: match[2] };
          }
          return { code: '+974', number: mobile };
        };

        const primaryMobile = extractMobileData(data.primaryContactMobile);
        const secondaryMobile = extractMobileData(data.secondaryContactMobile);

        reset({
          name: data.name || '',
          category: data.category || '',
          address: data.address || '',
          city: data.city || '',
          country: data.country || 'Qatar',
          website: data.website || '',
          establishmentYear: data.establishmentYear || undefined,
          primaryContactName: data.primaryContactName || '',
          primaryContactTitle: data.primaryContactTitle || '',
          primaryContactEmail: data.primaryContactEmail || '',
          primaryContactMobile: primaryMobile.number,
          primaryContactMobileCode: primaryMobile.code,
          secondaryContactName: data.secondaryContactName || '',
          secondaryContactTitle: data.secondaryContactTitle || '',
          secondaryContactEmail: data.secondaryContactEmail || '',
          secondaryContactMobile: secondaryMobile.number,
          secondaryContactMobileCode: secondaryMobile.code,
          paymentTerms: data.paymentTerms || '',
          additionalInfo: data.additionalInfo || '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load supplier');
      } finally {
        setIsLoading(false);
      }
    };

    if (params.id) {
      fetchSupplier();
    }
  }, [params.id, reset]);

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

  const onSubmit = async (data: UpdateSupplierRequest) => {
    setError(null);

    try {
      // Combine mobile code and number
      const payload = {
        ...data,
        primaryContactMobile: data.primaryContactMobile
          ? `${data.primaryContactMobileCode} ${data.primaryContactMobile}`
          : null,
        secondaryContactMobile: data.secondaryContactMobile
          ? `${data.secondaryContactMobileCode} ${data.secondaryContactMobile}`
          : null,
      };

      const response = await fetch(`/api/suppliers/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update supplier');
      }

      toast.success('Supplier updated successfully');
      router.push(`/admin/suppliers/${params.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update supplier');
      toast.error('Failed to update supplier', { duration: 10000 });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Supplier"
        subtitle="Update supplier information"
        breadcrumbs={[
          { label: 'Suppliers', href: '/admin/suppliers' },
          { label: 'Supplier', href: `/admin/suppliers/${params.id}` },
          { label: 'Edit' },
        ]}
      />

      <PageContent className="max-w-4xl">
        {error && (
          <Alert variant="error" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Information */}
            <Card>
              <CardHeader>
                <CardTitle>Company Information</CardTitle>
                <CardDescription>
                  Basic information about the company
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
                    <Label htmlFor="category">Material Category *</Label>
                    <Input
                      id="category"
                      {...register('category')}
                      onFocus={() => setShowCategorySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      placeholder="Electronics, Hardware, Software, etc."
                      autoComplete="off"
                    />
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
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      {...register('city')}
                      placeholder="City"
                    />
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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      type="text"
                      {...register('website')}
                      placeholder="https://example.com"
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
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Primary Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Primary Contact</CardTitle>
                <CardDescription>
                  Main point of contact for business inquiries
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactName">Contact Name</Label>
                    <Input
                      id="primaryContactName"
                      {...register('primaryContactName')}
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="primaryContactTitle">Title/Position</Label>
                    <Input
                      id="primaryContactTitle"
                      {...register('primaryContactTitle')}
                      placeholder="Sales Manager"
                    />
                  </div>
                </div>

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
                  <Label htmlFor="primaryContactMobile">Mobile Number</Label>
                  <div className="flex gap-2">
                    <Select
                      value={primaryContactMobileCodeValue || '+974'}
                      onValueChange={(value) => setValue('primaryContactMobileCode', value, { shouldValidate: true })}
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
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setValue('primaryContactMobile', value);
                      }}
                      placeholder="55551234"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Secondary Contact */}
            <Card>
              <CardHeader>
                <CardTitle>Secondary Contact (Optional)</CardTitle>
                <CardDescription>
                  Alternative point of contact
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="secondaryContactTitle">Title/Position</Label>
                    <Input
                      id="secondaryContactTitle"
                      {...register('secondaryContactTitle')}
                      placeholder="Account Manager"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryContactEmail">Email</Label>
                  <Input
                    id="secondaryContactEmail"
                    type="email"
                    {...register('secondaryContactEmail')}
                    placeholder="contact2@example.com"
                  />
                  {errors.secondaryContactEmail && (
                    <p className="text-sm text-red-600">{errors.secondaryContactEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="secondaryContactMobile">Mobile Number</Label>
                  <div className="flex gap-2">
                    <Select
                      value={secondaryContactMobileCodeValue || '+974'}
                      onValueChange={(value) => setValue('secondaryContactMobileCode', value, { shouldValidate: true })}
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
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setValue('secondaryContactMobile', value);
                      }}
                      placeholder="55555678"
                      className="flex-1"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Additional Information */}
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    {...register('paymentTerms')}
                    placeholder="Net 30, Net 60, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="additionalInfo">Additional Information</Label>
                  <Textarea
                    id="additionalInfo"
                    {...register('additionalInfo')}
                    placeholder="Any other relevant information..."
                    rows={4}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4 justify-end">
              <Link href={`/admin/suppliers/${params.id}`}>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
