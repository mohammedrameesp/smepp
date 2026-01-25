'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Plus, Trash2, ExternalLink } from 'lucide-react';
import {
  PURCHASE_TYPES,
  PAYMENT_MODES,
} from '@/features/purchase-requests/lib/purchase-request-utils';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { DEFAULT_RATES_TO_QAR } from '@/lib/core/currency';
import { formatNumber } from '@/lib/utils/math-utils';

// Type configuration for dynamic UI based on purchase type
const TYPE_CONFIG: Record<string, {
  descPlaceholder: string;
  qtyLabel: string;
  qtyNote: string;
  unitPriceLabel: string;
  showQty: boolean;
  showUnitPrice: boolean;
  showSubscription: boolean;
}> = {
  HARDWARE: {
    descPlaceholder: 'e.g. Dell Latitude 5440 laptop',
    qtyLabel: 'Qty',
    qtyNote: 'Number of units',
    unitPriceLabel: 'Unit Price',
    showQty: true,
    showUnitPrice: true,
    showSubscription: false,
  },
  SOFTWARE_SUBSCRIPTION: {
    descPlaceholder: 'e.g. Figma Professional plan',
    qtyLabel: 'Qty',
    qtyNote: '',
    unitPriceLabel: 'Unit Price',
    showQty: false,
    showUnitPrice: false,
    showSubscription: true,
  },
  SERVICES: {
    descPlaceholder: 'e.g. Annual maintenance contract',
    qtyLabel: 'Qty',
    qtyNote: '',
    unitPriceLabel: 'Service Cost',
    showQty: false,
    showUnitPrice: true,
    showSubscription: false,
  },
  OFFICE_SUPPLIES: {
    descPlaceholder: 'e.g. A4 paper box, printer toner',
    qtyLabel: 'Qty',
    qtyNote: 'Number of items',
    unitPriceLabel: 'Unit Price',
    showQty: true,
    showUnitPrice: true,
    showSubscription: false,
  },
  MARKETING: {
    descPlaceholder: 'e.g. Social media campaign',
    qtyLabel: 'Qty',
    qtyNote: '',
    unitPriceLabel: 'Budget',
    showQty: false,
    showUnitPrice: true,
    showSubscription: false,
  },
  TRAVEL: {
    descPlaceholder: 'e.g. Doha–Dubai business trip',
    qtyLabel: 'Qty',
    qtyNote: '',
    unitPriceLabel: 'Travel Budget',
    showQty: false,
    showUnitPrice: true,
    showSubscription: false,
  },
  TRAINING: {
    descPlaceholder: 'e.g. Excel training course',
    qtyLabel: 'Qty',
    qtyNote: '',
    unitPriceLabel: 'Training Budget',
    showQty: false,
    showUnitPrice: true,
    showSubscription: false,
  },
  OTHER: {
    descPlaceholder: 'Describe the item or service',
    qtyLabel: 'Qty',
    qtyNote: 'Number of units',
    unitPriceLabel: 'Unit Price',
    showQty: true,
    showUnitPrice: true,
    showSubscription: false,
  },
};

interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amountPerCycle: number; // For subscriptions
  currency: string;
  billingCycle: 'MONTHLY' | 'YEARLY';
  durationMonths: number | null;
  productUrl: string;
}

