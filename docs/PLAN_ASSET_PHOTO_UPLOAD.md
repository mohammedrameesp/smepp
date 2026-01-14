# Plan: Asset Photo & Document Upload Feature

## Summary

Add the ability to upload a primary photo and documents (manuals, spec sheets, warranty docs) to assets.

**User Requirements:**
- Single photo per asset
- Support photos (JPEG, PNG, WebP) + documents (PDF)
- Visible to all organization members

## Current State

- Asset model has NO photo/document fields
- File upload infrastructure already exists:
  - Supabase storage configured (`src/lib/storage/supabase.ts`)
  - Upload utilities (`sbUpload`, `storageUpload`, `uploadFile`)
  - API endpoint at `/api/upload`
  - File validation (MIME types, magic numbers, 10MB limit)
  - Tenant isolation built-in

## Implementation Plan

### 1. Update Prisma Schema

Add fields to `Asset` model in `prisma/schema.prisma`:

```prisma
model Asset {
  // ... existing fields ...

  // Photo & Documents
  photoUrl        String?   // Primary asset photo
  documentUrl     String?   // Manual, spec sheet, warranty doc
  documentName    String?   // Original filename for display
}
```

### 2. Create Asset Upload API

Create `src/app/api/assets/[id]/upload/route.ts`:

- **POST** - Upload photo or document to asset
- Validates:
  - Asset exists and belongs to tenant
  - File type (images: jpeg/png/webp, documents: pdf)
  - File size (max 10MB)
- Storage path: `{tenantId}/assets/{assetId}/{type}_{timestamp}.{ext}`
- Updates asset record with URL

- **DELETE** - Remove photo or document
- Removes file from Supabase
- Clears URL field on asset

### 3. Update Asset Validations

Update `src/features/assets/validations/asset.ts`:
- Add optional `photoUrl` and `documentUrl` to update schema

### 4. Update Asset Detail Page

Update `src/app/admin/(operations)/assets/[id]/page.tsx`:
- Add photo display (with placeholder if none)
- Add document download link
- Add upload buttons for admin users

### 5. Update Asset Edit Page

Update `src/app/admin/(operations)/assets/[id]/edit/page.tsx`:
- Add photo upload component
- Add document upload component
- Preview current photo/document
- Delete buttons

### 6. Create Upload Component

Create `src/features/assets/components/asset-file-upload.tsx`:
- Reusable upload component for assets
- Drag & drop support
- Preview for images
- Progress indicator
- Error handling

## Files to Modify

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add photoUrl, documentUrl, documentName fields |
| `src/app/api/assets/[id]/upload/route.ts` | New file - upload endpoint |
| `src/features/assets/validations/asset.ts` | Add optional URL fields |
| `src/app/admin/(operations)/assets/[id]/page.tsx` | Display photo & document |
| `src/app/admin/(operations)/assets/[id]/edit/page.tsx` | Upload UI |
| `src/features/assets/components/asset-file-upload.tsx` | New upload component |
| `src/features/assets/components/index.ts` | Export new component |

## Storage Structure

```
{tenantId}/
└── assets/
    └── {assetId}/
        ├── photo_{timestamp}.jpg
        └── document_{timestamp}.pdf
```

## Allowed File Types

| Type | Extensions | MIME Types |
|------|------------|------------|
| Photo | .jpg, .jpeg, .png, .webp | image/jpeg, image/png, image/webp |
| Document | .pdf | application/pdf |

## Security

- Tenant isolation via path prefix (existing pattern)
- File validation using existing `sanity.ts` utilities
- Admin-only upload/delete (view for all org members)
- 10MB file size limit

## Verification

1. Run `npm run db:generate` after schema change
2. Run `npm run db:migrate` to apply changes
3. Test upload flow:
   - Upload photo to asset
   - Upload document to asset
   - View asset detail (photo displays)
   - Download document
   - Delete photo/document
4. Run `npm run typecheck` for type errors
5. Test tenant isolation (asset photos not visible to other orgs)
