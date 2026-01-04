'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { toInputDateString } from '@/lib/date-format';
import { createAssetSchema, type CreateAssetRequest } from '@/lib/validations/assets';
import { AssetStatus } from '@prisma/client';
// Default exchange rates to QAR (fallback if not set in settings)
const DEFAULT_RATES: Record<string, number> = {
  USD: 3.64, EUR: 3.96, GBP: 4.60, SAR: 0.97, AED: 0.99, KWD: 11.85,
  BHD: 9.66, OMR: 9.46, INR: 0.044, PKR: 0.013, PHP: 0.065,
};
import { getQatarEndOfDay } from '@/lib/qatar-timezone';

interface DepreciationCategory {
  id: string;
  name: string;
  code: string;
  annualRate: number;
  usefulLifeYears: number;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [assetTypeSuggestions, setAssetTypeSuggestions] = useState<string[]>([]);
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [depreciationCategories, setDepreciationCategories] = useState<DepreciationCategory[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['QAR', 'USD']);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES);
  const [suggestedTag, setSuggestedTag] = useState<string>('');
  const [isTagManuallyEdited, setIsTagManuallyEdited] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues,
  } = useForm({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      assetTag: '',
      type: '',
      category: '',
      brand: '',
      model: '',
      serial: '',
      configuration: '',
      purchaseDate: '',
      warrantyExpiry: '',
      supplier: '',
      invoiceNumber: '',
      price: null,
      priceCurrency: 'QAR',
      priceQAR: null,
      status: AssetStatus.IN_USE,
      assignedMemberId: '',
      assignmentDate: '',
      notes: '',
      location: '',
      isShared: false,
      depreciationCategoryId: '',
    },
    mode: 'onChange',
  });

  // Watch critical fields for side effects
  const watchedType = watch('type');
  const watchedCategory = watch('category');
  const watchedLocation = watch('location');
  const watchedPrice = watch('price');
  const watchedCurrency = watch('priceCurrency');
  const watchedPurchaseDate = watch('purchaseDate');
  const watchedWarrantyExpiry = watch('warrantyExpiry');
  const watchedStatus = watch('status');
  const watchedAssignedUserId = watch('assignedMemberId');
  const watchedDepreciationCategoryId = watch('depreciationCategoryId');
  const watchedIsShared = watch('isShared');

  // Fetch users and depreciation categories on mount
  useEffect(() => {
    fetchUsers();
    fetchDepreciationCategories();
  }, []);

  // Fetch org settings to get available currencies and exchange rates
  useEffect(() => {
    async function fetchOrgSettings() {
      try {
        const response = await fetch('/api/organizations/settings');
        if (response.ok) {
          const data = await response.json();
          const primary = data.settings?.currency || 'QAR';
          const additional: string[] = data.settings?.additionalCurrencies || [];

          // Build unique currency list: primary first, then additional
          const currencies = [primary, ...additional.filter((c: string) => c !== primary)];
          setAvailableCurrencies(currencies.length > 0 ? currencies : ['QAR', 'USD']);

          // Set primary as default
          setValue('priceCurrency', primary);

          // Fetch exchange rates for all currencies
          const rates: Record<string, number> = { ...DEFAULT_RATES };
          const allCurrencies = currencies.filter((c: string) => c !== 'QAR');
          await Promise.all(
            allCurrencies.map(async (currency: string) => {
              try {
                const rateRes = await fetch(`/api/settings/exchange-rate?currency=${currency}`);
                if (rateRes.ok) {
                  const rateData = await rateRes.json();
                  if (rateData.rate) rates[currency] = rateData.rate;
                }
              } catch {
                // Use default rate
              }
            })
          );
          setExchangeRates(rates);
        }
      } catch (error) {
        console.error('Error fetching org settings:', error);
      }
    }
    fetchOrgSettings();
  }, [setValue]);

  // Fetch asset type suggestions
  useEffect(() => {
    if (watchedType && watchedType.length > 0) {
      fetchAssetTypes(watchedType);
    } else {
      setAssetTypeSuggestions([]);
    }
  }, [watchedType]);

  // Fetch suggested asset tag when type changes
  useEffect(() => {
    async function fetchSuggestedTag() {
      if (watchedType && watchedType.length >= 2 && !isTagManuallyEdited) {
        try {
          const response = await fetch(`/api/assets/next-tag?type=${encodeURIComponent(watchedType)}`);
          if (response.ok) {
            const data = await response.json();
            setSuggestedTag(data.tag);
            setValue('assetTag', data.tag);
          }
        } catch (error) {
          console.error('Error fetching suggested tag:', error);
        }
      }
    }

    // Debounce the fetch to avoid too many API calls
    const timeoutId = setTimeout(fetchSuggestedTag, 500);
    return () => clearTimeout(timeoutId);
  }, [watchedType, isTagManuallyEdited, setValue]);

  // Fetch category suggestions
  useEffect(() => {
    if (watchedCategory && watchedCategory.length > 0) {
      fetchCategories(watchedCategory);
    } else {
      setCategorySuggestions([]);
    }
  }, [watchedCategory]);

  // Fetch location suggestions
  useEffect(() => {
    if (watchedLocation && watchedLocation.length > 0) {
      fetchLocations(watchedLocation);
    } else {
      setLocationSuggestions([]);
    }
  }, [watchedLocation]);

  // Auto-calculate currency conversion to QAR
  useEffect(() => {
    if (watchedPrice && watchedCurrency) {
      if (watchedCurrency === 'QAR') {
        // QAR is base currency, no conversion needed
        setValue('priceQAR', null);
      } else {
        // Convert any other currency to QAR using exchange rate
        const rate = exchangeRates[watchedCurrency] || 1;
        const qarValue = watchedPrice * rate;
        setValue('priceQAR', qarValue);
      }
    }
  }, [watchedPrice, watchedCurrency, exchangeRates, setValue]);

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchAssetTypes = async (query: string) => {
    try {
      const response = await fetch(`/api/assets/types?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setAssetTypeSuggestions(data.types || []);
      }
    } catch (error) {
      console.error('Error fetching asset types:', error);
    }
  };

  const fetchCategories = async (query: string) => {
    try {
      const response = await fetch(`/api/assets/categories?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setCategorySuggestions(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchLocations = async (query: string) => {
    try {
      const response = await fetch(`/api/assets/locations?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setLocationSuggestions(data.locations || []);
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchDepreciationCategories = async () => {
    try {
      const response = await fetch('/api/depreciation/categories');
      if (response.ok) {
        const data = await response.json();
        setDepreciationCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching depreciation categories:', error);
    }
  };

  // Track previous purchase date to auto-fill warranty only when purchase date changes
  const prevPurchaseDateRef = useRef<string | null>(null);

  // Auto-fill warranty expiry only when purchase date is first set or changes
  useEffect(() => {
    // Only auto-fill if purchase date changed (not when warranty is cleared)
    if (watchedPurchaseDate && watchedPurchaseDate !== prevPurchaseDateRef.current) {
      // Get current warranty value directly from form
      const currentWarranty = getValues('warrantyExpiry');
      // Only auto-fill if warranty is empty
      if (!currentWarranty) {
        const purchaseDate = new Date(watchedPurchaseDate);
        const warrantyDate = new Date(purchaseDate);
        warrantyDate.setFullYear(warrantyDate.getFullYear() + 1);
        setValue('warrantyExpiry', toInputDateString(warrantyDate));
      }
    }
    prevPurchaseDateRef.current = watchedPurchaseDate || null;
  }, [watchedPurchaseDate, setValue, getValues]);

  // Clear assignment and isShared when status is not IN_USE
  useEffect(() => {
    if (watchedStatus !== AssetStatus.IN_USE) {
      if (watchedAssignedUserId) {
        setValue('assignedMemberId', '');
        setValue('assignmentDate', '');
      }
      if (watchedIsShared) {
        setValue('isShared', false);
      }
    }
  }, [watchedStatus, watchedAssignedUserId, watchedIsShared, setValue]);

  const onSubmit = async (data: CreateAssetRequest) => {
    try {
      // Calculate price in QAR based on currency
      const price = data.price;
      let priceInQAR = null;

      if (price) {
        if (data.priceCurrency === 'QAR' || !data.priceCurrency) {
          priceInQAR = price;
        } else {
          // Convert any other currency to QAR using exchange rate
          const rate = exchangeRates[data.priceCurrency as string] || 1;
          priceInQAR = price * rate;
        }
      }

      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          price: price,
          priceQAR: priceInQAR,
          assetTag: data.assetTag || null,
          // Clear assignment for shared assets
          assignedMemberId: data.isShared ? null : data.assignedMemberId,
          assignmentDate: data.isShared ? null : (data.assignedMemberId ? data.assignmentDate : null),
        }),
      });

      if (response.ok) {
        router.push('/admin/assets');
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create asset: ${errorData.error || 'Unknown error'}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Error creating asset:', error);
      toast.error('Error creating asset. Please try again.', { duration: 10000 });
    }
  };

  const handleUserAssignment = (userId: string) => {
    if (userId) {
      // When assigning to a user, set status to IN_USE
      setValue('assignedMemberId', userId);
      // Don't auto-set assignment date - let user provide it
      setValue('status', AssetStatus.IN_USE);
    } else {
      // When unassigning, clear both user and assignment date, set status to SPARE
      setValue('assignedMemberId', '');
      setValue('assignmentDate', '');
      setValue('status', AssetStatus.SPARE);
    }
  };

  return (
    <>
      <PageHeader
        title="Add New Asset"
        subtitle="Create a new digital asset or hardware item"
        breadcrumbs={[
          { label: 'Assets', href: '/admin/assets' },
          { label: 'New Asset' },
        ]}
      />

      <PageContent className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>
              Enter the details for the new asset
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">1. Basic Information</h3>
                <p className="text-xs text-gray-600">What is this asset?</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 relative">
                    <Label htmlFor="type">Asset Type *</Label>
                    <Input
                      id="type"
                      {...register('type')}
                      onFocus={() => setShowTypeSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowTypeSuggestions(false), 200)}
                      placeholder="Laptop, Mouse, Monitor, etc."
                      autoComplete="off"
                      className={errors.type ? 'border-red-500' : ''}
                    />
                    {errors.type && (
                      <p className="text-sm text-red-500">{errors.type.message}</p>
                    )}
                    {showTypeSuggestions && assetTypeSuggestions.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                        {assetTypeSuggestions.map((type, index) => (
                          <div
                            key={index}
                            className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                            onClick={() => {
                              setValue('type', type);
                              setShowTypeSuggestions(false);
                            }}
                          >
                            {type}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2 relative">
                    <Label htmlFor="category">Category / Department</Label>
                    <Input
                      id="category"
                      {...register('category')}
                      onFocus={() => setShowCategorySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      placeholder="IT, Marketing, Engineering, etc."
                      autoComplete="off"
                    />
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

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="brand">Brand / Manufacturer</Label>
                    <Input
                      id="brand"
                      {...register('brand')}
                      placeholder="Apple, Dell, HP, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model / Version *</Label>
                    <Input
                      id="model"
                      {...register('model')}
                      placeholder="MacBook Pro 16, Dell XPS 15, etc."
                      className={errors.model ? 'border-red-500' : ''}
                    />
                    {errors.model && (
                      <p className="text-sm text-red-500">{errors.model.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    {...register('serial')}
                    placeholder="Manufacturer's serial number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="configuration">Configuration / Specs</Label>
                  <Input
                    id="configuration"
                    {...register('configuration')}
                    placeholder="16GB RAM, 512GB SSD, Intel i7, etc."
                  />
                </div>
              </div>

              {/* Asset Identification Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">2. Asset Identification</h3>
                <p className="text-xs text-gray-600">Unique identifier for this asset</p>

                <div className="space-y-2">
                  <Label htmlFor="assetTag">Asset ID / Tag</Label>
                  <Input
                    id="assetTag"
                    {...register('assetTag')}
                    placeholder={!watchedType ? 'Enter asset type first...' : ''}
                    onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                      register('assetTag').onChange(e);
                      // Mark as manually edited if user changes from suggested
                      if (e.target.value !== suggestedTag) {
                        setIsTagManuallyEdited(true);
                      }
                    }}
                    style={{ textTransform: 'uppercase' }}
                  />
                  <p className="text-xs text-muted-foreground">
                    {suggestedTag && !isTagManuallyEdited
                      ? 'Auto-generated tag. Edit if needed.'
                      : isTagManuallyEdited
                      ? 'Using custom tag.'
                      : 'Enter asset type above to auto-generate tag.'}
                  </p>
                </div>
              </div>

              {/* Financial Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">3. Financial Information</h3>
                <p className="text-xs text-gray-600">Procurement and cost details</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <DatePicker
                      id="purchaseDate"
                      value={watchedPurchaseDate || ''}
                      onChange={(value) => setValue('purchaseDate', value)}
                      maxDate={getQatarEndOfDay()} // Only allow today and past dates (Qatar timezone)
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Cost / Value</Label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          {...register('price', { valueAsNumber: true })}
                          placeholder="0.00"
                        />
                      </div>
                      <Select
                        value={watchedCurrency || availableCurrencies[0] || 'QAR'}
                        onValueChange={(value) => setValue('priceCurrency', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCurrencies.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {currency}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {watchedPrice && watchedCurrency && (
                      <p className="text-xs text-muted-foreground">
                        {watchedCurrency === 'QAR' ? (
                          // QAR selected: show USD equivalent
                          <>≈ USD {(watchedPrice / (exchangeRates['USD'] || 3.64)).toFixed(2)}</>
                        ) : (
                          // Any other currency: show QAR equivalent
                          <>≈ QAR {(watchedPrice * (exchangeRates[watchedCurrency as string] || 1)).toFixed(2)}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier / Vendor</Label>
                    <Input
                      id="supplier"
                      {...register('supplier')}
                      placeholder="Where purchased from"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice / PO Number</Label>
                    <Input
                      id="invoiceNumber"
                      {...register('invoiceNumber')}
                      placeholder="Invoice or purchase order reference"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="warrantyExpiry">
                    Warranty Expiry
                    <span className="text-gray-500 text-sm ml-2">(Optional)</span>
                  </Label>
                  <DatePicker
                    id="warrantyExpiry"
                    value={watchedWarrantyExpiry || ''}
                    onChange={(value) => setValue('warrantyExpiry', value)}
                    required={false}
                    placeholder="No warranty or unknown"
                    minDate={watchedPurchaseDate ? new Date(watchedPurchaseDate) : undefined}
                  />
                  <p className="text-xs text-gray-500">
                    {watchedPurchaseDate
                      ? 'Auto-filled to 1 year from purchase date. Must be on or after purchase date.'
                      : 'Enter a purchase date first to set warranty expiry.'
                    } Click × to clear for items without warranty.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="depreciationCategoryId">
                    Depreciation Category
                    <span className="text-gray-500 text-sm ml-2">(Optional)</span>
                  </Label>
                  <Select
                    value={watchedDepreciationCategoryId || '__none__'}
                    onValueChange={(value) => setValue('depreciationCategoryId', value === '__none__' ? '' : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select depreciation category..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {depreciationCategories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name} ({cat.annualRate}% / {cat.usefulLifeYears} years)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    Select a depreciation category to track asset value over time
                  </p>
                </div>
              </div>

              {/* Current Status Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">4. Current Status</h3>
                <p className="text-xs text-gray-600">Current state and usage information</p>

                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={watchedStatus || ''}
                    onValueChange={(value) => setValue('status', value as AssetStatus)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_USE">In Use</SelectItem>
                      <SelectItem value="SPARE">Spare</SelectItem>
                      <SelectItem value="REPAIR">In Repair</SelectItem>
                      <SelectItem value="DISPOSED">Disposed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {watchedStatus === AssetStatus.IN_USE && (
                  <div className="flex items-start space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <Checkbox
                      id="isShared"
                      checked={watchedIsShared}
                      onCheckedChange={(checked) => {
                        setValue('isShared', !!checked);
                        // Clear assignment when marking as shared
                        if (checked) {
                          setValue('assignedMemberId', '');
                          setValue('assignmentDate', '');
                        }
                      }}
                    />
                    <div className="space-y-1">
                      <Label htmlFor="isShared" className="font-medium cursor-pointer">
                        This is a shared/common resource
                      </Label>
                      <p className="text-xs text-gray-600">
                        Check this for assets like printers, conference room equipment, or shared workstations
                        that are not assigned to any specific person.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Assignment Section - Only show when status is IN_USE and NOT shared */}
              {watchedStatus === AssetStatus.IN_USE && !watchedIsShared && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">5. Assignment</h3>
                  <p className="text-xs text-gray-600">Who is using this asset?</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="assignedMemberId">Assign to User *</Label>
                      <Select
                        value={watchedAssignedUserId || "__none__"}
                        onValueChange={(value) => handleUserAssignment(value === "__none__" ? '' : value)}
                      >
                        <SelectTrigger className={errors.assignedMemberId ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Select user..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None (Unassigned)</SelectItem>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.name || user.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.assignedMemberId && (
                        <p className="text-sm text-red-500">{errors.assignedMemberId.message}</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignmentDate">Assignment Date *</Label>
                      <DatePicker
                        id="assignmentDate"
                        value={watch('assignmentDate') || ''}
                        onChange={(value) => setValue('assignmentDate', value)}
                        maxDate={getQatarEndOfDay()}
                        minDate={watchedPurchaseDate ? new Date(watchedPurchaseDate) : undefined}
                      />
                      {errors.assignmentDate && (
                        <p className="text-sm text-red-500">{errors.assignmentDate.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        When was this asset assigned?
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Location Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {watchedIsShared ? '5. Location' : '6. Location'}
                </h3>
                <div className="space-y-2 relative">
                  <Label htmlFor="location">
                    Physical Location {watchedIsShared ? '(Recommended)' : '(Optional)'}
                  </Label>
                  <Input
                    id="location"
                    {...register('location')}
                    onFocus={() => setShowLocationSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowLocationSuggestions(false), 200)}
                    placeholder={watchedIsShared
                      ? "E.g., Reception, Conference Room A, IT Room"
                      : "E.g., Office 3rd Floor, Building A, Storage Room 201"
                    }
                    autoComplete="off"
                  />
                  {showLocationSuggestions && locationSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-48 overflow-auto">
                      {locationSuggestions.map((location, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => {
                            setValue('location', location);
                            setShowLocationSuggestions(false);
                          }}
                        >
                          {location}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {watchedIsShared
                      ? "Where can people find this shared resource?"
                      : "Where is this asset physically located?"
                    }
                  </p>
                </div>
              </div>

              {/* Notes Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                  {watchedIsShared ? '6. Notes / Remarks' : '7. Notes / Remarks'}
                </h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (optional)</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Any additional information about this asset..."
                    className="w-full min-h-[100px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Asset'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}