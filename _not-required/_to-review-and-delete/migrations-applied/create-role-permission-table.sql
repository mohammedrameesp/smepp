-- ============================================================================
-- Migration: Create RolePermission table for Access Control System
-- Run this in Supabase SQL Editor if Prisma db push fails
-- ============================================================================

-- Create RolePermission table for storing custom permissions per organization per role
CREATE TABLE IF NOT EXISTS "RolePermission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL,
    "permission" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint (prevents duplicate permission grants)
ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_tenantId_role_permission_key"
UNIQUE ("tenantId", "role", "permission");

-- Create indexes for efficient queries
CREATE INDEX "RolePermission_tenantId_idx" ON "RolePermission"("tenantId");
CREATE INDEX "RolePermission_tenantId_role_idx" ON "RolePermission"("tenantId", "role");

-- Add foreign key constraint to Organization table
ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================================================
-- Verification: Check table was created
-- ============================================================================
-- SELECT * FROM information_schema.tables WHERE table_name = 'RolePermission';
-- SELECT * FROM information_schema.columns WHERE table_name = 'RolePermission';
