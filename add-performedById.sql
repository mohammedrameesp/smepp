-- Add performedById column to MaintenanceRecord table
ALTER TABLE "MaintenanceRecord"
ADD COLUMN IF NOT EXISTS "performedById" TEXT;

-- Add foreign key constraint
ALTER TABLE "MaintenanceRecord"
ADD CONSTRAINT "MaintenanceRecord_performedById_fkey"
FOREIGN KEY ("performedById") REFERENCES "TeamMember"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS "MaintenanceRecord_performedById_idx"
ON "MaintenanceRecord"("performedById");
