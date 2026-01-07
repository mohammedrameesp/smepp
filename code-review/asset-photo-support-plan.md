# Asset Photo Support - Implementation Plan

**Feature**: Basic Photo Support for Assets
**Status**: Planned
**Priority**: Medium
**Estimated Effort**: 1-2 days
**Created**: 2026-01-07

---

## Overview

Add photo upload and display capabilities to assets, allowing organizations to visually document their equipment and inventory.

### Goals

1. ✅ Allow photo upload during asset creation
2. ✅ Support photo update/replacement on edit
3. ✅ Display photos on asset detail pages
4. ✅ Show thumbnail previews in asset lists
5. ✅ Maintain tenant-scoped security
6. ✅ Handle photo deletion when asset is deleted

### Non-Goals (Future Enhancements)

- ❌ Multiple photos per asset (Option 2)
- ❌ Photo gallery/carousel
- ❌ Photo history/versioning
- ❌ Image editing/cropping in-app
- ❌ Automatic thumbnail generation

---

## Database Schema Changes

### Phase 1.1: Add Photo Fields to Asset Model

**File**: `prisma/schema.prisma`

```prisma
model Asset {
  // ... existing fields ...

  // Photo Support
  photoUrl     String?  // Full-size photo URL from Supabase
  photoPath    String?  // Storage path for deletion (e.g., "tenants/{id}/assets/{assetId}.jpg")
  photoUploadedAt DateTime?  // When photo was uploaded
  photoUploadedBy String?    // Who uploaded it
  photoUploadedByMember TeamMember? @relation("AssetPhotoUploader", fields: [photoUploadedBy], references: [id])

  // ... existing fields ...
}
```

**Why `photoPath`?**
- Need to store the storage path for deletion
- URL alone isn't enough (may contain query params, signed URL, etc.)
- Path format: `tenants/{tenantId}/assets/{assetId}.{ext}`

### Phase 1.2: Migration

**Create Migration**: `prisma migrate dev --name add_asset_photo_support`

```sql
-- Migration: add_asset_photo_support
ALTER TABLE "Asset"
ADD COLUMN "photoUrl" TEXT,
ADD COLUMN "photoPath" TEXT,
ADD COLUMN "photoUploadedAt" TIMESTAMP(3),
ADD COLUMN "photoUploadedBy" TEXT;

-- Add foreign key for uploader
ALTER TABLE "Asset"
ADD CONSTRAINT "Asset_photoUploadedBy_fkey"
FOREIGN KEY ("photoUploadedBy")
REFERENCES "TeamMember"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Add index for queries that filter by photo presence
CREATE INDEX "Asset_photoUrl_idx" ON "Asset"("photoUrl") WHERE "photoUrl" IS NOT NULL;
```

---

## API Endpoints

### Phase 2.1: Photo Upload Endpoint

**New File**: `src/app/api/assets/[id]/photo/route.ts`

