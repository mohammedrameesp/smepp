'use client';

/**
 * @file ColorStep.tsx
 * @description Step 4 - Brand color selection (skippable)
 * @module setup/steps
 */

import { Palette, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface ColorStepProps {
  primaryColor: string;
  onPrimaryChange: (color: string) => void;
  orgName: string;
  logoPreview?: string | null;
}

const COLOR_PRESETS = [
  { name: 'Slate', value: '#0f172a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Pink', value: '#db2777' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Red', value: '#dc2626' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Amber', value: '#d97706' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#0d9488' },
  { name: 'Cyan', value: '#0891b2' },
];

export function ColorStep({
  primaryColor,
  onPrimaryChange,
  orgName,
  logoPreview,
}: ColorStepProps) {
  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Palette className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Choose your brand color
        </h1>
        <p className="text-slate-600">
          This color will be used for buttons and accents
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8">
        {/* Color presets grid */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">
            Pick a preset
          </p>
          <div className="grid grid-cols-6 gap-3">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                onClick={() => onPrimaryChange(color.value)}
                className={`relative w-10 h-10 rounded-lg transition-all ${
                  primaryColor === color.value
                    ? 'ring-2 ring-slate-900 ring-offset-2 scale-110'
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {primaryColor === color.value && (
                  <Check className="w-5 h-5 text-white absolute inset-0 m-auto" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom color input */}
        <div className="mb-6">
          <p className="text-sm font-medium text-slate-700 mb-3">
            Or enter a custom color
          </p>
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl border-2 border-white shadow-md flex-shrink-0"
              style={{ backgroundColor: primaryColor }}
            />
            <Input
              type="text"
              value={primaryColor}
              onChange={(e) => onPrimaryChange(e.target.value)}
              placeholder="#0f172a"
              className="flex-1 font-mono text-sm bg-slate-50"
            />
          </div>
        </div>

        {/* Preview */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-3">Preview</p>
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50">
            <div className="flex items-center gap-3 mb-4">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo"
                  className="w-10 h-10 object-contain rounded-lg"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: primaryColor }}
                >
                  {orgName?.charAt(0)?.toUpperCase() || 'D'}
                </div>
              )}
              <span className="font-semibold text-slate-900">
                {orgName || 'Your Organization'}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                className="px-4 py-2 text-white rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                style={{ backgroundColor: primaryColor }}
              >
                Primary Button
              </button>
              <button
                className="px-4 py-2 rounded-lg text-sm font-medium border-2"
                style={{
                  borderColor: primaryColor,
                  color: primaryColor
                }}
              >
                Secondary
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
