-- Asset Depreciation Schema Migration
-- Run this in Supabase SQL Editor if prisma db push is not available
-- Based on Qatar Tax Depreciation Rates and IFRS compliance

-- ============================================================================
-- 1. Create DepreciationCategory table (system-wide categories)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "DepreciationCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "annualRate" DECIMAL(5,2) NOT NULL,
    "usefulLifeYears" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DepreciationCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "DepreciationCategory_code_key" ON "DepreciationCategory"("code");

-- ============================================================================
-- 2. Create DepreciationRecord table (monthly depreciation entries)
-- ============================================================================
CREATE TABLE IF NOT EXISTS "DepreciationRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "depreciationAmount" DECIMAL(12,2) NOT NULL,
    "accumulatedAmount" DECIMAL(12,2) NOT NULL,
    "netBookValue" DECIMAL(12,2) NOT NULL,
    "calculationType" TEXT NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "calculatedById" TEXT,
    "notes" TEXT,
    CONSTRAINT "DepreciationRecord_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DepreciationRecord_tenantId_idx" ON "DepreciationRecord"("tenantId");
CREATE INDEX IF NOT EXISTS "DepreciationRecord_assetId_idx" ON "DepreciationRecord"("assetId");
CREATE INDEX IF NOT EXISTS "DepreciationRecord_periodEnd_idx" ON "DepreciationRecord"("periodEnd");

-- ============================================================================
-- 3. Add depreciation columns to Asset table
-- ============================================================================
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "depreciationCategoryId" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "salvageValue" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "customUsefulLifeMonths" INTEGER;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "depreciationStartDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "accumulatedDepreciation" DECIMAL(12,2) DEFAULT 0;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "netBookValue" DECIMAL(12,2);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "lastDepreciationDate" TIMESTAMP(3);
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "isFullyDepreciated" BOOLEAN DEFAULT false;

-- ============================================================================
-- 4. Add foreign key constraints
-- ============================================================================
DO $$
BEGIN
    -- DepreciationRecord -> Organization
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepreciationRecord_tenantId_fkey') THEN
        ALTER TABLE "DepreciationRecord" ADD CONSTRAINT "DepreciationRecord_tenantId_fkey"
            FOREIGN KEY ("tenantId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- DepreciationRecord -> Asset
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepreciationRecord_assetId_fkey') THEN
        ALTER TABLE "DepreciationRecord" ADD CONSTRAINT "DepreciationRecord_assetId_fkey"
            FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;

    -- DepreciationRecord -> User (calculatedBy)
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DepreciationRecord_calculatedById_fkey') THEN
        ALTER TABLE "DepreciationRecord" ADD CONSTRAINT "DepreciationRecord_calculatedById_fkey"
            FOREIGN KEY ("calculatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    -- Asset -> DepreciationCategory
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Asset_depreciationCategoryId_fkey') THEN
        ALTER TABLE "Asset" ADD CONSTRAINT "Asset_depreciationCategoryId_fkey"
            FOREIGN KEY ("depreciationCategoryId") REFERENCES "DepreciationCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- 5. Seed Qatar Tax Depreciation Categories
-- ============================================================================
INSERT INTO "DepreciationCategory" ("id", "name", "code", "annualRate", "usefulLifeYears", "description", "isActive", "createdAt", "updatedAt")
VALUES
    (gen_random_uuid()::text, 'Buildings', 'BUILDINGS', 4.00, 25, 'Commercial and industrial buildings, structures', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Machinery & Equipment', 'MACHINERY', 20.00, 5, 'Industrial machinery, manufacturing equipment', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Vehicles', 'VEHICLES', 20.00, 5, 'Cars, trucks, delivery vehicles, company fleet', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Furniture & Office Equipment', 'FURNITURE', 20.00, 5, 'Desks, chairs, filing cabinets, office furnishings', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Computers & IT Equipment', 'IT_EQUIPMENT', 20.00, 5, 'Laptops, desktops, servers, networking equipment', true, NOW(), NOW()),
    (gen_random_uuid()::text, 'Intangible Assets', 'INTANGIBLE', 0.00, 0, 'Software licenses, patents, trademarks (requires custom useful life)', true, NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- ============================================================================
-- Verification query (run after migration)
-- ============================================================================
-- SELECT * FROM "DepreciationCategory";
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'Asset' AND column_name LIKE '%depreciation%';
