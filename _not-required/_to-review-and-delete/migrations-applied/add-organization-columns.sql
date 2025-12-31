-- =====================================================
-- COMPLETE ORGANIZATION TABLE MIGRATION
-- Run this in Supabase SQL Editor
-- =====================================================

-- Branding columns
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#1E40AF';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "loginBackgroundUrl" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "welcomeTitle" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "welcomeSubtitle" TEXT;

-- Settings
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "timezone" TEXT DEFAULT 'Asia/Qatar';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "currency" TEXT DEFAULT 'QAR';

-- Module configuration (arrays)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "enabledModules" TEXT[] DEFAULT ARRAY['assets', 'subscriptions', 'suppliers'];
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "additionalCurrencies" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Onboarding tracking
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingCompleted" BOOLEAN DEFAULT false;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingCompletedAt" TIMESTAMP(3);
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "onboardingStep" INTEGER DEFAULT 0;

-- Subscription & Billing
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "subscriptionTier" TEXT DEFAULT 'FREE';
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripePriceId" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "stripeSubEnd" TIMESTAMP(3);

-- Usage Limits
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "maxUsers" INTEGER DEFAULT 5;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "maxAssets" INTEGER DEFAULT 50;

-- Timestamps (if missing)
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;

-- Create unique index on stripeCustomerId if not exists
CREATE UNIQUE INDEX IF NOT EXISTS "Organization_stripeCustomerId_key" ON "Organization"("stripeCustomerId");

-- =====================================================
-- SET DEFAULT VALUES FOR EXISTING ROWS
-- =====================================================
UPDATE "Organization" SET
  "primaryColor" = '#1E40AF' WHERE "primaryColor" IS NULL;
UPDATE "Organization" SET
  "timezone" = 'Asia/Qatar' WHERE "timezone" IS NULL;
UPDATE "Organization" SET
  "currency" = 'QAR' WHERE "currency" IS NULL;
UPDATE "Organization" SET
  "onboardingCompleted" = false WHERE "onboardingCompleted" IS NULL;
UPDATE "Organization" SET
  "onboardingStep" = 0 WHERE "onboardingStep" IS NULL;
UPDATE "Organization" SET
  "subscriptionTier" = 'FREE' WHERE "subscriptionTier" IS NULL;
UPDATE "Organization" SET
  "maxUsers" = 5 WHERE "maxUsers" IS NULL;
UPDATE "Organization" SET
  "maxAssets" = 50 WHERE "maxAssets" IS NULL;
