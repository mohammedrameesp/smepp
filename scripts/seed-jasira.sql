-- ═══════════════════════════════════════════════════════════════════════════════
-- JASIRA COMPANY SEED DATA
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════

-- First, get the Jasira organization ID
DO $$
DECLARE
    v_tenant_id TEXT;
    v_user_mohammed TEXT;
    v_user_fatima TEXT;
    v_user_ahmed TEXT;
    v_user_sarah TEXT;
    v_user_raj TEXT;
    v_user_omar TEXT;
    v_user_maria TEXT;
    v_user_john TEXT;
    v_user_priya TEXT;
    v_user_ali TEXT;
    v_user_chen TEXT;
    v_user_layla TEXT;
    v_user_deepak TEXT;
    v_user_amina TEXT;
    v_user_james TEXT;
    v_user_noor TEXT;
    v_leave_annual TEXT;
    v_leave_sick TEXT;
    v_leave_unpaid TEXT;
    v_leave_maternity TEXT;
    v_leave_paternity TEXT;
    v_leave_hajj TEXT;
    v_leave_compassionate TEXT;
    v_today DATE := CURRENT_DATE;
    v_password_hash TEXT := '$2b$10$P1YfrfF8H/UavUlVbhgui.ehvbtk0k0rJLGq8MMw0aWvUhsjMB.wC'; -- Jasira123!
BEGIN

-- Get or create Jasira organization
SELECT id INTO v_tenant_id FROM "Organization" WHERE slug = 'jasira';

IF v_tenant_id IS NULL THEN
    INSERT INTO "Organization" (id, name, slug, currency, timezone, "subscriptionTier", "maxUsers", "maxAssets", industry, "companySize", "enabledModules", "onboardingCompleted", "onboardingStep", "createdAt", "updatedAt")
    VALUES (
        'jasira_org_001',
        'Jasira',
        'jasira',
        'QAR',
        'Asia/Qatar',
        'PROFESSIONAL',
        50,
        500,
        'Technology',
        '11-50',
        ARRAY['assets', 'subscriptions', 'suppliers', 'employees', 'leave', 'payroll', 'projects'],
        true,
        5,
        NOW(),
        NOW()
    );
    v_tenant_id := 'jasira_org_001';
END IF;

RAISE NOTICE 'Using tenant ID: %', v_tenant_id;

-- ═══════════════════════════════════════════════════════════════════════════════
-- CLEANUP EXISTING JASIRA DATA
-- ═══════════════════════════════════════════════════════════════════════════════

DELETE FROM "Notification" WHERE "tenantId" = v_tenant_id;
DELETE FROM "LoanRepayment" WHERE "loanId" IN (SELECT id FROM "EmployeeLoan" WHERE "tenantId" = v_tenant_id);
DELETE FROM "EmployeeLoan" WHERE "tenantId" = v_tenant_id;
DELETE FROM "PayslipDeduction" WHERE "payslipId" IN (SELECT id FROM "Payslip" WHERE "tenantId" = v_tenant_id);
DELETE FROM "Payslip" WHERE "tenantId" = v_tenant_id;
DELETE FROM "PayrollHistory" WHERE "payrollRunId" IN (SELECT id FROM "PayrollRun" WHERE "tenantId" = v_tenant_id);
DELETE FROM "PayrollRun" WHERE "tenantId" = v_tenant_id;
DELETE FROM "SalaryStructureHistory" WHERE "salaryStructureId" IN (SELECT id FROM "SalaryStructure" WHERE "tenantId" = v_tenant_id);
DELETE FROM "SalaryStructure" WHERE "tenantId" = v_tenant_id;
DELETE FROM "LeaveRequestHistory" WHERE "leaveRequestId" IN (SELECT id FROM "LeaveRequest" WHERE "tenantId" = v_tenant_id);
DELETE FROM "LeaveRequest" WHERE "tenantId" = v_tenant_id;
DELETE FROM "LeaveBalance" WHERE "tenantId" = v_tenant_id;
DELETE FROM "LeaveType" WHERE "tenantId" = v_tenant_id;
DELETE FROM "AssetRequestHistory" WHERE "assetRequestId" IN (SELECT id FROM "AssetRequest" WHERE "tenantId" = v_tenant_id);
DELETE FROM "AssetRequest" WHERE "tenantId" = v_tenant_id;
DELETE FROM "AssetHistory" WHERE "assetId" IN (SELECT id FROM "Asset" WHERE "tenantId" = v_tenant_id);
DELETE FROM "Asset" WHERE "tenantId" = v_tenant_id;
DELETE FROM "SubscriptionHistory" WHERE "subscriptionId" IN (SELECT id FROM "Subscription" WHERE "tenantId" = v_tenant_id);
DELETE FROM "Subscription" WHERE "tenantId" = v_tenant_id;
DELETE FROM "SupplierEngagement" WHERE "tenantId" = v_tenant_id;
DELETE FROM "Project" WHERE "tenantId" = v_tenant_id;
DELETE FROM "Supplier" WHERE "tenantId" = v_tenant_id;
DELETE FROM "ProfileChangeRequest" WHERE "tenantId" = v_tenant_id;
DELETE FROM "HRProfile" WHERE "tenantId" = v_tenant_id;
DELETE FROM "ActivityLog" WHERE "tenantId" = v_tenant_id;
DELETE FROM "OrganizationUser" WHERE "organizationId" = v_tenant_id;
DELETE FROM "User" WHERE email LIKE '%@jasira.qa';

