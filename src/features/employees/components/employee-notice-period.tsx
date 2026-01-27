/**
 * @file employee-notice-period.tsx
 * @description Component to display employee's notice period and probation status
 * @module features/employees
 *
 * Calculates notice period dynamically based on:
 * - Employee's date of joining
 * - Organization's employment settings (probation duration, notice period tiers)
 */
'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { formatDate } from '@/lib/core/datetime';
import { ICON_SIZES } from '@/lib/constants';
import {
  calculateNoticePeriod,
  isInProbation,
  getProbationEndDate,
  getNoticePeriodDescription,
  QATAR_EMPLOYMENT_DEFAULTS,
  type EmploymentSettings,
} from '@/lib/domains/hr';

interface EmployeeNoticePeriodProps {
  dateOfJoining: Date | null;
  /** If provided, shows inline. Otherwise shows as a card-like display */
  variant?: 'inline' | 'detailed';
  /** Optional class name for styling */
  className?: string;
}

export function EmployeeNoticePeriod({
  dateOfJoining,
  variant = 'inline',
  className = '',
}: EmployeeNoticePeriodProps) {
  const [settings, setSettings] = useState<EmploymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/employment-defaults');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || QATAR_EMPLOYMENT_DEFAULTS);
      } else {
        setSettings(QATAR_EMPLOYMENT_DEFAULTS as unknown as EmploymentSettings);
      }
    } catch {
      setSettings(QATAR_EMPLOYMENT_DEFAULTS as unknown as EmploymentSettings);
    } finally {
      setIsLoading(false);
    }
  };

  if (!dateOfJoining) {
    return (
      <span className={`text-muted-foreground ${className}`}>
        Date of joining not set
      </span>
    );
  }

  if (isLoading || !settings) {
    return <Skeleton className={`h-5 w-24 ${className}`} />;
  }

  const joinDate = new Date(dateOfJoining);
  const inProbation = isInProbation(joinDate, settings.probationDurationMonths);
  const noticePeriodDays = calculateNoticePeriod(joinDate, settings);
  const serviceDescription = getNoticePeriodDescription(joinDate, settings);

  if (variant === 'inline') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-sm text-gray-900">{noticePeriodDays} days</span>
        {inProbation && (
          <Badge variant="secondary" className="text-xs">
            Probation
          </Badge>
        )}
      </div>
    );
  }

  // Detailed variant
  const probationEndDate = getProbationEndDate(joinDate, settings.probationDurationMonths);
  const now = new Date();
  const daysUntilProbationEnd = Math.ceil(
    (probationEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Probation Status */}
      <div className="flex items-start gap-3">
        {inProbation ? (
          <>
            <AlertCircle className={`${ICON_SIZES.md} text-amber-500 mt-0.5 shrink-0`} />
            <div>
              <p className="text-sm font-medium text-gray-900">In Probation Period</p>
              <p className="text-xs text-muted-foreground">
                {daysUntilProbationEnd > 0
                  ? `${daysUntilProbationEnd} days remaining (ends ${formatDate(probationEndDate)})`
                  : `Ends ${formatDate(probationEndDate)}`}
              </p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle className={`${ICON_SIZES.md} text-green-500 mt-0.5 shrink-0`} />
            <div>
              <p className="text-sm font-medium text-gray-900">Probation Completed</p>
              <p className="text-xs text-muted-foreground">
                Completed on {formatDate(probationEndDate)}
              </p>
            </div>
          </>
        )}
      </div>

      {/* Notice Period */}
      <div className="flex items-start gap-3">
        <Clock className={`${ICON_SIZES.md} text-blue-500 mt-0.5 shrink-0`} />
        <div>
          <p className="text-sm font-medium text-gray-900">
            {noticePeriodDays} Days Notice Period
          </p>
          <p className="text-xs text-muted-foreground">
            {inProbation
              ? 'During probation period'
              : serviceDescription}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to get employment settings and calculate notice period
 */
export function useEmploymentInfo(dateOfJoining: Date | null) {
  const [settings, setSettings] = useState<EmploymentSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings/employment-defaults');
      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings || QATAR_EMPLOYMENT_DEFAULTS);
      } else {
        setSettings(QATAR_EMPLOYMENT_DEFAULTS as unknown as EmploymentSettings);
      }
    } catch {
      setSettings(QATAR_EMPLOYMENT_DEFAULTS as unknown as EmploymentSettings);
    } finally {
      setIsLoading(false);
    }
  };

  if (!dateOfJoining || !settings) {
    return {
      isLoading,
      inProbation: false,
      noticePeriodDays: 30,
      probationEndDate: null,
      serviceDescription: '',
    };
  }

  const joinDate = new Date(dateOfJoining);

  return {
    isLoading,
    inProbation: isInProbation(joinDate, settings.probationDurationMonths),
    noticePeriodDays: calculateNoticePeriod(joinDate, settings),
    probationEndDate: getProbationEndDate(joinDate, settings.probationDurationMonths),
    serviceDescription: getNoticePeriodDescription(joinDate, settings),
  };
}
