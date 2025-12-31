/**
 * @file exchange-rate-settings.tsx
 * @description Settings component for managing USD to QAR currency exchange rate
 * @module components/domains/system/settings
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';

export function ExchangeRateSettings() {
  const [rate, setRate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [updatedBy, setUpdatedBy] = useState<string | null>(null);

  useEffect(() => {
    fetchRate();
  }, []);

  const fetchRate = async () => {
    try {
      const response = await fetch('/api/settings/exchange-rate');
      if (!response.ok) throw new Error('Failed to fetch rate');

      const data = await response.json();
      setRate(data.rate.toString());
      setLastUpdated(data.lastUpdated);
      setUpdatedBy(data.updatedBy);
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      toast.error('Failed to load exchange rate', { duration: 10000 });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const rateNum = parseFloat(rate);

    if (isNaN(rateNum) || rateNum <= 0) {
      toast.error('Invalid exchange rate', { description: 'Please enter a valid positive number', duration: 10000 });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/settings/exchange-rate', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rateNum }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update rate');
      }

      const data = await response.json();
      setRate(data.rate.toString());
      setLastUpdated(data.lastUpdated);
      setUpdatedBy(data.updatedBy);

      toast.success('Exchange rate updated successfully', {
        description: `New rate: 1 USD = ${data.rate} QAR`,
        duration: 5000,
      });
    } catch (error) {
      console.error('Error updating exchange rate:', error);
      toast.error('Failed to update exchange rate', {
        description: error instanceof Error ? error.message : 'Unknown error',
        duration: 8000,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Currency Exchange Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Currency Exchange Rate
        </CardTitle>
        <CardDescription>
          Set the USD to QAR exchange rate for currency conversions across the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="exchange-rate">1 USD = ? QAR</Label>
            <div className="flex gap-2">
              <Input
                id="exchange-rate"
                type="number"
                step="0.01"
                min="0"
                value={rate}
                onChange={(e) => setRate(e.target.value)}
                placeholder="3.64"
                className="flex-1"
              />
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
            <p className="text-sm text-gray-500">
              Current rate: 1 USD = {rate} QAR
            </p>
          </div>

          <div className="space-y-2">
            <Label>Quick Reference</Label>
            <div className="rounded-md bg-gray-50 p-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">100 USD</span>
                <span className="font-medium">{(100 * parseFloat(rate || '0')).toFixed(2)} QAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">1000 USD</span>
                <span className="font-medium">{(1000 * parseFloat(rate || '0')).toFixed(2)} QAR</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">10000 USD</span>
                <span className="font-medium">{(10000 * parseFloat(rate || '0')).toFixed(2)} QAR</span>
              </div>
            </div>
          </div>
        </div>

        {lastUpdated && (
          <div className="text-sm text-gray-500 pt-2 border-t">
            Last updated: {new Date(lastUpdated).toLocaleString()}
            {updatedBy && <> by {updatedBy}</>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