RAISE NOTICE 'Cleanup complete';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE USERS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Generate unique IDs
v_user_mohammed := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_fatima := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_ahmed := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_sarah := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_raj := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_omar := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_maria := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_john := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_priya := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_ali := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_chen := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_layla := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_deepak := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_amina := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_james := 'jas_usr_' || substr(md5(random()::text), 1, 16);
v_user_noor := 'jas_usr_' || substr(md5(random()::text), 1, 16);

-- Insert Users
INSERT INTO "User" (id, name, email, role, "passwordHash", "createdAt", "updatedAt") VALUES
(v_user_mohammed, 'Mohammed Al-Thani', 'mohammed@jasira.qa', 'ADMIN', v_password_hash, NOW(), NOW()),
(v_user_fatima, 'Fatima Hassan', 'fatima@jasira.qa', 'HR_MANAGER', v_password_hash, NOW(), NOW()),
(v_user_ahmed, 'Ahmed Khalil', 'ahmed@jasira.qa', 'FINANCE_MANAGER', v_password_hash, NOW(), NOW()),
(v_user_sarah, 'Sarah Williams', 'sarah@jasira.qa', 'MANAGER', v_password_hash, NOW(), NOW()),
(v_user_raj, 'Raj Patel', 'raj@jasira.qa', 'MANAGER', v_password_hash, NOW(), NOW()),
(v_user_omar, 'Omar Nasser', 'omar@jasira.qa', 'MANAGER', v_password_hash, NOW(), NOW()),
(v_user_maria, 'Maria Santos', 'maria@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_john, 'John Smith', 'john@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_priya, 'Priya Sharma', 'priya@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_ali, 'Ali Mahmoud', 'ali@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_chen, 'Chen Wei', 'chen@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_layla, 'Layla Ibrahim', 'layla@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_deepak, 'Deepak Kumar', 'deepak@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_amina, 'Amina Yusuf', 'amina@jasira.qa', 'EMPLOYEE', v_password_hash, NOW(), NOW()),
(v_user_james, 'James Brown', 'james@jasira.qa', 'TEMP_STAFF', v_password_hash, NOW(), NOW()),
(v_user_noor, 'Noor Al-Said', 'noor@jasira.qa', 'TEMP_STAFF', v_password_hash, NOW(), NOW());

RAISE NOTICE 'Created 16 users';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE ORGANIZATION MEMBERSHIPS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "OrganizationUser" (id, "organizationId", "userId", role, "isOwner", "joinedAt") VALUES
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 'OWNER', true, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 'ADMIN', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ahmed, 'ADMIN', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_sarah, 'ADMIN', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_raj, 'ADMIN', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_omar, 'ADMIN', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_maria, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_john, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_priya, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ali, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_chen, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_layla, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_deepak, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_amina, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_james, 'MEMBER', false, NOW()),
('jas_ou_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_noor, 'MEMBER', false, NOW());

RAISE NOTICE 'Created organization memberships';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE HR PROFILES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "HRProfile" (id, "tenantId", "userId", "dateOfBirth", gender, "maritalStatus", nationality, "qatarMobile", "personalEmail", "qidNumber", "qidExpiry", "passportNumber", "passportExpiry", "healthCardExpiry", "sponsorshipType", "employeeId", designation, "dateOfJoining", "bankName", iban, "highestQualification", "onboardingStep", "onboardingComplete", "createdAt", "updatedAt") VALUES
-- Mohammed - birthday in 5 days
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed,
 (v_today + INTERVAL '5 days') - INTERVAL '45 years', 'Male', 'Married', 'Qatar', '55512345', 'mohammed.personal@gmail.com',
 '28412345678', v_today + INTERVAL '2 years', 'QA1234567', v_today + INTERVAL '5 years', v_today + INTERVAL '1 year',
 'Self', 'JAS-2025-001', 'Managing Director', v_today - INTERVAL '5 years', 'Qatar National Bank', 'QA12QNBA000000001234567890',
 'Master''s Degree', 8, true, NOW(), NOW()),

-- Fatima - birthday in 12 days
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima,
 (v_today + INTERVAL '12 days') - INTERVAL '38 years', 'Female', 'Married', 'Qatar', '55523456', 'fatima.personal@gmail.com',
 '28423456789', v_today + INTERVAL '18 months', 'QA2345678', v_today + INTERVAL '4 years', v_today + INTERVAL '10 months',
 'Self', 'JAS-2025-002', 'HR Manager', v_today - INTERVAL '4 years', 'Commercial Bank', 'QA12CBQA000000001234567891',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Ahmed - birthday 30 days ago
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ahmed,
 (v_today - INTERVAL '30 days') - INTERVAL '42 years', 'Male', 'Married', 'Jordan', '55534567', 'ahmed.personal@gmail.com',
 '28434567890', v_today + INTERVAL '14 months', 'JO3456789', v_today + INTERVAL '3 years', v_today + INTERVAL '8 months',
 'Company', 'JAS-2025-003', 'Finance Director', v_today - INTERVAL '3 years', 'Doha Bank', 'QA12DHBK000000001234567892',
 'Master''s Degree', 8, true, NOW(), NOW()),

