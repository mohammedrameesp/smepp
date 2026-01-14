-- Migration: Remove PAUSED from SubscriptionStatus enum
-- Date: 2025-01-14
-- Description: Simplify subscription lifecycle to just ACTIVE and CANCELLED

-- Step 1: Update any existing PAUSED subscriptions to CANCELLED
UPDATE "Subscription"
SET status = 'CANCELLED',
    "cancelledAt" = COALESCE("cancelledAt", NOW())
WHERE status = 'PAUSED';

-- Step 2: Remove PAUSED from the enum
-- PostgreSQL requires creating a new enum and migrating
ALTER TYPE "SubscriptionStatus" RENAME TO "SubscriptionStatus_old";

CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELLED');

ALTER TABLE "Subscription"
  ALTER COLUMN status TYPE "SubscriptionStatus"
  USING status::text::"SubscriptionStatus";

DROP TYPE "SubscriptionStatus_old";
