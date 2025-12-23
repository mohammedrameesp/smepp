# PRE-PRODUCTION TESTING CHECKLIST
## Asset Management System (DAMP) - Final Testing Protocol

**Version:** 1.0
**Last Updated:** 2025-11-11
**Purpose:** Comprehensive manual testing before production deployment

---

## TESTING ENVIRONMENT SETUP

### Prerequisites
- [ ] Database backup created and verified
- [ ] Test environment URL accessible
- [ ] Production environment URL ready (don't deploy yet)
- [ ] Test accounts created for all 6 roles:
  - [ ] ADMIN account
  - [ ] EMPLOYEE account
  - [ ] VALIDATOR account
  - [ ] TEMP_STAFF account
  - [ ] ACCREDITATION_ADDER account
  - [ ] ACCREDITATION_APPROVER account
- [ ] Sample test data prepared (assets, subscriptions, users, suppliers)
- [ ] Browser dev tools ready (check console for errors)
- [ ] Network monitoring enabled (check API responses)

### Environment Variables Verification
- [ ] DATABASE_URL configured correctly
- [ ] NEXTAUTH_URL set to production domain
- [ ] NEXTAUTH_SECRET generated (minimum 32 characters)
- [ ] AZURE_AD_CLIENT_ID set
- [ ] AZURE_AD_CLIENT_SECRET set
- [ ] AZURE_AD_TENANT_ID set
- [ ] ADMIN_EMAILS configured (comma-separated)
- [ ] SUPABASE_URL configured (if using image uploads)
- [ ] SUPABASE_ANON_KEY configured (if using image uploads)
- [ ] EMAIL_FROM set (for notifications)
- [ ] SMTP credentials set (EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS)

---

## CRITICAL PRIORITY TESTS (MUST PASS)

### 1. AUTHENTICATION & AUTHORIZATION

#### 1.1 Azure AD Login Flow
- [ ] Click login button → Redirects to Microsoft login page
- [ ] Enter valid credentials → Successfully authenticates
- [ ] First-time login creates new user in database
- [ ] User email appears in header after login
- [ ] Logout works and clears session
- [ ] **Edge Case:** Try invalid credentials → Shows error, doesn't create user
- [ ] **Edge Case:** Close browser mid-auth → Can resume login

#### 1.2 Role Assignment & Permissions
- [ ] Login with email in ADMIN_EMAILS → User has ADMIN role
- [ ] Login with new email NOT in ADMIN_EMAILS → User has EMPLOYEE role (default)
- [ ] **Security:** EMPLOYEE cannot access `/admin/*` routes → Redirected to employee dashboard
- [ ] **Security:** VALIDATOR can only access `/validator/*` → Other admin routes blocked
- [ ] **Security:** ACCREDITATION_ADDER redirected to accreditation page only
- [ ] **Security:** ACCREDITATION_APPROVER redirected to accreditation page only
- [ ] **Security:** Direct URL access to unauthorized pages → Blocked with error or redirect

#### 1.3 Session Management
- [ ] Session persists across browser refresh
- [ ] Session expires after configured timeout
- [ ] **Security:** Copy session token → Cannot use in different browser
- [ ] **Security:** Session invalid after logout

---

### 2. ASSETS MODULE

#### 2.1 Create Asset (src/app/admin/assets/new/page.tsx)
- [ ] Fill all required fields (Type, Model) → Asset creates successfully
- [ ] Leave Asset Tag empty → Auto-generates unique tag (e.g., AST-001)
- [ ] Enter custom Asset Tag → Uses custom tag
- [ ] **Validation:** Try duplicate Asset Tag → Shows error, prevents creation
- [ ] Enter Purchase Date → Saves correctly
- [ ] Enter Warranty Expiry → Saves correctly
- [ ] **Validation:** Warranty Expiry before Purchase Date → Allows (no validation)
- [ ] Select Status (IN_USE, SPARE, REPAIR, DISPOSED) → Saves correctly
- [ ] Select Acquisition Type (NEW_PURCHASE, TRANSFERRED) → Saves correctly
- [ ] Enter Price in USD → Converts to QAR using exchange rate (default 3.64)
- [ ] Enter Price in QAR → Stores both currency and QAR value
- [ ] Assign to User → Requires Assignment Date
- [ ] **Validation:** Assign without Assignment Date → Shows error
- [ ] Add Serial Number, Configuration, Location, Notes → All save correctly
- [ ] **History:** Check Activity Log → Shows "CREATED" action with timestamp

#### 2.2 Edit Asset (src/app/admin/assets/[id]/edit/page.tsx)
- [ ] Change Type/Model → Saves successfully
- [ ] Change assigned user → Creates ASSIGNED history entry
- [ ] Unassign user → Creates UNASSIGNED history entry
- [ ] Change status → Creates STATUS_CHANGED history entry
- [ ] Change location → Creates LOCATION_CHANGED history entry
- [ ] **Date Handling:** Edit Assignment Date → Saves in Qatar timezone (UTC+3)
- [ ] **Edge Case:** Edit asset assigned to deleted user → Shows "Unassigned" or user ID

#### 2.3 View Asset Details (src/app/admin/assets/[id]/page.tsx)
- [ ] All fields display correctly
- [ ] Warranty Expiry shows days remaining if future
- [ ] Warranty Expiry shows "Expired" if past
- [ ] Assignment history displays in chronological order
- [ ] Maintenance records display (if any)
- [ ] **Currency:** Shows both original currency and QAR conversion
- [ ] **Performance:** Page loads in <2 seconds

#### 2.4 Clone Asset
- [ ] Click "Clone Asset" → Opens clone dialog
- [ ] Choose to assign to different user → Creates new asset with new tag
- [ ] Choose to keep same user → Creates new asset with same assignment
- [ ] **Verification:** New asset has unique Asset Tag (incremented)
- [ ] **Verification:** All other fields copied except dates and history

#### 2.5 Delete Asset
- [ ] Click "Delete Asset" → Shows confirmation dialog
- [ ] Confirm deletion → Asset soft-deleted or hard-deleted
- [ ] **Cascade:** Deleting asset also deletes history records
- [ ] **Cascade:** Deleting asset also deletes maintenance records

#### 2.6 Asset List & Search (src/app/admin/assets/page.tsx)
- [ ] Table displays all assets with pagination
- [ ] Search by Asset Tag → Filters correctly
- [ ] Search by Type → Filters correctly
- [ ] Search by Serial Number → Filters correctly
- [ ] Filter by Status (IN_USE, SPARE, REPAIR, DISPOSED) → Shows only matching
- [ ] Filter by Brand → Shows only matching
- [ ] Sort by columns (Tag, Type, Status, Assigned User) → Sorts correctly
- [ ] **Performance:** Handles 100+ assets without lag

#### 2.7 Asset Import (src/app/api/assets/import/route.ts)
- [ ] Download import template (should be CSV/XLSX)
- [ ] Fill template with 5 test assets → Upload successfully
- [ ] **Duplicate Strategy: Skip** → Duplicate Asset Tags skipped, new ones created
- [ ] **Duplicate Strategy: Update** → Existing assets updated with new data
- [ ] **Duplicate Strategy: Create** → Creates all as new with new tags
- [ ] **Validation:** Upload with missing required fields → Shows error details
- [ ] **Validation:** Upload with invalid Status value → Shows error
- [ ] **Flexible Columns:** Use "Asset Tag" → Works
- [ ] **Flexible Columns:** Use "asset_tag" → Works
- [ ] **Flexible Columns:** Use "assetTag" → Works
- [ ] Import with dates in various formats (YYYY-MM-DD, DD/MM/YYYY) → Parses correctly
- [ ] **Edge Case:** Import 100+ rows → All process successfully

#### 2.8 Asset Export (src/app/api/assets/export/route.ts)
- [ ] Click "Export Assets" → Downloads XLSX file
- [ ] Open file → Contains all asset fields
- [ ] **Verification:** Check exported dates are in readable format
- [ ] **Verification:** Currency fields include both original and QAR
- [ ] **Verification:** Status values exported correctly

#### 2.9 Maintenance Records
- [ ] Add maintenance record to asset → Saves with date and notes
- [ ] View maintenance history → Displays in chronological order
- [ ] Edit maintenance record → Updates successfully
- [ ] Delete maintenance record → Removes successfully

---

### 3. SUBSCRIPTIONS MODULE (CRITICAL - COMPLEX COST LOGIC)

#### 3.1 Create Subscription (src/app/admin/subscriptions/new/page.tsx)
- [ ] Fill Service Name, Billing Cycle (MONTHLY) → Creates successfully
- [ ] Set Cost Per Cycle = 100 QAR → Saves correctly
- [ ] Set Purchase Date and Renewal Date → Both save in Qatar timezone
- [ ] **Validation:** Purchase Date > Renewal Date → Shows error
- [ ] Assign to user → Requires Assignment Date
- [ ] **Validation:** Assign without date → Shows error
- [ ] Set Status to ACTIVE → Default status correct
- [ ] **Cost Calculation:** Verify initial charge = 1 cycle (100 QAR)
- [ ] **History:** Check history → Shows "CREATED" action

#### 3.2 Subscription Cost Logic Testing (CRITICAL)

**Test Scenario A: MONTHLY Billing**
- [ ] Create subscription: Cost = 100 QAR/month, Purchase Date = 2024-01-01, Renewal = 2024-02-01
- [ ] Initial cost = 100 QAR (1 cycle charged immediately)
- [ ] Wait or manually advance Renewal Date to 2024-03-01 → Cost = 200 QAR (1 more cycle)
- [ ] Wait or advance to 2024-04-01 → Cost = 300 QAR (1 more cycle)
- [ ] **Cancel** on 2024-04-15 (before May 1) → Final cost = 300 QAR (partial month, no charge)
- [ ] **Verify:** lastActiveRenewalDate = 2024-04-01, cancelledAt = 2024-04-15

**Test Scenario B: YEARLY Billing**
- [ ] Create subscription: Cost = 1200 QAR/year, Purchase = 2024-01-01, Renewal = 2025-01-01
- [ ] Initial cost = 1200 QAR (1 cycle charged)
- [ ] Advance to 2025-01-01 → Cost = 2400 QAR (1 more year)
- [ ] **Cancel** before next renewal → Final cost = 2400 QAR

**Test Scenario C: ONE_TIME Billing**
- [ ] Create subscription: Cost = 500 QAR, Billing = ONE_TIME, Purchase = 2024-01-01, Renewal = N/A
- [ ] Initial cost = 500 QAR (1 cycle only)
- [ ] Advance time/dates → Cost NEVER increases
- [ ] **Verify:** Only ever charged once

**Test Scenario D: Cancel Before Renewal**
- [ ] Create MONTHLY subscription: Cost = 100 QAR, Purchase = 2024-01-01, Renewal = 2024-02-01
- [ ] **Cancel** on 2024-01-15 (before renewal) → Total cost = 100 QAR (partial month, no additional charge)
- [ ] **Verify:** Status = CANCELLED, cancelledAt = 2024-01-15

**Test Scenario E: Cancel After Renewal**
- [ ] Create MONTHLY subscription: Cost = 100 QAR, Purchase = 2024-01-01, Renewal = 2024-02-01
- [ ] Advance to 2024-02-01 (renewal passed) → Cost = 200 QAR (full cycle charged)
- [ ] **Cancel** on 2024-02-15 → Total cost = 200 QAR (full cycle for February)
- [ ] **Verify:** lastActiveRenewalDate = 2024-02-01, cancelledAt = 2024-02-15

**Test Scenario F: Reactivate Subscription**
- [ ] Create subscription: Cost = 100 QAR/month, Purchase = 2024-01-01, Renewal = 2024-02-01
- [ ] Advance to 2024-03-01 → Cost = 200 QAR
- [ ] **Cancel** on 2024-03-15 → Status = CANCELLED
- [ ] **Reactivate** on 2024-04-01 with new Renewal = 2024-05-01 → Cost = 300 QAR (new cycle charged)
- [ ] **Verify:** Status = ACTIVE, reactivatedAt = 2024-04-01, new renewal date set
- [ ] **Verify:** History shows CANCELLED and REACTIVATED actions

**Test Scenario G: Multiple Reactivations**
- [ ] Create subscription → Cancel → Reactivate → Cancel → Reactivate
- [ ] **Verify:** Each reactivation charges 1 new cycle
- [ ] **Verify:** All periods tracked in history
- [ ] **Verify:** Cost calculation includes all periods

#### 3.3 Edit Subscription (src/app/admin/subscriptions/[id]/edit/page.tsx)
- [ ] Change Service Name → Saves successfully
- [ ] Change Cost Per Cycle → Updates successfully (doesn't recalculate past charges)
- [ ] Change Renewal Date → Saves in Qatar timezone
- [ ] **Date Handling:** Renewal Date doesn't auto-calculate when editing manually
- [ ] Reassign to different user → Creates REASSIGNED history entry
- [ ] **Validation:** Cannot set Purchase Date > Renewal Date

#### 3.4 Cancel & Reactivate Subscription
- [ ] Click "Cancel Subscription" → Shows confirmation dialog
- [ ] Confirm cancel → Status changes to CANCELLED, cancelledAt timestamp set
- [ ] **Verify:** lastActiveRenewalDate stored correctly
- [ ] Click "Reactivate Subscription" → Shows reactivation form
- [ ] Enter new Renewal Date → Status changes to ACTIVE, reactivatedAt timestamp set
- [ ] **Verify:** New cycle charged on reactivation
- [ ] **History:** Both CANCELLED and REACTIVATED actions logged

#### 3.5 Subscription List & Search (src/app/admin/subscriptions/page.tsx)
- [ ] Table displays all subscriptions with pagination
- [ ] Search by Service Name → Filters correctly
- [ ] Filter by Status (ACTIVE, PAUSED, CANCELLED) → Shows only matching
- [ ] Filter by Billing Cycle (MONTHLY, YEARLY, ONE_TIME) → Shows only matching
- [ ] Sort by Renewal Date → Sorts correctly
- [ ] **Visual:** Subscriptions expiring soon highlighted or flagged
- [ ] **Performance:** Handles 100+ subscriptions without lag

#### 3.6 Subscription Import/Export
- [ ] Export subscriptions → Downloads XLSX with all fields
- [ ] Import subscriptions with duplicate strategies → All work correctly
- [ ] **Validation:** Import with invalid Billing Cycle → Shows error
- [ ] **Cost Tracking:** Imported subscriptions calculate costs correctly

#### 3.7 Employee Subscription View (src/app/employee/subscriptions)
- [ ] Login as EMPLOYEE → Can only see own assigned subscriptions
- [ ] **Security:** Cannot see other users' subscriptions
- [ ] **Security:** Cannot edit or cancel subscriptions (view-only)

---

### 4. USERS MODULE

#### 4.1 Create User (src/app/admin/users/new/page.tsx)
- [ ] Enter Name and Email → Creates successfully
- [ ] **Validation:** Duplicate email → Shows error (email must be unique)
- [ ] Select Role (ADMIN, EMPLOYEE, VALIDATOR, TEMP_STAFF, ACCREDITATION_ADDER, ACCREDITATION_APPROVER) → Saves correctly
- [ ] **Auto-Assignment:** Email in ADMIN_EMAILS → Auto-assigned ADMIN role on first login
- [ ] **History:** User creation logged in Activity Log

#### 4.2 Edit User (src/app/admin/users/[id]/edit/page.tsx)
- [ ] Change Name → Saves successfully
- [ ] Change Role → Saves successfully
- [ ] **Validation:** Change email to duplicate → Shows error
- [ ] **Edge Case:** Change role from ADMIN to EMPLOYEE → Loses admin access immediately

#### 4.3 Delete User
- [ ] Click "Delete User" → Shows confirmation dialog
- [ ] Confirm deletion → User deleted or deactivated
- [ ] **Impact Check:** Deleting user with assigned assets → Assets show "Unassigned" or retain user ID
- [ ] **Impact Check:** Deleting user with subscriptions → Subscriptions retain assignment or show deleted user

#### 4.4 User List & Search (src/app/admin/users/page.tsx)
- [ ] Table displays all users with pagination
- [ ] Search by Name → Filters correctly
- [ ] Search by Email → Filters correctly
- [ ] Filter by Role → Shows only matching
- [ ] Sort by Name/Email → Sorts correctly

#### 4.5 User Import/Export
- [ ] Export users → Downloads XLSX with all user data
- [ ] Import users → Creates new users successfully
- [ ] **Validation:** Import with duplicate emails → Shows error or skips based on strategy
- [ ] **Role Validation:** Import with invalid role → Shows error

---

### 5. SUPPLIERS MODULE

#### 5.1 Public Supplier Registration (src/app/suppliers/register/page.tsx)
- [ ] **No Login Required:** Access /suppliers/register without authentication
- [ ] Fill all required fields (Name, Category, Contact Email) → Submits successfully
- [ ] **Validation:** Invalid email format → Shows error
- [ ] **Validation:** Website URL without http/https → Shows error or auto-adds
- [ ] **Validation:** Establishment Year in future → Shows error
- [ ] **Validation:** Establishment Year < 1800 → Shows error
- [ ] Submit form → Supplier created with Status = PENDING
- [ ] **Verification:** Supplier Code NOT generated yet (only on approval)
- [ ] **Confirmation:** Success message displayed after submission

#### 5.2 Supplier Approval Workflow (src/app/admin/suppliers/page.tsx)
- [ ] Login as ADMIN → View pending suppliers
- [ ] Click "Approve Supplier" → Shows confirmation dialog
- [ ] Confirm approval → Status changes to APPROVED
- [ ] **Verification:** Supplier Code auto-generated (format: SUPP-0001, SUPP-0002, etc.)
- [ ] **Verification:** approvedAt timestamp and approvedBy user ID set
- [ ] **Uniqueness:** Approve multiple suppliers simultaneously → All get unique codes
- [ ] **History:** Approval action logged in Activity Log

#### 5.3 Supplier Rejection
- [ ] Click "Reject Supplier" → Shows rejection reason dialog
- [ ] Enter rejection reason → Status changes to REJECTED
- [ ] **Verification:** Rejection reason saved and visible
- [ ] **Verification:** Supplier Code remains NULL (not generated)
- [ ] **Edge Case:** Re-approve previously rejected supplier → Generates new code

#### 5.4 Supplier Engagement History (src/components/suppliers/supplier-actions.tsx)
- [ ] Add engagement to supplier → Enter date, notes, and rating (1-5 stars)
- [ ] View engagement history → Displays in chronological order
- [ ] Edit engagement → Updates successfully
- [ ] Delete engagement → Removes successfully
- [ ] **Validation:** Rating outside 1-5 range → Shows error

#### 5.5 Supplier List & Search (src/app/admin/suppliers/page.tsx)
- [ ] Table displays all suppliers with pagination
- [ ] Search by Supplier Name → Filters correctly
- [ ] Search by Supplier Code → Filters correctly
- [ ] Filter by Status (PENDING, APPROVED, REJECTED) → Shows only matching
- [ ] Filter by Category → Shows only matching
- [ ] Sort by Name/Code/Created Date → Sorts correctly

#### 5.6 Employee Supplier View (src/app/employee/suppliers/page.tsx)
- [ ] Login as EMPLOYEE → Can view APPROVED suppliers only
- [ ] **Security:** Cannot see PENDING or REJECTED suppliers
- [ ] **Security:** Cannot approve/reject suppliers
- [ ] Can view engagement history (read-only)

#### 5.7 Supplier Import/Export
- [ ] Export suppliers → Downloads XLSX with all fields
- [ ] Import suppliers → Creates with PENDING status by default
- [ ] **Verification:** Imported suppliers do NOT auto-generate codes (require approval)

---

### 6. ACCREDITATION MODULE (MOST COMPLEX)

#### 6.1 Create Accreditation Project (src/app/admin/accreditation/projects/page.tsx)
- [ ] Click "Create Project" → Opens project form
- [ ] Enter Project Name and Code → Saves successfully
- [ ] Set Bump-In Start and End dates → Saves correctly
- [ ] Set Live Start and End dates → Saves correctly
- [ ] Set Bump-Out Start and End dates → Saves correctly
- [ ] **Validation:** bumpInEnd >= liveStart → Shows error (phases must be sequential)
- [ ] **Validation:** liveEnd >= bumpOutStart → Shows error
- [ ] **Correct Sequence:** bumpInStart < bumpInEnd < liveStart < liveEnd < bumpOutStart < bumpOutEnd → Saves successfully
- [ ] Select Access Groups (VIP, VVIP, Organiser, Contractor, Medical, Security, Media) → Saves as JSON array
- [ ] **Edge Case:** Create project with all phases on same day → Should fail validation

#### 6.2 Create Accreditation Record - QID Type (src/app/admin/accreditation/records/new/page.tsx)
- [ ] Select Project → Loads project details
- [ ] Enter First Name, Last Name, Organization, Job Title → All required
- [ ] Select Access Group from project groups → Required
- [ ] **Identification:** Select "QID" type
- [ ] Enter QID Number (exactly 11 digits) → Validates correctly
- [ ] **Validation:** QID with 10 digits → Shows error
- [ ] **Validation:** QID with 12 digits → Shows error
- [ ] **Validation:** QID with letters → Shows error
- [ ] Enter QID Expiry Date → Saves correctly
- [ ] **Phase Access:** Enable Bump-In Access → Requires Bump-In Start and End dates
- [ ] **Validation:** Bump-In Start >= Bump-In End → Shows error
- [ ] **Validation:** Enable Live Access without dates → Shows error
- [ ] **Phase Overlap:** Set Bump-In End = 2024-01-15, Live Start = 2024-01-10 → Shows error (overlap)
- [ ] **Correct Phases:** Bump-In (Jan 1-15), Live (Jan 16-30), Bump-Out (Feb 1-10) → Saves successfully
- [ ] **Validation:** No phase selected (all disabled) → Shows error (at least one required)
- [ ] Upload Profile Photo → Saves to Supabase storage
- [ ] **Verification:** Status = DRAFT, Accreditation Number auto-generated (format: ACC-0001)
- [ ] **QR Code:** QR Code NOT generated yet (only on approval)

#### 6.3 Create Accreditation Record - Passport Type
- [ ] **Identification:** Select "Passport" type
- [ ] Enter Passport Number (6-12 alphanumeric) → Validates correctly
- [ ] **Validation:** Passport < 6 chars → Shows error
- [ ] **Validation:** Passport > 12 chars → Shows error
- [ ] Enter Passport Country → Required
- [ ] Enter Passport Expiry → Required
- [ ] Enter Hayya Visa Number → Required
- [ ] Enter Hayya Visa Expiry → Required
- [ ] **Validation:** Missing any passport field → Shows error (all 5 required for passport type)
- [ ] **Mutual Exclusivity:** Verify QID fields are NULL when using Passport

#### 6.4 Accreditation Approval Workflow

**Workflow: DRAFT → PENDING → APPROVED**
- [ ] Create accreditation → Status = DRAFT
- [ ] **DRAFT:** Can edit all fields
- [ ] Click "Submit for Approval" → Status = PENDING
- [ ] **PENDING:** All fields locked (cannot edit)
- [ ] Login as ACCREDITATION_APPROVER or ADMIN
- [ ] Click "Approve" → Status = APPROVED
- [ ] **Verification:** QR Code Token generated (32-character hex string)
- [ ] **Verification:** approvedAt timestamp and approvedBy user ID set
- [ ] **QR Uniqueness:** Create and approve 5 records simultaneously → All get unique QR tokens
- [ ] **Edge Case:** QR generation fails after 10 attempts → Shows error (unlikely but possible)

**Workflow: PENDING → REJECTED → DRAFT**
- [ ] Record in PENDING status
- [ ] Click "Reject" → Enter rejection reason
- [ ] **Verification:** Status = REJECTED, rejection reason saved
- [ ] Click "Reinstate to Draft" → Status = DRAFT (can edit again)

**Workflow: APPROVED → REVOKED**
- [ ] Record in APPROVED status
- [ ] Login as ADMIN (only admins can revoke)
- [ ] Click "Revoke" → Enter revocation reason
- [ ] **Verification:** Status = REVOKED, revokedAt timestamp and revokedBy user ID set
- [ ] **QR Code:** Token still exists but verification fails (invalid status)
- [ ] Click "Reinstate to Draft" → Status = DRAFT, can resubmit

#### 6.5 QR Code Verification (PUBLIC - NO AUTH)
- [ ] Get QR Code Token from approved record
- [ ] Access /api/accreditation/verify/[token] without login
- [ ] **Valid Accreditation:** Status = APPROVED, at least one phase currently active → Returns valid response
- [ ] **Verification Response:** Includes name, organization, access group, photo, valid phases
- [ ] **Invalid Token:** Random token → Returns error "Not found"
- [ ] **Expired Accreditation:** All phases ended → Returns "Accreditation expired" or similar
- [ ] **Revoked Accreditation:** Status = REVOKED → Returns "Accreditation revoked"
- [ ] **Phase Check:** Current date within Live phase → Shows "Live Access" valid
- [ ] **Phase Check:** Current date outside all phases → Shows invalid or expired

#### 6.6 Accreditation Scanning (VALIDATOR Role)
- [ ] Login as VALIDATOR
- [ ] Access /validator → Can only access validator pages
- [ ] Scan QR Code → Enters token manually or via QR scanner
- [ ] **Valid Scan:** Creates AccreditationScan record with:
  - scannedBy (user ID)
  - scannedAt (timestamp)
  - location (optional)
  - device (user agent)
  - ipAddress
  - wasValid (true/false)
  - validPhases (JSON array of active phases)
- [ ] **Scan History:** View scan history for accreditation → Shows all scans chronologically
- [ ] **Analytics:** Scan count increases for accreditation
- [ ] **Edge Case:** Scan same accreditation multiple times → All scans logged separately

#### 6.7 Accreditation List & Search (src/app/admin/accreditation/records/page.tsx)
- [ ] Table displays all accreditation records
- [ ] Search by Accreditation Number → Filters correctly
- [ ] Search by Name (First/Last) → Filters correctly
- [ ] Search by Organization → Filters correctly
- [ ] Filter by Status (DRAFT, PENDING, APPROVED, REJECTED, REVOKED) → Shows only matching
- [ ] Filter by Access Group → Shows only matching
- [ ] Filter by Project → Shows only matching
- [ ] Sort by Created Date → Sorts correctly

#### 6.8 Accreditation Import
- [ ] Import CSV/XLSX with bulk accreditations → Creates multiple records
- [ ] **Validation:** Missing required fields → Shows error details
- [ ] **Validation:** Invalid QID format → Shows error
- [ ] **Validation:** Invalid phase dates → Shows error
- [ ] **Duplicate Detection:** Import existing QID/Passport → Skip or update based on strategy

#### 6.9 Accreditation Export
- [ ] Export all accreditations → Downloads XLSX
- [ ] **Verification:** Includes all fields (name, ID, phases, status, QR token)
- [ ] **Privacy:** QR tokens visible only in export (for printing badges)

#### 6.10 Accreditation Reports
- [ ] View approval metrics → Shows pending/approved/rejected counts
- [ ] View accreditations by access group → Shows breakdown
- [ ] View accreditations by project → Shows per-project statistics
- [ ] **Date Range Filter:** Filter by approval date range → Shows only matching

---

### 7. REPORTS & ANALYTICS MODULE

#### 7.1 Asset Reports (src/app/admin/reports/page.tsx)
- [ ] View total asset count → Displays correct number
- [ ] View assets by Status (pie chart or table) → Shows breakdown (IN_USE, SPARE, REPAIR, DISPOSED)
- [ ] View assets by Category → Shows breakdown
- [ ] View assets by Brand → Shows breakdown
- [ ] View warranty expiry report → Lists assets expiring soon
- [ ] View total asset value → Calculates sum of all asset prices in QAR
- [ ] **Date Filter:** Filter assets by purchase date range → Shows only matching

#### 7.2 Subscription Reports
- [ ] View total subscription cost → Calculates correct total (all active cycles charged)
- [ ] View subscriptions by billing cycle → Shows MONTHLY/YEARLY/ONE_TIME breakdown
- [ ] View upcoming renewals → Lists subscriptions renewing soon (next 30 days)
- [ ] View total spent per category → Groups and sums correctly
- [ ] **Cost Accuracy:** Verify total cost matches manual calculation of all periods

#### 7.3 Accreditation Reports
- [ ] View total accreditations by status → Shows counts
- [ ] View approvals per day/week → Shows trend
- [ ] View accreditations by access group → Shows distribution
- [ ] View scan analytics → Shows most scanned accreditations

#### 7.4 Activity Log (src/app/admin/activity/page.tsx)
- [ ] View all activity logs → Displays chronologically
- [ ] Filter by Action Type (Created, Updated, Deleted, etc.) → Shows only matching
- [ ] Filter by Entity Type (Asset, Subscription, User, etc.) → Shows only matching
- [ ] Search by User → Shows only that user's actions
- [ ] **Pagination:** Activity log paginates correctly (100+ entries)
- [ ] **Performance:** Loads quickly even with 1000+ log entries

---

### 8. SETTINGS MODULE

#### 8.1 Exchange Rate Settings (src/app/api/settings/exchange-rate/route.ts)
- [ ] View current USD to QAR rate → Displays current rate (default 3.64)
- [ ] Update exchange rate to 3.70 → Saves successfully
- [ ] **Verification:** SystemSettings table updated with new rate
- [ ] **Cache:** Rate cached for 5 minutes (check by updating and verifying old rate used briefly)
- [ ] Create new asset with USD price → Uses NEW exchange rate for conversion
- [ ] **Historical Data:** Old assets retain original QAR conversion (not recalculated)

#### 8.2 Full Backup & Restore (src/app/api/export/full-backup/route.ts)
- [ ] Click "Create Full Backup" → Downloads JSON file
- [ ] **Verification:** JSON includes all tables (users, assets, subscriptions, suppliers, accreditations, projects, settings)
- [ ] **Completeness:** Check all records present in backup
- [ ] Delete a test record → Record removed from database
- [ ] Click "Restore from Backup" → Upload JSON file
- [ ] **Verification:** Deleted record restored successfully
- [ ] **Data Integrity:** All relationships preserved (assigned users, approvers, etc.)
- [ ] **IDs:** Original IDs preserved or new IDs generated correctly

#### 8.3 Data Deletion (Admin Only)
- [ ] **WARNING TEST:** Click "Delete All Data" → Shows strong warning
- [ ] **Confirmation Required:** Must type confirmation text to proceed
- [ ] Confirm deletion → All data deleted (except users/auth)
- [ ] **Verification:** Assets, subscriptions, suppliers, accreditations all deleted
- [ ] **Safety:** User accounts NOT deleted (can still login)

---

### 9. IMPORT/EXPORT COMPREHENSIVE TESTING

#### 9.1 CSV Import Testing
- [ ] Create CSV with UTF-8 encoding → Imports correctly
- [ ] Create CSV with special characters (é, ñ, ä) → Imports correctly
- [ ] Create CSV with commas in field values → Imports correctly (quoted fields)
- [ ] **Large File:** Import CSV with 500+ rows → All process successfully
- [ ] **Performance:** Import completes in reasonable time (<30 seconds for 500 rows)

#### 9.2 XLSX Import Testing
- [ ] Create XLSX with multiple sheets → Uses first sheet
- [ ] Create XLSX with formulas in cells → Uses calculated values
- [ ] Create XLSX with date formatting → Parses dates correctly
- [ ] **Edge Case:** XLSX with merged cells → Handles gracefully or shows error

#### 9.3 Duplicate Strategies Comprehensive Test
- [ ] **Strategy: Skip** → Create asset with tag AST-001, import duplicate → Original kept, duplicate skipped
- [ ] **Strategy: Update** → Import duplicate with changed fields → Original updated with new data
- [ ] **Strategy: Create** → Import duplicate → Creates new record with new tag (AST-002)
- [ ] **Mixed Batch:** Import 10 records (5 duplicates, 5 new) with "Update" → 5 updated, 5 created

#### 9.4 Column Name Flexibility
- [ ] Import with "Asset Tag" → Works
- [ ] Import with "asset_tag" → Works
- [ ] Import with "assetTag" → Works
- [ ] Import with "AssetTag" → Works
- [ ] **Case Insensitive:** "ASSET TAG" → Works
- [ ] **Typos:** "Aset Tag" → Shows error or skips column

#### 9.5 Export Format Verification
- [ ] Export assets → Open in Excel → All columns visible and readable
- [ ] **Date Format:** Dates exported as YYYY-MM-DD or readable format
- [ ] **Decimal Places:** Prices show 2 decimal places
- [ ] **Empty Fields:** NULL values shown as empty cells (not "null" text)
- [ ] **Special Characters:** Names with special chars export correctly

---

### 10. DATE & TIMEZONE HANDLING (Qatar UTC+3)

#### 10.1 Date Input Testing
- [ ] Enter Purchase Date: 2024-01-15 → Saves as 2024-01-15 in Qatar timezone (not UTC shift)
- [ ] Enter Renewal Date: 2024-02-01 → Saves as 2024-02-01 in Qatar timezone
- [ ] **Browser Timezone:** Change browser timezone to US (UTC-5) → Dates still save as Qatar time
- [ ] **Display:** View saved date → Displays as 2024-01-15 (not shifted by timezone)

#### 10.2 Date Comparison Validation
- [ ] Set Purchase Date = 2024-01-15, Renewal Date = 2024-01-10 (earlier) → Shows error
- [ ] Set Purchase Date = 2024-01-15, Renewal Date = 2024-01-15 (same day) → Allows (edge case)
- [ ] Set Purchase Date = 2024-01-15, Renewal Date = 2024-01-16 → Allows (correct)

#### 10.3 Date Formatting
- [ ] View asset with Purchase Date 2024-01-15 → Displays as "15 Jan 2024" or similar readable format
- [ ] View warranty expiry 2024-12-31 → Shows "31 Dec 2024" and days remaining
- [ ] **Past Dates:** Warranty expired 2023-12-31 → Shows "Expired" or "X days ago"

#### 10.4 Accreditation Phase Date Testing
- [ ] Set Bump-In: Jan 1-15, Live: Jan 16-30 → Validates correctly (no overlap)
- [ ] **Overlap Test:** Bump-In: Jan 1-20, Live: Jan 15-30 → Shows error (overlap detected)
- [ ] **Current Phase Detection:** Current date = Jan 10 → Bump-In phase active
- [ ] **Current Phase Detection:** Current date = Jan 20 → Live phase active
- [ ] **QR Verification:** Scan on Jan 10 → Shows Bump-In access valid
- [ ] **QR Verification:** Scan on Jan 20 → Shows Live access valid

---

### 11. SECURITY TESTING

#### 11.1 SQL Injection Prevention
- [ ] Search asset tag with: `' OR '1'='1` → No SQL error, no data leak
- [ ] Search user email with: `admin@test.com' --` → No injection successful
- [ ] Import CSV with SQL in fields: `'; DROP TABLE assets; --` → Saved as text, not executed

#### 11.2 XSS Prevention
- [ ] Create asset with name: `<script>alert('XSS')</script>` → Script not executed when viewing
- [ ] Create supplier with notes: `<img src=x onerror=alert(1)>` → Image tag escaped, not rendered
- [ ] **Verification:** View source shows escaped HTML entities

#### 11.3 CSRF Protection
- [ ] Open asset edit form → Check for CSRF token in form or headers
- [ ] Copy API request from DevTools → Replay in different browser → Should fail (CSRF)

#### 11.4 Authorization Bypass Attempts
- [ ] Login as EMPLOYEE → Try accessing /admin/users directly via URL → Blocked
- [ ] Login as VALIDATOR → Try accessing /admin/assets directly → Blocked
- [ ] **API Direct Access:** Login as EMPLOYEE → Call DELETE /api/users/[id] directly → Should return 403 Forbidden
- [ ] **Parameter Tampering:** Edit own asset → Change assignedUserId in payload to someone else → Should validate ownership

#### 11.5 Sensitive Data Exposure
- [ ] View page source → Check no passwords or secrets exposed
- [ ] Check API responses → Ensure no sensitive fields (passwords, tokens) returned
- [ ] **Activity Logs:** Check logs don't contain passwords or secrets

#### 11.6 File Upload Security (Accreditation Photos)
- [ ] Upload valid image (JPG, PNG) → Accepts successfully
- [ ] Upload executable file (.exe, .sh) → Rejects with error
- [ ] Upload PHP file disguised as image (file.php.jpg) → Rejects or sanitizes
- [ ] **File Size:** Upload 10MB image → Rejects (should have size limit ~5MB)
- [ ] Upload SVG with embedded script → Sanitizes or rejects

---

### 12. PERFORMANCE & SCALABILITY TESTING

#### 12.1 Large Dataset Testing
- [ ] Create 500 assets → Application remains responsive
- [ ] Create 500 subscriptions → Pages load in <3 seconds
- [ ] Create 1000 users → User list paginates correctly
- [ ] Create 500 accreditations → Search and filter work efficiently

#### 12.2 Concurrent User Testing
- [ ] Open application in 3 browsers (different users) simultaneously
- [ ] All users create assets at same time → All succeed with unique tags
- [ ] All users approve suppliers simultaneously → All get unique supplier codes
- [ ] All users approve accreditations simultaneously → All get unique QR tokens

#### 12.3 Database Query Optimization
- [ ] Open DevTools Network tab → Monitor API response times
- [ ] Asset list page → Should load in <500ms
- [ ] Subscription list with 100+ records → Should load in <1 second
- [ ] Search functionality → Results appear in <300ms
- [ ] **N+1 Queries:** Check no excessive database queries (Prisma includes should be optimized)

#### 12.4 Browser Compatibility
- [ ] Test in Chrome → All features work
- [ ] Test in Firefox → All features work
- [ ] Test in Safari → All features work
- [ ] Test in Edge → All features work
- [ ] **Mobile:** Test on mobile browser → Responsive design, touch-friendly

---

### 13. ERROR HANDLING & EDGE CASES

#### 13.1 Network Error Handling
- [ ] Disable network mid-form submission → Shows error message
- [ ] Enable network and retry → Submission succeeds
- [ ] **Duplicate Prevention:** Ensure no duplicate records created from retry

#### 13.2 Validation Error Display
- [ ] Submit form with missing required fields → Shows clear error messages
- [ ] Error messages appear near relevant fields → User knows what to fix
- [ ] Fix errors and resubmit → Succeeds without page reload

#### 13.3 Database Connection Errors
- [ ] Simulate database down (stop DB server temporarily)
- [ ] Try to access any page → Shows graceful error, not crash
- [ ] Restore database → Application recovers without restart

#### 13.4 Empty State Handling
- [ ] View assets page with 0 assets → Shows "No assets found" message
- [ ] View subscriptions with 0 subscriptions → Shows empty state with "Create" button
- [ ] Search with no results → Shows "No results found" message

#### 13.5 Deleted/Missing Data References
- [ ] Delete user who is assigned assets → Assets show "Unassigned" or retain ID gracefully
- [ ] Delete supplier used in asset → Asset retains supplier name as text
- [ ] Delete accreditation project with records → Records cascade delete or show error

---

### 14. EMAIL NOTIFICATIONS (If Configured)

#### 14.1 Warranty Expiry Alerts
- [ ] Run cron job: `scripts/cron/warrantyAlerts.ts` → Sends email to ADMIN_EMAILS
- [ ] **Verification:** Email contains list of assets expiring soon (next 30 days)
- [ ] **Frequency:** Cron runs daily → Only sends once per day

#### 14.2 Subscription Renewal Alerts
- [ ] Run cron job: `scripts/cron/subscriptionRenewalAlerts.ts` → Sends email to ADMIN_EMAILS
- [ ] **Verification:** Email contains subscriptions renewing soon
- [ ] **Assigned User Notification:** User receives email about their subscription renewal

#### 14.3 Email Formatting
- [ ] Emails use professional template (HTML)
- [ ] Emails have subject line indicating purpose
- [ ] Emails include clickable links to relevant records
- [ ] **Unsubscribe:** Users can opt-out of non-critical notifications (nice to have)

---

### 15. ACCESSIBILITY & USABILITY

#### 15.1 Keyboard Navigation
- [ ] Tab through form fields → Focus visible and logical order
- [ ] Press Enter on buttons → Submits or activates action
- [ ] Press Escape on dialogs → Closes dialog

#### 15.2 Screen Reader Compatibility (Basic)
- [ ] Form inputs have labels → Screen reader announces label
- [ ] Buttons have descriptive text → Screen reader knows button purpose
- [ ] Error messages announced → Screen reader alerts user

#### 15.3 Visual Design & UX
- [ ] All text readable (sufficient contrast)
- [ ] Interactive elements clearly identifiable (buttons, links)
- [ ] Loading states visible (spinners, skeleton screens)
- [ ] Success messages displayed after actions
- [ ] Destructive actions (delete) require confirmation

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All critical tests passed
- [ ] No console errors in browser
- [ ] No unhandled exceptions in server logs
- [ ] Database migrations applied successfully
- [ ] Environment variables set correctly in production
- [ ] SSL certificate configured (HTTPS)
- [ ] Domain name configured and DNS propagated

### Deployment Steps
- [ ] Create production database backup
- [ ] Deploy to production environment (Vercel/Railway/etc.)
- [ ] Verify deployment successful (check URL accessible)
- [ ] Run database migrations in production
- [ ] Seed initial admin user (if needed)
- [ ] Test login with Azure AD in production
- [ ] Verify ADMIN_EMAILS working (admin role assignment)

### Post-Deployment Verification
- [ ] Smoke test: Login as admin → View all modules → Logout
- [ ] Create one test asset → Verify success
- [ ] Create one test subscription → Verify cost calculation
- [ ] Create one test accreditation → Approve → Verify QR code
- [ ] Check activity logs → All actions logging correctly
- [ ] Monitor server logs for errors (first 30 minutes)
- [ ] Performance check: Page load times acceptable

### Monitoring & Maintenance
- [ ] Set up error monitoring (Sentry, Bugsnag, etc.)
- [ ] Set up uptime monitoring (Pingdom, UptimeRobot, etc.)
- [ ] Configure automated backups (daily database backups)
- [ ] Set up cron jobs for warranty/renewal alerts
- [ ] Document admin procedures (user creation, role changes, etc.)
- [ ] Train admin users on key features
- [ ] Provide user manual or guide

---

## CRITICAL ISSUES LOG

Use this section to document any issues found during testing:

| # | Module | Issue Description | Severity | Status | Notes |
|---|--------|------------------|----------|--------|-------|
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |
| 3 |  |  |  |  |  |

**Severity Levels:**
- **Critical:** Blocks production deployment, must fix immediately
- **High:** Major functionality broken, fix before deployment
- **Medium:** Feature works but has issues, fix soon after deployment
- **Low:** Minor issue, can fix in future update

---

## SIGN-OFF

**Testing Completed By:** ___________________________
**Date:** ___________________________
**Approved for Production:** [ ] Yes [ ] No
**Deployment Date:** ___________________________

---

## NOTES & OBSERVATIONS

Use this space for any additional notes, observations, or recommendations:

---

**END OF CHECKLIST**