-- Sarah - QID expiring in 10 days!
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_sarah,
 '1988-07-15', 'Female', 'Single', 'United Kingdom', '55545678', 'sarah.personal@gmail.com',
 '28445678901', v_today + INTERVAL '10 days', 'GB4567890', v_today + INTERVAL '2 years', v_today + INTERVAL '6 months',
 'Company', 'JAS-2025-004', 'Operations Manager', v_today - INTERVAL '2 years', 'Qatar Islamic Bank', 'QA12QISB000000001234567893',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Raj
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_raj,
 '1985-03-20', 'Male', 'Married', 'India', '55556789', 'raj.personal@gmail.com',
 '28456789012', v_today + INTERVAL '20 months', 'IN5678901', v_today + INTERVAL '4 years', v_today + INTERVAL '14 months',
 'Company', 'JAS-2025-005', 'IT Manager', v_today - INTERVAL '18 months', 'Qatar National Bank', 'QA12QNBA000000001234567894',
 'Master''s Degree', 8, true, NOW(), NOW()),

-- Omar
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_omar,
 '1990-11-08', 'Male', 'Married', 'Egypt', '55567890', 'omar.personal@gmail.com',
 '28467890123', v_today + INTERVAL '16 months', 'EG6789012', v_today + INTERVAL '3 years', v_today + INTERVAL '11 months',
 'Company', 'JAS-2025-006', 'Sales Manager', v_today - INTERVAL '1 year', 'Masraf Al Rayan', 'QA12MRAF000000001234567895',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Maria - passport expiring in 15 days!
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_maria,
 '1992-06-25', 'Female', 'Single', 'Philippines', '55578901', 'maria.personal@gmail.com',
 '28478901234', v_today + INTERVAL '22 months', 'PH7890123', v_today + INTERVAL '15 days', v_today + INTERVAL '9 months',
 'Company', 'JAS-2025-007', 'Senior Accountant', v_today - INTERVAL '14 months', 'Commercial Bank', 'QA12CBQA000000001234567896',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- John - QID EXPIRED 5 days ago!
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_john,
 '1987-09-12', 'Male', 'Married', 'United Kingdom', '55589012', 'john.personal@gmail.com',
 '28489012345', v_today - INTERVAL '5 days', 'GB8901234', v_today + INTERVAL '4 years', v_today + INTERVAL '15 months',
 'Company', 'JAS-2025-008', 'Software Developer', v_today - INTERVAL '10 months', 'Doha Bank', 'QA12DHBK000000001234567897',
 'Master''s Degree', 8, true, NOW(), NOW()),

-- Priya - birthday in 3 days!
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_priya,
 (v_today + INTERVAL '3 days') - INTERVAL '28 years', 'Female', 'Single', 'India', '55590123', 'priya.personal@gmail.com',
 '28490123456', v_today + INTERVAL '24 months', 'IN9012345', v_today + INTERVAL '5 years', v_today + INTERVAL '18 months',
 'Company', 'JAS-2025-009', 'HR Coordinator', v_today - INTERVAL '8 months', 'Qatar National Bank', 'QA12QNBA000000001234567898',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Ali
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ali,
 '1993-04-18', 'Male', 'Single', 'Egypt', '55501234', 'ali.personal@gmail.com',
 '28401234567', v_today + INTERVAL '19 months', 'EG0123456', v_today + INTERVAL '60 days', v_today + INTERVAL '12 months',
 'Company', 'JAS-2025-010', 'Sales Executive', v_today - INTERVAL '7 months', 'Qatar Islamic Bank', 'QA12QISB000000001234567899',
 'Diploma', 8, true, NOW(), NOW()),

-- Chen - QID expiring in 30 days
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_chen,
 '1991-12-05', 'Male', 'Married', 'China', '55512346', 'chen.personal@gmail.com',
 '28412345679', v_today + INTERVAL '30 days', 'CN1234568', v_today + INTERVAL '3 years', v_today + INTERVAL '10 months',
 'Company', 'JAS-2025-011', 'Project Coordinator', v_today - INTERVAL '6 months', 'Commercial Bank', 'QA12CBQA000000001234567900',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Layla - birthday in 7 days
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_layla,
 (v_today + INTERVAL '7 days') - INTERVAL '30 years', 'Female', 'Single', 'Lebanon', '55523457', 'layla.personal@gmail.com',
 '28423456790', v_today + INTERVAL '26 months', 'LB2345679', v_today + INTERVAL '4 years', v_today + INTERVAL '14 months',
 'Company', 'JAS-2025-012', 'Marketing Specialist', v_today - INTERVAL '5 months', 'Doha Bank', 'QA12DHBK000000001234567901',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Deepak - health card expiring in 7 days!
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_deepak,
 '1989-08-22', 'Male', 'Married', 'India', '55534568', 'deepak.personal@gmail.com',
 '28434567891', v_today + INTERVAL '21 months', 'IN3456780', v_today + INTERVAL '5 years', v_today + INTERVAL '7 days',
 'Company', 'JAS-2025-013', 'System Administrator', v_today - INTERVAL '4 months', 'Masraf Al Rayan', 'QA12MRAF000000001234567902',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Amina
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_amina,
 '1995-02-14', 'Female', 'Single', 'Kenya', '55545679', 'amina.personal@gmail.com',
 '28445678902', v_today + INTERVAL '28 months', 'KE4567891', v_today + INTERVAL '6 years', v_today + INTERVAL '20 months',
 'Company', 'JAS-2025-014', 'Executive Assistant', v_today - INTERVAL '3 months', 'Qatar National Bank', 'QA12QNBA000000001234567903',
 'Diploma', 8, true, NOW(), NOW()),

-- James (Intern)
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_james,
 '2000-10-30', 'Male', 'Single', 'United States', '55556790', 'james.personal@gmail.com',
 '28456789013', v_today + INTERVAL '6 months', 'US5678902', v_today + INTERVAL '8 years', v_today + INTERVAL '5 months',
 'Company', 'JAS-2025-015', 'Intern - IT', v_today - INTERVAL '30 days', 'Commercial Bank', 'QA12CBQA000000001234567904',
 'Bachelor''s Degree', 8, true, NOW(), NOW()),

