'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createSubscriptionSchema, type CreateSubscriptionRequest } from '@/lib/validations/subscriptions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import { toInputDateString } from '@/lib/date-format';

// Default exchange rates to QAR (fallback if not set in settings)
const DEFAULT_RATES: Record<string, number> = {
  USD: 3.64, EUR: 3.96, GBP: 4.60, SAR: 0.97, AED: 0.99, KWD: 11.85,
  BHD: 9.66, OMR: 9.46, INR: 0.044, PKR: 0.013, PHP: 0.065,
};

export default function NewSubscriptionPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['QAR', 'USD']);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
  } = useForm<CreateSubscriptionRequest>({
    resolver: zodResolver(createSubscriptionSchema) as any,
    defaultValues: {
      serviceName: '',
      category: undefined,
      accountId: undefined,
      purchaseDate: '',
      renewalDate: undefined,
      billingCycle: 'MONTHLY',
      costPerCycle: undefined,
      costCurrency: 'QAR',
      costQAR: undefined,
      vendor: undefined,
      status: 'ACTIVE',
      autoRenew: true,
      paymentMethod: undefined,
      notes: undefined,
      assignedMemberId: '',
      assignmentDate: undefined,
    },
    mode: 'onChange',
  });

  // Watch fields for side effects and conditional rendering
  const watchedCategory = watch('category');
  const watchedPurchaseDate = watch('purchaseDate');
  const watchedBillingCycle = watch('billingCycle');
  const watchedCostPerCycle = watch('costPerCycle');
  const watchedCostCurrency = watch('costCurrency');
  const watchedAssignedMemberId = watch('assignedMemberId');
  const watchedAssignmentDate = watch('assignmentDate');
  const watchedRenewalDate = watch('renewalDate');
  const watchedAutoRenew = watch('autoRenew');

  // Fetch users on mount
  useEffect(() => {
    fetchUsers();
    fetchCategorySuggestions(); // Fetch all categories initially
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
          setValue('costCurrency', primary);

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

  // Auto-calculate currency conversion to QAR
  useEffect(() => {
    if (watchedCostPerCycle && watchedCostCurrency) {
      if (watchedCostCurrency === 'QAR') {
        // QAR is base currency, no conversion needed
        setValue('costQAR', null);
      } else {
        // Convert any other currency to QAR using exchange rate
        const rate = exchangeRates[watchedCostCurrency] || 1;
        const qarValue = watchedCostPerCycle * rate;
        setValue('costQAR', qarValue);
      }
    }
  }, [watchedCostPerCycle, watchedCostCurrency, exchangeRates, setValue]);

  // Auto-calculate renewal date based on purchase date and billing cycle
  useEffect(() => {
    if (watchedPurchaseDate && watchedBillingCycle) {
      const purchaseDate = new Date(watchedPurchaseDate);
      const renewalDate = new Date(purchaseDate);

      switch (watchedBillingCycle) {
        case 'MONTHLY':
          renewalDate.setMonth(renewalDate.getMonth() + 1);
          break;
        case 'YEARLY':
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
          break;
        case 'ONE_TIME':
          // For one-time purchases, no renewal needed
          setValue('renewalDate', null);
          setValue('autoRenew', false);
          return;
      }

      // Format date as YYYY-MM-DD for input type="date"
      const formattedDate = toInputDateString(renewalDate);
      setValue('renewalDate', formattedDate);
    }
  }, [watchedPurchaseDate, watchedBillingCycle, setValue]);

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

  const fetchCategorySuggestions = async (query: string = '') => {
    try {
      const url = query
        ? `/api/subscriptions/categories?q=${encodeURIComponent(query)}`
        : '/api/subscriptions/categories';
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setCategorySuggestions(data);
      }
    } catch (error) {
      console.error('Error fetching category suggestions:', error);
    }
  };

  const handleCategoryChange = (value: string) => {
    setValue('category', value || null);
    if (value.length > 0) {
      fetchCategorySuggestions(value);
      setShowCategorySuggestions(true);
    } else {
      setShowCategorySuggestions(false);
    }
  };

  const handleSelectCategory = (category: string) => {
    setValue('category', category);
    setShowCategorySuggestions(false);
  };

  const onSubmit = async (data: CreateSubscriptionRequest) => {
    try {
      // Store cost in the currency selected by user
      const costPerCycle = data.costPerCycle;
      let costInQAR = null;

      if (costPerCycle) {
        if (data.costCurrency === 'QAR' || !data.costCurrency) {
          // User entered QAR, so store as is
          costInQAR = costPerCycle;
        } else {
          // Convert any other currency to QAR using exchange rate
          const rate = exchangeRates[data.costCurrency as string] || 1;
          costInQAR = costPerCycle * rate;
        }
      }

      const response = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serviceName: data.serviceName,
          category: data.category || null,
          accountId: data.accountId || null,
          vendor: data.vendor || null,
          costPerCycle: costPerCycle,
          costCurrency: data.costCurrency || 'QAR',
          costQAR: costInQAR,
          purchaseDate: data.purchaseDate || null,
          renewalDate: data.renewalDate || null,
          billingCycle: data.billingCycle,
          usageType: 'OFFICE', // Default to OFFICE since we removed project functionality
          status: data.status,
          autoRenew: data.autoRenew,
          paymentMethod: data.paymentMethod || null,
          notes: data.notes || null,
          assignedMemberId: data.assignedMemberId || null,
          assignmentDate: data.assignedMemberId ? data.assignmentDate : null,
        }),
      });

      if (response.ok) {
        // Redirect to subscription list immediately
        router.push('/admin/subscriptions');
      } else {
        const errorData = await response.json();
        toast.error(`Failed to create subscription: ${errorData.error || 'Unknown error'}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Error creating subscription:', error);
      toast.error('Error creating subscription. Please try again.', { duration: 10000 });
    }
  };

  const handleUserAssignment = (userId: string) => {
    if (userId) {
      // When assigning to a user, don't auto-set date - user must select manually
      setValue('assignedMemberId', userId);
      // Keep existing assignment date if present, otherwise leave empty
    } else {
      // When unassigning, clear both user and assignment date
      setValue('assignedMemberId', '');
      setValue('assignmentDate', '');
    }
  };

  return (
    <>
      <PageHeader
        title="Add New Subscription"
        subtitle="Create a new software subscription or service"
        breadcrumbs={[
          { label: 'Subscriptions', href: '/admin/subscriptions' },
          { label: 'New Subscription' },
        ]}
      />

      <PageContent className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>
              Enter the details for the new subscription
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information Section */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="serviceName">Service Name *</Label>
                    <Input
                      id="serviceName"
                      {...register('serviceName')}
                      placeholder="Adobe Creative Cloud, Office 365, etc."
                      className={errors.serviceName ? 'border-red-500' : ''}
                    />
                    {errors.serviceName && (
                      <p className="text-sm text-red-500">{errors.serviceName.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      {...register('vendor')}
                      placeholder="Adobe, Microsoft, Google, etc."
                      className={errors.vendor ? 'border-red-500' : ''}
                    />
                    {errors.vendor && (
                      <p className="text-sm text-red-500">{errors.vendor.message}</p>
                    )}
                  </div>
                </div>

                {/* Category Field with Autocomplete */}
                <div className="space-y-2 relative">
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={watchedCategory || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    onFocus={() => {
                      // Show suggestions on focus, and fetch if we don't have any yet
                      if (categorySuggestions.length === 0) {
                        fetchCategorySuggestions();
                      }
                      setShowCategorySuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                    placeholder="e.g., SaaS, Cloud Storage, Communication, Design Tools"
                    autoComplete="off"
                    className={errors.category ? 'border-red-500' : ''}
                  />
                  {showCategorySuggestions && categorySuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                      {categorySuggestions.map((category, index) => (
                        <div
                          key={index}
                          className="px-4 py-2 cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSelectCategory(category)}
                        >
                          {category}
                        </div>
                      ))}
                    </div>
                  )}
                  {errors.category && (
                    <p className="text-sm text-red-500">{errors.category.message}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    {categorySuggestions.length > 0
                      ? 'Type to search existing categories or enter a new one'
                      : 'Start typing to see existing categories'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountId">Account ID/Email</Label>
                    <Input
                      id="accountId"
                      {...register('accountId')}
                      placeholder="Account identifier or email"
                      className={errors.accountId ? 'border-red-500' : ''}
                    />
                    {errors.accountId && (
                      <p className="text-sm text-red-500">{errors.accountId.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input
                      id="paymentMethod"
                      {...register('paymentMethod')}
                      placeholder="e.g., Card *1234, PayPal, Bank Transfer"
                      className={errors.paymentMethod ? 'border-red-500' : ''}
                    />
                    {errors.paymentMethod && (
                      <p className="text-sm text-red-500">{errors.paymentMethod.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      For credit cards, use format: Card *1234 (last 4 digits)
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing & Renewal Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Billing & Renewal</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="purchaseDate">Purchase/Start Date *</Label>
                    <DatePicker
                      id="purchaseDate"
                      value={watchedPurchaseDate || ''}
                      onChange={(value) => setValue('purchaseDate', value || '')}
                    />
                    {errors.purchaseDate && (
                      <p className="text-sm text-red-500">{errors.purchaseDate.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Required - When did this subscription start?
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billingCycle">Billing Cycle *</Label>
                    <Select value={watchedBillingCycle} onValueChange={(value) => setValue('billingCycle', value as 'MONTHLY' | 'YEARLY' | 'ONE_TIME')}>
                      <SelectTrigger className={errors.billingCycle ? 'border-red-500' : ''}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Annually</SelectItem>
                        <SelectItem value="ONE_TIME">One Time</SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.billingCycle && (
                      <p className="text-sm text-red-500">{errors.billingCycle.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      How often does this renew?
                    </p>
                  </div>
                </div>

                {/* Auto-calculated Renewal Date - Only show if not ONE_TIME */}
                {watchedBillingCycle !== 'ONE_TIME' && (
                  <div className="space-y-2">
                    <Label htmlFor="renewalDate">Next Renewal Date</Label>
                    <DatePicker
                      id="renewalDate"
                      value={watchedRenewalDate || ''}
                      onChange={(value) => setValue('renewalDate', value || null)}
                    />
                    {errors.renewalDate && (
                      <p className="text-sm text-red-500">{errors.renewalDate.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {watchedPurchaseDate && watchedRenewalDate ? (
                        <span className="text-green-600">
                          ✓ Auto-calculated based on {watchedBillingCycle.toLowerCase().replace('_', ' ')} billing cycle. You can edit if needed.
                        </span>
                      ) : (
                        'Will be auto-calculated when you select a purchase date and billing cycle'
                      )}
                    </p>
                  </div>
                )}

                {/* Auto-renew checkbox - Only show if not ONE_TIME */}
                {watchedBillingCycle !== 'ONE_TIME' && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="autoRenew"
                        checked={watchedAutoRenew}
                        onCheckedChange={(checked) => setValue('autoRenew', checked as boolean)}
                      />
                      <Label htmlFor="autoRenew" className="cursor-pointer">
                        Auto-renew enabled
                      </Label>
                    </div>
                    {errors.autoRenew && (
                      <p className="text-sm text-red-500">{errors.autoRenew.message}</p>
                    )}
                    <p className="text-xs text-gray-500 ml-6">
                      Automatically renew this subscription when it expires
                    </p>
                  </div>
                )}
              </div>

              {/* Cost Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Cost Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="costCurrency">Currency</Label>
                    <Select value={watchedCostCurrency || availableCurrencies[0] || 'QAR'} onValueChange={(value) => setValue('costCurrency', value)}>
                      <SelectTrigger className={errors.costCurrency ? 'border-red-500' : ''}>
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
                    {errors.costCurrency && (
                      <p className="text-sm text-red-500">{errors.costCurrency.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="costPerCycle">
                      Cost per Cycle ({watchedCostCurrency === 'USD' ? '$' : 'QAR'})
                    </Label>
                    <Input
                      id="costPerCycle"
                      type="number"
                      step="0.01"
                      {...register('costPerCycle', { valueAsNumber: true })}
                      placeholder="0.00"
                      className={errors.costPerCycle ? 'border-red-500' : ''}
                    />
                    {watchedCostPerCycle && watchedCostCurrency && (
                      <p className="text-xs text-muted-foreground">
                        {watchedCostCurrency === 'QAR' ? (
                          // QAR selected: show USD equivalent
                          <>≈ USD {(watchedCostPerCycle / (exchangeRates['USD'] || 3.64)).toFixed(2)}</>
                        ) : (
                          // Any other currency: show QAR equivalent
                          <>≈ QAR {(watchedCostPerCycle * (exchangeRates[watchedCostCurrency as string] || 1)).toFixed(2)}</>
                        )}
                      </p>
                    )}
                    {errors.costPerCycle && (
                      <p className="text-sm text-red-500">{errors.costPerCycle.message}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assignment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedMemberId">Assign to User *</Label>
                    <Select
                      value={watchedAssignedMemberId || "__none__"}
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
                    <p className="text-xs text-gray-500">
                      Required - Select the user for this subscription
                    </p>
                  </div>
                  {watchedAssignedMemberId && (
                    <div className="space-y-2">
                      <Label htmlFor="assignmentDate">Assignment Date *</Label>
                      <DatePicker
                        id="assignmentDate"
                        value={watchedAssignmentDate || ''}
                        onChange={(value) => setValue('assignmentDate', value || null)}
                      />
                      {errors.assignmentDate && (
                        <p className="text-sm text-red-500">{errors.assignmentDate.message}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Required when assigning to a user
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Additional Information</h3>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Additional notes about this subscription..."
                    rows={3}
                    className={errors.notes ? 'border-red-500' : ''}
                  />
                  {errors.notes && (
                    <p className="text-sm text-red-500">{errors.notes.message}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/')}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Creating...' : 'Create Subscription'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}