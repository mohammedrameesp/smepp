/**
 * @file CompanyDocumentForm.tsx
 * @description Form component for creating and editing company documents
 * @module components/domains/system/company-documents
 */
'use client';

import { useState } from 'react';
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

// Hardcoded document types - users can also enter custom names via "Other"
const DOCUMENT_TYPES = [
  'Commercial Registration',
  'Establishment Card',
  'Commercial License',
  'Tenancy/Lease Contract',
  'Vehicle Istmara',
  'Vehicle Insurance',
] as const;

interface CompanyDocumentFormProps {
  initialData?: {
    id: string;
    documentTypeName: string;
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

  // Determine if initial data uses a predefined type or custom
  const initialIsOther = initialData?.documentTypeName &&
    !DOCUMENT_TYPES.includes(initialData.documentTypeName as typeof DOCUMENT_TYPES[number]);

  const [selectedType, setSelectedType] = useState<string>(
    initialIsOther ? 'Other' : (initialData?.documentTypeName || '')
  );
  const [customTypeName, setCustomTypeName] = useState<string>(
    initialIsOther ? initialData.documentTypeName : ''
  );

  const form = useForm<CompanyDocumentInput>({
    resolver: zodResolver(companyDocumentSchema),
    defaultValues: {
      documentTypeName: initialData?.documentTypeName || '',
      referenceNumber: initialData?.referenceNumber || '',
      expiryDate: formatDateForInput(initialData?.expiryDate),
      documentUrl: initialData?.documentUrl || '',
      assetId: initialData?.assetId || '',
      renewalCost: initialData?.renewalCost || undefined,
      notes: initialData?.notes || '',
    },
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;

  const isOtherSelected = selectedType === 'Other';

  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    if (value === 'Other') {
      // Clear the type name, user will enter custom
      setValue('documentTypeName', customTypeName || '');
    } else {
      // Use the selected predefined type
      setValue('documentTypeName', value);
      setCustomTypeName('');
    }
  };

  const handleCustomTypeChange = (value: string) => {
    setCustomTypeName(value);
    setValue('documentTypeName', value);
  };

  const onSubmit = async (data: CompanyDocumentInput) => {
    // Validate that we have a document type name
    const typeName = isOtherSelected ? customTypeName.trim() : selectedType;
    if (!typeName) {
      toast.error('Please select or enter a document type');
      return;
    }

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
          documentTypeName: typeName,
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
            <Label htmlFor="documentType">Document Type *</Label>
            <Select
              value={selectedType}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
                <SelectItem value="Other">Other (enter custom name)</SelectItem>
              </SelectContent>
            </Select>
            {errors.documentTypeName && !isOtherSelected && (
              <p className="text-sm text-red-500">{errors.documentTypeName.message}</p>
            )}
          </div>

          {/* Custom Document Type Name (when "Other" selected) */}
          {isOtherSelected && (
            <div className="space-y-2">
              <Label htmlFor="customTypeName">Document Type Name *</Label>
              <Input
                id="customTypeName"
                value={customTypeName}
                onChange={(e) => handleCustomTypeChange(e.target.value)}
                placeholder="Enter the document type name"
              />
              {!customTypeName.trim() && (
                <p className="text-sm text-amber-600">Please enter a document type name</p>
              )}
            </div>
          )}

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
              placeholder="DD/MM/YYYY"
            />
            {errors.expiryDate && (
              <p className="text-sm text-red-500">{errors.expiryDate.message}</p>
            )}
          </div>

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