-- Noor (Intern)
('jas_hr_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_noor,
 '2001-05-19', 'Female', 'Single', 'Bahrain', '55567891', 'noor.personal@gmail.com',
 '28467890124', v_today + INTERVAL '8 months', 'BH6789013', v_today + INTERVAL '7 years', v_today + INTERVAL '6 months',
 'Company', 'JAS-2025-016', 'Intern - Marketing', v_today - INTERVAL '14 days', 'Doha Bank', 'QA12DHBK000000001234567905',
 'Bachelor''s Degree', 8, true, NOW(), NOW());

RAISE NOTICE 'Created 16 HR profiles';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE LEAVE TYPES
-- ═══════════════════════════════════════════════════════════════════════════════

v_leave_annual := 'jas_lt_' || substr(md5(random()::text), 1, 12);
v_leave_sick := 'jas_lt_' || substr(md5(random()::text), 1, 12);
v_leave_unpaid := 'jas_lt_' || substr(md5(random()::text), 1, 12);
v_leave_maternity := 'jas_lt_' || substr(md5(random()::text), 1, 12);
v_leave_paternity := 'jas_lt_' || substr(md5(random()::text), 1, 12);
v_leave_hajj := 'jas_lt_' || substr(md5(random()::text), 1, 12);
v_leave_compassionate := 'jas_lt_' || substr(md5(random()::text), 1, 12);

INSERT INTO "LeaveType" (id, "tenantId", name, description, color, "defaultDays", category, "isPaid", "requiresApproval", "requiresDocument", "isActive", "minNoticeDays", "minimumServiceMonths", "allowCarryForward", "maxCarryForwardDays", "isOnceInEmployment", "genderRestriction", "createdAt", "updatedAt") VALUES
(v_leave_annual, v_tenant_id, 'Annual Leave', 'Paid annual vacation leave per Qatar Labor Law', '#3B82F6', 21, 'STANDARD', true, true, false, true, 7, 12, true, 10, false, NULL, NOW(), NOW()),
(v_leave_sick, v_tenant_id, 'Sick Leave', 'Medical leave with graduated pay', '#EF4444', 14, 'MEDICAL', true, true, true, true, 0, 3, false, NULL, false, NULL, NOW(), NOW()),
(v_leave_unpaid, v_tenant_id, 'Unpaid Leave', 'Leave without pay', '#6B7280', 30, 'STANDARD', false, true, false, true, 14, 0, false, NULL, false, NULL, NOW(), NOW()),
(v_leave_maternity, v_tenant_id, 'Maternity Leave', 'Maternity leave for female employees', '#EC4899', 50, 'PARENTAL', true, true, true, true, 0, 12, false, NULL, false, 'Female', NOW(), NOW()),
(v_leave_paternity, v_tenant_id, 'Paternity Leave', 'Paternity leave for male employees', '#8B5CF6', 3, 'PARENTAL', true, true, false, true, 0, 0, false, NULL, false, 'Male', NOW(), NOW()),
(v_leave_hajj, v_tenant_id, 'Hajj Leave', 'One-time Hajj pilgrimage leave', '#059669', 14, 'RELIGIOUS', true, true, false, true, 0, 24, false, NULL, true, NULL, NOW(), NOW()),
(v_leave_compassionate, v_tenant_id, 'Compassionate Leave', 'Bereavement and family emergency', '#374151', 5, 'STANDARD', true, true, false, true, 0, 0, false, NULL, false, NULL, NOW(), NOW());

RAISE NOTICE 'Created 7 leave types';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE LEAVE BALANCES (for all employees, Annual/Sick/Unpaid/Compassionate)
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "LeaveBalance" (id, "tenantId", "userId", "leaveTypeId", year, entitlement, used, pending, "carriedForward", "createdAt", "updatedAt")
SELECT
    'jas_lb_' || substr(md5(random()::text || u.id || lt.id), 1, 16),
    v_tenant_id,
    u.id,
    lt.id,
    EXTRACT(YEAR FROM CURRENT_DATE)::INT,
    lt."defaultDays",
    CASE WHEN lt.name = 'Annual Leave' THEN floor(random() * 8)::INT ELSE floor(random() * 3)::INT END,
    0,
    floor(random() * 5)::INT,
    NOW(),
    NOW()
FROM "User" u
CROSS JOIN "LeaveType" lt
WHERE u.email LIKE '%@jasira.qa'
AND lt."tenantId" = v_tenant_id
AND lt.category IN ('STANDARD', 'MEDICAL');

RAISE NOTICE 'Created leave balances';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE LEAVE REQUESTS
-- ═══════════════════════════════════════════════════════════════════════════════

-- Pending requests
INSERT INTO "LeaveRequest" (id, "tenantId", "requestNumber", "userId", "leaveTypeId", "startDate", "endDate", "requestType", "totalDays", reason, status, "createdAt", "updatedAt") VALUES
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00001', v_user_raj, v_leave_annual, v_today + INTERVAL '7 days', v_today + INTERVAL '14 days', 'FULL_DAY', 7, 'Family vacation to India', 'PENDING', NOW(), NOW()),
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00002', v_user_maria, v_leave_annual, v_today + INTERVAL '14 days', v_today + INTERVAL '21 days', 'FULL_DAY', 7, 'Trip to Philippines', 'PENDING', NOW(), NOW()),
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00003', v_user_ali, v_leave_annual, v_today + INTERVAL '3 days', v_today + INTERVAL '5 days', 'FULL_DAY', 2, 'Personal matters', 'PENDING', NOW(), NOW());

