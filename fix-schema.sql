-- Run this in Supabase SQL Editor to add the missing column
ALTER TABLE "OrganizationInvitation" ADD COLUMN IF NOT EXISTS "name" TEXT;
