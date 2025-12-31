/**
 * @file CompanyDocumentForm.tsx
 * @description Form component for creating and editing company documents with support for document types, vehicle linking, and file uploads
 * @module components/domains/system/company-documents
 */
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { companyDocumentSchema, type CompanyDocumentInput } from '@/lib/validations/system/company-documents';
import { DatePicker } from '@/components/ui/date-picker';
import { DocumentUpload } from '@/components/domains/hr/profile/document-upload';

interface DocumentType {
  id: string;
  name: string;
  code: string;
  category: string;
  isActive?: boolean;
}

interface Asset {
  id: string;
  assetTag: string | null;
  brand: string | null;
  model: string;
  type: string;
}

interface CompanyDocumentFormProps {
  initialData?: {
    id: string;
    documentTypeId: string;
    referenceNumber: string | null;
    expiryDate: Date | string;
    documentUrl: string | null;
    assetId: string | null;
    renewalCost: number | null;
    notes: string | null;
  };
  mode: 'create' | 'edit';
}

function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  return d.toISOString().split('T')[0];
}

export function CompanyDocumentForm({ initialData, mode }: CompanyDocumentFormProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [vehicles, setVehicles] = useState<Asset[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  const form = useForm<CompanyDocumentInput>({
    resolver: zodResolver(companyDocumentSchema),
    defaultValues: {
      documentTypeId: initialData?.documentTypeId || '',
      referenceNumber: initialData?.referenceNumber || '',
      expiryDate: formatDateForInput(initialData?.expiryDate),
      documentUrl: initialData?.documentUrl || '',
      assetId: initialData?.assetId || '',
      renewalCost: initialData?.renewalCost || undefined,
      notes: initialData?.notes || '',
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const watchedDocumentTypeId = watch('documentTypeId');

  // Fetch document types
  useEffect(() => {
    async function fetchDocumentTypes() {
      try {
        const res = await fetch('/api/company-document-types');
        const data = await res.json();
        setDocumentTypes(data.documentTypes || []);
      } catch (error) {
        console.error('Failed to fetch document types:', error);
      }
    }
    fetchDocumentTypes();
  }, []);

  // Fetch vehicles (assets with type Vehicle)
  useEffect(() => {
    async function fetchVehicles() {
      try {
        const res = await fetch('/api/assets?type=Vehicle');
        const data = await res.json();
        setVehicles(data.assets || []);
      } catch (error) {
        console.error('Failed to fetch vehicles:', error);
      }
    }
    fetchVehicles();
  }, []);

  // Update selected category when document type changes
  useEffect(() => {
    if (watchedDocumentTypeId) {
      const docType = documentTypes.find(t => t.id === watchedDocumentTypeId);
      setSelectedCategory(docType?.category || '');
      // Clear asset if not a vehicle document
      if (docType?.category !== 'VEHICLE') {
        setValue('assetId', '');
      }
    }
  }, [watchedDocumentTypeId, documentTypes, setValue]);

  const onSubmit = async (data: CompanyDocumentInput) => {
    setIsLoading(true);
    try {
      const url = mode === 'create'
        ? '/api/company-documents'
        : `/api/company-documents/${initialData?.id}`;

      const method = mode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          assetId: data.assetId || null,
          renewalCost: data.renewalCost || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save document');
      }

      toast.success(mode === 'create' ? 'Document created' : 'Document updated');
      router.push('/admin/company-documents');
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save document');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Document Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="documentTypeId">Document Type *</Label>
            <Select
              value={watch('documentTypeId')}
              onValueChange={(value) => setValue('documentTypeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {documentTypes.filter(t => t.isActive !== false).map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name} ({type.category})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.documentTypeId && (
              <p className="text-sm text-red-500">{errors.documentTypeId.message}</p>
            )}
          </div>

          {/* Reference Number */}
          <div className="space-y-2">
            <Label htmlFor="referenceNumber">Reference / Document Number</Label>
            <Input
              id="referenceNumber"
              {...register('referenceNumber')}
              placeholder="e.g., CR-12345"
            />
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date *</Label>
            <DatePicker
              id="expiryDate"
              value={watch('expiryDate') || ''}
              onChange={(val) => setValue('expiryDate', val)}
              placeholder="Select expiry date"
            />
            {errors.expiryDate && (
              <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
            )}
          </div>

          {/* Vehicle (only for VEHICLE category) */}
          {selectedCategory === 'VEHICLE' && (
            <div className="space-y-2">
              <Label htmlFor="assetId">Linked Vehicle</Label>
              <Select
                value={watch('assetId') || 'none'}
                onValueChange={(value) => setValue('assetId', value === 'none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vehicle linked</SelectItem>
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      {vehicle.assetTag || `${vehicle.brand} ${vehicle.model}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Document Upload */}
          <div className="space-y-2">
            <DocumentUpload
              id="documentUrl"
              label="Document File"
              value={watch('documentUrl') || ''}
              onChange={(url) => setValue('documentUrl', url)}
              accept="application/pdf,image/jpeg,image/png"
              description="PDF, JPG, or PNG, max 10MB"
            />
          </div>

          {/* Renewal Cost */}
          <div className="space-y-2">
            <Label htmlFor="renewalCost">Renewal Cost (QAR)</Label>
            <Input
              id="renewalCost"
              type="number"
              step="0.01"
              {...register('renewalCost', { valueAsNumber: true })}
              placeholder="Optional"
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === 'create' ? 'Create Document' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