-- Approved requests (past)
INSERT INTO "LeaveRequest" (id, "tenantId", "requestNumber", "userId", "leaveTypeId", "startDate", "endDate", "requestType", "totalDays", reason, status, "approverId", "approvedAt", "createdAt", "updatedAt") VALUES
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00004', v_user_sarah, v_leave_annual, v_today - INTERVAL '14 days', v_today - INTERVAL '7 days', 'FULL_DAY', 7, 'Holiday trip to UK', 'APPROVED', v_user_fatima, v_today - INTERVAL '17 days', NOW(), NOW()),
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00005', v_user_omar, v_leave_annual, v_today + INTERVAL '21 days', v_today + INTERVAL '28 days', 'FULL_DAY', 7, 'Wedding in Egypt', 'APPROVED', v_user_fatima, v_today - INTERVAL '5 days', NOW(), NOW()),
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00006', v_user_john, v_leave_annual, v_today + INTERVAL '30 days', v_today + INTERVAL '37 days', 'FULL_DAY', 7, 'Christmas holiday', 'APPROVED', v_user_fatima, v_today - INTERVAL '3 days', NOW(), NOW()),
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00007', v_user_priya, v_leave_sick, v_today - INTERVAL '5 days', v_today - INTERVAL '3 days', 'FULL_DAY', 2, 'Flu recovery', 'APPROVED', v_user_fatima, v_today - INTERVAL '6 days', NOW(), NOW());

-- Currently on leave
INSERT INTO "LeaveRequest" (id, "tenantId", "requestNumber", "userId", "leaveTypeId", "startDate", "endDate", "requestType", "totalDays", reason, status, "approverId", "approvedAt", "createdAt", "updatedAt") VALUES
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00008', v_user_deepak, v_leave_sick, v_today - INTERVAL '2 days', v_today + INTERVAL '1 day', 'FULL_DAY', 3, 'Medical procedure recovery', 'APPROVED', v_user_fatima, v_today - INTERVAL '3 days', NOW(), NOW());

-- Rejected
INSERT INTO "LeaveRequest" (id, "tenantId", "requestNumber", "userId", "leaveTypeId", "startDate", "endDate", "requestType", "totalDays", reason, status, "rejectedAt", "rejectionReason", "createdAt", "updatedAt") VALUES
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00009', v_user_chen, v_leave_annual, v_today + INTERVAL '5 days', v_today + INTERVAL '20 days', 'FULL_DAY', 15, 'Extended vacation', 'REJECTED', v_today, 'Project deadline conflict', NOW(), NOW());

-- Cancelled
INSERT INTO "LeaveRequest" (id, "tenantId", "requestNumber", "userId", "leaveTypeId", "startDate", "endDate", "requestType", "totalDays", reason, status, "cancelledAt", "cancellationReason", "createdAt", "updatedAt") VALUES
('jas_lr_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LR-JAS-00010', v_user_layla, v_leave_annual, v_today + INTERVAL '10 days', v_today + INTERVAL '15 days', 'FULL_DAY', 5, 'Personal trip', 'CANCELLED', v_today, 'Plans changed', NOW(), NOW());

RAISE NOTICE 'Created 10 leave requests';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE ASSETS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "Asset" (id, "tenantId", "assetTag", type, category, brand, model, serial, configuration, "purchaseDate", "warrantyExpiry", supplier, "invoiceNumber", price, "priceCurrency", "priceQAR", status, "assignedUserId", location, notes, "createdAt", "updatedAt") VALUES
-- Laptops
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-LAP-001', 'Laptop', 'IT Equipment', 'Apple', 'MacBook Pro 16" M3', 'C02XJ1Y8JHCD', 'M3 Pro, 36GB RAM, 1TB SSD', v_today - INTERVAL '12 months', v_today + INTERVAL '24 months', 'Apple Store Qatar', 'INV-2024-001', 15000, 'QAR', 15000, 'IN_USE', v_user_mohammed, 'Head Office - Director Suite', NULL, NOW(), NOW()),
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-LAP-002', 'Laptop', 'IT Equipment', 'Dell', 'XPS 15 9530', 'DELL9530XPS001', 'Intel i9, 32GB RAM, 1TB SSD', v_today - INTERVAL '8 months', v_today + INTERVAL '28 months', 'Dell Qatar', 'INV-2024-015', 8500, 'QAR', 8500, 'IN_USE', v_user_raj, 'IT Department', NULL, NOW(), NOW()),
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-LAP-003', 'Laptop', 'IT Equipment', 'Lenovo', 'ThinkPad X1 Carbon Gen 11', 'LENX1C11001', 'Intel i7, 16GB RAM, 512GB SSD', v_today - INTERVAL '6 months', v_today + INTERVAL '30 months', 'Lenovo Qatar', 'INV-2024-022', 6500, 'QAR', 6500, 'SPARE', NULL, 'IT Storage Room', NULL, NOW(), NOW()),
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-LAP-004', 'Laptop', 'IT Equipment', 'HP', 'EliteBook 850 G10', 'HP850G10002', 'Intel i5, 16GB RAM, 256GB SSD', v_today - INTERVAL '4 months', v_today + INTERVAL '32 months', 'HP Qatar', 'INV-2024-033', 4500, 'QAR', 4500, 'SPARE', NULL, 'IT Storage Room', NULL, NOW(), NOW()),

