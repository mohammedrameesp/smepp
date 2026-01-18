'use client';

/**
 * @file ColorStep.tsx
 * @description Step 4 - Brand color selection (compact, modern design)
 * @module setup/steps
 */

import { useState, useMemo } from 'react';
import { Palette, Check, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/core/utils';

// Validate hex color format
function validateHexColor(color: string): { isValid: boolean; error?: string } {
  if (!color) return { isValid: true }; // Empty is valid (optional)
  if (/^#[0-9A-Fa-f]{6}$/.test(color)) return { isValid: true };
  if (/^#[0-9A-Fa-f]{3}$/.test(color)) return { isValid: true };
  if (/^[0-9A-Fa-f]{6}$/.test(color)) return { isValid: false, error: 'Add # prefix (e.g., #FF5733)' };
  if (/^[0-9A-Fa-f]{3}$/.test(color)) return { isValid: false, error: 'Add # prefix (e.g., #F53)' };
  return { isValid: false, error: 'Invalid hex color (e.g., #FF5733)' };
}

interface ColorStepProps {
  primaryColor: string;
  secondaryColor: string;
  onPrimaryChange: (color: string) => void;
  onSecondaryChange: (color: string) => void;
  orgName: string;
  logoPreview?: string | null;
}

// Platform default colors (shown in preview when no custom color selected)
const PLATFORM_DEFAULT_PRIMARY = '#0f172a';
const PLATFORM_DEFAULT_SECONDARY = '#64748b';

// Curated color palette - fewer, more distinct options
const COLOR_PRESETS = [
  { name: 'Slate', value: '#0f172a' },
  { name: 'Blue', value: '#2563eb' },
  { name: 'Indigo', value: '#4f46e5' },
  { name: 'Purple', value: '#7c3aed' },
  { name: 'Rose', value: '#e11d48' },
  { name: 'Orange', value: '#ea580c' },
  { name: 'Green', value: '#16a34a' },
  { name: 'Teal', value: '#0d9488' },
];

export function ColorStep({
  primaryColor,
  secondaryColor,
  onPrimaryChange,
  onSecondaryChange,
  orgName,
  logoPreview,
}: ColorStepProps) {
  const [activeTab, setActiveTab] = useState<'primary' | 'secondary'>('primary');

  // For preview display only - uses platform defaults when empty
  const displayPrimary = primaryColor || PLATFORM_DEFAULT_PRIMARY;
  const displaySecondary = secondaryColor || PLATFORM_DEFAULT_SECONDARY;

  const activeColor = activeTab === 'primary' ? primaryColor : secondaryColor;
  const onColorChange = activeTab === 'primary' ? onPrimaryChange : onSecondaryChange;
  const isUsingDefault = !activeColor;

  // Live validation for current color
  const colorValidation = useMemo(() => validateHexColor(activeColor), [activeColor]);

  return (
    <div className="max-w-xl mx-auto">
      {/* Header - Compact */}
      <div className="text-center mb-4">
        <div className="w-10 h-10 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
          <Palette className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-1">
          Brand Colors
        </h1>
        <p className="text-sm text-slate-500">
          Customize your brand colors or use platform defaults
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Live Preview - Top */}
        <div className="p-4 bg-slate-50 border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-7 h-7 object-contain rounded" />
              ) : (
                <div
                  className="w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs"
                  style={{ backgroundColor: displayPrimary }}
                >
                  {orgName?.charAt(0)?.toUpperCase() || 'D'}
                </div>
              )}
              <span className="font-medium text-slate-800 text-sm">
                {orgName || 'Your Organization'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1.5 text-white rounded-md text-xs font-medium"
                style={{ backgroundColor: displayPrimary }}
              >
                Save
              </button>
              <button
                className="px-3 py-1.5 rounded-md text-xs font-medium border"
                style={{ borderColor: displaySecondary, color: displaySecondary }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Color Selection */}
        <div className="p-4">
          {/* Tab Toggle */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-4">
            <button
              onClick={() => setActiveTab('primary')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
                activeTab === 'primary'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {primaryColor ? (
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300" />
              )}
              Primary
            </button>
            <button
              onClick={() => setActiveTab('secondary')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
                activeTab === 'secondary'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              {secondaryColor ? (
                <div
                  className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                  style={{ backgroundColor: secondaryColor }}
                />
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-dashed border-slate-300" />
              )}
              Secondary
            </button>
          </div>

          {/* Current Selection Status */}
          {isUsingDefault && (
            <div className="mb-3 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-600">
                Using platform default. Select a color below to customize.
              </p>
            </div>
          )}

          {/* Color Grid */}
          <div className="flex items-center gap-2 mb-3">
            {COLOR_PRESETS.map((color) => (
              <button
                key={color.value}
                onClick={() => onColorChange(color.value)}
                className={cn(
                  'relative w-9 h-9 rounded-lg transition-all flex-shrink-0',
                  activeColor === color.value
                    ? 'ring-2 ring-slate-900 ring-offset-2 scale-110'
                    : 'hover:scale-105 hover:shadow-md'
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {activeColor === color.value && (
                  <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
                )}
              </button>
            ))}
          </div>

          {/* Custom Color Input */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="color"
                value={activeColor || PLATFORM_DEFAULT_PRIMARY}
                onChange={(e) => onColorChange(e.target.value)}
                className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0 appearance-none [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0 [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0"
                style={{ backgroundColor: activeColor || '#e2e8f0' }}
              />
            </div>
            <div className="relative flex-1">
              <Input
                type="text"
                value={activeColor}
                onChange={(e) => onColorChange(e.target.value)}
                placeholder="Platform default"
                className={cn(
                  "font-mono text-sm bg-slate-50 h-9 uppercase pr-8",
                  activeColor && !colorValidation.isValid && "border-red-500 focus:border-red-500 focus:ring-red-500",
                  activeColor && colorValidation.isValid && "border-green-500 focus:border-green-500 focus:ring-green-500"
                )}
              />
              {activeColor && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  {colorValidation.isValid ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {activeColor && (
              <button
                onClick={() => onColorChange('')}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors"
                title="Reset to platform default"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Validation error */}
          {activeColor && !colorValidation.isValid && (
            <p className="text-xs text-red-600 mt-1">{colorValidation.error}</p>
          )}

          <p className="text-xs text-slate-400 mt-2">
            {activeTab === 'primary'
              ? 'Used for buttons and key actions'
              : 'Used for links, borders, and accents'}
          </p>
        </div>
      </div>
    </div>
  );
}
