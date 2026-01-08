-- Add subscriptionTag field to Subscription table
ALTER TABLE "Subscription" ADD COLUMN "subscriptionTag" TEXT;

-- Create unique constraint on tenantId + subscriptionTag
CREATE UNIQUE INDEX "Subscription_tenantId_subscriptionTag_key" ON "Subscription"("tenantId", "subscriptionTag");

-- Create index for efficient lookups
CREATE INDEX "Subscription_subscriptionTag_idx" ON "Subscription"("subscriptionTag");
