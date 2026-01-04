'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { PageHeader, PageContent } from '@/components/ui/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

interface AssetCategory {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  _count: {
    assets: number;
  };
}

export default function AssetCategoriesPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('active');

  // Create form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createCode, setCreateCode] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editCategory, setEditCategory] = useState<AssetCategory | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

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
    if (!createCode || !createName) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/asset-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: createCode.toUpperCase(),
          name: createName,
          description: createDescription || null,
        }),
      });

      if (response.ok) {
        toast.success('Category created successfully');
        setCreateCode('');
        setCreateName('');
        setCreateDescription('');
        setShowCreateForm(false);
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
    if (!editCategory || !editCode || !editName) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/asset-categories/${editCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: editCode.toUpperCase(),
          name: editName,
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

  async function handleToggleActive(category: AssetCategory) {
    try {
      const response = await fetch(`/api/asset-categories/${category.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !category.isActive }),
      });

      if (response.ok) {
        toast.success(`Category ${category.isActive ? 'deactivated' : 'activated'} successfully`);
        fetchCategories();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to toggle category status');
      }
    } catch (error) {
      console.error('Error toggling category:', error);
      toast.error('Failed to toggle category status');
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
        toast.success('Category deleted successfully');
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
  }

  const activeCategories = categories.filter((c) => c.isActive);
  const inactiveCategories = categories.filter((c) => !c.isActive);

  return (
    <>
      <PageHeader
        title="Asset Categories"
        subtitle="Manage asset categories for tagging and classification"
        breadcrumbs={[
          { label: 'Assets', href: '/admin/assets' },
          { label: 'Categories' },
        ]}
      />

      <PageContent>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Create Form */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add Category
                </CardTitle>
                <CardDescription>
                  Create a new asset category with a 2-letter code
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreate} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Code (2 letters) *</Label>
                    <Input
                      id="code"
                      value={createCode}
                      onChange={(e) => setCreateCode(e.target.value.toUpperCase().slice(0, 2))}
                      placeholder="e.g., IT, HR, MK"
                      maxLength={2}
                      className="uppercase"
                      required
                    />
                    <p className="text-xs text-muted-foreground">
                      Used in asset tags: ORG-<span className="font-mono">{createCode || 'XX'}</span>-25001
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="e.g., IT Equipment"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={createDescription}
                      onChange={(e) => setCreateDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isCreating || !createCode || !createName}>
                    {isCreating ? 'Creating...' : 'Create Category'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Categories List */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Categories</CardTitle>
                <CardDescription>
                  {categories.length} total categories ({activeCategories.length} active)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="active">
                      Active ({activeCategories.length})
                    </TabsTrigger>
                    <TabsTrigger value="inactive">
                      Inactive ({inactiveCategories.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    <CategoryTable
                      categories={activeCategories}
                      loading={loading}
                      onEdit={openEditDialog}
                      onToggle={handleToggleActive}
                      onDelete={setDeleteCategory}
                    />
                  </TabsContent>

                  <TabsContent value="inactive">
                    <CategoryTable
                      categories={inactiveCategories}
                      loading={loading}
                      onEdit={openEditDialog}
                      onToggle={handleToggleActive}
                      onDelete={setDeleteCategory}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>

      {/* Edit Dialog */}
      <Dialog open={!!editCategory} onOpenChange={(open) => !open && setEditCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
            <DialogDescription>
              Update the category details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-code">Code (2 letters) *</Label>
                <Input
                  id="edit-code"
                  value={editCode}
                  onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 2))}
                  maxLength={2}
                  className="uppercase"
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
              <Button type="submit" disabled={isUpdating || !editCode || !editName}>
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
              Are you sure you want to delete the category &quot;{deleteCategory?.name}&quot;?
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

interface CategoryTableProps {
  categories: AssetCategory[];
  loading: boolean;
  onEdit: (category: AssetCategory) => void;
  onToggle: (category: AssetCategory) => void;
  onDelete: (category: AssetCategory) => void;
}

function CategoryTable({ categories, loading, onEdit, onToggle, onDelete }: CategoryTableProps) {
  if (loading) {
    return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (categories.length === 0) {
    return <div className="py-8 text-center text-muted-foreground">No categories found</div>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-20">Code</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Description</TableHead>
          <TableHead className="text-center">Assets</TableHead>
          <TableHead className="text-center">Default</TableHead>
          <TableHead className="text-right">Actions</TableHead>
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
            <TableCell className="font-medium">{category.name}</TableCell>
            <TableCell className="text-muted-foreground max-w-xs truncate">
              {category.description || '-'}
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary">{category._count.assets}</Badge>
            </TableCell>
            <TableCell className="text-center">
              {category.isDefault && (
                <Badge variant="outline" className="text-xs">Default</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(category)}
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggle(category)}
                  title={category.isActive ? 'Deactivate' : 'Activate'}
                >
                  {category.isActive ? (
                    <ToggleRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(category)}
                  title="Delete"
                  disabled={category._count.assets > 0}
                  className={category._count.assets > 0 ? 'opacity-50 cursor-not-allowed' : ''}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
