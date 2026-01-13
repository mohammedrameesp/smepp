'use client';

/**
 * @file asset-type-mappings-settings.tsx
 * @description Custom asset type mappings management for organization settings
 *              Allows admins to add custom type-to-category mappings that appear in auto-suggestions
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Sparkles,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
} from 'lucide-react';

interface AssetCategory {
  id: string;
  code: string;
  name: string;
}

interface AssetTypeMapping {
  id: string;
  typeName: string;
  categoryId: string;
  category: AssetCategory;
}

interface AssetTypeMappingsSettingsProps {
  organizationId: string;
  isAdmin?: boolean;
}

export function AssetTypeMappingsSettings({
  isAdmin = true,
}: AssetTypeMappingsSettingsProps) {
  const [mappings, setMappings] = useState<AssetTypeMapping[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createTypeName, setCreateTypeName] = useState('');
  const [createCategoryId, setCreateCategoryId] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editMapping, setEditMapping] = useState<AssetTypeMapping | null>(null);
  const [editTypeName, setEditTypeName] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteMapping, setDeleteMapping] = useState<AssetTypeMapping | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [mappingsRes, categoriesRes] = await Promise.all([
        fetch('/api/asset-type-mappings'),
        fetch('/api/asset-categories'),
      ]);

      if (mappingsRes.ok) {
        const data = await mappingsRes.json();
        setMappings(data.mappings || []);
      }

      if (categoriesRes.ok) {
        const data = await categoriesRes.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createTypeName || !createCategoryId) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/asset-type-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName: createTypeName.trim(),
          categoryId: createCategoryId,
        }),
      });

      if (response.ok) {
        toast.success('Custom type added successfully');
        setCreateTypeName('');
        setCreateCategoryId('');
        setShowCreateDialog(false);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to add custom type');
      }
    } catch (error) {
      console.error('Error creating mapping:', error);
      toast.error('Failed to add custom type');
    } finally {
      setIsCreating(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editMapping || !editTypeName || !editCategoryId) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/asset-type-mappings/${editMapping.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName: editTypeName.trim(),
          categoryId: editCategoryId,
        }),
      });

      if (response.ok) {
        toast.success('Custom type updated');
        setEditMapping(null);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) {
      console.error('Error updating mapping:', error);
      toast.error('Failed to update');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteMapping) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/asset-type-mappings/${deleteMapping.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Custom type deleted');
        setDeleteMapping(null);
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Error deleting mapping:', error);
      toast.error('Failed to delete');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditDialog(mapping: AssetTypeMapping) {
    setEditMapping(mapping);
    setEditTypeName(mapping.typeName);
    setEditCategoryId(mapping.categoryId);
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <CardTitle>Custom Asset Types</CardTitle>
                <CardDescription>
                  Add organization-specific asset types that appear in auto-suggestions
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading custom types...
            </div>
          ) : mappings.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <p>No custom types yet.</p>
              <p className="text-sm mt-1">
                Add custom asset types for your organization that will appear in suggestions.
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappings.map((mapping) => (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                          <span className="font-medium">{mapping.typeName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {mapping.category.code}
                        </Badge>
                        <span className="ml-2 text-muted-foreground">
                          {mapping.category.name}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(mapping)}
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteMapping(mapping)}
                              title="Delete"
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
              <strong>How it works:</strong> Custom types appear in suggestions when users
              create assets. They&apos;re shown with a{' '}
              <Star className="h-3 w-3 inline text-amber-500 fill-amber-500" /> star and
              automatically assign the mapped category.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Asset Type</DialogTitle>
            <DialogDescription>
              Create a custom type that will appear in asset type suggestions
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-type">Type Name *</Label>
                <Input
                  id="create-type"
                  value={createTypeName}
                  onChange={(e) => setCreateTypeName(e.target.value)}
                  placeholder="e.g., Drawings, Blueprint, Studio Mic"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-category">Category *</Label>
                <Select value={createCategoryId} onValueChange={setCreateCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="font-mono mr-2">{cat.code}</span>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  When users type this asset type, this category will be auto-assigned
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating || !createTypeName || !createCategoryId}>
                {isCreating ? 'Adding...' : 'Add Type'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editMapping} onOpenChange={(open) => !open && setEditMapping(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Custom Type</DialogTitle>
            <DialogDescription>Update the type name or category</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type Name *</Label>
                <Input
                  id="edit-type"
                  value={editTypeName}
                  onChange={(e) => setEditTypeName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category *</Label>
                <Select value={editCategoryId} onValueChange={setEditCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <span className="font-mono mr-2">{cat.code}</span>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditMapping(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || !editTypeName || !editCategoryId}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteMapping} onOpenChange={(open) => !open && setDeleteMapping(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Custom Type</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteMapping?.typeName}&quot;?
              This will remove it from auto-suggestions.
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
