/**
 * @file payroll-settings.tsx
 * @description Settings component for configuring default salary component percentages
 * @module components/domains/system/settings
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface SalaryComponentPercentages {
  basic: number;
  housing: number;
  transport: number;
  food: number;
  phone: number;
  other: number;
}

const DEFAULT_PERCENTAGES: SalaryComponentPercentages = {
  basic: 60,
  housing: 20,
  transport: 10,
  food: 5,
  phone: 3,
  other: 2,
};

export function PayrollSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [percentages, setPercentages] = useState<SalaryComponentPercentages>(DEFAULT_PERCENTAGES);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/payroll-percentages');
      if (response.ok) {
        const data = await response.json();
        if (data.percentages) {
          setPercentages(data.percentages);
        }
      }
    } catch (error) {
      console.error('Failed to load payroll settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate total equals 100
    const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
    if (Math.abs(total - 100) > 0.01) {
      toast.error(`Percentages must total 100%. Current total: ${total.toFixed(1)}%`);
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/payroll-percentages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentages }),
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast.success('Payroll settings saved successfully');
    } catch (error) {
      toast.error('Failed to save payroll settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setPercentages(DEFAULT_PERCENTAGES);
    toast.info('Reset to default percentages');
  };

  const updatePercentage = (key: keyof SalaryComponentPercentages, value: string) => {
    const numValue = parseFloat(value) || 0;
    setPercentages((prev) => ({ ...prev, [key]: numValue }));
  };

  const total = Object.values(percentages).reduce((sum, val) => sum + val, 0);
  const isValid = Math.abs(total - 100) < 0.01;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Salary Component Percentages</CardTitle>
        <CardDescription>
          Configure default salary breakdown percentages. When creating a salary structure,
          you can enter the total salary and components will be calculated automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="basic">Basic Salary %</Label>
            <Input
              id="basic"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentages.basic}
              onChange={(e) => updatePercentage('basic', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="housing">Housing Allowance %</Label>
            <Input
              id="housing"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentages.housing}
              onChange={(e) => updatePercentage('housing', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transport">Transport Allowance %</Label>
            <Input
              id="transport"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentages.transport}
              onChange={(e) => updatePercentage('transport', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="food">Food Allowance %</Label>
            <Input
              id="food"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentages.food}
              onChange={(e) => updatePercentage('food', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Allowance %</Label>
            <Input
              id="phone"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentages.phone}
              onChange={(e) => updatePercentage('phone', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="other">Other Allowances %</Label>
            <Input
              id="other"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={percentages.other}
              onChange={(e) => updatePercentage('other', e.target.value)}
            />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isValid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'} border`}>
          <div className="flex justify-between items-center">
            <span className="font-medium">Total:</span>
            <span className={`text-lg font-bold ${isValid ? 'text-green-600' : 'text-red-600'}`}>
              {total.toFixed(1)}%
            </span>
          </div>
          {!isValid && (
            <p className="text-sm text-red-600 mt-1">
              Total must equal 100%
            </p>
          )}
        </div>

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isSaving || !isValid}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
