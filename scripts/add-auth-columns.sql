-- Add authentication configuration columns to Organization table
-- Run this in Supabase Dashboard > SQL Editor

-- Add allowed auth methods column (array of strings)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "allowedAuthMethods" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add allowed email domains column (array of strings)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "allowedEmailDomains" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Add enforce domain restriction flag
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "enforceDomainRestriction" BOOLEAN DEFAULT false;

-- Add custom OAuth credentials (for enterprise orgs)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customGoogleClientId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customGoogleClientSecret" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customAzureClientId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customAzureClientSecret" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customAzureTenantId" TEXT;

-- Verify columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'Organization'
AND column_name IN (
  'allowedAuthMethods',
  'allowedEmailDomains',
  'enforceDomainRestriction',
  'customGoogleClientId',
  'customGoogleClientSecret',
  'customAzureClientId',
  'customAzureClientSecret',
  'customAzureTenantId'
);
