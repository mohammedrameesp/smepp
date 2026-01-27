'use client';

/**
 * @file locations-settings.tsx
 * @description Location management for organization settings
 * @module components/domains/system/settings
 *
 * FEATURES:
 * - View, create, edit, delete locations
 * - Shows asset count per location
 */

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
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
  MapPin,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Package,
} from 'lucide-react';
import { cn } from '@/lib/core/utils';
import { ICON_SIZES } from '@/lib/constants';

interface Location {
  id: string;
  name: string;
  description: string | null;
  assetsCount?: number;
}

interface LocationsSettingsProps {
  isAdmin?: boolean;
}

export function LocationsSettings({
  isAdmin = true,
}: LocationsSettingsProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Edit dialog state
  const [editLocation, setEditLocation] = useState<Location | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete dialog state
  const [deleteLocation, setDeleteLocation] = useState<Location | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchLocations();
  }, []);

  async function fetchLocations() {
    try {
      const response = await fetch('/api/locations');
      if (response.ok) {
        const data = await response.json();
        setLocations(data.locations || []);
      } else {
        toast.error('Failed to load locations');
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDescription.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success('Location created successfully');
        resetCreateForm();
        setShowCreateDialog(false);
        fetchLocations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to create location');
      }
    } catch (error) {
      console.error('Error creating location:', error);
      toast.error('Failed to create location');
    } finally {
      setIsCreating(false);
    }
  }

  function resetCreateForm() {
    setCreateName('');
    setCreateDescription('');
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editLocation || !editName.trim()) return;

    setIsUpdating(true);
    try {
      const response = await fetch(`/api/locations/${editLocation.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() || null,
        }),
      });

      if (response.ok) {
        toast.success('Location updated successfully');
        setEditLocation(null);
        fetchLocations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update location');
      }
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location');
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    if (!deleteLocation) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/locations/${deleteLocation.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast.success('Location deleted');
        setDeleteLocation(null);
        fetchLocations();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to delete location');
      }
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error('Failed to delete location');
    } finally {
      setIsDeleting(false);
    }
  }

  function openEditDialog(location: Location) {
    setEditLocation(location);
    setEditName(location.name);
    setEditDescription(location.description || '');
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <MapPin className={`${ICON_SIZES.md} text-blue-600`} />
              </div>
              <div>
                <CardTitle>Locations</CardTitle>
                <CardDescription>
                  Manage locations where your assets are stored or used
                </CardDescription>
              </div>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowCreateDialog(true)}>
                <Plus className={`${ICON_SIZES.sm} mr-2`} />
                Add Location
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              <Loader2 className={`${ICON_SIZES.lg} animate-spin mx-auto mb-2`} />
              Loading locations...
            </div>
          ) : locations.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground space-y-4">
              <MapPin className={`${ICON_SIZES['3xl']} mx-auto text-muted-foreground/50`} />
              <p>No locations configured yet.</p>
              {isAdmin && (
                <Button variant="outline" onClick={() => setShowCreateDialog(true)}>
                  <Plus className={`${ICON_SIZES.sm} mr-2`} />
                  Add Your First Location
                </Button>
              )}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden md:table-cell">Description</TableHead>
                    <TableHead className="text-center w-28">Assets</TableHead>
                    <TableHead className="text-right w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locations.map((location) => (
                    <TableRow key={location.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className={`${ICON_SIZES.sm} text-muted-foreground`} />
                          <span className="font-medium">{location.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                        {location.description || '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1 text-muted-foreground">
                          <Package className={ICON_SIZES.sm} />
                          <span>{location.assetsCount ?? 0}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {isAdmin && (
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(location)}
                              title="Edit"
                            >
                              <Pencil className={ICON_SIZES.sm} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteLocation(location)}
                              title="Delete"
                              disabled={(location.assetsCount ?? 0) > 0}
                              className={(location.assetsCount ?? 0) > 0 ? 'opacity-30' : ''}
                            >
                              <Trash2 className={`${ICON_SIZES.sm} text-destructive`} />
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
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Location</DialogTitle>
            <DialogDescription>
              Create a new location for your assets
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="create-name">Name *</Label>
                <Input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="e.g., Main Office, Warehouse A"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-description">Description</Label>
                <Textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  placeholder="e.g., Building 1, Floor 3"
                  rows={2}
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
              <Button type="submit" disabled={isCreating || !createName.trim()}>
                {isCreating ? 'Creating...' : 'Create Location'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editLocation} onOpenChange={(open) => !open && setEditLocation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>Update the location details</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate}>
            <div className="space-y-4 py-4">
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
                <Textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditLocation(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isUpdating || !editName.trim()}>
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteLocation} onOpenChange={(open) => !open && setDeleteLocation(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Location</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteLocation?.name}&quot;?
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
