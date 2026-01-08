/**
 * @file DocumentTypeSettings.tsx
 * @description Settings component for managing company and vehicle document types with CRUD operations
 * @module components/domains/system/settings
 */
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Plus, Pencil, Trash2, FileCheck } from 'lucide-react';

interface DocumentType {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
  isActive: boolean;
  sortOrder: number;
  _count?: { documents: number };
}

interface FormData {
  name: string;
  code: string;
  category: string;
  description: string;
  isActive: boolean;
  sortOrder: number;
}

const emptyForm: FormData = {
  name: '',
  code: '',
  category: 'COMPANY',
  description: '',
  isActive: true,
  sortOrder: 0,
};

export function DocumentTypeSettings() {
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [deletingType, setDeletingType] = useState<DocumentType | null>(null);
  const [formData, setFormData] = useState<FormData>(emptyForm);

  const fetchDocumentTypes = async () => {
    try {
      const res = await fetch('/api/company-document-types');
      const data = await res.json();
      setDocumentTypes(data.documentTypes || []);
    } catch (error) {
      console.error('Failed to fetch document types:', error);
      toast.error('Failed to load document types');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentTypes();
  }, []);

  const openCreateDialog = () => {
    setEditingType(null);
    setFormData(emptyForm);
    setIsDialogOpen(true);
  };

  const openEditDialog = (type: DocumentType) => {
    setEditingType(type);
    setFormData({
      name: type.name,
      code: type.code,
      category: type.category,
      description: type.description || '',
      isActive: type.isActive,
      sortOrder: type.sortOrder,
    });
    setIsDialogOpen(true);
  };

  const openDeleteDialog = (type: DocumentType) => {
    setDeletingType(type);
    setIsDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Name and code are required');
      return;
    }

    setIsSaving(true);
    try {
      const url = editingType
        ? `/api/company-document-types/${editingType.id}`
        : '/api/company-document-types';
      const method = editingType ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save');
      }

      toast.success(editingType ? 'Document type updated' : 'Document type created');
      setIsDialogOpen(false);
      fetchDocumentTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save document type');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingType) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/company-document-types/${deletingType.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to delete');
      }

      toast.success('Document type deleted');
      setIsDeleteDialogOpen(false);
      setDeletingType(null);
      fetchDocumentTypes();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete document type');
    } finally {
      setIsSaving(false);
    }
  };

  const companyTypes = documentTypes.filter((t) => t.category === 'COMPANY');
  const vehicleTypes = documentTypes.filter((t) => t.category === 'VEHICLE');

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Loading document types...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="h-5 w-5" />
                Document Types
              </CardTitle>
              <CardDescription>
                Manage the types of company and vehicle documents you want to track
              </CardDescription>
            </div>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Type
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Documents */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">COMPANY DOCUMENTS</h3>
            {companyTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No company document types defined</p>
            ) : (
              <div className="space-y-2">
                {companyTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {type.code}
                          </Badge>
                          {!type.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {type._count && type._count.documents > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {type._count.documents} doc{type._count.documents !== 1 ? 's' : ''}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(type)}
                        disabled={type._count && type._count.documents > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Vehicle Documents */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">VEHICLE DOCUMENTS</h3>
            {vehicleTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No vehicle document types defined</p>
            ) : (
              <div className="space-y-2">
                {vehicleTypes.map((type) => (
                  <div
                    key={type.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{type.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {type.code}
                          </Badge>
                          {!type.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              Inactive
                            </Badge>
                          )}
                        </div>
                        {type.description && (
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {type._count && type._count.documents > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {type._count.documents} doc{type._count.documents !== 1 ? 's' : ''}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(type)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(type)}
                        disabled={type._count && type._count.documents > 0}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingType ? 'Edit Document Type' : 'Add Document Type'}
            </DialogTitle>
            <DialogDescription>
              {editingType
                ? 'Update the document type details'
                : 'Create a new document type for tracking'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Commercial Registration"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code">Code *</Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CR"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Short unique identifier (letters, numbers, underscores)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  <SelectItem value="COMPANY">Company Document</SelectItem>
                  <SelectItem value="VEHICLE">Vehicle Document</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description..."
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="isActive">Active</Label>
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingType ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document Type</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingType?.name}&quot;? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
