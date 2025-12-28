-- Fix Missing HR Profiles
-- Run this in Supabase SQL Editor
-- Replace 'YOUR_ORG_ID' with your actual organization ID

-- Step 1: Find your organization ID
SELECT id, name, slug, "codePrefix" FROM "Organization";

-- Step 2: Check which members are missing HR profiles
-- Replace YOUR_ORG_ID below
SELECT
  u.id as user_id,
  u.name,
  u.email,
  h.id as hr_profile_id,
  h."tenantId" as hr_tenant_id,
  CASE
    WHEN h.id IS NULL THEN 'MISSING'
    WHEN h."tenantId" != 'YOUR_ORG_ID' THEN 'WRONG_TENANT'
    ELSE 'OK'
  END as status
FROM "User" u
JOIN "OrganizationUser" ou ON ou."userId" = u.id
LEFT JOIN "HRProfile" h ON h."userId" = u.id
WHERE ou."organizationId" = 'YOUR_ORG_ID'
ORDER BY status, u.name;

-- Step 3: Create missing HR profiles
-- This inserts profiles for users who don't have any HR profile
-- Replace YOUR_ORG_ID and adjust the employeeId prefix as needed

INSERT INTO "HRProfile" (id, "tenantId", "userId", "employeeId", "onboardingComplete", "onboardingStep", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'YOUR_ORG_ID',
  u.id,
  'EMP-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY u.name))::TEXT, 3, '0'),
  true,
  0,
  NOW(),
  NOW()
FROM "User" u
JOIN "OrganizationUser" ou ON ou."userId" = u.id
LEFT JOIN "HRProfile" h ON h."userId" = u.id
WHERE ou."organizationId" = 'YOUR_ORG_ID'
  AND h.id IS NULL;

-- Step 4: Fix profiles with wrong tenant (optional - will move them to this org)
-- WARNING: This removes the profile from the other organization
-- Only run if you're sure these users should belong to YOUR_ORG_ID

-- UPDATE "HRProfile" h
-- SET "tenantId" = 'YOUR_ORG_ID'
-- FROM "OrganizationUser" ou
-- WHERE h."userId" = ou."userId"
--   AND ou."organizationId" = 'YOUR_ORG_ID'
--   AND h."tenantId" != 'YOUR_ORG_ID';

-- Step 5: Verify the fix
SELECT
  u.id as user_id,
  u.name,
  u.email,
  h."employeeId",
  h."tenantId"
FROM "User" u
JOIN "OrganizationUser" ou ON ou."userId" = u.id
JOIN "HRProfile" h ON h."userId" = u.id AND h."tenantId" = 'YOUR_ORG_ID'
WHERE ou."organizationId" = 'YOUR_ORG_ID'
ORDER BY u.name;
