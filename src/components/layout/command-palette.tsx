/**
 * @file command-palette.tsx
 * @description Command palette component for quick navigation and actions
 * @module components/layout
 */

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Users,
  Box,
  Calendar,
  DollarSign,
  CreditCard,
  Truck,
  BarChart3,
  Settings,
  UserPlus,
  Plus,
  ShoppingCart,
  Building2,
  Activity,
  FileCheck,
  Package,
} from 'lucide-react';

interface CommandItem {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  href?: string;
  action?: () => void;
  shortcut?: string;
  moduleId?: string;
  category: 'action' | 'navigation';
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enabledModules?: string[];
}

// Static command items - defined outside component to avoid recreation
const COMMAND_ITEMS: CommandItem[] = [
  // Quick Actions
  { id: 'add-team-member', label: 'Add Team Member', description: 'Add or invite a new team member', icon: UserPlus, href: '/admin/employees', category: 'action' },
  { id: 'add-asset', label: 'Add Asset', description: 'Register new asset', icon: Plus, href: '/admin/assets/new', shortcut: 'N A', moduleId: 'assets', category: 'action' },
  { id: 'add-document', label: 'Add Document', description: 'Track company document', icon: FileCheck, href: '/admin/company-documents/new', moduleId: 'documents', category: 'action' },
  { id: 'run-payroll', label: 'Run Payroll', description: 'Process monthly payroll', icon: DollarSign, href: '/admin/payroll/runs/new', shortcut: 'P', moduleId: 'payroll', category: 'action' },
  { id: 'add-leave-type', label: 'Add Leave Type', description: 'Create new leave type', icon: Calendar, href: '/admin/leave/types/new', moduleId: 'leave', category: 'action' },
  { id: 'add-subscription', label: 'Add Subscription', description: 'Track new SaaS subscription', icon: CreditCard, href: '/admin/subscriptions/new', moduleId: 'subscriptions', category: 'action' },
  { id: 'add-supplier', label: 'Add Supplier', description: 'Register new supplier', icon: Truck, href: '/admin/suppliers/new', moduleId: 'suppliers', category: 'action' },

  // Navigation
  { id: 'nav-dashboard', label: 'Dashboard', icon: Building2, href: '/admin', category: 'navigation' },
  { id: 'nav-team', label: 'Team', icon: Users, href: '/admin/employees', category: 'navigation' },
  { id: 'nav-assets', label: 'Assets', icon: Box, href: '/admin/assets', moduleId: 'assets', category: 'navigation' },
  { id: 'nav-documents', label: 'Company Documents', icon: FileCheck, href: '/admin/company-documents', moduleId: 'documents', category: 'navigation' },
  { id: 'nav-leave', label: 'Leave Requests', icon: Calendar, href: '/admin/leave/requests', moduleId: 'leave', category: 'navigation' },
  { id: 'nav-payroll', label: 'Payroll', icon: DollarSign, href: '/admin/payroll/runs', moduleId: 'payroll', category: 'navigation' },
  { id: 'nav-subscriptions', label: 'Subscriptions', icon: CreditCard, href: '/admin/subscriptions', moduleId: 'subscriptions', category: 'navigation' },
  { id: 'nav-suppliers', label: 'Suppliers', icon: Truck, href: '/admin/suppliers', moduleId: 'suppliers', category: 'navigation' },
  { id: 'nav-purchase-requests', label: 'Spend Requests', icon: ShoppingCart, href: '/admin/purchase-requests', moduleId: 'purchase-requests', category: 'navigation' },
  { id: 'nav-reports', label: 'Reports', icon: BarChart3, href: '/admin/reports', category: 'navigation' },
  { id: 'nav-activity', label: 'Activity Log', icon: Activity, href: '/admin/activity', category: 'navigation' },
  { id: 'nav-settings', label: 'Settings', icon: Settings, href: '/admin/settings', category: 'navigation' },
  { id: 'nav-modules', label: 'Modules', description: 'Install and manage modules', icon: Package, href: '/admin/modules', category: 'navigation' },
];

export function CommandPalette({ open, onOpenChange, enabledModules = [] }: CommandPaletteProps) {
  const router = useRouter();
  const [search, setSearch] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Memoize enabled modules set for O(1) lookups
  const enabledModulesSet = React.useMemo(() => new Set(enabledModules), [enabledModules]);

  // Memoize module-filtered items (only recompute when enabledModules changes)
  const moduleFilteredItems = React.useMemo(() =>
    COMMAND_ITEMS.filter(item => !item.moduleId || enabledModulesSet.has(item.moduleId)),
    [enabledModulesSet]
  );

  // Filter by search term
  const filteredItems = React.useMemo(() => {
    if (!search) return moduleFilteredItems;
    const searchLower = search.toLowerCase();
    return moduleFilteredItems.filter(item =>
      item.label.toLowerCase().includes(searchLower) ||
      item.description?.toLowerCase().includes(searchLower)
    );
  }, [moduleFilteredItems, search]);

  const actionItems = React.useMemo(() =>
    filteredItems.filter(item => item.category === 'action'),
    [filteredItems]
  );

  const navigationItems = React.useMemo(() =>
    filteredItems.filter(item => item.category === 'navigation'),
    [filteredItems]
  );

  const handleSelect = React.useCallback((item: CommandItem) => {
    onOpenChange(false);
    setSearch('');
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href);
    }
  }, [onOpenChange, router]);

  // Focus input when dialog opens
  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 0);
    } else {
      setSearch('');
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0 gap-0 overflow-hidden top-[15%] translate-y-0">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-100">
          <Search className="h-5 w-5 text-slate-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search or type a command..."
            className="flex-1 text-lg outline-none bg-transparent placeholder:text-slate-400"
          />
          <kbd className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[400px] overflow-y-auto">
          {actionItems.length > 0 && (
            <div className="p-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 py-2">
                Quick Actions
              </p>
              {actionItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 text-left group"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <item.icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    {item.description && (
                      <p className="text-xs text-slate-500">{item.description}</p>
                    )}
                  </div>
                  {item.shortcut && (
                    <kbd className="text-xs bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          )}

          {navigationItems.length > 0 && (
            <div className="p-2 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide px-3 py-2">
                Go to
              </p>
              <div className="grid grid-cols-2 gap-1">
                {navigationItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 text-left"
                  >
                    <item.icon className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {filteredItems.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No results found for &ldquo;{search}&rdquo;</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
