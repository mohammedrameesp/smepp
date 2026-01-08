-- Migration: Add logoUrlInverse column to Organization table
-- Run this in Supabase SQL Editor if prisma migrate fails

ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrlInverse" TEXT;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'Organization' AND column_name = 'logoUrlInverse';
