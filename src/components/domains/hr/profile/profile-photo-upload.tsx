/**
 * @file profile-photo-upload.tsx
 * @description Profile photo upload with guidelines, validation, and ID card preview
 * @module components/domains/hr
 */
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Upload,
  X,
  Eye,
  Loader2,
  Info,
  Check,
  AlertCircle,
  User,
  CropIcon,
} from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

interface ProfilePhotoUploadProps {
  label: string;
  value: string | null | undefined;
  onChange: (url: string | null) => void;
  disabled?: boolean;
  id?: string;
  description?: string;
  employeeName?: string; // For ID card preview
}

// Photo guidelines
const PHOTO_GUIDELINES = [
  { text: 'Plain background (white or light color)', icon: '🎨' },
  { text: 'Face clearly visible and centered', icon: '👤' },
  { text: 'No sunglasses or hats', icon: '🕶️' },
  { text: 'Good lighting, no shadows on face', icon: '💡' },
  { text: 'Recent photo (within last 6 months)', icon: '📅' },
];

// Validation constants
const MIN_RESOLUTION = 300;
const MAX_ASPECT_RATIO_DIFF = 0.1; // Allow 10% deviation from square

export function ProfilePhotoUpload({
  label,
  value,
  onChange,
  disabled = false,
  id = 'profile-photo',
  description,
  employeeName = 'Employee Name',
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [showIdPreview, setShowIdPreview] = useState(false);
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [tempImage, setTempImage] = useState<string | null>(null);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, size: 0 });
  const [originalDimensions, setOriginalDimensions] = useState({ width: 0, height: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const validateImage = (file: File): Promise<{ valid: boolean; error?: string; width: number; height: number }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const { width, height } = img;

        // Check minimum resolution
        if (width < MIN_RESOLUTION || height < MIN_RESOLUTION) {
          resolve({
            valid: false,
            error: `Image must be at least ${MIN_RESOLUTION}x${MIN_RESOLUTION} pixels. Your image is ${width}x${height}.`,
            width,
            height,
          });
          return;
        }

        // Check aspect ratio (should be close to square)
        const aspectRatio = width / height;
        const isSquareEnough = Math.abs(aspectRatio - 1) <= MAX_ASPECT_RATIO_DIFF;

        if (!isSquareEnough) {
          // Image is not square, but we'll allow cropping
          resolve({
            valid: true,
            error: 'crop_needed',
            width,
            height,
          });
          return;
        }

        resolve({ valid: true, width, height });
      };
      img.onerror = () => {
        resolve({ valid: false, error: 'Failed to load image', width: 0, height: 0 });
      };
      img.src = URL.createObjectURL(file);
    });
  };

  const cropImageToSquare = (imageUrl: string, cropX: number, cropY: number, cropSize: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Set canvas size to the crop size (or minimum 300)
        const outputSize = Math.max(cropSize, MIN_RESOLUTION);
        canvas.width = outputSize;
        canvas.height = outputSize;

        // Draw the cropped portion
        ctx.drawImage(
          img,
          cropX, cropY, cropSize, cropSize,
          0, 0, outputSize, outputSize
        );

        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create blob'));
          }
        }, 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    // Validate file type
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Please upload a JPG or PNG image');
      e.target.value = '';
      return;
    }

    // Validate image dimensions
    const validation = await validateImage(file);

    if (!validation.valid && validation.error !== 'crop_needed') {
      toast.error(validation.error);
      e.target.value = '';
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    // If image needs cropping (not square), show crop dialog
    if (validation.error === 'crop_needed') {
      setTempImage(imageUrl);
      setOriginalDimensions({ width: validation.width, height: validation.height });
      // Initialize crop area to center square
      const minDim = Math.min(validation.width, validation.height);
      setCropArea({
        x: (validation.width - minDim) / 2,
        y: (validation.height - minDim) / 2,
        size: minDim,
      });
      setShowCropDialog(true);
      e.target.value = '';
      return;
    }

    // Image is valid and square, upload directly
    await uploadImage(file, imageUrl);
    e.target.value = '';
  };

  const handleCropConfirm = async () => {
    if (!tempImage) return;

    try {
      setIsUploading(true);
      const croppedBlob = await cropImageToSquare(
        tempImage,
        cropArea.x,
        cropArea.y,
        cropArea.size
      );

      const croppedFile = new File([croppedBlob], 'profile-photo.jpg', { type: 'image/jpeg' });
      await uploadImage(croppedFile, URL.createObjectURL(croppedBlob));
    } catch (error) {
      toast.error('Failed to crop image');
    } finally {
      setShowCropDialog(false);
      setTempImage(null);
      setIsUploading(false);
    }
  };

  const uploadImage = async (file: File, previewUrl: string) => {
    setPreview(previewUrl);
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
      toast.success('Photo uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      setPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setPreview(null);
  };

  const displayImage = preview || value;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label="Photo guidelines"
            >
              <Info className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3" align="start">
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Photo Guidelines</h4>
              <ul className="space-y-1.5">
                {PHOTO_GUIDELINES.map((guideline, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-xs text-slate-600">
                    <span>{guideline.icon}</span>
                    <span>{guideline.text}</span>
                  </li>
                ))}
              </ul>
              <div className="pt-2 border-t mt-2">
                <p className="text-xs text-slate-500">
                  Min size: {MIN_RESOLUTION}x{MIN_RESOLUTION}px, Square ratio
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {displayImage ? (
        <div className="flex gap-4">
          {/* Photo preview */}
          <div className="flex-shrink-0">
            <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-100">
              <img
                src={displayImage}
                alt="Profile photo"
                className="w-full h-full object-cover"
              />
              {isUploading && (
                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col justify-center gap-2">
            <div className="flex items-center gap-1 text-xs text-green-600">
              <Check className="h-3 w-3" />
              <span>Photo uploaded</span>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowIdPreview(true)}
                className="text-xs"
              >
                <Eye className="h-3 w-3 mr-1" />
                ID Preview
              </Button>
              {!disabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemove}
                  className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="h-3 w-3 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Input
            id={id}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            disabled={disabled || isUploading}
            className="hidden"
          />
          <label
            htmlFor={id}
            className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
              disabled || isUploading
                ? 'bg-gray-100 border-gray-300 cursor-not-allowed'
                : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="text-sm text-gray-600">Uploading...</span>
              </>
            ) : (
              <>
                <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center">
                  <User className="h-8 w-8 text-slate-400" />
                </div>
                <span className="text-sm text-gray-600">Click to upload photo</span>
                <span className="text-xs text-gray-400">JPG or PNG, min {MIN_RESOLUTION}x{MIN_RESOLUTION}px</span>
              </>
            )}
          </label>
        </div>
      )}

      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      {/* ID Card Preview Dialog */}
      <Dialog open={showIdPreview} onOpenChange={setShowIdPreview}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ID Card Preview</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <div className="w-80 bg-gradient-to-br from-slate-800 to-slate-900 rounded-xl p-4 shadow-xl">
              {/* Card header */}
              <div className="text-center mb-3">
                <div className="text-xs text-slate-400 uppercase tracking-wider">Employee ID</div>
              </div>

              {/* Photo and info */}
              <div className="flex gap-4 items-start">
                <div className="flex-shrink-0">
                  <div className="w-20 h-24 rounded-lg overflow-hidden border-2 border-slate-600 bg-slate-700">
                    {displayImage ? (
                      <img
                        src={displayImage}
                        alt="ID Photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="h-8 w-8 text-slate-500" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <div className="text-white font-semibold text-sm">{employeeName}</div>
                  <div className="text-slate-400 text-xs mt-1">Department</div>
                  <div className="text-slate-300 text-xs">Engineering</div>
                  <div className="text-slate-400 text-xs mt-2">ID: EMP-0000</div>
                </div>
              </div>

              {/* Card footer */}
              <div className="mt-4 pt-3 border-t border-slate-700">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-slate-500">Valid from: Jan 2024</div>
                  <div className="h-8 w-8 bg-slate-700 rounded flex items-center justify-center">
                    <div className="w-5 h-5 bg-gradient-to-br from-blue-400 to-blue-600 rounded-sm" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-center text-slate-500">
            This is how your photo will appear on your employee ID badge
          </p>
        </DialogContent>
      </Dialog>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CropIcon className="h-5 w-5" />
              Crop Photo to Square
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                Your photo is not square. We&apos;ll crop it to a 1:1 ratio for the best result.
              </p>
            </div>

            {tempImage && (
              <div className="relative flex justify-center">
                <div className="relative inline-block max-w-full">
                  <img
                    src={tempImage}
                    alt="Preview"
                    className="max-h-64 rounded"
                    style={{ opacity: 0.5 }}
                  />
                  {/* Crop overlay - center square */}
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/10"
                    style={{
                      left: `${(cropArea.x / originalDimensions.width) * 100}%`,
                      top: `${(cropArea.y / originalDimensions.height) * 100}%`,
                      width: `${(cropArea.size / originalDimensions.width) * 100}%`,
                      height: `${(cropArea.size / originalDimensions.height) * 100}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowCropDialog(false);
                  setTempImage(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleCropConfirm}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Crop & Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
