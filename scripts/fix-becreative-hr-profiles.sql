-- Fix Missing HR Profiles for BeCreative
-- Run this in Supabase SQL Editor

-- Step 1: Check members without HR profiles
SELECT
  u.id as user_id,
  u.name,
  u.email,
  h.id as hr_profile_id,
  CASE WHEN h.id IS NULL THEN 'MISSING' ELSE 'OK' END as status
FROM "User" u
JOIN "OrganizationUser" ou ON ou."userId" = u.id
LEFT JOIN "HRProfile" h ON h."userId" = u.id
WHERE ou."organizationId" = 'cmjolyx8h0000l104nv4b3x14'
ORDER BY h.id NULLS FIRST, u.name;

-- Step 2: Create missing HR profiles for BeCreative
INSERT INTO "HRProfile" (id, "tenantId", "userId", "employeeId", "onboardingComplete", "onboardingStep", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'cmjolyx8h0000l104nv4b3x14',
  u.id,
  'BEC-' || EXTRACT(YEAR FROM NOW())::TEXT || '-' || LPAD((ROW_NUMBER() OVER (ORDER BY u.name))::TEXT, 3, '0'),
  true,
  0,
  NOW(),
  NOW()
FROM "User" u
JOIN "OrganizationUser" ou ON ou."userId" = u.id
LEFT JOIN "HRProfile" h ON h."userId" = u.id
WHERE ou."organizationId" = 'cmjolyx8h0000l104nv4b3x14'
  AND h.id IS NULL;

-- Step 3: Verify the fix
SELECT
  u.name,
  u.email,
  h."employeeId"
FROM "User" u
JOIN "OrganizationUser" ou ON ou."userId" = u.id
JOIN "HRProfile" h ON h."userId" = u.id
WHERE ou."organizationId" = 'cmjolyx8h0000l104nv4b3x14'
ORDER BY u.name;
