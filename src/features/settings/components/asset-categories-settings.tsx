'use client';

/**
 * @file asset-categories-settings.tsx
 * @description Asset category management component for organization settings
 * @module components/domains/system/settings
 */

import { useState, useEffect } from 'react';
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
  Tags,
  Plus,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';

interface AssetCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  _count: {
    assets: number;
  };
}

interface AssetCategoriesSettingsProps {
  organizationId: string;
  codePrefix: string;
  isAdmin?: boolean;
}

export function AssetCategoriesSettings({
  codePrefix,
  isAdmin = true,
}: AssetCategoriesSettingsProps) {
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createErrors, setCreateErrors] = useState<{ code?: string; name?: string; description?: string }>({});

  // Edit dialog state
  const [editCategory, setEditCategory] = useState<AssetCategory | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [editErrors, setEditErrors] = useState<{ code?: string; name?: string; description?: string }>({});

  // Delete dialog state
  const [deleteCategory, setDeleteCategory] = useState<AssetCategory | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  async function fetchCategories() {
    try {
      const response = await fetch('/api/asset-categories?includeInactive=true');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        toast.error('Failed to load categories');
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    const errors: { code?: string; name?: string; description?: string } = {};

    if (!createCode) {
      errors.code = 'Code is required';
    } else if (createCode.length < 2 || createCode.length > 3) {
      errors.code = 'Code must be 2-3 characters';
    } else if (!/^[A-Za-z]{2,3}$/.test(createCode)) {
      errors.code = 'Code must be 2-3 letters only';
    }

    if (!createName) {
      errors.name = 'Name is required';
    } else if (createName.length > 50) {
      errors.name = 'Name must be at most 50 characters';
    }

    if (createDescription && createDescription.length > 200) {
      errors.description = 'Description must be at most 200 characters';
    }

    if (Object.keys(errors).length > 0) {
      setCreateErrors(errors);
      return;
    }

    setCreateErrors({});
    setIsCreating(true);
    try {
      const response = await fetch('/api/asset-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createCode.toUpperCase(),
          name: createName,
          ...(createDescription ? { description: createDescription } : {}),
        }),
      });

      if (response.ok) {
        toast.success('Category created successfully');
        setCreateCode('');
        setCreateName('');
        setCreateDescription('');
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

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editCategory) return;

    // Client-side validation
    const errors: { code?: string; name?: string; description?: string } = {};

    if (!editCode) {
      errors.code = 'Code is required';
    } else if (editCode.length < 2 || editCode.length > 3) {
      errors.code = 'Code must be 2-3 characters';
    } else if (!/^[A-Za-z]{2,3}$/.test(editCode)) {
      errors.code = 'Code must be 2-3 letters only';
    }

    if (!editName) {
      errors.name = 'Name is required';
    } else if (editName.length > 50) {
      errors.name = 'Name must be at most 50 characters';
    }

    if (editDescription && editDescription.length > 200) {
      errors.description = 'Description must be at most 200 characters';
    }

    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }

    setEditErrors({});
    setIsUpdating(true);
    try {
      const response = await fetch(`/api/asset-categories/${editCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editCode.toUpperCase(),
          name: editName,
          ...(editDescription ? { description: editDescription } : { description: null }),
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

  async function handleDelete() {
    if (!deleteCategory) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/asset-categories/${deleteCategory.id}`, {
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

  function openEditDialog(category: AssetCategory) {
    setEditCategory(category);
    setEditCode(category.code);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditErrors({});
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <Tags className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <CardTitle>Asset Categories</CardTitle>
                <CardDescription>
                  Manage categories for asset tagging (e.g., {codePrefix}-CP-25001)
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Category
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading categories...
            </div>
          ) : categories.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              No categories found. Add one to get started.
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-center w-20">Assets</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {category.code}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{category.name}</span>
                          {category.isDefault && (
                            <Badge variant="outline" className="text-xs">Default</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{category._count.assets}</Badge>
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
                              onClick={() => setDeleteCategory(category)}
                              title="Delete"
                              disabled={category._count.assets > 0}
                              className={category._count.assets > 0 ? 'opacity-30' : ''}
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

          {/* Tag Format Example */}
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-900">
              <strong>Tag Format:</strong>{' '}
              <code className="px-2 py-0.5 bg-blue-100 rounded font-mono">
                {codePrefix}-[CODE]-[YY][SEQ]
              </code>
              <span className="text-blue-700 ml-2">
                Example: {codePrefix}-CP-25001
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(open) => {
        setShowCreateDialog(open);
        if (!open) setCreateErrors({});
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Asset Category</DialogTitle>
            <DialogDescription>
              Create a new category with a 2-3 letter code for asset tagging
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-code">Code (2-3 letters) *</Label>
                <Input
                  id="create-code"
                  value={createCode}
                  onChange={(e) => {
                    setCreateCode(e.target.value.toUpperCase().slice(0, 3));
                    if (createErrors.code) setCreateErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  placeholder="e.g., IT, FUR, VEH"
                  maxLength={3}
                  className={`uppercase font-mono ${createErrors.code ? 'border-destructive' : ''}`}
                />
                {createErrors.code ? (
                  <p className="text-xs text-destructive">{createErrors.code}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Tag preview: {codePrefix}-<span className="font-mono">{createCode || 'XX'}</span>-25001
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => {
                    setCreateName(e.target.value);
                    if (createErrors.name) setCreateErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g., IT Equipment"
                  className={createErrors.name ? 'border-destructive' : ''}
                />
                {createErrors.name && (
                  <p className="text-xs text-destructive">{createErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Input
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => {
                    setCreateDescription(e.target.value);
                    if (createErrors.description) setCreateErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Optional description (max 200 chars)"
                  className={createErrors.description ? 'border-destructive' : ''}
                />
                {createErrors.description && (
                  <p className="text-xs text-destructive">{createErrors.description}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => {
        if (!open) {
          setEditCategory(null);
          setEditErrors({});
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>Update the category details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code (2-3 letters) *</Label>
                <Input
                  id="edit-code"
                  value={editCode}
                  onChange={(e) => {
                    setEditCode(e.target.value.toUpperCase().slice(0, 3));
                    if (editErrors.code) setEditErrors((prev) => ({ ...prev, code: undefined }));
                  }}
                  maxLength={3}
                  className={`uppercase font-mono ${editErrors.code ? 'border-destructive' : ''}`}
                />
                {editErrors.code && (
                  <p className="text-xs text-destructive">{editErrors.code}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-name">Name *</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    if (editErrors.name) setEditErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={editErrors.name ? 'border-destructive' : ''}
                />
                {editErrors.name && (
                  <p className="text-xs text-destructive">{editErrors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Input
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => {
                    setEditDescription(e.target.value);
                    if (editErrors.description) setEditErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Optional description (max 200 chars)"
                  className={editErrors.description ? 'border-destructive' : ''}
                />
                {editErrors.description && (
                  <p className="text-xs text-destructive">{editErrors.description}</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditCategory(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating}>
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
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
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
    </>
  );
}
