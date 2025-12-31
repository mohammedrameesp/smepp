'use client';

/**
 * @file OrgNameStep.tsx
 * @description Step 1 - Organization name input (required)
 * @module setup/steps
 */

import { Input } from '@/components/ui/input';
import { Building2 } from 'lucide-react';

interface OrgNameStepProps {
  value: string;
  onChange: (value: string) => void;
}

export function OrgNameStep({ value, onChange }: OrgNameStepProps) {
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

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter organization name"
          className="h-14 text-lg text-center bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-900 focus:border-slate-900"
          autoFocus
        />
        <p className="mt-3 text-center text-sm text-slate-500">
          You can change this later in settings
        </p>
      </div>
    </div>
  );
}
