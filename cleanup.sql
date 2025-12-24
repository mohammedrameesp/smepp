-- Delete all data and start fresh
-- Run in Supabase SQL Editor

-- Delete all sessions and accounts first (auth related)
DELETE FROM "Session";
DELETE FROM "Account";
DELETE FROM "VerificationToken";

-- Delete organization data (if any remaining)
DELETE FROM "OrganizationInvitation";
DELETE FROM "OrganizationUser";
DELETE FROM "Organization";

-- Delete all users
DELETE FROM "User";
