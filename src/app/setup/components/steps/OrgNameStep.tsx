'use client';

/**
 * @file OrgNameStep.tsx
 * @description Step 1 - Organization name and code prefix input (required)
 * @module setup/steps
 */

import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Building2, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { generateCodePrefixFromName } from '@/lib/utils/code-prefix';

interface OrgNameStepProps {
  value: string;
  onChange: (value: string) => void;
  codePrefix: string;
  onCodePrefixChange: (value: string) => void;
}

export function OrgNameStep({
  value,
  onChange,
  codePrefix,
  onCodePrefixChange,
}: OrgNameStepProps) {
  const [userEditedPrefix, setUserEditedPrefix] = useState(false);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Validate prefix format (3 uppercase alphanumeric)
  const isValidPrefix = /^[A-Z0-9]{3}$/.test(codePrefix);
  const isPartialPrefix = codePrefix.length > 0 && codePrefix.length < 3;

  // Auto-generate suggestion from org name (only if user hasn't manually edited)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (value.trim() && !userEditedPrefix) {
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
  }, [value, onCodePrefixChange, userEditedPrefix]);

  const handlePrefixChange = (newPrefix: string) => {
    const upperPrefix = newPrefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3);
    setUserEditedPrefix(true);
    onCodePrefixChange(upperPrefix);
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Building2 className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          What's your organization called?
        </h1>
        <p className="text-slate-600">
          This will be the name shown throughout your workspace
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 space-y-6">
        {/* Organization Name */}
        <div>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Enter organization name"
            className="h-14 text-lg text-center bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
            autoFocus
          />
        </div>

        {/* Organization Code */}
        <div className="pt-4 border-t border-slate-100">
          <label className="block text-sm font-medium text-slate-700 mb-2 text-center">
            Organization Code
            <span className="text-slate-400 font-normal ml-1">(3 letters)</span>
          </label>
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
                <Check className="w-5 h-5 text-green-500" />
              ) : isPartialPrefix ? (
                <X className="w-5 h-5 text-amber-500" />
              ) : null}
            </div>
          </div>
          {isPartialPrefix && (
            <p className="mt-1 text-sm text-amber-600 text-center">Must be 3 characters</p>
          )}
          {/* Preview */}
          {isValidPrefix && (
            <p className="mt-3 text-sm text-slate-500 text-center">
              Employee IDs will look like: <span className="font-mono font-medium text-slate-700">{codePrefix}-{currentYear}-001</span>
            </p>
          )}
          {!codePrefix && (
            <p className="mt-3 text-sm text-slate-400 text-center">
              Auto-generated from organization name
            </p>
          )}
        </div>

        <p className="text-center text-sm text-slate-500">
          You can change these later in settings
        </p>
      </div>
    </div>
  );
}
