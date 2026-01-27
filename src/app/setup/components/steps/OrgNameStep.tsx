'use client';

/**
 * @file OrgNameStep.tsx
 * @description Step 1 - Organization name and code prefix input (required)
 * @module setup/steps
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Building2, Check, X, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';
import { generateCodePrefixFromName } from '@/lib/utils/code-prefix';

// Validate website URL (allows with or without protocol)
function validateWebsite(url: string): { isValid: boolean; error?: string } {
  if (!url.trim()) return { isValid: true }; // Empty is valid (optional field)

  // Add protocol if missing for validation
  let urlToTest = url.trim();
  if (!/^https?:\/\//i.test(urlToTest)) {
    urlToTest = `https://${urlToTest}`;
  }

  try {
    const parsed = new URL(urlToTest);
    // Check for valid hostname (must have at least one dot for a real domain)
    if (!parsed.hostname.includes('.')) {
      return { isValid: false, error: 'Enter a valid domain (e.g., example.com)' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Enter a valid website URL' };
  }
}

interface OrgNameStepProps {
  value: string;
  onChange: (value: string) => void;
  codePrefix: string;
  onCodePrefixChange: (value: string) => void;
  codePrefixEdited: boolean;
  onCodePrefixEdited: (edited: boolean) => void;
  website: string;
  onWebsiteChange: (value: string) => void;
}

export function OrgNameStep({
  value,
  onChange,
  codePrefix,
  onCodePrefixChange,
  codePrefixEdited,
  onCodePrefixEdited,
  website,
  onWebsiteChange,
}: OrgNameStepProps) {
  const [websiteTouched, setWebsiteTouched] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate org name
  const orgNameError = useMemo(() => {
    if (!value.trim()) return 'Organization name is required';
    if (value.trim().length < 2) return 'Name must be at least 2 characters';
    return null;
  }, [value]);

  // Validate prefix format (2-3 uppercase alphanumeric)
  const isValidPrefix = /^[A-Z0-9]{2,3}$/.test(codePrefix);
  const isPartialPrefix = codePrefix.length > 0 && codePrefix.length < 2;

  // Validate website
  const websiteValidation = useMemo(() => validateWebsite(website), [website]);

  // Auto-generate suggestion from org name (only if user hasn't manually edited)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim() && !codePrefixEdited) {
      debounceTimerRef.current = setTimeout(() => {
        const suggested = generateCodePrefixFromName(value);
        onCodePrefixChange(suggested);
      }, 300);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [value, onCodePrefixChange, codePrefixEdited]);

  const handlePrefixChange = (newPrefix: string) => {
    const upperPrefix = newPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    onCodePrefixEdited(true);
    onCodePrefixChange(upperPrefix);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Building2 className={`${ICON_SIZES.lg} text-slate-600`} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Organization details
        </h1>
        <p className="text-sm text-slate-600">
          Set up the basics for your workspace
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        {/* Organization Name */}
        <div>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter organization name"
            className="h-12 text-base text-center bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            autoFocus
          />
        </div>

        {/* Website (optional) */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
            Website
            <span className="text-slate-400 font-normal ml-1">(optional)</span>
          </label>
          <div className="relative">
            <Input
              value={website}
              onChange={(e) => onWebsiteChange(e.target.value)}
              onBlur={() => setWebsiteTouched(true)}
              placeholder="yourcompany.com"
              type="text"
              className={cn(
                "h-12 text-base text-center bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900",
                websiteTouched && !websiteValidation.isValid && "border-red-500 focus:border-red-500 focus:ring-red-500",
                websiteTouched && website && websiteValidation.isValid && "border-green-500 focus:border-green-500 focus:ring-green-500"
              )}
            />
            {/* Status indicator */}
            {websiteTouched && website && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {websiteValidation.isValid ? (
                  <Check className={`${ICON_SIZES.md} text-green-500`} />
                ) : (
                  <AlertCircle className={`${ICON_SIZES.md} text-red-500`} />
                )}
              </div>
            )}
          </div>
          {websiteTouched && !websiteValidation.isValid && (
            <p className="mt-1 text-sm text-red-600 text-center">{websiteValidation.error}</p>
          )}
        </div>

        {/* Organization Code */}
        <div className="pt-3 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-1 text-center">
            Organization Code
            <span className="text-slate-400 font-normal ml-1">(2-3 letters)</span>
          </label>
          <p className="text-xs text-slate-500 text-center mb-2">
            Used as a prefix in employee IDs, asset tags, request numbers, and other internal references.
            <br />
            <span className="text-slate-400">This code cannot be changed later. Formats can be customized.</span>
          </p>
          <div className="relative">
            <Input
              value={codePrefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              placeholder="ABC"
              maxLength={3}
              className={cn(
                "h-12 text-lg text-center font-mono tracking-widest uppercase bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900",
                isValidPrefix && "border-green-500 focus:border-green-500 focus:ring-green-500",
                isPartialPrefix && "border-amber-500 focus:border-amber-500 focus:ring-amber-500"
              )}
            />
            {/* Status indicator */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValidPrefix ? (
                <Check className={`${ICON_SIZES.md} text-green-500`} />
              ) : isPartialPrefix ? (
                <X className={`${ICON_SIZES.md} text-amber-500`} />
              ) : null}
            </div>
          </div>
          {isPartialPrefix && (
            <p className="mt-1 text-sm text-amber-600 text-center">Must be 2-3 characters</p>
          )}
          {/* Preview */}
          {isValidPrefix && (
            <p className="mt-3 text-sm text-slate-500 text-center">
              Example: <span className="font-mono font-medium text-slate-700">{codePrefix}-{currentYear}-001</span>
            </p>
          )}
          {!codePrefix && (
            <p className="mt-3 text-sm text-slate-400 text-center">
              Auto-generated from organization name
            </p>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          You can update name and website later in settings
        </p>
      </div>
    </div>
  );
}