```typescript
/**
 * POST /api/assets/[id]/photo - Upload asset photo
 * DELETE /api/assets/[id]/photo - Remove asset photo
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { sbUpload, sbRemove } from '@/lib/storage/supabase';
import { withErrorHandler, APIContext } from '@/lib/http/handler';
import { logAction, ActivityActions } from '@/lib/core/activity';

// SECURITY: Allowed image types only
const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

// SECURITY: Max image size (5MB for photos)
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

/**
 * Upload or replace asset photo
 */
async function uploadAssetPhotoHandler(
  request: NextRequest,
  context: APIContext
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = session.user.organizationId;
  const assetId = context.params?.id;

  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
  }

  // Verify asset exists and belongs to tenant
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('photo') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
  }

  // SECURITY: Validate file type
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Invalid file type. Allowed: ${Array.from(ALLOWED_IMAGE_TYPES).join(', ')}` },
      { status: 400 }
    );
  }

  // SECURITY: Validate file size
  if (file.size > MAX_IMAGE_SIZE) {
    return NextResponse.json(
      { error: `File too large. Maximum size: ${MAX_IMAGE_SIZE / 1024 / 1024}MB` },
      { status: 400 }
    );
  }

  // Delete old photo if exists
  if (asset.photoPath) {
    try {
      await sbRemove(asset.photoPath, tenantId);
    } catch (error) {
      console.error('Failed to delete old photo:', error);
      // Continue anyway - old photo might already be deleted
    }
  }

  // Determine file extension
  const ext = file.type.split('/')[1] || 'jpg';
  const storagePath = `tenants/${tenantId}/assets/${assetId}.${ext}`;

  // Upload to Supabase
  const bytes = Buffer.from(await file.arrayBuffer());
  await sbUpload({
    path: storagePath,
    bytes,
    contentType: file.type,
    tenantId,
  });

  // Get public URL
  const { sbPublicUrl } = await import('@/lib/storage/supabase');
  const photoUrl = await sbPublicUrl(storagePath, tenantId);

  // Update asset record
  const updatedAsset = await prisma.asset.update({
    where: { id: assetId },
    data: {
      photoUrl,
      photoPath: storagePath,
      photoUploadedAt: new Date(),
      photoUploadedBy: session.user.id,
    },
    select: {
      id: true,
      photoUrl: true,
      photoUploadedAt: true,
    },
  });

  // Log activity
  await logAction(
    tenantId,
    session.user.id,
    ActivityActions.ASSET_UPDATED,
    'Asset',
    assetId,
    {
      assetModel: asset.model,
      assetTag: asset.assetTag,
      action: 'photo_uploaded',
    }
  );

  return NextResponse.json({
    success: true,
    photoUrl: updatedAsset.photoUrl,
    uploadedAt: updatedAsset.photoUploadedAt,
  });
}

/**
 * Delete asset photo
 */
async function deleteAssetPhotoHandler(
  request: NextRequest,
  context: APIContext
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const tenantId = session.user.organizationId;
  const assetId = context.params?.id;

  if (!assetId) {
    return NextResponse.json({ error: 'Asset ID required' }, { status: 400 });
  }

  // Verify asset exists and belongs to tenant
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    select: {
      id: true,
      photoPath: true,
      photoUrl: true,
      model: true,
      assetTag: true,
    },
  });

  if (!asset) {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
  }

  if (!asset.photoPath) {
    return NextResponse.json({ error: 'No photo to delete' }, { status: 400 });
  }

  // Delete from storage
  try {
    await sbRemove(asset.photoPath, tenantId);
  } catch (error) {
    console.error('Failed to delete photo from storage:', error);
    // Continue anyway to clear database reference
  }

  // Clear database fields
  await prisma.asset.update({
    where: { id: assetId },
    data: {
      photoUrl: null,
      photoPath: null,
      photoUploadedAt: null,
      photoUploadedBy: null,
    },
  });

  // Log activity
  await logAction(
    tenantId,
    session.user.id,
    ActivityActions.ASSET_UPDATED,
    'Asset',
    assetId,
    {
      assetModel: asset.model,
      assetTag: asset.assetTag,
      action: 'photo_deleted',
    }
  );

  return NextResponse.json({ success: true });
}

export const POST = withErrorHandler(uploadAssetPhotoHandler, {
  requireAuth: true,
  requireAdmin: true,
  requireModule: 'assets',
});

export const DELETE = withErrorHandler(deleteAssetPhotoHandler, {
  requireAuth: true,
  requireAdmin: true,
  requireModule: 'assets',
});
```

### Phase 2.2: Update Asset API Routes

**Update**: `src/app/api/assets/route.ts` (GET list endpoint)

Add photo fields to the select statement:

```typescript
// In GET handler
const assets = await prisma.asset.findMany({
  // ... existing query ...
  select: {
    // ... existing fields ...
    photoUrl: true,
    photoUploadedAt: true,
    // ... rest of fields ...
  },
});
```

**Update**: `src/app/api/assets/[id]/route.ts` (GET detail endpoint)

```typescript
// In GET handler
const asset = await prisma.asset.findFirst({
  // ... existing query ...
  select: {
    // ... existing fields ...
    photoUrl: true,
    photoPath: true,
    photoUploadedAt: true,
    photoUploadedBy: true,
    photoUploadedByMember: {
      select: {
        id: true,
        name: true,
        email: true,
      },
    },
    // ... rest of fields ...
  },
});
```

---

## Frontend Components

### Phase 3.1: Asset Photo Upload Component

**New File**: `src/components/domains/operations/assets/asset-photo-upload.tsx`

```tsx
'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AssetPhotoUploadProps {
  assetId: string;
  currentPhotoUrl?: string | null;
  onUploadSuccess?: (photoUrl: string) => void;
  onDeleteSuccess?: () => void;
  className?: string;
}

