'use client';

/**
 * @file LogoStep.tsx
 * @description Step 3 - Logo upload (skippable)
 * @module setup/steps
 */

import { useRef } from 'react';
import { Image, Upload, X } from 'lucide-react';

interface LogoStepProps {
  preview: string | null;
  onFileSelect: (file: File | null) => void;
  onPreviewChange: (preview: string | null) => void;
  error?: string | null;
  onError: (error: string | null) => void;
}

export function LogoStep({
  preview,
  onFileSelect,
  onPreviewChange,
  error,
  onError,
}: LogoStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(selectedFile.type)) {
      onError('Invalid file type. Allowed: PNG, JPEG, WebP, SVG');
      return;
    }

    if (selectedFile.size > 1 * 1024 * 1024) {
      onError('File too large. Maximum size is 1MB');
      return;
    }

    onFileSelect(selectedFile);
    onError(null);

    const reader = new FileReader();
    reader.onload = () => onPreviewChange(reader.result as string);
    reader.readAsDataURL(selectedFile);
  };

  const removeLogo = () => {
    onFileSelect(null);
    onPreviewChange(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-4">
        <div className="w-12 h-12 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
          <Image className="w-6 h-6 text-slate-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          Add your company logo
        </h1>
        <p className="text-sm text-slate-600">
          Your logo will appear in the navigation and reports
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        {preview ? (
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={preview}
                alt="Logo preview"
                className="h-24 w-24 object-contain rounded-xl border border-slate-200 bg-white mx-auto"
              />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-slate-900 mb-1">
                Logo uploaded
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-sm text-slate-600 hover:text-slate-900 underline"
              >
                Change logo
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-slate-400 transition-colors cursor-pointer"
          >
            <div className="w-12 h-12 mx-auto mb-3 bg-slate-100 rounded-xl flex items-center justify-center">
              <Upload className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-600 mb-1">
              Drag and drop your logo here
            </p>
            <p className="text-xs text-slate-400">
              or click to browse (PNG, JPG, SVG up to 1MB)
            </p>
          </div>
        )}

        {error && (
          <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