export default function NewPurchaseRequestPage() {
  const router = useRouter();
  useSession();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state - Request Information
  const [title, setTitle] = useState('');
  const [description, ] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [neededByDate, setNeededByDate] = useState('');

  // Purchase Type & Payment Details
  const [purchaseType, setPurchaseType] = useState<string>('');

  // Field-specific validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [otherPurchaseType, setOtherPurchaseType] = useState('');
  const [paymentMode, setPaymentMode] = useState<string>('BANK_TRANSFER');

  // Business Justification
  const [justification, setJustification] = useState('');

  // Vendor Details
  const [vendorName, setVendorName] = useState('');
  const [vendorContact, setVendorContact] = useState('');
  const [vendorEmail, setVendorEmail] = useState('');

  // Additional Notes
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Currency (form-level for all items)
  const [currency, setCurrency] = useState<string>('QAR');
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>(['QAR', 'USD']);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>(DEFAULT_RATES_TO_QAR);
  const [usingFallbackRates, setUsingFallbackRates] = useState(false);

  // Fetch org settings for currency defaults and exchange rates
  useEffect(() => {
    async function fetchOrgSettings() {
      try {
        const response = await fetch('/api/organizations/settings');
        if (response.ok) {
          const data = await response.json();
          const primary = data.settings?.currency || 'QAR';
          const additional: string[] = data.settings?.additionalCurrencies || [];
          const currencies = [primary, ...additional.filter((c: string) => c !== primary)];
          setAvailableCurrencies(currencies.length > 0 ? currencies : ['QAR', 'USD']);
          setCurrency(primary);

          // Fetch exchange rates for all currencies
          const rates: Record<string, number> = { ...DEFAULT_RATES_TO_QAR };
          const allCurrencies = currencies.filter((c: string) => c !== 'QAR');
          let ratesFailed = false;
          await Promise.all(
            allCurrencies.map(async (curr: string) => {
              try {
                const rateRes = await fetch(`/api/exchange-rates/${curr}`);
                if (rateRes.ok) {
                  const rateData = await rateRes.json();
                  if (rateData.rate) {
                    rates[curr] = rateData.rate;
                  }
                } else {
                  ratesFailed = true;
                }
              } catch {
                ratesFailed = true;
              }
            })
          );
          setExchangeRates(rates);
          setUsingFallbackRates(ratesFailed);
        }
      } catch (error) {
        console.error('Error fetching org settings:', error);
      }
    }
    fetchOrgSettings();
  }, []);

  // Line Items
  const [items, setItems] = useState<LineItem[]>([
    {
      id: crypto.randomUUID(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      amountPerCycle: 0,
      currency: 'QAR',
      billingCycle: 'MONTHLY',
      durationMonths: 12,
      productUrl: '',
    },
  ]);

  // Get current type config
  const typeConfig = useMemo(() => TYPE_CONFIG[purchaseType] || TYPE_CONFIG.OTHER, [purchaseType]);

  // Get display currency label
  const currencyLabel = currency;

  // Get today's date in format YYYY-MM-DD
  const today = new Date().toISOString().split('T')[0];

  // Add new line item
  const addItem = () => {
    setItems([
      ...items,
      {
        id: crypto.randomUUID(),
        description: '',
        quantity: 1,
        unitPrice: 0,
        amountPerCycle: 0,
        currency: currency,
        billingCycle: 'MONTHLY',
        durationMonths: 12,
        productUrl: '',
      },
    ]);
  };

  // Remove line item
  const removeItem = (id: string) => {
    if (items.length === 1) return;
    setItems(items.filter((item) => item.id !== id));
  };

  // Update line item
  const updateItem = (id: string, field: keyof LineItem, value: LineItem[keyof LineItem]) => {
    setItems(
      items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalOneTime = 0;
    let totalMonthly = 0;
    let totalContractValue = 0;

    const isSubscription = purchaseType === 'SOFTWARE_SUBSCRIPTION';

    items.forEach((item) => {
      const qty = typeConfig.showQty ? item.quantity : 1;

      if (isSubscription) {
        // For subscriptions, use amountPerCycle
        const amountPerCycle = item.amountPerCycle || 0;
        const licenses = qty > 0 ? qty : 1;

        if (item.billingCycle === 'MONTHLY') {
          totalMonthly += amountPerCycle * licenses;
          const months = item.durationMonths || 12;
          totalContractValue += amountPerCycle * licenses * months;
        } else {
          // Yearly - treated as full contract value
          totalContractValue += amountPerCycle * licenses;
        }
      } else {
        // For non-subscriptions, use unitPrice
        const lineTotal = qty * item.unitPrice;
        totalOneTime += lineTotal;
        totalContractValue += lineTotal;
      }
    });

    return { totalOneTime, totalMonthly, totalContractValue };
  };

  // Format amount
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-QA', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    const errors: Record<string, string> = {};
    const isSubscription = purchaseType === 'SOFTWARE_SUBSCRIPTION';

    // Validate required fields
    if (!title.trim()) {
      errors.title = 'Title is required';
    }

    if (!purchaseType) {
      errors.purchaseType = 'Purchase type is required';
    }

    if (!justification.trim()) {
      errors.justification = 'Business justification is required';
    }

    const validItems = items.filter((item) => item.description.trim());
    if (validItems.length === 0) {
      errors.items = 'At least one item with a description is required';
    }

    // Validate prices based on type
    if (purchaseType && isSubscription) {
      const hasZeroPriceItems = validItems.some((item) => item.amountPerCycle <= 0);
      if (hasZeroPriceItems) {
        errors.items = 'All items must have an amount per cycle greater than 0';
      }
    } else if (purchaseType && validItems.length > 0) {
      const hasZeroPriceItems = validItems.some((item) => item.unitPrice <= 0);
      if (hasZeroPriceItems) {
        errors.items = 'All items must have a price greater than 0';
      }
    }

    // Validate quantity for types that require it
    if (purchaseType && typeConfig.showQty && validItems.length > 0) {
      const hasZeroQty = validItems.some((item) => item.quantity <= 0);
      if (hasZeroQty) {
        errors.items = 'All items must have a quantity greater than 0';
      }
    }

    // Validate email format if provided
    if (vendorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendorEmail)) {
      errors.vendorEmail = 'Please enter a valid email address';
    }

    // If there are any errors, set them and don't submit
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/purchase-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description || undefined,
          justification: justification || undefined,
          priority,
          neededByDate: neededByDate || undefined,
          purchaseType,
          paymentMode,
          currency,
          vendorName: vendorName || undefined,
          vendorContact: vendorContact || undefined,
          vendorEmail: vendorEmail || undefined,
          additionalNotes: additionalNotes || undefined,
          items: validItems.map((item) => ({
            description: item.description,
            quantity: typeConfig.showQty ? item.quantity : 1,
            unitPrice: isSubscription ? 0 : item.unitPrice,
            currency,
            billingCycle: isSubscription ? item.billingCycle : 'ONE_TIME',
            durationMonths: isSubscription && item.billingCycle === 'MONTHLY' ? item.durationMonths : undefined,
            amountPerCycle: isSubscription ? item.amountPerCycle : undefined,
            productUrl: item.productUrl || undefined,
          })),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create purchase request');
      }

      const data = await response.json();
      router.push(`/employee/purchase-requests/${data.id}`);
    } catch (error) {
      console.error('Error creating purchase request:', error);
      setError(error instanceof Error ? error.message : 'Failed to create purchase request');
    } finally {
      setSubmitting(false);
    }
  };

  const { totalMonthly, totalContractValue } = calculateTotals();

  return (
    <>
      <PageHeader
        title="New Spend Request"
        subtitle="Fill in the details below to submit a new spend request"
        breadcrumbs={[
          { label: 'Dashboard', href: '/employee' },
          { label: 'Spend Requests', href: '/employee/purchase-requests' },
          { label: 'New Request' }
        ]}
        actions={
          <Link href="/employee/purchase-requests">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Requests
            </Button>
          </Link>
        }
      />

      <PageContent className="max-w-4xl">
        {error && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Request Information */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Request Information</CardTitle>
              <CardDescription>Basic information about your purchase request</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (fieldErrors.title) setFieldErrors(prev => ({ ...prev, title: '' }));
                  }}
                  placeholder="e.g., Office Equipment Purchase"
                  className={fieldErrors.title ? 'border-red-500' : ''}
                />
                {fieldErrors.title && (
                  <p className="text-sm text-red-500">{fieldErrors.title}</p>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={(v) => setPriority(v as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LOW">Low</SelectItem>
                      <SelectItem value="MEDIUM">Medium</SelectItem>
                      <SelectItem value="HIGH">High</SelectItem>
                      <SelectItem value="URGENT">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="neededByDate">Needed By Date</Label>
                  <Input
                    id="neededByDate"
                    type="date"
                    value={neededByDate}
                    onChange={(e) => setNeededByDate(e.target.value)}
                    min={today}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Purchase Type & Cost Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Purchase Type & Cost Details</CardTitle>
              <CardDescription>Define what you are buying and how it will be paid</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="purchaseType">Purchase Type *</Label>
                  <Select
                    value={purchaseType}
                    onValueChange={(v) => {
                      setPurchaseType(v);
                      if (fieldErrors.purchaseType) setFieldErrors(prev => ({ ...prev, purchaseType: '' }));
                    }}
                  >
                    <SelectTrigger className={fieldErrors.purchaseType ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select purchase type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PURCHASE_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.purchaseType && (
                    <p className="text-sm text-red-500">{fieldErrors.purchaseType}</p>
                  )}
                  {purchaseType === 'OTHER' && (
                    <Input
                      className="mt-2"
                      value={otherPurchaseType}
                      onChange={(e) => setOtherPurchaseType(e.target.value)}
                      placeholder="Please specify the purchase type"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={(v) => setCurrency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCurrencies.map((curr) => (
                        <SelectItem key={curr} value={curr}>
                          {curr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    All prices below will be in this currency
                    {currency !== 'QAR' && (
                      <span className="ml-1">
                        (1 {currency} ≈ {formatNumber(exchangeRates[currency] || 1)} QAR)
                        {usingFallbackRates && (
                          <span className="text-amber-600 ml-1" title="Using default exchange rate">⚠</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMode">Mode of Payment</Label>
                <Select value={paymentMode} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((mode) => (
                      <SelectItem key={mode.value} value={mode.value}>
                        {mode.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Business Justification */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Business Justification</CardTitle>
              <CardDescription>Explain why this purchase is needed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="justification">Business Justification *</Label>
                <Textarea
                  id="justification"
                  value={justification}
                  onChange={(e) => {
                    setJustification(e.target.value);
                    if (fieldErrors.justification) setFieldErrors(prev => ({ ...prev, justification: '' }));
                  }}
                  placeholder="Why is this purchase needed?"
                  rows={4}
                  className={fieldErrors.justification ? 'border-red-500' : ''}
                />
                {fieldErrors.justification && (
                  <p className="text-sm text-red-500">{fieldErrors.justification}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Line Items - Table Layout */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Items</CardTitle>
                  <CardDescription>Add each item or subscription you are requesting</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {fieldErrors.items && (
                <p className="text-sm text-red-500 mb-4">{fieldErrors.items}</p>
              )}
              {/* Desktop Table View */}
              <div className={`hidden md:block overflow-x-auto border rounded-lg ${fieldErrors.items ? 'border-red-500' : ''}`}>
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">
                        Description <span className="text-red-500">*</span>
                      </th>
                      {typeConfig.showQty && (
                        <th className="px-3 py-2 text-left font-medium w-24">
                          {typeConfig.qtyLabel} <span className="text-red-500">*</span>
                          {typeConfig.qtyNote && (
                            <span className="block text-xs font-normal text-muted-foreground">{typeConfig.qtyNote}</span>
                          )}
                        </th>
                      )}
                      {typeConfig.showSubscription && (
                        <>
                          <th className="px-3 py-2 text-left font-medium w-28">
                            Billing Cycle
                          </th>
                          <th className="px-3 py-2 text-left font-medium w-28">
                            Duration
                            <span className="block text-xs font-normal text-muted-foreground">(months)</span>
                          </th>
                        </>
                      )}
                      {typeConfig.showUnitPrice && (
                        <th className="px-3 py-2 text-left font-medium w-32">
                          {typeConfig.unitPriceLabel}
                          <span className="block text-xs font-normal text-muted-foreground">in {currencyLabel}</span>
                        </th>
                      )}
                      {typeConfig.showSubscription && (
                        <th className="px-3 py-2 text-left font-medium w-32">
                          Amount/Cycle
                          <span className="block text-xs font-normal text-muted-foreground">in {currencyLabel}</span>
                        </th>
                      )}
                      <th className="px-3 py-2 text-left font-medium">
                        Product Link
                      </th>
                      <th className="px-3 py-2 w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t">
                        <td className="px-3 py-2">
                          <Input
                            value={item.description}
                            onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                            placeholder={typeConfig.descPlaceholder}
                            className="w-full"
                          />
                        </td>
                        {typeConfig.showQty && (
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                              className="w-full"
                            />
                          </td>
                        )}
                        {typeConfig.showSubscription && (
                          <>
                            <td className="px-3 py-2">
                              <Select
                                value={item.billingCycle}
                                onValueChange={(v) => updateItem(item.id, 'billingCycle', v)}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                                  <SelectItem value="YEARLY">Yearly</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-3 py-2">
                              {item.billingCycle === 'MONTHLY' ? (
                                <Input
                                  type="number"
                                  min="1"
                                  value={item.durationMonths || ''}
                                  onChange={(e) => updateItem(item.id, 'durationMonths', parseInt(e.target.value) || null)}
                                  placeholder="e.g. 12"
                                  className="w-full"
                                />
                              ) : (
                                <span className="text-muted-foreground text-xs">N/A</span>
                              )}
                            </td>
                          </>
                        )}
                        {typeConfig.showUnitPrice && (
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={item.unitPrice || ''}
                              onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                        )}
                        {typeConfig.showSubscription && (
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              min="0"
                              value={item.amountPerCycle || ''}
                              onChange={(e) => updateItem(item.id, 'amountPerCycle', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                              className="w-full"
                            />
                          </td>
                        )}
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <Input
                              type="url"
                              value={item.productUrl}
                              onChange={(e) => updateItem(item.id, 'productUrl', e.target.value)}
                              placeholder="https://..."
                              className="w-full"
                            />
                            {item.productUrl && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="shrink-0"
                                asChild
                              >
                                <a href={item.productUrl} target="_blank" rel="noopener noreferrer">
                                  <ExternalLink className="h-4 w-4" />
                                </a>
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.id)}
                            disabled={items.length === 1}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-sm text-muted-foreground">Item #{index + 1}</span>
                      {items.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs">Description *</Label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        placeholder={typeConfig.descPlaceholder}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {typeConfig.showQty && (
                        <div>
                          <Label className="text-xs">{typeConfig.qtyLabel} *</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 1)}
                          />
                        </div>
                      )}

                      {typeConfig.showSubscription && (
                        <>
                          <div>
                            <Label className="text-xs">Billing Cycle</Label>
                            <Select
                              value={item.billingCycle}
                              onValueChange={(v) => updateItem(item.id, 'billingCycle', v)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="MONTHLY">Monthly</SelectItem>
                                <SelectItem value="YEARLY">Yearly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {item.billingCycle === 'MONTHLY' && (
                            <div>
                              <Label className="text-xs">Duration (months)</Label>
                              <Input
                                type="number"
                                min="1"
                                value={item.durationMonths || ''}
                                onChange={(e) => updateItem(item.id, 'durationMonths', parseInt(e.target.value) || null)}
                                placeholder="e.g. 12"
                              />
                            </div>
                          )}

                          <div>
                            <Label className="text-xs">Amount/Cycle ({currencyLabel})</Label>
                            <Input
                              type="number"
                              min="0"
                              value={item.amountPerCycle || ''}
                              onChange={(e) => updateItem(item.id, 'amountPerCycle', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                        </>
                      )}

                      {typeConfig.showUnitPrice && (
                        <div>
                          <Label className="text-xs">{typeConfig.unitPriceLabel} ({currencyLabel})</Label>
                          <Input
                            type="number"
                            min="0"
                            value={item.unitPrice || ''}
                            onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                          />
                        </div>
                      )}
                    </div>

                    <div>
                      <Label className="text-xs">Product Link</Label>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          value={item.productUrl}
                          onChange={(e) => updateItem(item.id, 'productUrl', e.target.value)}
                          placeholder="https://..."
                          className="flex-1"
                        />
                        {item.productUrl && (
                          <Button type="button" variant="outline" size="icon" asChild>
                            <a href={item.productUrl} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button type="button" variant="outline" className="mt-4" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              {/* Summary */}
              <div className="mt-6 pt-4 border-t text-right space-y-1">
                <div className="font-semibold">
                  Estimated Total: {formatAmount(totalContractValue)} {currencyLabel}
                  {currency !== 'QAR' && totalContractValue > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      (≈ {formatAmount(totalContractValue * (exchangeRates[currency] || 1))} QAR)
                    </span>
                  )}
                </div>
                {purchaseType === 'SOFTWARE_SUBSCRIPTION' && totalMonthly > 0 && (
                  <div className="text-sm text-muted-foreground">
                    Monthly Total: {formatAmount(totalMonthly)} {currencyLabel}
                    {currency !== 'QAR' && (
                      <span className="ml-1">
                        (≈ {formatAmount(totalMonthly * (exchangeRates[currency] || 1))} QAR)
                      </span>
                    )}
                  </div>
                )}
                {purchaseType === 'SOFTWARE_SUBSCRIPTION' && totalContractValue > 0 && totalContractValue !== totalMonthly && (
                  <div className="text-sm text-muted-foreground">
                    Contract Total: {formatAmount(totalContractValue)} {currencyLabel}
                    {currency !== 'QAR' && (
                      <span className="ml-1">
                        (≈ {formatAmount(totalContractValue * (exchangeRates[currency] || 1))} QAR)
                      </span>
                    )}
                  </div>
                )}
                {currency !== 'QAR' && usingFallbackRates && (
                  <p className="text-xs text-amber-600">
                    ⚠ Using default exchange rates - actual values may differ
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vendor Details */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Vendor Details</CardTitle>
              <CardDescription>Information about the preferred vendor (optional)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="vendorName">Vendor Name</Label>
                  <Input
                    id="vendorName"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g., ABC Technology"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorContact">Contact Number</Label>
                  <Input
                    id="vendorContact"
                    value={vendorContact}
                    onChange={(e) => setVendorContact(e.target.value)}
                    placeholder="e.g., +974 1234 5678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vendorEmail">Email Address</Label>
                  <Input
                    id="vendorEmail"
                    type="email"
                    value={vendorEmail}
                    onChange={(e) => {
                      setVendorEmail(e.target.value);
                      if (fieldErrors.vendorEmail) setFieldErrors(prev => ({ ...prev, vendorEmail: '' }));
                    }}
                    placeholder="e.g., sales@vendor.com"
                    className={fieldErrors.vendorEmail ? 'border-red-500' : ''}
                  />
                  {fieldErrors.vendorEmail && (
                    <p className="text-sm text-red-500">{fieldErrors.vendorEmail}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Notes */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any other information you want to add</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                placeholder="Any additional information, special requirements, or notes for the admin..."
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Link href="/employee/purchase-requests">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Submit Request
            </Button>
          </div>
        </form>
      </PageContent>
    </>
  );
}
