'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Upload, X, FileText, Image as ImageIcon, Eye, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentUploadProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  accept?: string;
  maxSize?: number; // in MB
  disabled?: boolean;
  id?: string;
  description?: string;
}

export function DocumentUpload({
  label,
  value,
  onChange,
  accept = 'image/jpeg,image/png,application/pdf',
  maxSize = 5,
  disabled = false,
  id,
  description,
}: DocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      e.target.value = '';
      return;
    }

    // Validate file type
    const allowedTypes = accept.split(',').map(t => t.trim());
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a JPG, PNG, or PDF file.');
      e.target.value = '';
      return;
    }

    // For images, show preview
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }

    // Upload file
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
      toast.success('File uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
      setPreview(null);
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
  };

  const isPdf = value?.toLowerCase().endsWith('.pdf');
  const isImage = value && !isPdf;

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">{label}</label>

      {value ? (
        <div className="flex items-center gap-3 p-3 bg-gray-50 border rounded-lg">
          <div className="flex-shrink-0">
            {isPdf ? (
              <FileText className="h-10 w-10 text-red-500" />
            ) : preview || isImage ? (
              <img
                src={preview || value}
                alt={label}
                className="h-12 w-12 object-cover rounded border"
              />
            ) : (
              <ImageIcon className="h-10 w-10 text-blue-500" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {isPdf ? 'PDF Document' : 'Image uploaded'}
            </p>
            <p className="text-xs text-gray-500">Click view to open</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(value, '_blank')}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            id={id}
            type="file"
            accept={accept}
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <label
            htmlFor={id}
            className={`flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              disabled || isUploading
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  Click to upload or drag and drop
                </span>
              </>
            )}
          </label>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

// Compact version for multiple documents in a row
interface CompactDocumentUploadProps {
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  accept?: string;
  maxSize?: number;
  disabled?: boolean;
  id?: string;
  placeholder?: string;
}

export function CompactDocumentUpload({
  value,
  onChange,
  accept = 'image/jpeg,image/png,application/pdf',
  maxSize = 5,
  disabled = false,
  id,
  placeholder = 'Upload',
}: CompactDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File size must be less than ${maxSize}MB`);
      e.target.value = '';
      return;
    }

    const allowedTypes = accept.split(',').map(t => t.trim());
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      onChange(data.url);
      toast.success('Uploaded');
    } catch (error) {
      toast.error('Upload failed');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => window.open(value, '_blank')}
        >
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
        {!disabled && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(null)}
            className="text-red-600"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        id={id}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled || isUploading}
        asChild
      >
        <label htmlFor={id} className="cursor-pointer">
          {isUploading ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Upload className="h-4 w-4 mr-1" />
          )}
          {placeholder}
        </label>
      </Button>
    </div>
  );
}
