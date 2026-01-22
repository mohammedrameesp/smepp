/**
 * @file page.tsx
 * @description Admin create new asset page - form for adding new assets to inventory
 * @module app/admin/(operations)/assets/new
 *
 * Features:
 * - Multi-section form: Basic Info, Purchase Details, Location & Assignment
 * - Auto-generated asset tags based on category and organization prefix
 * - Multi-currency support with live QAR conversion preview
 * - Type autocomplete with auto-category suggestion
 * - Depreciation category assignment with salvage value
 * - Warranty tracking with optional expiry date
 * - Initial status selection (IN_USE, SPARE, REPAIR)
 * - Shared asset marking for pool assets
 *
 * Form validation: Zod schema (createAssetSchema)
 * Access: Admin only
 * Route: /admin/assets/new
 */

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
import { Package, ShoppingCart, MapPin, Info, RefreshCw } from 'lucide-react';
import { toInputDateString } from '@/lib/core/datetime';
import { createAssetSchema, type CreateAssetRequest } from '@/features/assets';
import { AssetStatus } from '@prisma/client';
import { CategorySelector } from '@/features/assets';
import { AssetTypeCombobox } from '@/features/assets';
import { DEFAULT_RATES_TO_QAR } from '@/lib/core/currency';
import { getQatarEndOfDay, dateInputToQatarDate } from '@/lib/core/datetime';

interface DepreciationCategory {
  id: string;
  name: string;
  code: string;
  annualRate: number;
  usefulLifeYears: number;
}

interface Location {
  id: string;
  name: string;
  description: string | null;
}

