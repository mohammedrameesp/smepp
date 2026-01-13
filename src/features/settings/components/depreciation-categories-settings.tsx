'use client';

/**
 * @file depreciation-categories-settings.tsx
 * @description Depreciation category management for organization settings
 * @module components/domains/system/settings
 *
 * FEATURES:
 * - View, create, edit, delete depreciation categories
 * - Seed default Qatar tax depreciation rates
 * - Toggle active/inactive status
 *
 * CATEGORIES (Qatar Tax Authority rates):
 * - Machinery & Equipment: 15% (7 years)
 * - Vehicles: 20% (5 years)
 * - Furniture & Office Equipment: 15% (7 years)
 * - Computers & IT Equipment: 33.33% (3 years)
 * - Electrical Equipment: 20% (5 years)
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calculator,
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Loader2,
  Download,
  Info,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DepreciationCategory {
  id: string;
  code: string;
  name: string;
  annualRate: number;
  usefulLifeYears: number;
  description: string | null;
  isActive: boolean;
  assetsCount?: number;
}

interface DepreciationCategoriesSettingsProps {
  organizationId: string;
  isAdmin?: boolean;
}

export function DepreciationCategoriesSettings({
  isAdmin = true,
}: DepreciationCategoriesSettingsProps) {
  const [categories, setCategories] = useState<DepreciationCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInactive, setShowInactive] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Create form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createAnnualRate, setCreateAnnualRate] = useState('');
  const [createUsefulLifeYears, setCreateUsefulLifeYears] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editCategory, setEditCategory] = useState<DepreciationCategory | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editAnnualRate, setEditAnnualRate] = useState('');
  const [editUsefulLifeYears, setEditUsefulLifeYears] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteCategory, setDeleteCategory] = useState<DepreciationCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const seedDefaultCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/depreciation/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error seeding default categories:', error);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch('/api/depreciation/categories?includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        const fetchedCategories = data.categories || [];
        setCategories(fetchedCategories);

        // Auto-seed defaults if no categories exist
        if (fetchedCategories.length === 0 && isAdmin) {
          await seedDefaultCategories();
        }
      } else {
        toast.error('Failed to load depreciation categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load depreciation categories');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, seedDefaultCategories]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      const response = await fetch('/api/depreciation/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'seed' }),
      });

      if (response.ok) {
        const data = await response.json();
        const created = data.results?.filter((r: { action: string }) => r.action === 'created').length || 0;
        const existed = data.results?.filter((r: { action: string }) => r.action === 'exists').length || 0;

        if (created > 0) {
          toast.success(`Created ${created} default categories`);
        } else if (existed > 0) {
          toast.info('All default categories already exist');
        }
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to seed categories');
      }
    } catch (error) {
      console.error('Error seeding categories:', error);
      toast.error('Failed to seed categories');
    } finally {
      setSeeding(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createCode || !createName || !createAnnualRate) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/depreciation/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createCode.toUpperCase(),
          name: createName,
          annualRate: parseFloat(createAnnualRate),
          usefulLifeYears: createUsefulLifeYears ? parseInt(createUsefulLifeYears, 10) : Math.round(100 / parseFloat(createAnnualRate)),
          description: createDescription || null,
        }),
      });

      if (response.ok) {
        toast.success('Category created successfully');
        resetCreateForm();
        setShowCreateDialog(false);
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create category');
      }
    } catch (error) {
      console.error('Error creating category:', error);
      toast.error('Failed to create category');
    } finally {
      setIsCreating(false);
    }
  }

  function resetCreateForm() {
    setCreateCode('');
    setCreateName('');
    setCreateAnnualRate('');
    setCreateUsefulLifeYears('');
    setCreateDescription('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editCategory || !editCode || !editName || !editAnnualRate) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/depreciation/categories/${editCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editCode.toUpperCase(),
          name: editName,
          annualRate: parseFloat(editAnnualRate),
          usefulLifeYears: editUsefulLifeYears ? parseInt(editUsefulLifeYears, 10) : Math.round(100 / parseFloat(editAnnualRate)),
          description: editDescription || null,
        }),
      });

      if (response.ok) {
        toast.success('Category updated successfully');
        setEditCategory(null);
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update category');
      }
    } catch (error) {
      console.error('Error updating category:', error);
      toast.error('Failed to update category');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleToggleActive(category: DepreciationCategory) {
    try {
      const response = await fetch(`/api/depreciation/categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (response.ok) {
        toast.success(`Category ${category.isActive ? 'deactivated' : 'activated'}`);
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to toggle category');
      }
    } catch (error) {
      console.error('Error toggling category:', error);
      toast.error('Failed to toggle category');
    }
  }

  async function handleDelete() {
    if (!deleteCategory) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/depreciation/categories/${deleteCategory.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Category deleted');
        setDeleteCategory(null);
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      toast.error('Failed to delete category');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditDialog(category: DepreciationCategory) {
    setEditCategory(category);
    setEditCode(category.code);
    setEditName(category.name);
    setEditAnnualRate(category.annualRate.toString());
    setEditUsefulLifeYears(category.usefulLifeYears.toString());
    setEditDescription(category.description || '');
  }

  // Auto-calculate useful life when rate changes
  function handleRateChange(rate: string, setter: (v: string) => void, lifeSetter: (v: string) => void) {
    setter(rate);
    const rateNum = parseFloat(rate);
    if (!isNaN(rateNum) && rateNum > 0) {
      lifeSetter(Math.round(100 / rateNum).toString());
    }
  }

  // Auto-calculate rate when useful life changes
  function handleLifeChange(years: string, setter: (v: string) => void, rateSetter: (v: string) => void) {
    setter(years);
    const yearsNum = parseInt(years, 10);
    if (!isNaN(yearsNum) && yearsNum > 0) {
      rateSetter((100 / yearsNum).toFixed(2));
    }
  }

  const activeCategories = categories.filter((c) => c.isActive);
  const inactiveCategories = categories.filter((c) => !c.isActive);
  const displayCategories = showInactive ? categories : activeCategories;

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Calculator className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Depreciation Categories</CardTitle>
                <CardDescription>
                  Configure depreciation rates for asset categories (Qatar Tax Authority rates)
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {inactiveCategories.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowInactive(!showInactive)}
                >
                  {showInactive ? 'Hide' : 'Show'} Inactive ({inactiveCategories.length})
                </Button>
              )}
              {isAdmin && categories.length === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSeedDefaults}
                  disabled={seeding}
                >
                  {seeding ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 mr-2" />
                  )}
                  Load Defaults
                </Button>
              )}
              {isAdmin && (
                <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Category
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading categories...
            </div>
          ) : displayCategories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <p>No depreciation categories configured.</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right w-28">
                      <span className="flex items-center justify-end gap-1">
                        Annual Rate
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-3.5 w-3.5 text-muted-foreground" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Percentage of asset value depreciated per year</p>
                          </TooltipContent>
                        </Tooltip>
                      </span>
                    </TableHead>
                    <TableHead className="text-right w-28">Useful Life</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-right w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayCategories.map((category) => (
                    <TableRow key={category.id} className={!category.isActive ? 'opacity-50' : ''}>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {category.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          {!category.isActive && (
                            <Badge variant="secondary" className="text-xs">Inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {category.annualRate.toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {category.usefulLifeYears} {category.usefulLifeYears === 1 ? 'year' : 'years'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(category)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleActive(category)}
                              title={category.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {category.isActive ? (
                                <ToggleRight className="h-4 w-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteCategory(category)}
                              title="Delete"
                              disabled={(category.assetsCount ?? 0) > 0}
                              className={(category.assetsCount ?? 0) > 0 ? 'opacity-30' : ''}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Info box */}
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-sm text-amber-900">
              <strong>Straight-Line Method:</strong> Assets are depreciated equally over their useful life.{' '}
              <code className="px-2 py-0.5 bg-amber-100 rounded font-mono text-xs">
                Monthly = (Cost - Salvage) / Useful Life Months
              </code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Depreciation Category</DialogTitle>
            <DialogDescription>
              Create a new depreciation category with rate and useful life settings
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-code">Code *</Label>
                  <Input
                    id="create-code"
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    placeholder="e.g., IT_EQUIPMENT"
                    className="uppercase font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-name">Name *</Label>
                  <Input
                    id="create-name"
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    placeholder="e.g., Computers & IT"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="create-rate">Annual Rate (%) *</Label>
                  <Input
                    id="create-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={createAnnualRate}
                    onChange={(e) =>
                      handleRateChange(e.target.value, setCreateAnnualRate, setCreateUsefulLifeYears)
                    }
                    placeholder="e.g., 20.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="create-life">Useful Life (years)</Label>
                  <Input
                    id="create-life"
                    type="number"
                    min="1"
                    max="100"
                    value={createUsefulLifeYears}
                    onChange={(e) =>
                      handleLifeChange(e.target.value, setCreateUsefulLifeYears, setCreateAnnualRate)
                    }
                    placeholder="Auto-calculated"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Input
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="e.g., Laptops, desktops, servers"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCreateDialog(false);
                  resetCreateForm();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !createCode || !createName || !createAnnualRate}>
                {isCreating ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Depreciation Category</DialogTitle>
            <DialogDescription>Update the category settings</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-code">Code *</Label>
                  <Input
                    id="edit-code"
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                    className="uppercase font-mono"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name *</Label>
                  <Input
                    id="edit-name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-rate">Annual Rate (%) *</Label>
                  <Input
                    id="edit-rate"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={editAnnualRate}
                    onChange={(e) =>
                      handleRateChange(e.target.value, setEditAnnualRate, setEditUsefulLifeYears)
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-life">Useful Life (years)</Label>
                  <Input
                    id="edit-life"
                    type="number"
                    min="1"
                    max="100"
                    value={editUsefulLifeYears}
                    onChange={(e) =>
                      handleLifeChange(e.target.value, setEditUsefulLifeYears, setEditAnnualRate)
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || !editCode || !editName || !editAnnualRate}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteCategory} onOpenChange={(open) => !open && setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Depreciation Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteCategory?.name}&quot;?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
