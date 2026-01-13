-- Add soft delete columns to Asset table
-- Run this manually in Supabase SQL Editor

-- Add deletedAt column
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Add deletedById column (foreign key to TeamMember)
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "deletedById" TEXT;

-- Add foreign key constraint
ALTER TABLE "Asset"
ADD CONSTRAINT "Asset_deletedById_fkey"
FOREIGN KEY ("deletedById") REFERENCES "TeamMember"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for efficient querying of soft-deleted assets
CREATE INDEX IF NOT EXISTS "Asset_tenantId_deletedAt_idx" ON "Asset"("tenantId", "deletedAt");
