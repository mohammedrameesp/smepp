'use client';

import { useState, useEffect, useRef } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { DatePicker } from '@/components/ui/date-picker';
import { toInputDateString } from '@/lib/date-format';
import { updateSubscriptionSchema, type UpdateSubscriptionRequest } from '@/lib/validations/subscriptions';

// USD to QAR exchange rate (typically around 3.64)
const USD_TO_QAR_RATE = 3.64;

interface Subscription {
  id: string;
  serviceName: string;
  category?: string;
  accountId?: string;
  purchaseDate?: string;
  renewalDate?: string;
  billingCycle: string;
  costPerCycle?: number;
  vendor?: string;
  status: string;
  autoRenew: boolean;
  paymentMethod?: string;
  notes?: string;
  assignedUserId?: string;
  projectId?: string;
}

export default function EditSubscriptionPage() {
  const router = useRouter();
  const params = useParams();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [users, setUsers] = useState<Array<{ id: string; name: string | null; email: string }>>([]);
  const [categorySuggestions, setCategorySuggestions] = useState<string[]>([]);
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
  const [lastAssignmentDate, setLastAssignmentDate] = useState<string>('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    reset,
  } = useForm<UpdateSubscriptionRequest>({
    resolver: zodResolver(updateSubscriptionSchema),
    defaultValues: {
      serviceName: '',
      category: '',
      accountId: '',
      purchaseDate: '',
      renewalDate: '',
      billingCycle: 'MONTHLY',
      costPerCycle: null,
      costCurrency: 'QAR',
      costQAR: null,
      vendor: '',
      status: 'ACTIVE',
      autoRenew: true,
      paymentMethod: '',
      notes: '',
      assignedUserId: '',
      assignmentDate: ''
    },
    mode: 'onChange',
  });

  // Watch critical fields for side effects and conditional rendering
  const watchedCategory = watch('category');
  const watchedCostPerCycle = watch('costPerCycle');
  const watchedCostCurrency = watch('costCurrency');
  const watchedPurchaseDate = watch('purchaseDate');
  const watchedBillingCycle = watch('billingCycle');
  const watchedRenewalDate = watch('renewalDate');
  const watchedAssignedUserId = watch('assignedUserId');
  const watchedAssignmentDate = watch('assignmentDate');

  useEffect(() => {
    if (params?.id) {
      fetchSubscription(params.id as string);
    }
    fetchUsers();
    fetchCategorySuggestions(); // Fetch all categories initially
  }, [params?.id]);

  // Auto-calculate currency conversion (only for storing in DB)
  useEffect(() => {
    if (watchedCostPerCycle && watchedCostCurrency) {
      if (watchedCostCurrency === 'QAR') {
        setValue('costQAR', null);
      } else if (watchedCostCurrency === 'USD') {
        // When USD is selected, we'll calculate costQAR in the submit handler
        setValue('costQAR', null);
      }
    }
  }, [watchedCostPerCycle, watchedCostCurrency, setValue]);

  // Auto-calculate renewal date ONLY on initial load or when purchase/billing actually changes
  // Use refs to track previous values to avoid unnecessary recalculations
  const prevPurchaseDateRef = useRef<string>('');
  const prevBillingCycleRef = useRef<string>('');

  useEffect(() => {
    // Skip if this is re-render with same values (avoid auto-calc on every render)
    const purchaseChanged = prevPurchaseDateRef.current !== '' && prevPurchaseDateRef.current !== watchedPurchaseDate;
    const billingChanged = prevBillingCycleRef.current !== '' && prevBillingCycleRef.current !== watchedBillingCycle;

    // Only auto-calculate if:
    // 1. Initial load (prevPurchaseDateRef is empty)
    // 2. Purchase date actually changed
    // 3. Billing cycle actually changed
    const shouldAutoCalc = isInitialLoad || purchaseChanged || billingChanged;

    if (!shouldAutoCalc) {
      // Update refs for next comparison
      prevPurchaseDateRef.current = watchedPurchaseDate || '';
      prevBillingCycleRef.current = watchedBillingCycle || '';
      return;
    }

    if (watchedPurchaseDate && watchedBillingCycle && watchedBillingCycle !== 'ONE_TIME') {
      // Parse the date string properly
      const [y, m, d] = watchedPurchaseDate.split('-').map(Number);
      const purchaseDate = new Date(y, m - 1, d);

      const renewalDate = new Date(purchaseDate);
      switch (watchedBillingCycle) {
        case 'MONTHLY':
          renewalDate.setMonth(renewalDate.getMonth() + 1);
          break;
        case 'YEARLY':
          renewalDate.setFullYear(renewalDate.getFullYear() + 1);
          break;
      }

      const ry = renewalDate.getFullYear();
      const rm = String(renewalDate.getMonth() + 1).padStart(2, '0');
      const rd = String(renewalDate.getDate()).padStart(2, '0');
      const formattedDate = `${ry}-${rm}-${rd}`;

      setValue('renewalDate', formattedDate);
    } else if (watchedBillingCycle === 'ONE_TIME') {
      setValue('renewalDate', '');
      setValue('autoRenew', false);
    }

    // Update refs after calculation
    prevPurchaseDateRef.current = watchedPurchaseDate || '';
    prevBillingCycleRef.current = watchedBillingCycle || '';

    // Mark initial load as complete
    if (isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [watchedPurchaseDate, watchedBillingCycle, setValue, isInitialLoad]);

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
    setValue('category', value);
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

  const fetchSubscription = async (id: string) => {
    try {
      const response = await fetch(`/api/subscriptions/${id}`);
      if (response.ok) {
        const subscriptionData = await response.json();
        setSubscription(subscriptionData);

        // Fetch assignment history to get the last assignment date
        let assignmentDateValue = '';
        if (subscriptionData.assignedUserId) {
          try {
            // Fetch subscription history
            const historyResponse = await fetch(`/api/subscriptions/${id}`);
            if (historyResponse.ok) {
              const data = await historyResponse.json();
              // Find the most recent REASSIGNED or CREATED action for current user
              const assignmentHistory = data.history
                ?.filter((h: any) =>
                  (h.action === 'REASSIGNED' || h.action === 'CREATED') &&
                  h.newUserId === subscriptionData.assignedUserId
                )
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              if (assignmentHistory && assignmentHistory.length > 0) {
                const latestAssignment = assignmentHistory[0];
                if (latestAssignment.assignmentDate) {
                  assignmentDateValue = toInputDateString(latestAssignment.assignmentDate);
                  setLastAssignmentDate(assignmentDateValue);
                } else if (latestAssignment.createdAt) {
                  assignmentDateValue = toInputDateString(latestAssignment.createdAt);
                  setLastAssignmentDate(assignmentDateValue);
                }
              } else if (subscriptionData.purchaseDate) {
                // If no assignment history, use purchase date
                assignmentDateValue = toInputDateString(subscriptionData.purchaseDate);
                setLastAssignmentDate(assignmentDateValue);
              }
            }
          } catch (err) {
            console.error('Error fetching assignment history:', err);
          }
        }

        reset({
          serviceName: subscriptionData.serviceName || '',
          category: subscriptionData.category || '',
          accountId: subscriptionData.accountId || '',
          purchaseDate: toInputDateString(subscriptionData.purchaseDate),
          renewalDate: toInputDateString(subscriptionData.renewalDate),
          billingCycle: (subscriptionData.billingCycle || 'MONTHLY') as 'MONTHLY' | 'YEARLY' | 'ONE_TIME',
          costPerCycle: subscriptionData.costPerCycle || null,
          costCurrency: subscriptionData.costCurrency || 'QAR',
          costQAR: subscriptionData.costQAR || null,
          vendor: subscriptionData.vendor || '',
          status: (subscriptionData.status || 'ACTIVE') as 'ACTIVE' | 'CANCELLED',
          autoRenew: subscriptionData.autoRenew ?? true,
          paymentMethod: subscriptionData.paymentMethod || '',
          notes: subscriptionData.notes || '',
          assignedUserId: subscriptionData.assignedUserId || '',
          assignmentDate: assignmentDateValue
        });
      } else {
        toast.error('Subscription not found', { duration: 10000 });
        router.push('/admin/subscriptions');
      }
    } catch (error) {
      console.error('Error fetching subscription:', error);
      toast.error('Error loading subscription', { duration: 10000 });
    }
  };

  const onSubmit = async (data: UpdateSubscriptionRequest) => {
    try {
      // Store cost in the currency selected by user
      const costPerCycle = data.costPerCycle;
      let costInQAR = null;

      if (costPerCycle) {
        if (data.costCurrency === 'QAR') {
          // User entered QAR, store as-is for costQAR
          costInQAR = costPerCycle;
        } else {
          // User entered USD, calculate QAR equivalent
          costInQAR = costPerCycle * USD_TO_QAR_RATE;
        }
      }

      const response = await fetch(`/api/subscriptions/${params?.id}`, {
        method: 'PUT',
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
          status: data.status, // Include status to preserve it during updates
          autoRenew: data.autoRenew,
          paymentMethod: data.paymentMethod || null,
          notes: data.notes || null,
          assignedUserId: data.assignedUserId || null,
          assignmentDate: data.assignmentDate || null,
        }),
      });

      if (response.ok) {
        setShowSuccessMessage(true);

        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });

        // Redirect to subscriptions list after 2 seconds
        setTimeout(() => {
          router.push('/admin/subscriptions');
        }, 2000);
      } else {
        const errorData = await response.json();
        toast.error(`Failed to update subscription: ${errorData.error || 'Unknown error'}`, { duration: 10000 });
      }
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast.error('Error updating subscription. Please try again.', { duration: 10000 });
    }
  };

  const handleAssignedUserChange = (value: string) => {
    const newUserId = value === "__none__" ? '' : value;
    const currentAssignmentDate = watch('assignmentDate');

    setValue('assignedUserId', newUserId);

    // If user is being unassigned, clear assignment date
    if (!newUserId) {
      setValue('assignmentDate', '');
    }
    // Otherwise, keep the existing assignment date (don't auto-set to today)
    // User must manually select a date
  };

  if (!subscription) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Edit Subscription"
        subtitle="Update subscription information"
        breadcrumbs={[
          { label: 'Subscriptions', href: '/admin/subscriptions' },
          { label: subscription.serviceName, href: `/admin/subscriptions/${params?.id}` },
          { label: 'Edit' },
        ]}
      />

      <PageContent className="max-w-2xl">
        {showSuccessMessage && (
          <Alert variant="success" className="mb-6 bg-green-50 border-green-500">
            <AlertTitle className="text-green-800 text-lg font-bold">✓ Subscription updated successfully!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your changes have been saved. Redirecting to subscriptions list...
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Subscription Details</CardTitle>
            <CardDescription>
              Update the subscription information below
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
                    {errors.serviceName && <p className="text-sm text-red-500">{errors.serviceName.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor">Vendor</Label>
                    <Input
                      id="vendor"
                      {...register('vendor')}
                      placeholder="Adobe, Microsoft, Google, etc."
                    />
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Payment Method</Label>
                    <Input
                      id="paymentMethod"
                      {...register('paymentMethod')}
                      placeholder="e.g., Card *1234, PayPal, Bank Transfer"
                    />
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
                      onChange={(value) => setValue('purchaseDate', value)}
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
                    <Select value={watchedBillingCycle || ''} onValueChange={(value) => setValue('billingCycle', value as 'MONTHLY' | 'YEARLY' | 'ONE_TIME')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                        <SelectItem value="YEARLY">Annually</SelectItem>
                        <SelectItem value="ONE_TIME">One Time</SelectItem>
                      </SelectContent>
                    </Select>
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
                      onChange={(value) => setValue('renewalDate', value)}
                      minDate={watchedPurchaseDate ? (() => {
                        const [y, m, d] = watchedPurchaseDate.split('-').map(Number);
                        return new Date(y, m - 1, d);
                      })() : undefined}
                    />
                    {errors.renewalDate && (
                      <p className="text-sm text-red-500">{errors.renewalDate.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      {watchedPurchaseDate && watchedRenewalDate ? (
                        <span className="text-green-600">
                          ✓ Auto-calculated based on {watchedBillingCycle?.toLowerCase().replace('_', ' ')} billing cycle. You can edit if needed.
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
                        checked={watch('autoRenew') || false}
                        onCheckedChange={(checked) => setValue('autoRenew', checked as boolean)}
                      />
                      <Label htmlFor="autoRenew" className="cursor-pointer">
                        Auto-renew enabled
                      </Label>
                    </div>
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
                    <Select value={watchedCostCurrency || ''} onValueChange={(value) => setValue('costCurrency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="QAR">QAR (Qatari Riyal)</SelectItem>
                        <SelectItem value="USD">USD (US Dollar)</SelectItem>
                      </SelectContent>
                    </Select>
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
                    />
                    {watchedCostPerCycle && (
                      <p className="text-xs text-muted-foreground">
                        {watchedCostCurrency === 'USD' ? (
                          <>≈ QAR {(watchedCostPerCycle * USD_TO_QAR_RATE).toFixed(2)}</>
                        ) : (
                          <>≈ USD {(watchedCostPerCycle / USD_TO_QAR_RATE).toFixed(2)}</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Assignment Section */}
              <div className="space-y-4 pt-4 border-t">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Assignment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="assignedUserId">Assign to User *</Label>
                    <Select
                      value={watchedAssignedUserId || "__none__"}
                      onValueChange={handleAssignedUserChange}
                    >
                      <SelectTrigger className={errors.assignedUserId ? 'border-red-500' : ''}>
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
                    {errors.assignedUserId && (
                      <p className="text-sm text-red-500">{errors.assignedUserId.message}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Required - Select the user for this subscription
                    </p>
                  </div>
                  {watchedAssignedUserId && (
                    <div className="space-y-2">
                      <Label htmlFor="assignmentDate">Assignment Date *</Label>
                      <DatePicker
                        id="assignmentDate"
                        value={watchedAssignmentDate || ''}
                        onChange={(value) => setValue('assignmentDate', value || '')}
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
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/admin/subscriptions')}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Updating...' : 'Update Subscription'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PageContent>
    </>
  );
}