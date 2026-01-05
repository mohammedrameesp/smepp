'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { Checkbox } from '@/components/ui/checkbox';
import { Package, ShoppingCart, MapPin, Info, Wrench, RefreshCw, AlertTriangle } from 'lucide-react';
import { DisposeAssetDialog } from '@/components/domains/operations/assets';
import { toInputDateString } from '@/lib/date-format';
import { updateAssetSchema, type UpdateAssetRequest } from '@/lib/validations/operations/assets';
import { AssetStatus } from '@prisma/client';
import { CategorySelector } from '@/components/domains/operations/assets/category-selector';
import { AssetTypeCombobox } from '@/components/domains/operations/assets/asset-type-combobox';
import { DEFAULT_RATES_TO_QAR } from '@/lib/core/currency';
import { getQatarEndOfDay } from '@/lib/qatar-timezone';

interface Asset {
  id: string;
  assetTag?: string;
  type: string;
  categoryId?: string;
  brand?: string;
  model: string;
  serial?: string;
  configuration?: string;
  purchaseDate?: string;
  warrantyExpiry?: string;
  supplier?: string;
  invoiceNumber?: string;
  price?: number;
  priceCurrency?: string;
  priceQAR?: number;
  status: string;
  createdAt?: string;
  depreciationCategoryId?: string;
}

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

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [depreciationCategories, setDepreciationCategories] = useState<DepreciationCategory[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['QAR', 'USD']);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES_TO_QAR);
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string | null>(null);
  const [suggestedTag, setSuggestedTag] = useState<string>('');
  const [isTagManuallyEdited, setIsTagManuallyEdited] = useState(false);
  const [hasMultipleLocations, setHasMultipleLocations] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<UpdateAssetRequest>({
    resolver: zodResolver(updateAssetSchema),
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

  // Watch critical fields
  const watchedType = watch('type');
  const watchedCategoryId = watch('categoryId');
  const watchedLocationId = watch('locationId');
  const watchedPrice = watch('price');
  const watchedCurrency = watch('priceCurrency');
  const watchedStatus = watch('status');
  const watchedAssignedUserId = watch('assignedMemberId');
  const watchedPurchaseDate = watch('purchaseDate');
  const watchedWarrantyExpiry = watch('warrantyExpiry');
  const watchedDepreciationCategoryId = watch('depreciationCategoryId');
  const watchedIsShared = watch('isShared');

  // Maintenance tracking state
  const [maintenanceRecords, setMaintenanceRecords] = useState<Array<{ id: string; maintenanceDate: string; notes: string | null }>>([]);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [newMaintenance, setNewMaintenance] = useState({ date: toInputDateString(new Date()), notes: '' });

  useEffect(() => {
    if (params?.id) {
      fetchAsset(params.id as string);
    }
    fetchUsers();
    fetchDepreciationCategories();
    fetchOrgSettings();
  }, [params?.id]);

  // Fetch org settings to get available currencies, exchange rates, and location settings
  const fetchOrgSettings = async () => {
    try {
      const response = await fetch('/api/organizations/settings');
      if (response.ok) {
        const data = await response.json();
        const primary = data.settings?.currency || 'QAR';
        const additional: string[] = data.settings?.additionalCurrencies || [];
        const currencies = [primary, ...additional.filter((c: string) => c !== primary)];
        setAvailableCurrencies(currencies.length > 0 ? currencies : ['QAR', 'USD']);

        // Check if multiple locations is enabled
        setHasMultipleLocations(data.settings?.hasMultipleLocations || false);

        // Fetch exchange rates for all currencies
        const rates: Record<string, number> = { ...DEFAULT_RATES_TO_QAR };
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
  };

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

  // Auto-calculate currency conversion to QAR
  useEffect(() => {
    if (watchedPrice && watchedCurrency) {
      if (watchedCurrency === 'QAR') {
        setValue('priceQAR', null);
      } else {
        // Convert any other currency to QAR using exchange rate
        const rate = exchangeRates[watchedCurrency] || 1;
        const qarValue = watchedPrice * rate;
        setValue('priceQAR', qarValue);
      }
    }
  }, [watchedPrice, watchedCurrency, exchangeRates, setValue]);

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

  const fetchAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/assets/${id}`);
      if (response.ok) {
        const assetData = await response.json();
        setAsset(assetData);
        reset({
          assetTag: assetData.assetTag || '',
          type: assetData.type || '',
          categoryId: assetData.categoryId || '',
          brand: assetData.brand || '',
          model: assetData.model || '',
          serial: assetData.serial || '',
          configuration: assetData.configuration || '',
          purchaseDate: toInputDateString(assetData.purchaseDate),
          warrantyExpiry: toInputDateString(assetData.warrantyExpiry),
          supplier: assetData.supplier || '',
          invoiceNumber: assetData.invoiceNumber || '',
          price: assetData.price || null,
          priceCurrency: assetData.priceCurrency || 'QAR',
          priceQAR: assetData.priceQAR || null,
          status: (assetData.status || AssetStatus.IN_USE) as AssetStatus,
          assignedMemberId: assetData.assignedMemberId || '',
          assignmentDate: toInputDateString(assetData.assignmentDate),
          notes: assetData.notes || '',
          locationId: assetData.locationId || '',
          isShared: assetData.isShared || false,
          depreciationCategoryId: assetData.depreciationCategoryId || '',
        });
        // If asset has a tag, mark as manually edited so we don't auto-generate
        if (assetData.assetTag) {
          setIsTagManuallyEdited(true);
          setSuggestedTag(assetData.assetTag);
        }
        // Fetch maintenance records
        fetchMaintenanceRecords(id);
      } else {
        toast.error('Asset not found', { duration: 10000 });
        router.push('/admin/assets');
      }
    } catch (error) {
      console.error('Error fetching asset:', error);
      toast.error('Error loading asset', { duration: 10000 });
    }
  };

  const fetchMaintenanceRecords = async (assetId: string) => {
    try {
      const response = await fetch(`/api/assets/${assetId}/maintenance`);
      if (response.ok) {
        const records = await response.json();
        setMaintenanceRecords(records);
      }
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    }
  };

  const handleAddMaintenance = async () => {
    if (!params?.id) return;

    try {
      const response = await fetch(`/api/assets/${params.id}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceDate: newMaintenance.date,
          notes: newMaintenance.notes || null,
        }),
      });

      if (response.ok) {
        // Refresh maintenance records
        fetchMaintenanceRecords(params.id as string);
        // Reset form
        setNewMaintenance({ date: toInputDateString(new Date()), notes: '' });
        setShowMaintenanceForm(false);
      } else {
        toast.error('Failed to add maintenance record', { duration: 10000 });
      }
    } catch (error) {
      console.error('Error adding maintenance:', error);
      toast.error('Error adding maintenance record', { duration: 10000 });
    }
  };

  const onSubmit = async (data: UpdateAssetRequest) => {
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

      const response = await fetch(`/api/assets/${params?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          categoryId: data.categoryId || null,
          price: price,
          priceQAR: priceInQAR,
          assetTag: data.assetTag || null,
          // Clear assignment for shared assets
          assignedMemberId: data.isShared ? null : data.assignedMemberId,
          assignmentDate: data.isShared ? null : (data.assignmentDate || null),
        }),
      });

      if (response.ok) {
        setShowSuccessMessage(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          router.push('/admin/assets');
        }, 2000);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update asset: ${errorData.error || 'Unknown error'}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Error updating asset:', error);
      toast.error('Error updating asset. Please try again.', { duration: 10000 });
    }
  };

  const handleAssignedUserChange = (value: string) => {
    const newUserId = value === "__none__" ? '' : value;

    if (newUserId) {
      setValue('assignedMemberId', newUserId);
      // Don't auto-set assignment date - let user provide it
      setValue('status', AssetStatus.IN_USE);
    } else {
      setValue('assignedMemberId', '');
      setValue('assignmentDate', '');
      setValue('status', AssetStatus.SPARE);
    }
  };

  if (!asset) {
    return (
      <>
        <PageHeader title="Edit Asset" subtitle="Loading..." />
        <PageContent>
          <div className="text-center">Loading...</div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Asset"
        subtitle="Update asset information"
        breadcrumbs={[
          { label: 'Assets', href: '/admin/assets' },
          { label: asset.assetTag || asset.model, href: `/admin/assets/${params?.id}` },
          { label: 'Edit' },
        ]}
      />

      <PageContent className="max-w-2xl">
        {showSuccessMessage && (
          <Alert variant="success" className="mb-6 bg-green-50 border-green-500">
            <AlertTitle className="text-green-800 text-lg font-bold">✓ Asset updated successfully!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your changes have been saved. Redirecting to assets list...
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Asset Details</CardTitle>
            <CardDescription>
              Update the asset information below
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
                      }}
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-selected based on type
                    </p>
                  </div>
                </div>

                {/* Asset Tag - Generated from category, editable if needed */}
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Label className="text-xs text-blue-700 uppercase tracking-wide">Asset Tag</Label>
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
                        className="font-mono text-base h-9 w-44 uppercase bg-white"
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
                          title="Reset to original tag"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-blue-600">
                      {isTagManuallyEdited ? 'Custom tag' : 'Edit if needed'}
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
                      minDate={watchedPurchaseDate ? new Date(watchedPurchaseDate) : undefined}
                    />
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
                        <>≈ USD {(watchedPrice / (exchangeRates['USD'] || 3.64)).toFixed(2)}</>
                      ) : (
                        <>≈ QAR {(watchedPrice * (exchangeRates[watchedCurrency as string] || 1)).toFixed(2)}</>
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
                    {asset?.status === 'DISPOSED' ? (
                      <div className="flex items-center gap-2 p-3 bg-slate-100 rounded-lg">
                        <span className="px-2 py-1 bg-slate-200 text-slate-700 text-sm font-medium rounded">
                          Disposed
                        </span>
                      </div>
                    ) : (
                      <Select value={watchedStatus || ''} onValueChange={(value) => setValue('status', value as AssetStatus)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="IN_USE">In Use</SelectItem>
                          <SelectItem value="SPARE">Spare</SelectItem>
                          <SelectItem value="REPAIR">In Repair</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
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
              </div>

              {/* Assignment Section - Only show when status is IN_USE and NOT shared */}
              {watchedStatus === AssetStatus.IN_USE && !watchedIsShared && (
                <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                  <h4 className="text-sm font-semibold text-gray-700">Assignment</h4>
                  <p className="text-xs text-muted-foreground">Who is using this asset?</p>

                  <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedMemberId">Assign to User *</Label>
                    <Select
                      value={watchedAssignedUserId || "__none__"}
                      onValueChange={handleAssignedUserChange}
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

              {/* Section 4: Additional Information */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Info className="h-5 w-5 text-gray-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Additional Information</h3>
                </div>

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

              {/* Maintenance Records Section */}
              {asset && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5 text-amber-600" />
                        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Maintenance History</h3>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Track all maintenance performed on this asset</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowMaintenanceForm(!showMaintenanceForm)}
                    >
                      {showMaintenanceForm ? 'Cancel' : '+ Add Maintenance'}
                    </Button>
                  </div>

                {/* Add Maintenance Form */}
                {showMaintenanceForm && (
                  <div className="bg-gray-50 p-4 rounded-md border space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="maintenanceDate">Maintenance Date *</Label>
                        <DatePicker
                          id="maintenanceDate"
                          value={newMaintenance.date}
                          onChange={(value) => setNewMaintenance(prev => ({ ...prev, date: value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="maintenanceNotes">Notes</Label>
                      <textarea
                        id="maintenanceNotes"
                        value={newMaintenance.notes}
                        onChange={(e) => setNewMaintenance(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="What maintenance was performed?"
                        className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={handleAddMaintenance}
                        disabled={!newMaintenance.date}
                      >
                        Save Maintenance Record
                      </Button>
                    </div>
                  </div>
                )}

                {/* Maintenance Records List */}
                {maintenanceRecords.length > 0 ? (
                  <div className="space-y-2">
                    {maintenanceRecords.map((record) => (
                      <div key={record.id} className="bg-gray-50 p-3 rounded-md border">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(record.maintenanceDate).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              })}
                            </p>
                            {record.notes && (
                              <p className="text-sm text-gray-600 mt-1">{record.notes}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  !showMaintenanceForm && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No maintenance records yet. Click "+ Add Maintenance" to add one.
                    </p>
                  )
                )}
                </div>
              )}

              {/* Danger Zone - Dispose Asset */}
              {asset && asset.status !== 'DISPOSED' && (
                <div className="border border-red-200 rounded-lg p-4 bg-red-50/50 mt-6">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Danger Zone</h3>
                  </div>
                  <p className="text-sm text-red-700 mb-3">
                    Permanent actions that cannot be undone. Disposing an asset will record its final value and remove it from active inventory.
                  </p>
                  <DisposeAssetDialog
                    assetId={asset.id}
                    assetTag={asset.assetTag || undefined}
                    assetModel={asset.model}
                    assetStatus={asset.status as AssetStatus}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/assets')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Asset'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}