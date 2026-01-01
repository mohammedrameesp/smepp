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
import { toInputDateString } from '@/lib/date-format';
import { updateAssetSchema, type UpdateAssetRequest } from '@/lib/validations/assets';
import { AssetStatus, AcquisitionType } from '@prisma/client';
import { USD_TO_QAR_RATE } from '@/lib/constants';
import { getQatarEndOfDay } from '@/lib/qatar-timezone';

interface Asset {
  id: string;
  assetTag?: string;
  type: string;
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
  acquisitionType?: string;
  transferNotes?: string;
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

export default function EditAssetPage() {
  const router = useRouter();
  const params = useParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [assetTypeSuggestions, setAssetTypeSuggestions] = useState<string[]>([]);
  const [showTypeSuggestions, setShowTypeSuggestions] = useState(false);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [depreciationCategories, setDepreciationCategories] = useState<DepreciationCategory[]>([]);

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
      acquisitionType: AcquisitionType.NEW_PURCHASE,
      transferNotes: '',
      assignedMemberId: '',
      assignmentDate: '',
      notes: '',
      location: '',
      isShared: false,
      depreciationCategoryId: '',
    },
    mode: 'onChange',
  });

  // Watch critical fields
  const watchedType = watch('type');
  const watchedCategory = watch('category');
  const watchedLocation = watch('location');
  const watchedPrice = watch('price');
  const watchedCurrency = watch('priceCurrency');
  const watchedStatus = watch('status');
  const watchedAcquisitionType = watch('acquisitionType');
  const watchedAssignedUserId = watch('assignedMemberId');
  const watchedPurchaseDate = watch('purchaseDate');
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
  }, [params?.id]);

  // Auto-calculate currency conversion
  useEffect(() => {
    if (watchedPrice && watchedCurrency) {
      if (watchedCurrency === 'QAR') {
        setValue('priceQAR', null);
      } else if (watchedCurrency === 'USD') {
        const qarValue = watchedPrice * USD_TO_QAR_RATE;
        setValue('priceQAR', qarValue);
      }
    }
  }, [watchedPrice, watchedCurrency, setValue]);

  // Fetch asset type suggestions as user types
  useEffect(() => {
    if (watchedType && watchedType.length > 0) {
      fetchAssetTypes(watchedType);
    } else {
      setAssetTypeSuggestions([]);
    }
  }, [watchedType]);

  // Fetch category suggestions as user types
  useEffect(() => {
    if (watchedCategory && watchedCategory.length > 0) {
      fetchCategories(watchedCategory);
    } else {
      setCategorySuggestions([]);
    }
  }, [watchedCategory]);

  // Fetch location suggestions as user types
  useEffect(() => {
    if (watchedLocation && watchedLocation.length > 0) {
      fetchLocations(watchedLocation);
    } else {
      setLocationSuggestions([]);
    }
  }, [watchedLocation]);

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

  const fetchAsset = async (id: string) => {
    try {
      const response = await fetch(`/api/assets/${id}`);
      if (response.ok) {
        const assetData = await response.json();
        setAsset(assetData);
        reset({
          assetTag: assetData.assetTag || '',
          type: assetData.type || '',
          category: assetData.category || '',
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
          acquisitionType: (assetData.acquisitionType || AcquisitionType.NEW_PURCHASE) as AcquisitionType,
          transferNotes: assetData.transferNotes || '',
          assignedMemberId: assetData.assignedMemberId || '',
          assignmentDate: toInputDateString(assetData.assignmentDate),
          notes: assetData.notes || '',
          location: assetData.location || '',
          isShared: assetData.isShared || false,
          depreciationCategoryId: assetData.depreciationCategoryId || '',
        });
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
        if (data.priceCurrency === 'QAR') {
          priceInQAR = price;
        } else if (data.priceCurrency === 'USD') {
          priceInQAR = price * USD_TO_QAR_RATE;
        }
      }

      const response = await fetch(`/api/assets/${params?.id}`, {
        method: 'PUT',
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
                      placeholder="Laptop, Phone, Monitor, etc."
                      autoComplete="off"
                      className={errors.type ? 'border-red-500' : ''}
                    />
                    {errors.type && <p className="text-sm text-red-500">{errors.type.message}</p>}
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
                    <Label htmlFor="brand">Brand/Manufacturer</Label>
                    <Input
                      id="brand"
                      {...register('brand')}
                      placeholder="Apple, Dell, HP, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="model">Model/Version *</Label>
                    <Input
                      id="model"
                      {...register('model')}
                      placeholder="MacBook Pro 16&quot;, iPhone 14, etc."
                      className={errors.model ? 'border-red-500' : ''}
                    />
                    {errors.model && <p className="text-sm text-red-500">{errors.model.message}</p>}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serial">Serial Number</Label>
                  <Input
                    id="serial"
                    {...register('serial')}
                    placeholder="Serial number or identifier"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="configuration">Configuration/Specs</Label>
                  <Input
                    id="configuration"
                    {...register('configuration')}
                    placeholder="e.g., M2 Pro, 32GB RAM, 1TB SSD"
                  />
                </div>
              </div>

              {/* Acquisition Details Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">2. Acquisition Details</h3>
                <p className="text-xs text-gray-600">How did we acquire this asset?</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="acquisitionType">Acquisition Type *</Label>
                    <Select value={watchedAcquisitionType || ''} onValueChange={(value) => setValue('acquisitionType', value as AcquisitionType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NEW_PURCHASE">New Purchase</SelectItem>
                        <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="assetTag">Asset ID/Tag</Label>
                    <Input
                      id="assetTag"
                      {...register('assetTag')}
                      placeholder="Auto-generated if empty"
                      onChange={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                        register('assetTag').onChange(e);
                      }}
                      style={{ textTransform: 'uppercase' }}
                    />
                  </div>
                </div>

                {watchedAcquisitionType === 'TRANSFERRED' && (
                  <div className="space-y-2">
                    <Label htmlFor="transferNotes">Transfer Notes *</Label>
                    <textarea
                      id="transferNotes"
                      {...register('transferNotes')}
                      placeholder="E.g., From previous company, Personal laptop donated by boss, etc."
                      className="w-full min-h-[80px] px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500">
                      Provide details about where this asset came from
                    </p>
                  </div>
                )}
              </div>

              {/* Financial Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">3. Financial Information</h3>
                <p className="text-xs text-gray-600">Procurement and cost details</p>

                {watchedAcquisitionType !== 'TRANSFERRED' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="purchaseDate">Purchase Date</Label>
                      <DatePicker
                        id="purchaseDate"
                        value={watch('purchaseDate') || ''}
                        onChange={(value) => setValue('purchaseDate', value)}
                        maxDate={getQatarEndOfDay()} // Only allow today and past dates
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
                          value={watchedCurrency || ''}
                          onValueChange={(value) => setValue('priceCurrency', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="QAR">QAR</SelectItem>
                            <SelectItem value="USD">USD</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {watchedPrice && (
                        <p className="text-xs text-muted-foreground">
                          {watchedCurrency === 'USD' ? (
                            <>≈ QAR {(watchedPrice * USD_TO_QAR_RATE).toFixed(2)}</>
                          ) : watchedCurrency === 'QAR' ? (
                            <>≈ USD {(watchedPrice / USD_TO_QAR_RATE).toFixed(2)}</>
                          ) : null}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="supplier">Supplier/Vendor</Label>
                    <Input
                      id="supplier"
                      {...register('supplier')}
                      placeholder="Apple Store Qatar, Dell Qatar, etc."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="invoiceNumber">Invoice/PO Number</Label>
                    <Input
                      id="invoiceNumber"
                      {...register('invoiceNumber')}
                      placeholder="INV-2023-001"
                    />
                  </div>
                </div>

                {watchedAcquisitionType !== 'TRANSFERRED' && (
                  <div className="space-y-2">
                    <Label htmlFor="warrantyExpiry">
                      Warranty Expiry
                      <span className="text-gray-500 text-sm ml-2">(Optional)</span>
                    </Label>
                    <DatePicker
                      id="warrantyExpiry"
                      value={watch('warrantyExpiry') || ''}
                      onChange={(value) => setValue('warrantyExpiry', value)}
                      required={false}
                      placeholder="No warranty or unknown"
                      minDate={watchedPurchaseDate ? new Date(watchedPurchaseDate) : undefined}
                    />
                    <p className="text-xs text-gray-500">
                      {watchedPurchaseDate
                        ? 'Must be on or after purchase date.'
                        : 'Enter a purchase date first to set warranty expiry.'
                      } Click × to clear for items without warranty.
                    </p>
                  </div>
                )}

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
                  <Select value={watchedStatus || ''} onValueChange={(value) => setValue('status', value as AssetStatus)}>
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

              {/* Maintenance Records Section */}
              {asset && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
                        {watchedIsShared ? '7. Maintenance History' : '8. Maintenance History'}
                      </h3>
                      <p className="text-xs text-gray-600">Track all maintenance performed on this asset</p>
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