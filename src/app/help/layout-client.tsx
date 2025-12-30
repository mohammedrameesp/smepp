'use client';

import * as React from 'react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Home,
  Search,
  HelpCircle,
} from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { AdminTopNav } from '@/components/layout/admin-top-nav';
import { EmployeeTopNav } from '@/components/layout/employee-top-nav';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { CommandPalette } from '@/components/layout/command-palette';
import { type BadgeCounts } from '@/components/layout/sidebar-config';
import type { UserRole } from '@/lib/help/help-types';
import {
  helpCategories,
  filterCategoriesByRole,
  type CategoryInfo,
} from '@/lib/help/help-categories';

interface HelpLayoutClientProps {
  children: React.ReactNode;
  userRole: UserRole;
  isAdmin: boolean;
  enabledModules: string[];
  badgeCounts: BadgeCounts;
  userName: string;
  userEmail: string;
}

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return <HelpCircle className={className} />;
  return <IconComponent className={className} />;
}

// Sidebar navigation item
function NavItem({
  category,
  isOpen,
  onToggle,
  pathname,
}: {
  category: CategoryInfo;
  isOpen: boolean;
  onToggle: () => void;
  pathname: string;
}) {
  const isActive = pathname.includes(`/help/${category.id}`);

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-md transition-colors',
          isActive
            ? 'bg-blue-50 text-blue-700'
            : 'text-gray-700 hover:bg-gray-100'
        )}
      >
        <span className="flex items-center gap-2">
          <DynamicIcon name={category.icon} className="h-4 w-4" />
          {category.name}
        </span>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {isOpen && (
        <div className="ml-4 mt-1 space-y-1">
          {category.modules.map((module) => {
            const isModuleActive = pathname === module.href;
            return (
              <Link
                key={module.id}
                href={module.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                  isModuleActive
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <DynamicIcon name={module.icon} className="h-4 w-4" />
                {module.name}
                {module.adminOnly && (
                  <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Sidebar component
function HelpSidebar({
  categories,
  openCategories,
  toggleCategory,
  pathname,
  onSearchSubmit,
  searchQuery,
  onSearchChange,
}: {
  categories: CategoryInfo[];
  openCategories: Record<string, boolean>;
  toggleCategory: (id: string) => void;
  pathname: string;
  onSearchSubmit: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Search */}
      <div className="p-4 border-b">
        <form onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search help..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
        </form>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 p-4">
        {/* Home link */}
        <Link
          href="/help"
          className={cn(
            'flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md mb-2 transition-colors',
            pathname === '/help'
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100'
          )}
        >
          <Home className="h-4 w-4" />
          Help Home
        </Link>

        {/* Category navigation */}
        <div className="space-y-1">
          {categories.map((category) => (
            <NavItem
              key={category.id}
              category={category}
              isOpen={openCategories[category.id] ?? false}
              onToggle={() => toggleCategory(category.id)}
              pathname={pathname}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export function HelpLayoutClient({
  children,
  userRole,
  isAdmin,
  enabledModules,
  badgeCounts,
}: HelpLayoutClientProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(() => {
    // Open the category that contains the current path
    const initialOpen: Record<string, boolean> = {};
    for (const category of helpCategories) {
      if (pathname.includes(`/help/${category.id}`)) {
        initialOpen[category.id] = true;
      }
    }
    return initialOpen;
  });

  // Filter categories based on role and enabled modules
  const filteredCategories = filterCategoriesByRole(
    helpCategories,
    userRole,
    enabledModules
  );

  const toggleCategory = (id: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      window.location.href = `/help/search?q=${encodeURIComponent(searchQuery.trim())}`;
    }
  };

  // Keyboard shortcut for command palette (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Top Navigation Header - Same as dashboard */}
      {isAdmin ? (
        <AdminTopNav
          badgeCounts={badgeCounts}
          enabledModules={enabledModules}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        />
      ) : (
        <EmployeeTopNav enabledModules={enabledModules} />
      )}

      {/* Command Palette */}
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        enabledModules={enabledModules}
      />

      {/* Main Layout with Sidebar */}
      <div className="min-h-[calc(100vh-3.5rem)] bg-gray-50 pb-20 md:pb-0">
        <div className="flex">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:top-14 lg:bottom-0 bg-white border-r z-30">
            <HelpSidebar
              categories={filteredCategories}
              openCategories={openCategories}
              toggleCategory={toggleCategory}
              pathname={pathname}
              onSearchSubmit={handleSearchSubmit}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
            />
          </aside>

          {/* Mobile Sheet for Help Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="w-72 p-0">
              <div className="flex items-center gap-2 px-6 h-14 border-b">
                <HelpCircle className="h-5 w-5 text-blue-600" />
                <span className="font-semibold">Help & Support</span>
              </div>
              <HelpSidebar
                categories={filteredCategories}
                openCategories={openCategories}
                toggleCategory={toggleCategory}
                pathname={pathname}
                onSearchSubmit={() => {
                  handleSearchSubmit();
                  setMobileMenuOpen(false);
                }}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
              />
            </SheetContent>
          </Sheet>

          {/* Mobile floating menu button */}
          <div className="lg:hidden fixed bottom-24 left-4 z-40">
            <Button
              onClick={() => setMobileMenuOpen(true)}
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
            >
              <HelpCircle className="h-5 w-5 text-white" />
            </Button>
          </div>

          {/* Main content */}
          <main className="flex-1 lg:pl-72">
            <div className="max-w-4xl mx-auto px-4 py-8 lg:px-8">
              {children}
            </div>
          </main>
        </div>
      </div>

      {/* Mobile Bottom Navigation - Same as dashboard */}
      {isAdmin && (
        <MobileBottomNav badgeCounts={badgeCounts} enabledModules={enabledModules} />
      )}
    </>
  );
}
