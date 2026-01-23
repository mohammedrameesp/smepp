'use client';

/**
 * @file ModuleStep.tsx
 * @description Step 6 - Module selection (required)
 * @module setup/steps
 */

import {
  Package,
  RefreshCw,
  Building,
  Calendar,
  DollarSign,
  ShoppingCart,
  FileText,
  Check,
  Blocks,
  AlertCircle,
  Users,
  Lock,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ModuleStepProps {
  selected: string[];
  onChange: (modules: string[]) => void;
}

interface Module {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  warning?: string;
}

interface Section {
  title: string;
  subtitle: string;
  color: string;
  modules: Module[];
  isCore?: boolean; // Core modules can't be toggled
}

// Core modules (like 'employees') are always enabled silently - not shown in UI

// Default modules: pre-selected for new organizations
const DEFAULT_MODULES: Module[] = [
  { id: 'assets', name: 'Assets', description: 'Track company assets & assignments', icon: Package },
  { id: 'subscriptions', name: 'Subscriptions', description: 'Manage software subscriptions', icon: RefreshCw },
  { id: 'suppliers', name: 'Suppliers', description: 'Vendor management', icon: Building },
];

// Add-on modules: optional features
const ADDON_MODULES: Module[] = [
  { id: 'documents', name: 'Company Documents', description: 'Document management', icon: FileText },
  { id: 'purchase-requests', name: 'Purchase Requests', description: 'Procurement workflow', icon: ShoppingCart },
  { id: 'leave', name: 'Leave Management', description: 'Leave requests & balances', icon: Calendar },
  { id: 'payroll', name: 'Payroll', description: 'Salary & payslips', icon: DollarSign, warning: 'Requires additional configuration' },
];

const SECTIONS: Section[] = [
  {
    title: 'Default Modules',
    subtitle: 'Essential modules to get started. Recommended for most organizations.',
    color: '#3b82f6',
    modules: DEFAULT_MODULES,
  },
  {
    title: 'Add-on Modules',
    subtitle: 'Optional features you can enable',
    color: '#22c55e',
    modules: ADDON_MODULES,
  },
];

const ALL_TOGGLEABLE_MODULES = [...DEFAULT_MODULES, ...ADDON_MODULES];

export function ModuleStep({ selected, onChange }: ModuleStepProps) {
  const toggleModule = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((m) => m !== id)
        : [...selected, id]
    );
  };

  const selectAll = () => {
    // Select all available modules
    const allIds = ALL_TOGGLEABLE_MODULES.map(m => m.id);
    onChange(allIds);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Blocks className="w-6 h-6 text-slate-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Choose your modules
        </h1>
        <p className="text-sm text-slate-600">
          Select the features you need. You can change these anytime.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Enabled modules will appear in your workspace menu
        </p>
      </div>

      <div className="space-y-5">
        {SECTIONS.map((section) => (
          <div key={section.title}>
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: section.color }}
                />
                {section.title}
                {section.isCore && (
                  <Lock className="w-3 h-3 text-slate-400" />
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{section.subtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {section.modules.map((module) => {
                const isCore = section.isCore;
                const isSelected = isCore || selected.includes(module.id);
                const Icon = module.icon;

                return (
                  <button
                    key={module.id}
                    onClick={() => !isCore && toggleModule(module.id)}
                    disabled={isCore}
                    className={`bg-white border-2 rounded-xl p-3 text-left transition-all ${
                      isCore
                        ? 'border-indigo-200 bg-indigo-50/50 cursor-default'
                        : 'hover:-translate-y-0.5 hover:shadow-md'
                    } ${
                      !isCore && isSelected ? 'border-slate-900 bg-slate-50' : !isCore ? 'border-slate-200' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                        style={{
                          backgroundColor: isSelected
                            ? `${section.color}20`
                            : '#f1f5f9',
                          color: isSelected ? section.color : '#94a3b8',
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      {isCore ? (
                        <div className="flex items-center gap-1 text-xs text-indigo-600 font-medium">
                          <Lock className="w-3 h-3" />
                          Always on
                        </div>
                      ) : (
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center ${
                            isSelected ? 'bg-slate-900' : 'border-2 border-slate-300'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      )}
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-0.5">
                      {module.name}
                    </h4>
                    <p className="text-xs text-slate-500">{module.description}</p>
                    {module.warning && (
                      <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        {module.warning}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selection summary */}
      <div className="mt-4 p-3 rounded-xl border bg-slate-100 border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-900">
              {selected.length} modules selected
            </span>
            <span className="text-sm text-slate-600 ml-1">
              {selected
                .map((id) => ALL_TOGGLEABLE_MODULES.find((m) => m.id === id)?.name)
                .filter(Boolean)
                .slice(0, 3)
                .join(', ')}
              {selected.length > 3 && ` +${selected.length - 3} more`}
            </span>
          </div>
          <button
            onClick={selectAll}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            Enable all add-ons
          </button>
        </div>
      </div>
    </div>
  );
}