-- Monitor
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-MON-001', 'Monitor', 'IT Equipment', 'LG', 'UltraFine 32UN880', 'LG32UN880001', '32" 4K Ergo IPS', v_today - INTERVAL '10 months', v_today + INTERVAL '26 months', 'LG Electronics Qatar', 'INV-2024-008', 2800, 'QAR', 2800, 'IN_USE', v_user_john, 'Development Area', NULL, NOW(), NOW()),

-- Phones
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PHN-001', 'Mobile Phone', 'Communications', 'Apple', 'iPhone 15 Pro Max', 'DNQXF3K8N7', '512GB, Natural Titanium', v_today - INTERVAL '3 months', v_today + INTERVAL '9 months', 'Apple Store Qatar', 'INV-2024-045', 5500, 'QAR', 5500, 'IN_USE', v_user_mohammed, 'Director Suite', NULL, NOW(), NOW()),
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PHN-002', 'Mobile Phone', 'Communications', 'Samsung', 'Galaxy S24 Ultra', 'SAMGALS24U001', '256GB, Titanium Black', v_today - INTERVAL '2 months', v_today + INTERVAL '10 months', 'Samsung Qatar', 'INV-2024-052', 4800, 'QAR', 4800, 'IN_USE', v_user_omar, 'Sales Department', NULL, NOW(), NOW()),

-- Vehicles
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-VEH-001', 'Vehicle', 'Transportation', 'Toyota', 'Land Cruiser 2024', 'JTMCU5AJ7R4123456', 'VXR, V8, White', v_today - INTERVAL '6 months', v_today + INTERVAL '30 months', 'AAB Toyota Qatar', 'VEH-2024-001', 350000, 'QAR', 350000, 'IN_USE', NULL, 'Company Parking', 'Company vehicle for executive transport', NOW(), NOW()),
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-VEH-002', 'Vehicle', 'Transportation', 'Toyota', 'Hilux 2023', 'AHTFR22G809876543', 'Double Cab, 4x4, Silver', v_today - INTERVAL '18 months', v_today + INTERVAL '18 months', 'AAB Toyota Qatar', 'VEH-2023-005', 180000, 'QAR', 180000, 'IN_USE', NULL, 'Company Parking', 'Utility vehicle for operations', NOW(), NOW()),

-- Printer (in repair - warranty expired)
('jas_ast_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PRN-001', 'Printer', 'Office Equipment', 'HP', 'LaserJet Pro MFP M428fdw', 'CNBJR8N1RS', 'Multifunction, Duplex, Wireless', v_today - INTERVAL '14 months', v_today - INTERVAL '2 months', 'HP Qatar', 'INV-2023-088', 2200, 'QAR', 2200, 'REPAIR', NULL, 'Main Office', 'Paper jam issues - sent for repair', NOW(), NOW());