export default function NewAssetPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [depreciationCategories, setDepreciationCategories] = useState<DepreciationCategory[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['QAR', 'USD']);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES_TO_QAR);
  const [suggestedTag, setSuggestedTag] = useState<string>('');
  const [isTagManuallyEdited, setIsTagManuallyEdited] = useState(false);
  const [, setSelectedCategoryCode] = useState<string | null>(null);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  const [depreciationEnabled, setDepreciationEnabled] = useState(true);
  const [locations, setLocations] = useState<Location[]>([]);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);

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
      categoryId: '',
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
      locationId: '',
      isShared: false,
      depreciationCategoryId: '',
    },
    mode: 'onChange',
  });

  // Watch critical fields for side effects
  const watchedType = watch('type');
  const watchedCategoryId = watch('categoryId');
  const watchedLocationId = watch('locationId');
  const watchedPrice = watch('price');
  const watchedCurrency = watch('priceCurrency');
  const watchedPurchaseDate = watch('purchaseDate');
  const watchedWarrantyExpiry = watch('warrantyExpiry');
  const watchedStatus = watch('status');
  const watchedAssignedUserId = watch('assignedMemberId');
  const watchedDepreciationCategoryId = watch('depreciationCategoryId');
  const watchedIsShared = watch('isShared');

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Fetch org settings to get available currencies, exchange rates, and location settings
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

          // Check if multiple locations is enabled
          setHasMultipleLocations(data.settings?.hasMultipleLocations || false);

          // Check if depreciation is enabled
          const depEnabled = data.settings?.depreciationEnabled ?? true;
          setDepreciationEnabled(depEnabled);
          // Fetch depreciation categories if enabled
          if (depEnabled) {
            fetchDepreciationCategories();
          }

          // Fetch exchange rates for all currencies
          const rates: Record<string, number> = { ...DEFAULT_RATES_TO_QAR };
          const allCurrencies = currencies.filter((c: string) => c !== 'QAR');
          let ratesFailed = false;
          await Promise.all(
            allCurrencies.map(async (currency: string) => {
              try {
                const rateRes = await fetch(`/api/settings/exchange-rate?currency=${currency}`);
                if (rateRes.ok) {
                  const rateData = await rateRes.json();
                  if (rateData.rate) rates[currency] = rateData.rate;
                } else {
                  ratesFailed = true;
                }
              } catch {
                ratesFailed = true;
              }
            })
          );
          setExchangeRates(rates);
          if (ratesFailed && allCurrencies.length > 0) {
            setUsingFallbackRates(true);
          }
        }
      } catch (error) {
        console.error('Error fetching org settings:', error);
      }
    }
    fetchOrgSettings();
  }, [setValue]);

  // Fetch locations when multiple locations is enabled
  useEffect(() => {
    async function fetchLocations() {
      if (!hasMultipleLocations) {
        setLocations([]);
        return;
      }
      try {
        const response = await fetch('/api/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data.locations || []);
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    }
    fetchLocations();
  }, [hasMultipleLocations]);

  // Fetch suggested asset tag when category changes (new format: ORG-CAT-YYSEQ)
  // Only generates tag when category is selected - not during typing
  useEffect(() => {
    async function fetchSuggestedTag() {
      if (watchedCategoryId && !isTagManuallyEdited) {
        try {
          const response = await fetch(`/api/assets/next-tag?categoryId=${encodeURIComponent(watchedCategoryId)}`);
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
    const timeoutId = setTimeout(fetchSuggestedTag, 300);
    return () => clearTimeout(timeoutId);
  }, [watchedCategoryId, isTagManuallyEdited, setValue]);

  
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
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          price: data.price,
          // Don't send priceQAR - let API calculate with tenant-specific exchange rates
          priceQAR: undefined,
          assetTag: data.assetTag || null,
          // Clear assignment for shared assets
          assignedMemberId: data.isShared ? null : data.assignedMemberId,
          assignmentDate: data.isShared ? null : (data.assignedMemberId ? data.assignmentDate : null),
        }),
      });

      if (response.ok) {
        toast.success('Asset created successfully');
        router.push('/admin/assets');
      } else {
        let errorMessage = 'Unknown error';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          // Show field-specific validation errors if available
          if (errorData.details && Array.isArray(errorData.details)) {
            const fieldErrors = errorData.details
              .map((d: { path?: string[]; message?: string }) =>
                d.path?.length ? `${d.path.join('.')}: ${d.message}` : d.message
              )
              .filter(Boolean)
              .join(', ');
            if (fieldErrors) {
              errorMessage = fieldErrors;
            }
          }
        } catch {
          // Response wasn't valid JSON
        }
        toast.error(`Failed to create asset: ${errorMessage}`, { duration: 10000 });
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
              {/* Section 1: Asset Details */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Asset Details</h3>
                </div>
                <p className="text-xs text-muted-foreground">What is this asset?</p>

                {/* Asset Type & Category - Same Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Asset Type *</Label>
                    <AssetTypeCombobox
                      value={watchedType || ''}
                      onChange={(type) => setValue('type', type)}
                      onCategoryMatch={async (categoryCode) => {
                        // Auto-select category based on type match
                        if (!watchedCategoryId) {
                          try {
                            const response = await fetch('/api/asset-categories');
                            if (response.ok) {
                              const data = await response.json();
                              const matchedCategory = data.categories?.find(
                                (c: { code: string; id: string }) => c.code === categoryCode
                              );
                              if (matchedCategory) {
                                setValue('categoryId', matchedCategory.id);
                                setSelectedCategoryCode(categoryCode);
                              }
                            }
                          } catch (error) {
                            console.error('Error fetching categories:', error);
                            toast.error('Failed to load categories. Please select manually.');
                          }
                        }
                      }}
                      placeholder="Laptop, Monitor, Printer..."
                      className={errors.type ? 'border-red-500' : ''}
                    />
                    {errors.type && (
                      <p className="text-sm text-red-500">{errors.type.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="categoryId">Category</Label>
                    <CategorySelector
                      value={watchedCategoryId || null}
                      onChange={(categoryId, categoryCode) => {
                        setValue('categoryId', categoryId || '');
                        setSelectedCategoryCode(categoryCode);
                        if (!isTagManuallyEdited && categoryId) {
                          setSuggestedTag('');
                        }
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-selected based on type
                    </p>
                  </div>
                </div>

                {/* Asset Tag - Generated from category, editable if needed */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-slate-700 uppercase tracking-wide">Asset Tag</Label>
                      <Input
                        id="assetTag"
                        {...register('assetTag')}
                        placeholder={!watchedCategoryId ? 'Select category first' : 'Auto-generated'}
                        onChange={(e) => {
                          e.target.value = e.target.value.toUpperCase();
                          register('assetTag').onChange(e);
                          if (e.target.value !== suggestedTag) {
                            setIsTagManuallyEdited(true);
                          }
                        }}
                        className="font-mono text-base h-9 w-36 uppercase bg-white"
                      />
                      {isTagManuallyEdited && suggestedTag && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setValue('assetTag', suggestedTag);
                            setIsTagManuallyEdited(false);
                          }}
                          title="Reset to auto-generated tag"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {isTagManuallyEdited ? 'Custom tag' : 'Auto-generated from category. Edit if needed.'}
                    </p>
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
                      placeholder="MacBook Pro 16, XPS 15, etc."
                      className={errors.model ? 'border-red-500' : ''}
                    />
                    {errors.model && (
                      <p className="text-sm text-red-500">{errors.model.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serial">Serial Number</Label>
                    <Input
                      id="serial"
                      {...register('serial')}
                      placeholder="Manufacturer's serial"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="configuration">Configuration / Specs</Label>
                    <Input
                      id="configuration"
                      {...register('configuration')}
                      placeholder="16GB RAM, 512GB SSD, etc."
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Acquisition Details */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-green-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Acquisition Details</h3>
                </div>
                <p className="text-xs text-muted-foreground">Where did this asset come from?</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase Date</Label>
                    <DatePicker
                      id="purchaseDate"
                      value={watchedPurchaseDate || ''}
                      onChange={(value) => setValue('purchaseDate', value)}
                      maxDate={getQatarEndOfDay()}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="warrantyExpiry">Warranty Expiry</Label>
                    <DatePicker
                      id="warrantyExpiry"
                      value={watchedWarrantyExpiry || ''}
                      onChange={(value) => setValue('warrantyExpiry', value)}
                      required={false}
                      placeholder="No warranty"
                      minDate={watchedPurchaseDate ? dateInputToQatarDate(watchedPurchaseDate) ?? undefined : undefined}
                    />
                    <p className="text-xs text-muted-foreground">
                      {watchedPurchaseDate ? 'Auto-filled +1 year' : ''}
                    </p>
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
                      placeholder="Invoice reference"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Cost / Value</Label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        id="price"
                        type="number"
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
                  {typeof watchedPrice === 'number' && !isNaN(watchedPrice) && watchedPrice > 0 && watchedCurrency && (
                    <p className="text-xs text-muted-foreground">
                      {watchedCurrency === 'QAR' ? (
                        <>≈ USD {(watchedPrice / (exchangeRates['USD'] || 3.64)).toFixed(2)}</>
                      ) : (
                        <>≈ QAR {(watchedPrice * (exchangeRates[watchedCurrency as string] || 1)).toFixed(2)}</>
                      )}
                      {usingFallbackRates && watchedCurrency !== 'QAR' && (
                        <span className="text-amber-600 ml-1" title="Using default exchange rate - actual value may differ">⚠</span>
                      )}
                    </p>
                  )}
                </div>
              </div>

              {/* Section 3: Status & Assignment */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-orange-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Status & Assignment</h3>
                </div>
                <p className="text-xs text-muted-foreground">Current state and who is using it</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status *</Label>
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
                      </SelectContent>
                    </Select>
                  </div>
                  {hasMultipleLocations && locations.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="locationId">Location</Label>
                      <Select
                        value={watchedLocationId || '__none__'}
                        onValueChange={(value) => setValue('locationId', value === '__none__' ? '' : value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select location..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Not specified</SelectItem>
                          {locations.map((loc) => (
                            <SelectItem key={loc.id} value={loc.id}>
                              {loc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {watchedStatus === AssetStatus.IN_USE && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <div className="flex items-center space-x-3">
                      <Checkbox
                        id="isShared"
                        checked={watchedIsShared}
                        onCheckedChange={(checked) => {
                          setValue('isShared', !!checked);
                          if (checked) {
                            setValue('assignedMemberId', '');
                            setValue('assignmentDate', '');
                          }
                        }}
                      />
                      <Label htmlFor="isShared" className="text-sm font-medium cursor-pointer">
                        This is a shared/common resource
                      </Label>
                    </div>
                    <p className="text-xs text-blue-700 ml-7">
                      Check this for assets used by multiple team members (e.g., conference room equipment,
                      shared printers, common area devices). Shared assets won&apos;t be assigned to any specific person.
                    </p>
                  </div>
                )}

                {watchedStatus === AssetStatus.IN_USE && !watchedIsShared && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-2">
                      <Label htmlFor="assignedMemberId">Assign to *</Label>
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
                        minDate={watchedPurchaseDate ? dateInputToQatarDate(watchedPurchaseDate) ?? undefined : undefined}
                      />
                      {errors.assignmentDate && (
                        <p className="text-sm text-red-500">{errors.assignmentDate.message}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 4: Additional Information */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Additional Information</h3>
                </div>

                {depreciationEnabled && (
                  <div className="space-y-2">
                    <Label htmlFor="depreciationCategoryId">Depreciation Category</Label>
                    <Select
                      value={watchedDepreciationCategoryId || '__none__'}
                      onValueChange={(value) => setValue('depreciationCategoryId', value === '__none__' ? '' : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select for value tracking..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">None</SelectItem>
                        {depreciationCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name} ({cat.annualRate}% / {cat.usefulLifeYears} yrs)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Any additional information..."
                    className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/assets')}
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