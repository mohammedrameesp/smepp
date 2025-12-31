'use client';

/**
 * @file ModuleStep.tsx
 * @description Step 5 - Module selection (required)
 * @module setup/steps
 */

import {
  Package,
  RefreshCw,
  Building,
  Users,
  Calendar,
  DollarSign,
  ClipboardList,
  ShoppingCart,
  FileText,
  Check,
  Blocks,
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
  defaultOn: boolean;
}

interface Category {
  name: string;
  color: string;
  modules: Module[];
}

const MODULE_CATEGORIES: Category[] = [
  {
    name: 'Operations',
    color: '#3b82f6',
    modules: [
      { id: 'assets', name: 'Assets', description: 'Track company assets & assignments', icon: Package, defaultOn: true },
      { id: 'subscriptions', name: 'Subscriptions', description: 'Manage software subscriptions', icon: RefreshCw, defaultOn: true },
      { id: 'suppliers', name: 'Suppliers', description: 'Vendor management', icon: Building, defaultOn: true },
    ],
  },
  {
    name: 'Human Resources',
    color: '#22c55e',
    modules: [
      { id: 'employees', name: 'Employees', description: 'Employee profiles & HR data', icon: Users, defaultOn: false },
      { id: 'leave', name: 'Leave Management', description: 'Leave requests & balances', icon: Calendar, defaultOn: false },
      { id: 'payroll', name: 'Payroll', description: 'Salary & payslips', icon: DollarSign, defaultOn: false },
    ],
  },
  {
    name: 'Projects & Procurement',
    color: '#a855f7',
    modules: [
      { id: 'projects', name: 'Projects', description: 'Project management', icon: ClipboardList, defaultOn: false },
      { id: 'purchase-requests', name: 'Purchase Requests', description: 'Procurement workflow', icon: ShoppingCart, defaultOn: false },
    ],
  },
  {
    name: 'Documents',
    color: '#f97316',
    modules: [
      { id: 'documents', name: 'Company Documents', description: 'Document management', icon: FileText, defaultOn: false },
    ],
  },
];

export function ModuleStep({ selected, onChange }: ModuleStepProps) {
  const toggleModule = (id: string) => {
    onChange(
      selected.includes(id)
        ? selected.filter((m) => m !== id)
        : [...selected, id]
    );
  };

  const selectAll = () => {
    const allModuleIds = MODULE_CATEGORIES.flatMap((c) =>
      c.modules.map((m) => m.id)
    );
    onChange(allModuleIds);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 mx-auto mb-6 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Blocks className="w-8 h-8 text-slate-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-3">
          Choose your modules
        </h1>
        <p className="text-slate-600">
          Select the features you need. You can change these anytime.
        </p>
      </div>

      <div className="space-y-6">
        {MODULE_CATEGORIES.map((category) => (
          <div key={category.name}>
            <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3 flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              {category.name}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {category.modules.map((module) => {
                const isSelected = selected.includes(module.id);
                const Icon = module.icon;

                return (
                  <button
                    key={module.id}
                    onClick={() => toggleModule(module.id)}
                    className={`bg-white border-2 rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-md ${
                      isSelected ? 'border-slate-900 bg-slate-50' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors`}
                        style={{
                          backgroundColor: isSelected
                            ? `${category.color}20`
                            : '#f1f5f9',
                          color: isSelected ? category.color : '#94a3b8',
                        }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          isSelected ? 'bg-slate-900' : 'border-2 border-slate-300'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    </div>
                    <h4 className="font-semibold text-slate-900 text-sm mb-1">
                      {module.name}
                    </h4>
                    <p className="text-xs text-slate-500">{module.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Selection summary */}
      <div className="mt-6 p-4 bg-slate-100 rounded-xl border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-slate-900">
              {selected.length} modules selected
            </span>
            {selected.length > 0 && (
              <span className="text-sm text-slate-600 ml-2">
                {selected
                  .map((id) => {
                    const mod = MODULE_CATEGORIES.flatMap((c) => c.modules).find(
                      (m) => m.id === id
                    );
                    return mod?.name;
                  })
                  .filter(Boolean)
                  .slice(0, 3)
                  .join(', ')}
                {selected.length > 3 && ` +${selected.length - 3} more`}
              </span>
            )}
          </div>
          <button
            onClick={selectAll}
            className="text-sm text-slate-600 hover:text-slate-900 font-medium"
          >
            Select All
          </button>
        </div>
      </div>
    </div>
  );
}
