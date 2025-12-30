-- Add isShared column to Asset table for shared/common resources
-- Run this in Supabase SQL Editor

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "isShared" BOOLEAN NOT NULL DEFAULT false;

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Asset' AND column_name = 'isShared';
