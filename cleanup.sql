-- COMPLETE DATABASE CLEANUP
-- Keeps only user accounts (for login), deletes everything else
-- Run in Supabase SQL Editor

-- 1. Delete all tenant-scoped data first (respecting foreign keys)

-- Leave & Payroll
DELETE FROM "Payslip";
DELETE FROM "PayrollRun";
DELETE FROM "SalaryStructure";
DELETE FROM "EmployeeLoan";
DELETE FROM "LeaveRequest";
DELETE FROM "LeaveBalance";
DELETE FROM "LeaveType";

-- HR
DELETE FROM "ProfileChangeRequest";
DELETE FROM "HRProfile";

-- Purchase Requests
DELETE FROM "PurchaseRequestHistory";
DELETE FROM "PurchaseRequestItem";
DELETE FROM "PurchaseRequest";

-- Assets
DELETE FROM "AssetRequest";
DELETE FROM "MaintenanceRecord";
DELETE FROM "AssetHistory";
DELETE FROM "Asset";

-- Subscriptions
DELETE FROM "SubscriptionHistory";
DELETE FROM "Subscription";

-- Suppliers
DELETE FROM "SupplierEngagement";
DELETE FROM "Supplier";

-- Company Documents
DELETE FROM "CompanyDocument";
DELETE FROM "CompanyDocumentType";

-- Approvals
DELETE FROM "ApproverDelegation";
DELETE FROM "ApprovalStep";
DELETE FROM "ApprovalPolicy";

-- System
DELETE FROM "Notification";
DELETE FROM "ActivityLog";
DELETE FROM "SystemSettings";

-- 2. Delete organization memberships and invitations
DELETE FROM "OrganizationInvitation";
DELETE FROM "OrganizationUser";

-- 3. Delete organizations
DELETE FROM "Organization";

-- 4. Clean up auth sessions (keeps users)
DELETE FROM "Session";
DELETE FROM "VerificationToken";

-- OPTIONAL: Uncomment below to also delete all users except super admin
-- DELETE FROM "Account" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE email = 'YOUR_SUPER_ADMIN_EMAIL');
-- DELETE FROM "User" WHERE email != 'YOUR_SUPER_ADMIN_EMAIL';

-- Done! Your database is now clean.
-- Users can still log in, but no organizations or data exist.
