-- Migration Script: Sync database with Prisma schema
-- Run this in Supabase SQL Editor
-- Generated: 2025-12-29

-- ============================================================================
-- STEP 1: Create new enums (if not exists)
-- ============================================================================

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WhatsAppSource') THEN
        CREATE TYPE "WhatsAppSource" AS ENUM ('NONE', 'PLATFORM', 'CUSTOM');
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Add missing columns to Organization table
-- ============================================================================

-- WhatsApp fields
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "whatsAppSource" "WhatsAppSource" DEFAULT 'NONE';

ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "whatsAppPlatformEnabled" BOOLEAN DEFAULT false;

-- AI Token Budget
ALTER TABLE "Organization"
ADD COLUMN IF NOT EXISTS "aiTokenBudgetMonthly" INTEGER;

-- ============================================================================
-- STEP 3: Add missing columns to User table
-- ============================================================================

-- Session security - password change tracking
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "passwordChangedAt" TIMESTAMP(3);

-- Account lockout (brute-force protection)
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "failedLoginAttempts" INTEGER DEFAULT 0;

ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3);

-- ============================================================================
-- STEP 4: Update SystemSettings constraints (only if table exists)
-- ============================================================================

DO $$
BEGIN
    -- Only proceed if SystemSettings table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SystemSettings') THEN
        -- Drop the old unique constraint on key if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'SystemSettings_key_key'
            AND table_name = 'SystemSettings'
        ) THEN
            ALTER TABLE "SystemSettings" DROP CONSTRAINT "SystemSettings_key_key";
        END IF;

        -- Add composite unique constraint (tenantId, key) if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'SystemSettings_tenantId_key_key'
            AND table_name = 'SystemSettings'
        ) THEN
            ALTER TABLE "SystemSettings" ADD CONSTRAINT "SystemSettings_tenantId_key_key" UNIQUE ("tenantId", "key");
        END IF;
    ELSE
        RAISE NOTICE 'SystemSettings table does not exist, skipping constraint updates';
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Create AIChatAuditLog table
-- ============================================================================

CREATE TABLE IF NOT EXISTS "AIChatAuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conversationId" TEXT,
    "queryHash" TEXT NOT NULL,
    "queryLength" INTEGER NOT NULL,
    "functionsCalled" JSONB NOT NULL,
    "dataAccessed" JSONB NOT NULL,
    "tokensUsed" INTEGER NOT NULL,
    "responseTimeMs" INTEGER NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "flagReasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "riskScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIChatAuditLog_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for AIChatAuditLog
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'AIChatAuditLog_tenantId_fkey'
    ) THEN
        ALTER TABLE "AIChatAuditLog"
        ADD CONSTRAINT "AIChatAuditLog_tenantId_fkey"
        FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'AIChatAuditLog_userId_fkey'
    ) THEN
        ALTER TABLE "AIChatAuditLog"
        ADD CONSTRAINT "AIChatAuditLog_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Create indexes
-- ============================================================================

-- AIChatAuditLog indexes
CREATE INDEX IF NOT EXISTS "AIChatAuditLog_tenantId_createdAt_idx" ON "AIChatAuditLog"("tenantId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIChatAuditLog_userId_createdAt_idx" ON "AIChatAuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "AIChatAuditLog_flagged_idx" ON "AIChatAuditLog"("flagged");

-- HRProfile expiry indexes (for cron job performance)
CREATE INDEX IF NOT EXISTS "HRProfile_qidExpiry_idx" ON "HRProfile"("qidExpiry");
CREATE INDEX IF NOT EXISTS "HRProfile_passportExpiry_idx" ON "HRProfile"("passportExpiry");
CREATE INDEX IF NOT EXISTS "HRProfile_healthCardExpiry_idx" ON "HRProfile"("healthCardExpiry");
CREATE INDEX IF NOT EXISTS "HRProfile_contractExpiry_idx" ON "HRProfile"("contractExpiry");
CREATE INDEX IF NOT EXISTS "HRProfile_licenseExpiry_idx" ON "HRProfile"("licenseExpiry");

-- Compound indexes for tenant-scoped expiry queries
CREATE INDEX IF NOT EXISTS "HRProfile_tenantId_qidExpiry_idx" ON "HRProfile"("tenantId", "qidExpiry");
CREATE INDEX IF NOT EXISTS "HRProfile_tenantId_passportExpiry_idx" ON "HRProfile"("tenantId", "passportExpiry");
CREATE INDEX IF NOT EXISTS "HRProfile_tenantId_contractExpiry_idx" ON "HRProfile"("tenantId", "contractExpiry");

-- CompanyDocument expiry index
CREATE INDEX IF NOT EXISTS "CompanyDocument_tenantId_expiryDate_idx" ON "CompanyDocument"("tenantId", "expiryDate");

-- ============================================================================
-- VERIFICATION: Check that everything was created
-- ============================================================================

-- You can run these queries to verify:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'Organization' AND column_name IN ('whatsAppSource', 'whatsAppPlatformEnabled', 'aiTokenBudgetMonthly');
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'User' AND column_name IN ('passwordChangedAt', 'failedLoginAttempts', 'lockedUntil');
-- SELECT table_name FROM information_schema.tables WHERE table_name = 'AIChatAuditLog';