export function AssetPhotoUpload({
  assetId,
  currentPhotoUrl,
  onUploadSuccess,
  onDeleteSuccess,
  className,
}: AssetPhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentPhotoUrl || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload
    setIsUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch(`/api/assets/${assetId}/photo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      toast.success('Photo uploaded successfully');
      setPreviewUrl(data.photoUrl);
      onUploadSuccess?.(data.photoUrl);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload photo');
      // Revert preview
      setPreviewUrl(currentPhotoUrl || null);
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/assets/${assetId}/photo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Delete failed');
      }

      toast.success('Photo deleted successfully');
      setPreviewUrl(null);
      onDeleteSuccess?.();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-slate-700">Asset Photo</label>

      {/* Photo Preview */}
      {previewUrl ? (
        <div className="relative w-full aspect-video bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
          <img
            src={previewUrl}
            alt="Asset photo"
            className="w-full h-full object-contain"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              'Deleting...'
            ) : (
              <>
                <X className="h-4 w-4 mr-1" />
                Remove
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="w-full aspect-video bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400">
          <ImageIcon className="h-12 w-12 mb-2" />
          <p className="text-sm">No photo uploaded</p>
        </div>
      )}

      {/* Upload Button */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        variant="outline"
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading}
        className="w-full"
      >
        {isUploading ? (
          'Uploading...'
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {previewUrl ? 'Replace Photo' : 'Upload Photo'}
          </>
        )}
      </Button>
      <p className="text-xs text-slate-500">
        Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
      </p>
    </div>
  );
}
```

### Phase 3.2: Asset Photo Display Component

**New File**: `src/components/domains/operations/assets/asset-photo-display.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Image as ImageIcon, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AssetPhotoDisplayProps {
  photoUrl?: string | null;
  assetModel: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  allowZoom?: boolean;
}

export function AssetPhotoDisplay({
  photoUrl,
  assetModel,
  size = 'md',
  className,
  allowZoom = true,
}: AssetPhotoDisplayProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-32 h-32',
    lg: 'w-full aspect-video',
  };

  if (!photoUrl) {
    return (
      <div
        className={cn(
          'bg-slate-100 rounded-lg flex items-center justify-center text-slate-400',
          sizeClasses[size],
          className
        )}
      >
        <ImageIcon className={size === 'sm' ? 'h-6 w-6' : 'h-12 w-12'} />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          'relative bg-slate-100 rounded-lg overflow-hidden group',
          sizeClasses[size],
          allowZoom && 'cursor-pointer',
          className
        )}
        onClick={() => allowZoom && setIsZoomed(true)}
      >
        <img
          src={photoUrl}
          alt={assetModel}
          className="w-full h-full object-cover"
        />
        {allowZoom && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <ZoomIn className="h-8 w-8 text-white" />
          </div>
        )}
      </div>

      {/* Zoom Dialog */}
      {allowZoom && (
        <Dialog open={isZoomed} onOpenChange={setIsZoomed}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>{assetModel}</DialogTitle>
            </DialogHeader>
            <div className="w-full">
              <img
                src={photoUrl}
                alt={assetModel}
                className="w-full h-auto rounded-lg"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
```

### Phase 3.3: Update Asset Form

**Update**: `src/app/admin/(operations)/assets/new/page.tsx`

Add photo upload section after basic information:

```tsx
import { AssetPhotoUpload } from '@/components/domains/operations/assets/asset-photo-upload';

// In the form, after asset is created:
{asset && (
  <div className="bg-white rounded-2xl border border-slate-200 p-5 mt-6">
    <h2 className="font-semibold text-slate-900 mb-4">Asset Photo</h2>
    <AssetPhotoUpload
      assetId={asset.id}
      currentPhotoUrl={asset.photoUrl}
      onUploadSuccess={(url) => {
        // Refresh asset data or update local state
        setAsset({ ...asset, photoUrl: url });
      }}
    />
  </div>
)}
```

**Update**: `src/app/admin/(operations)/assets/[id]/edit/page.tsx`

Same as above - add photo upload section.

### Phase 3.4: Update Asset Detail Pages

**Update**: `src/app/admin/(operations)/assets/[id]/page.tsx`

Add photo display in the sidebar or top section:

```tsx
import { AssetPhotoDisplay } from '@/components/domains/operations/assets/asset-photo-display';

// In the sidebar or top section:
<div className="bg-white rounded-2xl border border-slate-200 p-5">
  <h3 className="font-semibold text-slate-900 mb-3">Photo</h3>
  <AssetPhotoDisplay
    photoUrl={asset.photoUrl}
    assetModel={asset.model}
    size="lg"
  />
  {asset.photoUploadedAt && (
    <p className="text-xs text-slate-500 mt-2">
      Uploaded {formatDateTime(asset.photoUploadedAt)}
      {asset.photoUploadedByMember &&
        ` by ${asset.photoUploadedByMember.name || asset.photoUploadedByMember.email}`
      }
    </p>
  )}
</div>
```

**Update**: `src/app/employee/(operations)/assets/[id]/page.tsx`

Same as above, but read-only (no upload/delete).

### Phase 3.5: Update Asset Lists

**Update**: Asset list table components to show thumbnail

**File**: `src/components/domains/operations/assets/asset-list-table-server-search.tsx`

```tsx
import { AssetPhotoDisplay } from './asset-photo-display';

// In the table row:
<td className="px-4 py-4">
  <div className="flex items-center gap-3">
    <AssetPhotoDisplay
      photoUrl={asset.photoUrl}
      assetModel={asset.model}
      size="sm"
      allowZoom={false}
    />
    <div>
      <Link
        href={`/admin/assets/${asset.id}`}
        className="font-medium text-slate-900 hover:text-blue-600"
      >
        {asset.model}
      </Link>
      <p className="text-sm text-slate-500">{asset.assetTag}</p>
    </div>
  </div>
</td>
```

---

## Export Components Index

**Update**: `src/components/domains/operations/assets/index.ts`

```typescript
// ... existing exports ...
export { AssetPhotoUpload } from './asset-photo-upload';
export { AssetPhotoDisplay } from './asset-photo-display';
```

---

## Data Migration Strategy

### Handling Existing Assets

**No data migration needed!** All existing assets will simply have `null` for photo fields. This is backward compatible.

**Future Bulk Upload** (optional):
- Admin can manually upload photos one by one
- Or build a bulk import tool later (Phase 4 future enhancement)

---

## Storage Considerations

### Cost Analysis

**Supabase Pricing**:
- Free tier: 1 GB storage
- Pro tier: $25/mo includes 100 GB

**Typical Usage**:
- Average photo: 2-3 MB (after user compression)
- 100 assets: ~250 MB
- 500 assets: ~1.25 GB (exceeds free tier)
- 1000 assets: ~2.5 GB

**Recommendation**:
- Start with free tier
- Monitor usage via Supabase dashboard
- Upgrade when approaching 1 GB
- Advise users to compress photos before upload

### Storage Path Structure

```
durj-storage/
└── tenants/
    └── {tenantId}/
        └── assets/
            ├── {assetId}.jpg
            ├── {assetId}.png
            └── {assetId}.webp
```

**Benefits**:
- Easy tenant-scoped deletion
- No naming conflicts
- Clear audit trail
- Easy backup/restore

---

## Security Checklist

### Upload Security

- ✅ File type validation (images only)
- ✅ File size limit (5MB)
- ✅ Tenant-scoped storage paths
- ✅ Admin-only upload/delete
- ✅ MIME type validation
- ✅ Path traversal prevention
- ✅ Activity logging

### Access Control

- ✅ Only tenant members can view photos
- ✅ Only admins can upload/delete
- ✅ Public URLs (photos not sensitive)
- ❌ Signed URLs not needed (assets are internal records)

### Data Privacy

- ✅ Photos deleted when asset deleted (cascade)
- ✅ Photos scoped to tenant
- ✅ No cross-tenant access
- ✅ Audit trail maintained

---

## Testing Checklist

### Unit Tests

- [ ] Photo upload validation (file type, size)
- [ ] Storage path generation
- [ ] Photo deletion logic
- [ ] Cascade deletion when asset deleted

### Integration Tests

- [ ] Upload photo via API
- [ ] Replace existing photo
- [ ] Delete photo via API
- [ ] View photo on detail page
- [ ] See thumbnail in list

### E2E Tests

**File**: `tests/e2e/asset-photos.spec.ts`

```typescript
test('admin can upload asset photo', async ({ page }) => {
  // Login as admin
  // Navigate to asset detail
  // Upload photo
  // Verify photo appears
});

test('admin can replace asset photo', async ({ page }) => {
  // Upload initial photo
  // Upload replacement
  // Verify new photo shown
  // Verify old photo deleted from storage
});

test('admin can delete asset photo', async ({ page }) => {
  // Upload photo
  // Click delete
  // Verify photo removed
});

test('photo thumbnail appears in list', async ({ page }) => {
  // Upload photo to asset
  // Go to asset list
  // Verify thumbnail shown
});

test('employee can view but not upload photo', async ({ page }) => {
  // Login as employee
  // Navigate to asset detail
  // Verify photo shown
  // Verify no upload button
});
```

### Manual Testing

- [ ] Upload JPEG, PNG, GIF, WebP
- [ ] Try uploading non-image file (should fail)
- [ ] Try uploading >5MB file (should fail)
- [ ] Upload photo, then delete asset (verify photo deleted)
- [ ] Upload photo in one tenant, verify not visible in another
- [ ] Test on mobile (responsive design)
- [ ] Test zoom dialog
- [ ] Test photo replacement

---

## Implementation Timeline

### Day 1: Backend (4-6 hours)

**Morning (2-3 hours)**:
- ✅ Add schema fields
- ✅ Run migration
- ✅ Create photo upload API endpoint
- ✅ Create photo delete API endpoint

**Afternoon (2-3 hours)**:
- ✅ Update asset list/detail APIs
- ✅ Test API endpoints with Postman
- ✅ Write unit tests

### Day 2: Frontend (4-6 hours)

**Morning (2-3 hours)**:
- ✅ Create AssetPhotoUpload component
- ✅ Create AssetPhotoDisplay component
- ✅ Update asset create/edit forms

**Afternoon (2-3 hours)**:
- ✅ Update asset detail pages (admin + employee)
- ✅ Update asset list tables
- ✅ Test on dev environment
- ✅ Write E2E tests

---

## Rollout Plan

### Phase 1: Staging (Week 1)
- Deploy to staging environment
- Internal team testing
- Upload test photos
- Monitor storage usage
- Gather feedback

### Phase 2: Pilot (Week 2)
- Enable for 2-3 friendly organizations
- Provide usage guidelines
- Monitor for issues
- Collect user feedback

### Phase 3: General Availability (Week 3)
- Deploy to production
- Announce in release notes
- Update documentation
- Monitor Supabase storage usage

---

## Documentation Updates

### Admin Guide

**Location**: User documentation / Asset Management

**Add Section**: "Adding Photos to Assets"

```markdown
## Adding Photos to Assets

You can add photos to your assets to visually document equipment.

### Upload a Photo

1. Go to **Assets** > Select an asset
2. Click **Edit**
3. Scroll to **Asset Photo** section
4. Click **Upload Photo**
5. Select an image (JPEG, PNG, GIF, or WebP)
6. Photo will appear once uploaded

### Replace a Photo

1. Navigate to asset detail page
2. Click **Replace Photo**
3. Select new image
4. Previous photo will be automatically deleted

### Delete a Photo

1. Navigate to asset detail page
2. Click **Remove** button on photo
3. Confirm deletion

**Tips**:
- Use clear, well-lit photos
- Keep file size under 5MB
- Compress images before upload for faster loading
- Take photos from multiple angles (save others locally)
```

### Developer Guide

**Location**: `CLAUDE.md`

**Add Section**: Asset Photos

```markdown
## Asset Photos

Assets support photo uploads via Supabase storage.

**Schema**:
- `photoUrl`: Public URL to photo
- `photoPath`: Storage path for deletion
- `photoUploadedAt`: Upload timestamp
- `photoUploadedBy`: FK to TeamMember

**API Endpoints**:
- `POST /api/assets/[id]/photo` - Upload photo
- `DELETE /api/assets/[id]/photo` - Delete photo

**Components**:
- `<AssetPhotoUpload>` - Upload/replace/delete UI (admin)
- `<AssetPhotoDisplay>` - Display photo with zoom (all users)

**Storage Path**: `tenants/{tenantId}/assets/{assetId}.{ext}`
```

---

## Future Enhancements (Post-MVP)

### Phase 2: Multiple Photos
- Create `AssetPhoto` model
- Photo gallery component
- Drag-to-reorder
- Primary photo designation

### Phase 3: Advanced Features
- In-app image cropping
- Automatic thumbnail generation
- Photo compression on upload
- Bulk photo import (CSV + ZIP)

### Phase 4: AI Features
- Auto-tag assets from photos (OCR serial numbers)
- Damage detection (before/after comparisons)
- Similar asset search by photo

---

## Monitoring & Metrics

### Key Metrics to Track

1. **Adoption Rate**
   - % of assets with photos
   - Photos uploaded per day/week

2. **Storage Usage**
   - Total GB used
   - Average photo size
   - Growth rate

3. **Performance**
   - Upload success rate
   - Average upload time
   - Page load time with photos

4. **User Behavior**
   - Photo replacements vs new uploads
   - Photo deletions
   - Zoom usage

### Alerts

- ⚠️ Storage exceeds 80% of plan limit
- ⚠️ Upload failure rate > 5%
- ⚠️ Average upload time > 10 seconds

---

## Success Criteria

✅ **Launch Success** when:
- All tests passing
- Photo upload works on mobile and desktop
- No performance degradation on asset lists
- Documentation complete
- At least 50% of pilot org assets have photos

✅ **Feature Success** when:
- 30%+ of active assets have photos across all orgs
- Upload success rate > 95%
- No critical bugs reported
- Positive user feedback

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Storage costs exceed budget | High | Medium | Monitor usage, set alerts, advise compression |
| Large photos slow page load | Medium | Medium | Implement lazy loading, thumbnails |
| Photo deletion cascade fails | High | Low | Test thoroughly, add safeguards |
| Cross-tenant photo access | Critical | Very Low | Strict path validation, security tests |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Low adoption | Medium | Medium | Add onboarding prompts, show benefits |
| Storage plan upgrade needed | Medium | High | Budget for Pro tier, transparent pricing |
| Users upload sensitive data | Medium | Low | Add upload guidelines, privacy policy |

---

## Dependencies

### Required Services
- ✅ Supabase storage configured
- ✅ Environment variables set
- ✅ Bucket permissions correct

### Required Code
- ✅ `src/lib/storage/supabase.ts` exists
- ✅ Activity logging functional
- ✅ Asset module enabled

---

## Rollback Plan

If critical issues arise:

1. **Immediate**: Disable upload button (feature flag)
2. **Database**: Rollback migration if needed
3. **Storage**: Photos remain in Supabase (no data loss)
4. **Code**: Revert to previous deployment

**Recovery Time**: < 30 minutes

---

## Contacts

**Implementation Owner**: Frontend + Backend Team
**Design Review**: UI/UX Team
**Storage Review**: Infrastructure Team
**Approval Required**: CTO

---

**Last Updated**: 2026-01-07
**Target Release**: Q1 2026
**Status**: Ready for Implementation
