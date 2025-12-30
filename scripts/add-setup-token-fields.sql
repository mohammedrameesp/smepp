-- Add setupToken and setupTokenExpiry fields to User table
-- For initial password setup flow for new employees

-- Add setupToken field (unique, nullable)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "setupToken" TEXT;

-- Add unique constraint on setupToken
CREATE UNIQUE INDEX IF NOT EXISTS "User_setupToken_key" ON "User"("setupToken");

-- Add setupTokenExpiry field (nullable)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "setupTokenExpiry" TIMESTAMP(3);
