/**
 * @file employment-defaults-settings.tsx
 * @description Settings component for configuring employment terms (probation & notice periods)
 * @module features/settings
 *
 * Qatar Labor Law Reference (Law No. 14 of 2004):
 * - Article 39: Probation period (maximum 6 months)
 * - Article 48: Notice period based on length of service
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Loader2, Save, RefreshCw, Plus, Trash2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { type NoticePeriodTier, QATAR_EMPLOYMENT_DEFAULTS } from '@/lib/domains/hr';

interface EmploymentSettings {
  probationDurationMonths: number;
  probationNoticePeriodDays: number;
  noticePeriodTiers: NoticePeriodTier[];
}

const DEFAULT_SETTINGS: EmploymentSettings = {
  probationDurationMonths: QATAR_EMPLOYMENT_DEFAULTS.probationDurationMonths,
  probationNoticePeriodDays: QATAR_EMPLOYMENT_DEFAULTS.probationNoticePeriodDays,
  noticePeriodTiers: [...QATAR_EMPLOYMENT_DEFAULTS.noticePeriodTiers],
};

export function EmploymentDefaultsSettings() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<EmploymentSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings/employment-defaults');
      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          setSettings(data.settings);
        }
      }
    } catch (error) {
      console.error('Failed to load employment settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate tiers
    if (settings.noticePeriodTiers.length === 0) {
      toast.error('At least one notice period tier is required');
      return;
    }

    const hasZeroTier = settings.noticePeriodTiers.some((t) => t.minServiceMonths === 0);
    if (!hasZeroTier) {
      toast.error('At least one tier must start at 0 months of service');
      return;
    }

    // Check for duplicate service thresholds
    const serviceMonths = settings.noticePeriodTiers.map((t) => t.minServiceMonths);
    const uniqueMonths = new Set(serviceMonths);
    if (uniqueMonths.size !== serviceMonths.length) {
      toast.error('Each tier must have a unique service duration threshold');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch('/api/settings/employment-defaults', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save settings');
      }

      toast.success('Employment settings saved successfully');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save employment settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setSettings({
      probationDurationMonths: QATAR_EMPLOYMENT_DEFAULTS.probationDurationMonths,
      probationNoticePeriodDays: QATAR_EMPLOYMENT_DEFAULTS.probationNoticePeriodDays,
      noticePeriodTiers: [...QATAR_EMPLOYMENT_DEFAULTS.noticePeriodTiers],
    });
    toast.info('Reset to Qatar Labor Law defaults');
  };

  const updateProbation = (field: 'probationDurationMonths' | 'probationNoticePeriodDays', value: string) => {
    const numValue = parseInt(value) || 0;
    setSettings((prev) => ({ ...prev, [field]: numValue }));
  };

  const addTier = () => {
    // Find the highest service month threshold and add 12 months
    const maxServiceMonths = Math.max(...settings.noticePeriodTiers.map((t) => t.minServiceMonths), -12);
    const newTier: NoticePeriodTier = {
      minServiceMonths: maxServiceMonths + 12,
      noticeDays: 30,
    };
    setSettings((prev) => ({
      ...prev,
      noticePeriodTiers: [...prev.noticePeriodTiers, newTier].sort(
        (a, b) => a.minServiceMonths - b.minServiceMonths
      ),
    }));
  };

  const removeTier = (index: number) => {
    if (settings.noticePeriodTiers.length <= 1) {
      toast.error('At least one notice period tier is required');
      return;
    }
    setSettings((prev) => ({
      ...prev,
      noticePeriodTiers: prev.noticePeriodTiers.filter((_, i) => i !== index),
    }));
  };

  const updateTier = (index: number, field: keyof NoticePeriodTier, value: string) => {
    const numValue = parseInt(value) || 0;
    setSettings((prev) => ({
      ...prev,
      noticePeriodTiers: prev.noticePeriodTiers
        .map((tier, i) => (i === index ? { ...tier, [field]: numValue } : tier))
        .sort((a, b) => a.minServiceMonths - b.minServiceMonths),
    }));
  };

  const formatServiceDuration = (months: number, nextMonths?: number): string => {
    if (months === 0 && nextMonths !== undefined) {
      return `0 - ${nextMonths} months`;
    }
    if (nextMonths === undefined) {
      return `${months}+ months`;
    }
    return `${months} - ${nextMonths} months`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  const sortedTiers = [...settings.noticePeriodTiers].sort(
    (a, b) => a.minServiceMonths - b.minServiceMonths
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Employment Terms</CardTitle>
        <CardDescription>
          Configure probation and notice period settings. These apply to all employees in your organization.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {/* Probation Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Probation
          </h3>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="probationDuration">Probation Duration (Months)</Label>
              <Input
                id="probationDuration"
                type="number"
                min="0"
                max="6"
                value={settings.probationDurationMonths}
                onChange={(e) => updateProbation('probationDurationMonths', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Qatar Labor Law maximum: 6 months (Article 39)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="probationNotice">Notice Period During Probation (Days)</Label>
              <Input
                id="probationNotice"
                type="number"
                min="0"
                max="30"
                value={settings.probationNoticePeriodDays}
                onChange={(e) => updateProbation('probationNoticePeriodDays', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Either party can terminate during probation
              </p>
            </div>
          </div>
        </div>

        {/* Notice Periods Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Notice Periods (Post-Probation)
            </h3>
            <Button variant="outline" size="sm" onClick={addTier}>
              <Plus className="mr-1 h-4 w-4" />
              Add Tier
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Service Duration</TableHead>
                <TableHead>Min. Service (Months)</TableHead>
                <TableHead>Notice Period (Days)</TableHead>
                <TableHead className="w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTiers.map((tier, index) => {
                const nextTier = sortedTiers[index + 1];
                return (
                  <TableRow key={index}>
                    <TableCell className="text-muted-foreground">
                      {formatServiceDuration(tier.minServiceMonths, nextTier?.minServiceMonths)}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        value={tier.minServiceMonths}
                        onChange={(e) => updateTier(index, 'minServiceMonths', e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        max="180"
                        value={tier.noticeDays}
                        onChange={(e) => updateTier(index, 'noticeDays', e.target.value)}
                        className="w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(index)}
                        disabled={settings.noticePeriodTiers.length <= 1}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
            <Info className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">
              Per Qatar Labor Law (Article 48): Notice period increases with length of service.
              Default is 30 days for 0-2 years, and 60 days for 2+ years of service.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Reset to Qatar Defaults
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
