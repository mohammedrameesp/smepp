-- Add codeFormats column to Organization table
-- This column stores custom format patterns for reference codes (employee IDs, asset tags, etc.)
-- Run this in Supabase SQL Editor

ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "codeFormats" JSONB DEFAULT '{}';