RAISE NOTICE 'Created 10 assets';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "Subscription" (id, "tenantId", "serviceName", category, "accountId", vendor, "billingCycle", "costPerCycle", "costCurrency", "costQAR", "purchaseDate", "renewalDate", "autoRenew", "paymentMethod", notes, "assignedUserId", status, "createdAt", "updatedAt") VALUES
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'Microsoft 365 Business Premium', 'Productivity', 'jasira@jasira.onmicrosoft.com', 'Microsoft', 'YEARLY', 5400, 'QAR', 5400, v_today - INTERVAL '10 months', v_today + INTERVAL '2 months', true, 'Company Credit Card', '15 licenses for all staff', v_user_raj, 'ACTIVE', NOW(), NOW()),
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'Slack Business+', 'Communication', 'jasira-workspace', 'Slack', 'MONTHLY', 450, 'QAR', 450, v_today - INTERVAL '8 months', v_today + INTERVAL '15 days', true, 'Company Credit Card', NULL, v_user_raj, 'ACTIVE', NOW(), NOW()),
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'Adobe Creative Cloud - Teams', 'Design', 'jasira-adobe-001', 'Adobe', 'YEARLY', 8400, 'QAR', 8400, v_today - INTERVAL '6 months', v_today + INTERVAL '6 months', true, 'Bank Transfer', '3 licenses for marketing team', v_user_layla, 'ACTIVE', NOW(), NOW()),
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'Zoom Business', 'Communication', 'jasira@jasira.qa', 'Zoom', 'YEARLY', 3600, 'QAR', 3600, v_today - INTERVAL '4 months', v_today + INTERVAL '8 months', true, 'Company Credit Card', NULL, v_user_mohammed, 'ACTIVE', NOW(), NOW()),
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'QuickBooks Online Plus', 'Finance', 'jasira-qb-001', 'Intuit', 'YEARLY', 2800, 'QAR', 2800, v_today - INTERVAL '11 months', v_today + INTERVAL '1 month', true, 'Bank Transfer', NULL, v_user_ahmed, 'ACTIVE', NOW(), NOW()),
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'GitHub Enterprise', 'Development', 'jasira-org', 'GitHub', 'YEARLY', 7200, 'QAR', 7200, v_today - INTERVAL '3 months', v_today + INTERVAL '9 months', true, 'Company Credit Card', '5 developer seats', v_user_raj, 'ACTIVE', NOW(), NOW()),
('jas_sub_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'Ooredoo Business Internet', 'Infrastructure', 'JAS-ORD-2024-001', 'Ooredoo Qatar', 'MONTHLY', 1500, 'QAR', 1500, v_today - INTERVAL '24 months', v_today + INTERVAL '5 days', true, 'Direct Debit', '500 Mbps Business Fiber', v_user_raj, 'ACTIVE', NOW(), NOW());

RAISE NOTICE 'Created 7 subscriptions';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE SUPPLIERS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "Supplier" (id, "tenantId", "suppCode", name, category, status, address, city, country, website, "establishmentYear", "primaryContactName", "primaryContactTitle", "primaryContactEmail", "primaryContactMobile", "paymentTerms", "approvedAt", "approvedById", "createdAt", "updatedAt") VALUES
('jas_sup_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'SUPP-JAS-001', 'Tech Solutions Qatar', 'IT Equipment', 'APPROVED', 'Building 45, Zone 25', 'Doha', 'Qatar', 'https://techsolutions.qa', 2010, 'Khalid Rahman', 'Sales Director', 'khalid@techsolutions.qa', '+974 5555 1234', 'Net 30', v_today - INTERVAL '12 months', v_user_mohammed, NOW(), NOW()),
('jas_sup_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'SUPP-JAS-002', 'Office World Qatar', 'Office Supplies', 'APPROVED', 'Industrial Area, Street 12', 'Doha', 'Qatar', NULL, NULL, 'Fatma Al-Sayed', NULL, 'fatma@officeworld.qa', '+974 5555 5678', 'Net 15', v_today - INTERVAL '8 months', v_user_ahmed, NOW(), NOW()),
('jas_sup_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'SUPP-JAS-003', 'Gulf Furniture Solutions', 'Furniture', 'APPROVED', 'Salwa Road', 'Doha', 'Qatar', NULL, NULL, 'Mohammed Abbas', NULL, 'mabbas@gulffurniture.qa', '+974 5555 9012', 'Net 45', v_today - INTERVAL '6 months', v_user_mohammed, NOW(), NOW()),
('jas_sup_' || substr(md5(random()::text), 1, 12), v_tenant_id, NULL, 'Creative Design Agency', 'Marketing Services', 'PENDING', NULL, 'Doha', 'Qatar', NULL, NULL, 'Layla Nasser', NULL, 'layla@creativeqa.com', '+974 5555 3456', NULL, NULL, NULL, NOW(), NOW());

RAISE NOTICE 'Created 4 suppliers';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE PROJECTS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "Project" (id, "tenantId", code, name, description, status, "clientType", "clientName", "startDate", "endDate", "managerId", "createdById", "createdAt", "updatedAt") VALUES
('jas_prj_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PRJ-2024-001', 'Office Renovation Phase 2', 'Complete renovation of 3rd floor office space', 'ACTIVE', 'INTERNAL', 'Operations Department', v_today - INTERVAL '2 months', v_today + INTERVAL '3 months', v_user_sarah, v_user_mohammed, NOW(), NOW()),
('jas_prj_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PRJ-2024-002', 'ERP System Implementation', 'Full ERP system rollout and training', 'ACTIVE', 'INTERNAL', NULL, v_today - INTERVAL '4 months', v_today + INTERVAL '2 months', v_user_raj, v_user_mohammed, NOW(), NOW()),
('jas_prj_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PRJ-2024-003', 'Website Redesign', 'Complete overhaul of company website', 'PLANNING', 'INTERNAL', 'Marketing Department', v_today + INTERVAL '1 month', NULL, v_user_layla, v_user_mohammed, NOW(), NOW()),
('jas_prj_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'JAS-PRJ-2023-008', 'Annual Audit 2023', 'External financial audit for FY 2023', 'COMPLETED', 'EXTERNAL', 'KPMG Qatar', v_today - INTERVAL '8 months', v_today - INTERVAL '5 months', v_user_ahmed, v_user_mohammed, NOW(), NOW());

RAISE NOTICE 'Created 4 projects';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE SALARY STRUCTURES
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "SalaryStructure" (id, "tenantId", "userId", "basicSalary", "housingAllowance", "transportAllowance", "foodAllowance", "phoneAllowance", "otherAllowances", "grossSalary", "effectiveFrom", "isActive", "createdAt", "updatedAt") VALUES
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 27000, 11250, 4500, 0, 0, 2250, 45000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 16800, 7000, 2800, 0, 0, 1400, 28000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ahmed, 19200, 8000, 3200, 0, 0, 1600, 32000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_sarah, 15000, 6250, 2500, 0, 0, 1250, 25000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_raj, 13200, 5500, 2200, 0, 0, 1100, 22000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_omar, 12000, 5000, 2000, 0, 0, 1000, 20000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_maria, 7200, 3000, 1200, 0, 0, 600, 12000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_john, 10800, 4500, 1800, 0, 0, 900, 18000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_priya, 5400, 2250, 900, 0, 0, 450, 9000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ali, 5100, 2125, 850, 0, 0, 425, 8500, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_chen, 6600, 2750, 1100, 0, 0, 550, 11000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_layla, 6000, 2500, 1000, 0, 0, 500, 10000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_deepak, 8400, 3500, 1400, 0, 0, 700, 14000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_amina, 4500, 1875, 750, 0, 0, 375, 7500, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_james, 2400, 1000, 400, 0, 0, 200, 4000, v_today - INTERVAL '12 months', true, NOW(), NOW()),
('jas_sal_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_noor, 2400, 1000, 400, 0, 0, 200, 4000, v_today - INTERVAL '12 months', true, NOW(), NOW());

RAISE NOTICE 'Created 16 salary structures';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE EMPLOYEE LOANS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "EmployeeLoan" (id, "tenantId", "loanNumber", "userId", type, description, "principalAmount", "totalAmount", "monthlyDeduction", "totalPaid", "remainingAmount", "startDate", "endDate", installments, "installmentsPaid", status, "approvedById", "approvedAt", "createdById", "createdAt", "updatedAt") VALUES
('jas_loan_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LOAN-JAS-001', v_user_maria, 'LOAN', 'Personal loan for family emergency', 15000, 15000, 1500, 6000, 9000, v_today - INTERVAL '4 months', v_today + INTERVAL '6 months', 10, 4, 'ACTIVE', v_user_ahmed, v_today - INTERVAL '4 months', v_user_fatima, NOW(), NOW()),
('jas_loan_' || substr(md5(random()::text), 1, 12), v_tenant_id, 'LOAN-JAS-002', v_user_ali, 'ADVANCE', 'Salary advance for rent deposit', 5000, 5000, 2500, 2500, 2500, v_today - INTERVAL '1 month', v_today + INTERVAL '1 month', 2, 1, 'ACTIVE', v_user_ahmed, v_today - INTERVAL '1 month', v_user_fatima, NOW(), NOW());

RAISE NOTICE 'Created 2 employee loans';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "Notification" (id, "tenantId", "recipientId", type, title, message, link, "isRead", "createdAt") VALUES
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 'LEAVE_REQUEST_SUBMITTED', 'New Leave Request', 'Raj Patel has submitted a leave request for 7 days', '/admin/leave', false, NOW() - INTERVAL '1 day'),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 'LEAVE_REQUEST_SUBMITTED', 'New Leave Request', 'Maria Santos has submitted a leave request for 7 days', '/admin/leave', false, NOW() - INTERVAL '2 days'),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 'LEAVE_REQUEST_SUBMITTED', 'New Leave Request', 'Ali Mahmoud has submitted a leave request for 2 days', '/admin/leave', false, NOW() - INTERVAL '3 hours'),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_sarah, 'DOCUMENT_EXPIRY_WARNING', 'QID Expiring Soon', 'Your QID will expire in 10 days. Please renew immediately.', '/employee/profile', false, NOW()),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_maria, 'DOCUMENT_EXPIRY_WARNING', 'Passport Expiring Soon', 'Your passport will expire in 15 days. Please renew.', '/employee/profile', false, NOW()),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_deepak, 'DOCUMENT_EXPIRY_WARNING', 'Health Card Expiring', 'Your health card will expire in 7 days.', '/employee/profile', false, NOW()),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_raj, 'ASSET_ASSIGNED', 'Asset Assigned', 'Dell XPS 15 laptop has been assigned to you', '/employee/assets', true, NOW() - INTERVAL '5 days'),
('jas_not_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 'GENERAL', 'System Maintenance', 'Scheduled maintenance on Sunday 2AM-4AM', NULL, true, NOW() - INTERVAL '7 days');

RAISE NOTICE 'Created 8 notifications';

-- ═══════════════════════════════════════════════════════════════════════════════
-- CREATE ACTIVITY LOGS
-- ═══════════════════════════════════════════════════════════════════════════════

INSERT INTO "ActivityLog" (id, "tenantId", "actorUserId", action, "entityType", "entityId", payload, at) VALUES
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 'USER_CREATED', 'User', v_user_fatima, '{"name": "Fatima Hassan"}'::jsonb, NOW() - INTERVAL '30 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 'ASSET_CREATED', 'Asset', 'JAS-LAP-001', '{"assetTag": "JAS-LAP-001", "type": "Laptop"}'::jsonb, NOW() - INTERVAL '25 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_raj, 'LEAVE_REQUEST_SUBMITTED', 'LeaveRequest', 'LR-JAS-00001', '{"days": 7, "type": "Annual"}'::jsonb, NOW() - INTERVAL '3 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 'LEAVE_REQUEST_APPROVED', 'LeaveRequest', 'LR-JAS-00004', '{"requestNumber": "LR-JAS-00004"}'::jsonb, NOW() - INTERVAL '17 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ahmed, 'SALARY_STRUCTURE_UPDATED', 'SalaryStructure', v_user_maria, ('{"userId": "' || v_user_maria || '"}'::text)::jsonb, NOW() - INTERVAL '10 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 'PROJECT_CREATED', 'Project', 'JAS-PRJ-2024-001', '{"code": "JAS-PRJ-2024-001"}'::jsonb, NOW() - INTERVAL '60 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_mohammed, 'SUPPLIER_APPROVED', 'Supplier', 'SUPP-JAS-001', '{"name": "Tech Solutions Qatar"}'::jsonb, NOW() - INTERVAL '365 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_raj, 'SUBSCRIPTION_RENEWED', 'Subscription', 'M365', '{"service": "Microsoft 365"}'::jsonb, NOW() - INTERVAL '60 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_fatima, 'EMPLOYEE_ONBOARDED', 'User', v_user_james, '{"name": "James Brown", "type": "Intern"}'::jsonb, NOW() - INTERVAL '30 days'),
('jas_log_' || substr(md5(random()::text), 1, 12), v_tenant_id, v_user_ahmed, 'LOAN_APPROVED', 'EmployeeLoan', 'LOAN-JAS-001', '{"amount": 15000, "employee": "Maria Santos"}'::jsonb, NOW() - INTERVAL '4 months');

RAISE NOTICE 'Created 10 activity logs';

RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
RAISE NOTICE '                  JASIRA SEED COMPLETE!';
RAISE NOTICE '═══════════════════════════════════════════════════════════════════';
RAISE NOTICE '';
RAISE NOTICE 'Login at: http://jasira.quriosityhub.com/';
RAISE NOTICE '';
RAISE NOTICE 'Admin: mohammed@jasira.qa / Jasira123!';
RAISE NOTICE 'HR Manager: fatima@jasira.qa / Jasira123!';
RAISE NOTICE 'Finance: ahmed@jasira.qa / Jasira123!';

END $$;
