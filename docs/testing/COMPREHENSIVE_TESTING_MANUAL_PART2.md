# 🔬 COMPREHENSIVE TESTING MANUAL - PART 2
## Sections 6-13: Users, Accreditation, Special Features, Edge Cases, Security

**Prerequisite**: Complete Part 1 first
**Estimated Time**: 4-6 hours

---

## 6. USERS MODULE

### 6.1 Create User
**Time**: 10 minutes

#### Test 6.1.1: Create Regular User
- [ ] Go to Users → "New User"
- [ ] Fill:
  - **Name**: "TEST User 1"
  - **Email**: "testuser1@company.com"
  - **Role**: "EMPLOYEE"
- [ ] Save
- **Expected**: User created
- **Expected**: emailVerified: null
- **Expected**: Activity logged

#### Test 6.1.2: Create Temporary Staff
- [ ] Create new user
- [ ] Check "Temporary Staff"
- [ ] Fill name and email only
- [ ] Save
- **Expected**: User created
- **Expected**: Role defaults to EMPLOYEE

#### Test 6.1.3: Validation - Duplicate Email
- [ ] Try to create user with existing email
- **Expected**: ❌ Error: "Email already exists"

#### Test 6.1.4: Validation - Invalid Email Format
- [ ] Try email: "not-an-email"
- **Expected**: ❌ Error: "Invalid email format"

#### Test 6.1.5: Validation - Non-Temporary without Role
- [ ] Create user
- [ ] DON'T check "Temporary Staff"
- [ ] DON'T select Role
- [ ] Save
- **Expected**: ❌ Error: "Role required for regular users"

#### Test 6.1.6: Create Admin User
- [ ] Create user with Role: ADMIN
- [ ] Save
- **Expected**: User created
- ⚠️ **Security Note**: Only trusted users should be admin

#### Test 6.1.7: Create Validator User
- [ ] Create user with Role: VALIDATOR
- [ ] Save
- **Expected**: User created
- **Note**: Validator can only access /validator routes

### 6.2 View Users
**Time**: 5 minutes

#### Test 6.2.1: List All Users
- [ ] Go to Users page
- **Expected**: See all users
- **Expected**: Shows name, email, role
- **Expected**: Shows asset count
- **Expected**: Shows subscription count

#### Test 6.2.2: Filter by Role
- [ ] Filter "ADMIN"
- **Expected**: Shows only admins
- [ ] Filter "EMPLOYEE"
- **Expected**: Shows only employees

#### Test 6.2.3: View User Detail
- [ ] Click on a user
- **Expected**: Shows all user info
- **Expected**: Shows assigned assets (list)
- **Expected**: Shows assigned subscriptions (list)
- **Expected**: Shows counts

### 6.3 Update User
**Time**: 5 minutes

#### Test 6.3.1: Update Name
- [ ] Edit user
- [ ] Change name
- [ ] Save
- **Expected**: Name updated
- **Expected**: Activity logged

#### Test 6.3.2: Update Role
- [ ] Change role from EMPLOYEE to ADMIN
- [ ] Save
- **Expected**: Role updated
- **Expected**: Activity logged
- **Note**: User must re-login for role change to take effect

#### Test 6.3.3: Role Change Effect
- [ ] Change user role to ADMIN
- [ ] Log in as that user (if possible)
- **Expected**: Can access /admin routes
- [ ] Change back to EMPLOYEE
- [ ] Log in again
- **Expected**: Cannot access /admin

### 6.4 Delete User
**Time**: 15 minutes

#### Test 6.4.1: Delete User without Assignments
- [ ] Create test user with no assets/subscriptions
- [ ] Delete user
- [ ] Enter **Deletion Notes**: "Test deletion"
- [ ] Confirm
- **Expected**: User soft-deleted (deletedAt set)
- **Expected**: Still exists in database
- **Expected**: Not shown in user list
- **Expected**: Activity logged

#### Test 6.4.2: Verify Soft Delete
- [ ] Check database or API directly
- **Expected**: deletedAt field set
- **Expected**: deletedById set to your ID
- **Expected**: deletionNotes stored

#### Test 6.4.3: Cannot Delete Self
- [ ] Try to delete your own user account
- **Expected**: ❌ Error: "Cannot delete yourself"
- **If allows**: ❌ CRITICAL BUG

#### Test 6.4.4: Cannot Delete System Account
- [ ] Find user with isSystemAccount: true
- [ ] Try to delete
- **Expected**: ❌ Error: "Cannot delete system account"
- **If allows**: ❌ CRITICAL BUG

#### Test 6.4.5: Cannot Delete User with Assets
- [ ] Assign asset to user
- [ ] Try to delete user
- **Expected**: ❌ Error 409: "User has assigned assets"
- **Expected**: Lists assets
- **If allows deletion**: ❌ BUG - Data integrity issue

#### Test 6.4.6: Cannot Delete User with Subscriptions
- [ ] Assign subscription to user
- [ ] Try to delete
- **Expected**: ❌ Error 409: "User has assigned subscriptions"
- **If allows**: ❌ BUG

#### Test 6.4.7: Delete After Unassignment
- [ ] Unassign all assets and subscriptions from user
- [ ] Then delete user
- **Expected**: ✅ Deletion succeeds

#### Test 6.4.8: Cannot Delete Already Deleted
- [ ] Delete a user
- [ ] Try to delete again
- **Expected**: ❌ Error: "User already deleted"

### 6.5 User Export
**Time**: 3 minutes

#### Test 6.5.1: Export All Users
- [ ] Click Export
- **Expected**: Excel file
- [ ] Open file
- **Expected**: All users included
- **Expected**: Shows role, assets count, subscriptions count

### 🎯 Section 6 Results:
- **Tests Passed**: ___/25
- **Critical Bugs**: ___________

---

## 7. ACCREDITATION MODULE

### 7.1 Accreditation Projects
**Time**: 20 minutes

#### Test 7.1.1: Create Project with Sequential Dates
- [ ] Go to Accreditation → Projects → New
- [ ] Fill:
  - **Name**: "TEST Event 2025"
  - **Code**: "TEST2025"
  - **Bump In Start**: 2025-06-01 09:00
  - **Bump In End**: 2025-06-03 18:00
  - **Live Start**: 2025-06-04 09:00
  - **Live End**: 2025-06-10 23:00
  - **Bump Out Start**: 2025-06-11 09:00
  - **Bump Out End**: 2025-06-13 18:00
  - **Access Groups**: ["VIP", "Staff", "Media", "Contractor"]
- [ ] Save
- **Expected**: Project created
- **Actual dates validated in Qatar timezone

#### Test 7.1.2: Validation - Non-Sequential Dates
- [ ] Try to create with:
  - Live Start BEFORE Bump In End
- **Expected**: ❌ Error: "Dates must be sequential"

#### Test 7.1.3: Validation - Duplicate Code
- [ ] Try to create project with code "TEST2025" (same as Test 7.1.1)
- **Expected**: ❌ Error: "Code already exists"

#### Test 7.1.4: Validation - No Access Groups
- [ ] Try to create without access groups
- **Expected**: ❌ Error: "At least one access group required"

#### Test 7.1.5: Validation - Empty Access Groups
- [ ] Try with empty array: []
- **Expected**: ❌ Error

#### Test 7.1.6: View Projects List
- [ ] Go to Projects page
- **Expected**: See all projects
- **Expected**: Shows name, code, dates
- **Expected**: Shows accreditation count

#### Test 7.1.7: Filter Active Projects
- [ ] Filter isActive: true
- **Expected**: Shows only active projects
- [ ] Set project to inactive
- [ ] Filter again
- **Expected**: Project not shown

#### Test 7.1.8: View Project Details
- [ ] Click on a project
- **Expected**: Shows all phase dates
- **Expected**: Shows access groups
- **Expected**: Shows statistics

#### Test 7.1.9: Update Project Dates
- [ ] Edit project
- [ ] Change Live Start to new date
- [ ] Save
- **Expected**: Date updated
- **Expected**: Still validates sequential order

#### Test 7.1.10: Cannot Change Project Name/Code
- [ ] Try to edit name or code
- **Expected**: Fields disabled or validation error
- **If allows change**: ⚠️ Should be immutable

#### Test 7.1.11: Delete Project
- [ ] Create test project
- [ ] Add 2-3 accreditations to it
- [ ] Delete project
- **Expected**: Project deleted
- **Expected**: All accreditations deleted (cascade)
- **Expected**: All history deleted (cascade)

### 7.2 Accreditation Records - QID Type
**Time**: 25 minutes

#### Test 7.2.1: Create with QID (DRAFT)
- [ ] Go to project → Records → New
- [ ] Fill:
  - **First Name**: "Ahmed"
  - **Last Name**: "Al-Mansoori"
  - **Organization**: "TEST Organization"
  - **Job Title**: "Project Manager"
  - **Access Group**: "VIP" (must be from project)
  - **Identification Type**: QID
  - **QID Number**: "12345678901" (exactly 11 digits)
  - **QID Expiry**: (future date, after last access end)
  - **Profile Photo**: (upload image < 5MB)
  - **Phase Access**:
    - [x] Bump In Access
    - **Bump In Start**: (within project bump-in phase)
    - **Bump In End**: (within project bump-in phase)
    - [x] Live Access
    - **Live Start**: (within project live phase)
    - **Live End**: (within project live phase)
- [ ] Save as Draft
- **Expected**: Accreditation created
- **Expected**: Status: DRAFT
- **Expected**: accreditationNumber generated (ACC-XXXX)
- **Example number**: _______________
- **Expected**: No QR code yet

#### Test 7.2.2: Validation - QID Not 11 Digits
- [ ] Try QID: "12345" (too short)
- **Expected**: ❌ Error: "QID must be 11 digits"
- [ ] Try QID: "123456789012" (too long)
- **Expected**: ❌ Error

#### Test 7.2.3: Validation - Expired QID
- [ ] Set QID Expiry to yesterday
- **Expected**: ❌ Error: "Document expired"

#### Test 7.2.4: Validation - QID Expires Before Access End
- [ ] Set:
  - Live End: 2025-06-10
  - QID Expiry: 2025-06-05 (before live end)
- **Expected**: ❌ Error: "Document must be valid for entire access period"

#### Test 7.2.5: Validation - Phase Dates Outside Project
- [ ] Set Bump In Start before project's Bump In Start
- **Expected**: ❌ Error: "Dates must be within project phase"

#### Test 7.2.6: Validation - Phase Date Range
- [ ] Set Bump In Start > Bump In End
- **Expected**: ❌ Error: "Start must be before end"

#### Test 7.2.7: Validation - No Phases Selected
- [ ] Uncheck all phases (Bump In, Live, Bump Out)
- **Expected**: ❌ Error: "At least one phase required"

#### Test 7.2.8: Validation - Invalid Access Group
- [ ] Try access group not in project's accessGroups
- **Expected**: ❌ Error: "Invalid access group for this project"

#### Test 7.2.9: Duplicate QID in Same Project
- [ ] Create accreditation with QID: 12345678901
- [ ] Try to create another with same QID in same project
- **Expected**: ❌ Error 409: "Duplicate"
- **Expected**: Shows existing accreditation number

### 7.3 Accreditation Records - Passport Type
**Time**: 15 minutes

#### Test 7.3.1: Create with Passport
- [ ] Create new accreditation
- [ ] Select **Identification Type**: Passport
- [ ] Fill:
  - **Passport Number**: "AB1234567" (6-12 alphanumeric)
  - **Passport Country**: "United Kingdom"
  - **Passport Expiry**: (future date)
  - **Hayya Visa Number**: "HV12345"
  - **Hayya Visa Expiry**: (future date)
- [ ] Save
- **Expected**: Accreditation created

#### Test 7.3.2: Validation - Passport Number Length
- [ ] Try passport: "12345" (too short < 6)
- **Expected**: ❌ Error
- [ ] Try passport: "1234567890123" (too long > 12)
- **Expected**: ❌ Error

#### Test 7.3.3: Validation - Expired Passport
- [ ] Set passport expiry to past
- **Expected**: ❌ Error: "Document expired"

#### Test 7.3.4: Duplicate Passport in Same Project
- [ ] Create accreditation with passport AB1234567
- [ ] Try another with same passport in same project
- **Expected**: ❌ Error 409: "Duplicate"

### 7.4 Accreditation Workflow
**Time**: 20 minutes

#### Test 7.4.1: Submit for Approval
- [ ] Create accreditation in DRAFT
- [ ] Click "Submit for Approval"
- [ ] Confirm
- **Expected**: Status → PENDING
- **Expected**: History entry created (SUBMITTED)

#### Test 7.4.2: Cannot Submit Non-Draft
- [ ] Try to submit already PENDING accreditation
- **Expected**: ❌ Error or button disabled

#### Test 7.4.3: Approve Accreditation
- [ ] Find PENDING accreditation
- [ ] Click "Approve"
- [ ] Confirm
- **Expected**: Status → APPROVED
- **Expected**: qrCodeToken generated (32 hex chars)
- **Expected**: approvedAt timestamp set
- **Expected**: approvedBy set to your user
- **Expected**: History entry created (APPROVED)

#### Test 7.4.4: Verify QR Code Generated
- [ ] On approved accreditation detail page
- **Expected**: See QR code image
- **Expected**: Can download QR code
- **Example token length**: _____ (should be 32)

#### Test 7.4.5: Verify QR Token Uniqueness
- [ ] Approve 5 different accreditations
- [ ] Check their qrCodeTokens
- **Expected**: All tokens unique
- **If duplicates**: ❌ CRITICAL BUG

#### Test 7.4.6: Cannot Approve Non-Pending
- [ ] Try to approve DRAFT accreditation
- **Expected**: ❌ Error: "Must be PENDING"
- [ ] Try to approve already APPROVED
- **Expected**: ❌ Error or button disabled

#### Test 7.4.7: Reject Accreditation
- [ ] Find PENDING accreditation
- [ ] Click "Reject"
- [ ] Enter **Notes**: "Incomplete information"
- [ ] Confirm
- **Expected**: Status → REJECTED
- **Expected**: History entry with notes

#### Test 7.4.8: Reject without Notes
- [ ] Try to reject without notes
- **Expected**: ❌ Error: "Notes required"

#### Test 7.4.9: Edit Approved Resets to Pending
- [ ] Approve an accreditation
- [ ] Edit any field (e.g., change name)
- [ ] Save
- **Expected**: Status automatically reset to PENDING
- **Expected**: QR token cleared
- **Expected**: approvedAt cleared
- **Expected**: History shows status change

#### Test 7.4.10: Revoke Accreditation
- [ ] Approve an accreditation
- [ ] Click "Revoke"
- [ ] Enter **Reason**: "Security concern"
- [ ] Confirm
- **Expected**: Status → REVOKED
- **Expected**: revokedAt set
- **Expected**: revokedBy set
- **Expected**: revocationReason stored
- **Expected**: qrCodeToken cleared
- **Expected**: History entry created

#### Test 7.4.11: Cannot Revoke Non-Approved
- [ ] Try to revoke PENDING accreditation
- **Expected**: ❌ Error: "Must be APPROVED"

#### Test 7.4.12: Reinstate Revoked
- [ ] Revoke an accreditation first
- [ ] Click "Reinstate"
- [ ] Confirm
- **Expected**: Status → APPROVED
- **Expected**: New qrCodeToken generated
- **Expected**: History entry created

#### Test 7.4.13: Cannot Reinstate Non-Revoked
- [ ] Try to reinstate APPROVED accreditation
- **Expected**: ❌ Error: "Must be REVOKED"

#### Test 7.4.14: Return to Draft
- [ ] PENDING or REJECTED accreditation
- [ ] Click "Return to Draft"
- **Expected**: Status → DRAFT
- **Expected**: Approval info cleared

### 7.5 QR Code Verification
**Time**: 20 minutes

#### Test 7.5.1: Verify by QR Token
- [ ] Get qrCodeToken from approved accreditation
- [ ] Go to /verify/[token] or scan QR
- **Expected**: Shows accreditation details
- **Expected**: Shows name, organization, photo
- **Expected**: Shows access permissions
- **Expected**: Shows isValidToday (true if in phase)

#### Test 7.5.2: Verify by Accreditation Number
- [ ] Go to /verify/ACC-0001 (use actual number)
- **Expected**: Works same as token
- **Expected**: Case-insensitive (acc-0001 works)

#### Test 7.5.3: Verify Within Valid Phase
- [ ] Today's date is within a phase (e.g., Bump In)
- [ ] Verify accreditation with that phase enabled
- **Expected**: isValidToday: true
- **Expected**: Shows which phases are active today

#### Test 7.5.4: Verify Outside Valid Phase
- [ ] Today's date is outside all phases
- [ ] Verify accreditation
- **Expected**: isValidToday: false
- **Expected**: Shows "Not valid today"

#### Test 7.5.5: Verify Revoked Accreditation
- [ ] Revoke an accreditation
- [ ] Try to verify its token
- **Expected**: ❌ 403 Forbidden
- **Expected**: Shows "Accreditation revoked: [reason]"

#### Test 7.5.6: Verify Rejected Accreditation
- [ ] Try to verify REJECTED accreditation
- **Expected**: ❌ 403 Forbidden
- **Expected**: Shows "Accreditation rejected"

#### Test 7.5.7: Verify Pending Accreditation
- [ ] Try to verify PENDING accreditation
- **Expected**: ❌ 403 Forbidden
- **Expected**: Shows "Not yet approved"

#### Test 7.5.8: Verify Non-Existent Token
- [ ] Go to /verify/nonexistent-token-12345
- **Expected**: ❌ 404 Not Found

#### Test 7.5.9: Scan Logging
- [ ] Verify an accreditation
- [ ] Check Scans page (admin)
- **Expected**: Scan logged
- **Expected**: Shows who scanned (scannedBy)
- **Expected**: Shows when (scannedAt)
- **Expected**: Shows wasValid (true/false)
- **Expected**: Shows device info (user agent)
- **Expected**: Shows IP address

#### Test 7.5.10: Multiple Scans
- [ ] Scan same QR 5 times
- **Expected**: Creates 5 scan records
- **Expected**: All show correct validity

#### Test 7.5.11: Revoked QR Cannot Be Scanned
- [ ] Approve accreditation (QR works)
- [ ] Scan successfully
- [ ] Revoke accreditation
- [ ] Try to scan again
- **Expected**: ❌ Fails with revocation message
- [ ] Reinstate
- [ ] Scan again
- **Expected**: ✅ Works (new token)

### 7.6 Accreditation Import
**Time**: 15 minutes

#### Test 7.6.1: Bulk Import (via API)
- [ ] Use browser console or Postman:
```javascript
fetch('/api/accreditation/import', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: '[project-id]',
    skipDuplicates: false,
    records: [
      {
        firstName: 'Import', lastName: 'Test1',
        organization: 'Test Org', jobTitle: 'Manager',
        accessGroup: 'VIP',
        identificationType: 'qid',
        qidNumber: '11111111111',
        qidExpiry: '2026-12-31',
        hasBumpInAccess: true,
        bumpInStart: '2025-06-01',
        bumpInEnd: '2025-06-03'
      },
      {
        firstName: 'Import', lastName: 'Test2',
        // ... same structure
      }
    ]
  })
}).then(r => r.json()).then(console.log)
```
- **Expected**: Imports all records
- **Expected**: Creates in DRAFT status
- **Expected**: Generates accreditation numbers
- **Expected**: Transaction (all or nothing)

#### Test 7.6.2: Import with Duplicates
- [ ] Import same QID twice in one request
- [ ] With skipDuplicates: true
- **Expected**: Skips duplicate
- [ ] With skipDuplicates: false
- **Expected**: ❌ Error, rolls back all

#### Test 7.6.3: Import Invalid Data
- [ ] Include record with missing required field
- **Expected**: ❌ Transaction fails
- **Expected**: No records imported (rollback)

### 7.7 Accreditation Export
**Time**: 10 minutes

#### Test 7.7.1: Export All Records
- [ ] Go to Accreditation → Export
- **Expected**: Excel file
- [ ] Open file
- **Expected**: All accreditations included
- **Expected**: All fields present

#### Test 7.7.2: Export Filtered by Project
- [ ] Export with projectId filter
- **Expected**: Only records from that project

#### Test 7.7.3: Export QR Codes (Single)
- [ ] On accreditation detail page
- [ ] Click "Download QR"
- **Expected**: PNG image downloads
- **Expected**: QR code scannable

#### Test 7.7.4: Export QR Codes (Bulk)
- [ ] Select multiple approved accreditations
- [ ] Click "Export QR Codes"
- **Expected**: PDF downloads
- **Expected**: One page per accreditation
- **Expected**: Shows name, org, number, QR

#### Test 7.7.5: Cannot Export QR for Non-Approved
- [ ] Try to export QR for DRAFT/PENDING
- **Expected**: ❌ Error or filtered out

### 7.8 Accreditation Scans
**Time**: 10 minutes

#### Test 7.8.1: View All Scans
- [ ] Go to Accreditation → Scans
- **Expected**: See all scans
- **Expected**: Shows who scanned, when, which accreditation
- **Expected**: Shows validity status

#### Test 7.8.2: Filter Scans by Project
- [ ] Filter by project
- **Expected**: Shows only scans for that project

#### Test 7.8.3: Filter by Date Range
- [ ] Set date range (e.g., last 7 days)
- **Expected**: Filters scans

#### Test 7.8.4: Export Scans
- [ ] Click Export
- **Expected**: Excel file
- **Expected**: All scan records with details

### 7.9 Accreditation Reports
**Time**: 5 minutes

#### Test 7.9.1: Project Statistics
- [ ] Go to Project → Reports/Stats
- **Expected**: Shows counts by status
- **Expected**: Shows breakdown by access group
- **Expected**: Real-time data

#### Test 7.9.2: Verify Accuracy
- [ ] Manually count accreditations by status
- [ ] Compare to report
- **Expected**: Numbers match

### 🎯 Section 7 Results:
- **Tests Passed**: ___/80
- **Critical Bugs**: ___________

---

## 8. SPECIAL FEATURES

### 8.1 Currency Conversion
**Time**: 10 minutes

#### Test 8.1.1: Asset USD to QAR
- [ ] Create asset with $1000 USD
- **Expected**: priceQAR = 3640 (1000 × 3.64)

#### Test 8.1.2: Subscription USD to QAR
- [ ] Create subscription with $500 USD
- **Expected**: costQAR = 1820 (500 × 3.64)

#### Test 8.1.3: Edit Currency Only
- [ ] Edit asset
- [ ] Change currency from QAR to USD (don't change price)
- **Expected**: Price recalculated (QAR ÷ 3.64 = USD)

#### Test 8.1.4: Import with USD
- [ ] Import CSV with USD prices
- **Expected**: All converted correctly

#### Test 8.1.5: Export Shows Both Currencies
- [ ] Export assets/subscriptions
- **Expected**: Shows both original and QAR values

### 8.2 Qatar Timezone
**Time**: 5 minutes

#### Test 8.2.1: Date Storage
- [ ] Create subscription with renewal date
- [ ] Check database directly (if possible)
- **Expected**: Stored in Qatar timezone

#### Test 8.2.2: Date Display
- [ ] View dates in app
- **Expected**: Displayed in Qatar time
- **Expected**: Consistent across all pages

### 8.3 History Tracking
**Time**: 10 minutes

#### Test 8.3.1: Asset History Completeness
- [ ] Create asset
- [ ] Edit it 3 times
- [ ] Assign, unassign, reassign
- [ ] Change status twice
- [ ] Check history
- **Expected**: 7+ history entries (all actions logged)

#### Test 8.3.2: Subscription History
- [ ] Create subscription
- [ ] Cancel it
- [ ] Reactivate it
- [ ] Check history
- **Expected**: CREATED, CANCELLED, REACTIVATED entries

#### Test 8.3.3: Accreditation History
- [ ] Create (DRAFT)
- [ ] Submit (PENDING)
- [ ] Approve (APPROVED)
- [ ] Revoke (REVOKED)
- [ ] Reinstate (APPROVED)
- [ ] Check history
- **Expected**: All 5 state changes logged

#### Test 8.3.4: History Shows Old/New Values
- [ ] Edit asset (change model, brand, status)
- [ ] Check history
- **Expected**: Shows before and after values

### 8.4 File Uploads
**Time**: 10 minutes

#### Test 8.4.1: Upload Valid Image
- [ ] Upload image < 5MB to accreditation
- **Expected**: Success
- **Expected**: URL returned
- [ ] View accreditation
- **Expected**: Photo displayed

#### Test 8.4.2: Upload Invalid File Type
- [ ] Try to upload .exe or .pdf
- **Expected**: ❌ Error: "Invalid file type"

#### Test 8.4.3: Upload Oversized File
- [ ] Try to upload image > 10MB
- **Expected**: ❌ Error: "File too large"

#### Test 8.4.4: Verify File Accessible
- [ ] Upload image
- [ ] Copy URL
- [ ] Open in new tab
- **Expected**: Image loads

### 8.5 Auto-Generated Codes
**Time**: 10 minutes

#### Test 8.5.1: Asset Tag Auto-Generation
- [ ] Create asset without asset tag
- **Expected**: Tag auto-generated based on type
- **Example**: "Laptop" → "LAPTOP-0001"

#### Test 8.5.2: Supplier Code on Approval
- [ ] Approve supplier
- **Expected**: suppCode = SUPP-XXXX
- [ ] Approve 3 more
- **Expected**: Sequential (SUPP-0001, 0002, 0003, etc.)

#### Test 8.5.3: Accreditation Number
- [ ] Create accreditation
- **Expected**: accreditationNumber = ACC-XXXX
- [ ] Create 5 more
- **Expected**: All unique and sequential

#### Test 8.5.4: Concurrent Generation
- [ ] Rapid create (use script):
  - Create 10 assets simultaneously
  - Or 10 accreditations
- **Expected**: All get unique codes
- **Expected**: No duplicates
- **If duplicates**: ❌ CRITICAL BUG - Race condition

### 8.6 Search Functionality
**Time**: 10 minutes

#### Test 8.6.1: Case-Insensitive Search
- [ ] Create asset with model "Dell XPS"
- [ ] Search for "dell xps" (lowercase)
- **Expected**: Found
- [ ] Search for "DELL XPS" (uppercase)
- **Expected**: Found

#### Test 8.6.2: Partial Match Search
- [ ] Search for "Dell"
- **Expected**: Finds "Dell XPS", "Dell Latitude", etc.

#### Test 8.6.3: Multi-Field Search
- [ ] Search for serial number
- **Expected**: Finds asset
- [ ] Search for asset tag
- **Expected**: Finds asset

#### Test 8.6.4: Special Characters
- [ ] Search with: "Dell's Laptop"
- **Expected**: Handles apostrophe
- [ ] Search with: "Test & Co."
- **Expected**: Handles ampersand

### 8.7 Rate Limiting
**Time**: 5 minutes

#### Test 8.7.1: Supplier Registration Limit
- [ ] Register supplier 100 times (use script/tool)
- **Expected**: All succeed
- [ ] Try 101st registration
- **Expected**: ❌ 429 Too Many Requests
- [ ] Wait 15 minutes
- [ ] Try again
- **Expected**: ✅ Works

### 🎯 Section 8 Results:
- **Tests Passed**: ___/30
- **Critical Bugs**: ___________

---

## 9. EDGE CASES & ERROR HANDLING

### 9.1 Null/Empty Handling
**Time**: 10 minutes

#### Test 9.1.1: Create with Empty Optional Fields
- [ ] Create asset with only required fields
- [ ] Leave all optional fields empty
- **Expected**: Success
- **Expected**: Empty fields stored as null

#### Test 9.1.2: Update to Null
- [ ] Edit asset
- [ ] Clear optional field (make it empty)
- [ ] Save
- **Expected**: Field set to null

#### Test 9.1.3: Display Null Values
- [ ] View record with null fields
- **Expected**: Shows "N/A" or "(empty)" or blank
- **Expected**: No "null" or "undefined" displayed

#### Test 9.1.4: Export Null Values
- [ ] Export records with null fields
- **Expected**: Empty cells in Excel

### 9.2 Date Edge Cases
**Time**: 10 minutes

#### Test 9.2.1: Leap Year Date
- [ ] Create asset with warranty expiry: Feb 29, 2024
- **Expected**: Accepts (2024 is leap year)
- [ ] Try Feb 29, 2025
- **Expected**: ❌ Error (2025 not leap year)

#### Test 9.2.2: Year 2000 Date
- [ ] Try to create with date before 2000-01-01
- **Expected**: Depends on field, may reject

#### Test 9.2.3: Far Future Date
- [ ] Try date in year 2100
- **Expected**: Depends on field (renewal: reject if >10 years)

#### Test 9.2.4: Same Start and End Date
- [ ] Create subscription with renewalDate = purchaseDate
- **Expected**: May allow or reject

### 9.3 Large Datasets
**Time**: 15 minutes

#### Test 9.3.1: Large Page Size
- [ ] Request page size = 101
- **Expected**: ❌ Error: "Max 100 per page"

#### Test 9.3.2: Many Pages
- [ ] If you have 200+ records:
  - Navigate to page 10
  - **Expected**: Loads quickly
  - Check page 1, then page 10
  - **Expected**: Different records

#### Test 9.3.3: Large Export
- [ ] Export 1000+ records
- ⏱️ **Time**: _____ seconds
- **Expected**: Completes within reasonable time (<30s)
- **If timeout**: ⚠️ Performance issue

#### Test 9.3.4: Large Import
- [ ] Import 500+ records
- ⏱️ **Time**: _____ seconds
- **Expected**: Completes
- **If fails**: ⚠️ Timeout or memory issue

### 9.4 Concurrent Operations
**Time**: 10 minutes

#### Test 9.4.1: Edit Same Record Simultaneously
- [ ] Open asset in 2 browser tabs
- [ ] Edit different fields in each
- [ ] Save both
- **Expected**: Last save wins OR conflict detection
- **Note behavior**: _______________

#### Test 9.4.2: Delete While Viewing
- [ ] User A views asset
- [ ] User B deletes asset
- [ ] User A tries to edit
- **Expected**: ❌ Error: "Not found"

### 9.5 Database Errors
**Time**: 10 minutes

#### Test 9.5.1: Foreign Key Violation
- [ ] Try to delete asset with maintenance records
- **Expected**: Should cascade delete OR prevent with error

#### Test 9.5.2: Transaction Rollback
- [ ] Import file with 10 records, one invalid
- **Expected**: Either:
  - All 10 rejected (transaction rollback)
  - OR 9 imported, 1 skipped (row-by-row)
- **Note behavior**: _______________

### 🎯 Section 9 Results:
- **Tests Passed**: ___/20
- **Critical Bugs**: ___________

---

## 10. INTEGRATION TESTS

### 10.1 End-to-End Workflows
**Time**: 30 minutes

#### Test 10.1.1: Complete Asset Lifecycle
1. [ ] Admin creates asset
2. [ ] Admin assigns to Employee A
3. [ ] Employee A sees in "My Assets"
4. [ ] Admin reassigns to Employee B
5. [ ] Employee A no longer sees it
6. [ ] Employee B sees it
7. [ ] Admin changes status to REPAIR
8. [ ] Asset auto-unassigned
9. [ ] Employee B no longer sees it
10. [ ] Admin deletes asset
11. [ ] Check history deleted
- **Expected**: All steps work seamlessly

#### Test 10.1.2: Subscription Full Lifecycle
1. [ ] Create subscription
2. [ ] Assign to user
3. [ ] Cancel
4. [ ] Reactivate
5. [ ] Export (verify in export)
6. [ ] Delete
- **Expected**: All steps work

#### Test 10.1.3: Supplier Approval Flow
1. [ ] Public registers supplier (no auth)
2. [ ] Admin logs in, sees pending
3. [ ] Admin approves
4. [ ] suppCode assigned
5. [ ] Admin adds engagement
6. [ ] Employee can view (approved)
- **Expected**: Full workflow works

#### Test 10.1.4: Accreditation End-to-End
1. [ ] Create project
2. [ ] Create accreditation (DRAFT)
3. [ ] Submit (PENDING)
4. [ ] Admin approves (APPROVED)
5. [ ] QR code generated
6. [ ] Scan QR code (logged)
7. [ ] Revoke accreditation
8. [ ] Try to scan (fails)
9. [ ] Reinstate
10. [ ] Scan works again
- **Expected**: Full workflow works

### 10.2 Import/Export Round-Trip
**Time**: 20 minutes

#### Test 10.2.1: Assets Round-Trip
1. [ ] Create 20 assets with various data
2. [ ] Export to Excel
3. [ ] Delete all assets
4. [ ] Import from Excel
5. [ ] Compare data
- **Expected**: All data matches

#### Test 10.2.2: Subscriptions Round-Trip
1. [ ] Create 20 subscriptions (with history)
2. [ ] Export (both sheets)
3. [ ] Delete all
4. [ ] Import
5. [ ] Verify history preserved
- **Expected**: Exact match

### 10.3 Cross-Module Operations
**Time**: 15 minutes

#### Test 10.3.1: User Deletion Dependencies
1. [ ] Create user
2. [ ] Assign asset to user
3. [ ] Assign subscription to user
4. [ ] Try to delete user
- **Expected**: ❌ Error: "Has assignments"
5. [ ] Unassign all
6. [ ] Delete user
- **Expected**: ✅ Success

#### Test 10.3.2: Multi-User Activity Log
1. [ ] Admin creates asset
2. [ ] Admin assigns to Employee
3. [ ] Check activity log
- **Expected**: Shows both actions with correct users

### 🎯 Section 10 Results:
- **Tests Passed**: ___/15
- **Critical Bugs**: ___________

---

## 11. SECURITY TESTS

### 11.1 Authentication Bypass
**Time**: 10 minutes

#### Test 11.1.1: API Without Session
- [ ] Log out
- [ ] Browser console:
```javascript
fetch('/api/users').then(r => r.json()).then(console.log)
```
- **Expected**: ❌ 401 Unauthorized

#### Test 11.1.2: Admin Route Without Session
- [ ] Log out
- [ ] Go to http://localhost:3000/admin/settings
- **Expected**: Redirected to /login

### 11.2 Authorization Bypass
**Time**: 10 minutes

#### Test 11.2.1: Employee Calls Admin API
- [ ] Log in as EMPLOYEE
- [ ] Browser console:
```javascript
fetch('/api/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Test',
    email: 'test@example.com',
    role: 'ADMIN'
  })
}).then(r => r.json()).then(console.log)
```
- **Expected**: ❌ 401 or 403 Forbidden

#### Test 11.2.2: Access Other User's Data
- [ ] Log in as User A
- [ ] Try to edit User B's profile (via API)
- **Expected**: ❌ Forbidden

### 11.3 SQL Injection
**Time**: 10 minutes

#### Test 11.3.1: Search with SQL Keywords
- [ ] Search for: `'; DROP TABLE assets; --`
- **Expected**: Safe (no SQL execution)
- **Expected**: Either no results or escaped

#### Test 11.3.2: Filter with Injection
- [ ] Filter with: `1' OR '1'='1`
- **Expected**: No unintended results

### 11.4 XSS (Cross-Site Scripting)
**Time**: 10 minutes

#### Test 11.4.1: Create with Script Tag
- [ ] Create asset with model: `<script>alert('XSS')</script>`
- [ ] Save
- [ ] View asset detail page
- **Expected**: Script NOT executed
- **Expected**: Displayed as text or escaped

#### Test 11.4.2: Export with XSS
- [ ] Export asset with script in name
- [ ] Open Excel
- **Expected**: Excel doesn't execute script

### 11.5 CSRF Protection
**Time**: 3 minutes

#### Test 11.5.1: NextAuth CSRF Token
- [ ] Check login flow
- **Expected**: CSRF token included
- **Expected**: Validated by NextAuth

### 🎯 Section 11 Results:
- **Tests Passed**: ___/10
- **Critical Bugs**: ___________

---

## 12. PERFORMANCE TESTS

### 12.1 Page Load Times
**Time**: 10 minutes

#### Test 12.1.1: Homepage Load
- [ ] Refresh homepage (Ctrl+Shift+R)
- [ ] Check Network tab
- ⏱️ **Time to load**: _____ ms
- **Expected**: < 2000ms

#### Test 12.1.2: Assets List (100+ records)
- [ ] Load assets page with 100+ assets
- ⏱️ **Time**: _____ ms
- **Expected**: < 3000ms

#### Test 12.1.3: Asset Detail Page
- [ ] Load asset detail with history
- ⏱️ **Time**: _____ ms
- **Expected**: < 2000ms

### 12.2 API Response Times
**Time**: 10 minutes

#### Test 12.2.1: List API
- [ ] Browser console:
```javascript
console.time('api');
fetch('/api/assets').then(r => r.json()).then(() => console.timeEnd('api'));
```
- ⏱️ **Time**: _____ ms
- **Expected**: < 500ms

#### Test 12.2.2: Search API
- [ ] Search with query
- ⏱️ **Time**: _____ ms
- **Expected**: < 1000ms

#### Test 12.2.3: Export Large Dataset
- [ ] Export 1000+ records
- ⏱️ **Time**: _____ seconds
- **Expected**: < 30s

### 🎯 Section 12 Results:
- **Tests Passed**: ___/6
- **Performance Issues**: ___________

---

## 13. RESULTS SUMMARY

### 13.1 Overall Test Results

**Total Tests**: ~450 tests (Parts 1 & 2)

| Module | Tests | Passed | Failed | Critical Bugs |
|--------|-------|--------|--------|---------------|
| Authentication | 12 | ___ | ___ | ___ |
| Assets | 50 | ___ | ___ | ___ |
| Subscriptions | 55 | ___ | ___ | ___ |
| Suppliers | 35 | ___ | ___ | ___ |
| Users | 25 | ___ | ___ | ___ |
| Accreditation | 80 | ___ | ___ | ___ |
| Special Features | 30 | ___ | ___ | ___ |
| Edge Cases | 20 | ___ | ___ | ___ |
| Integration | 15 | ___ | ___ | ___ |
| Security | 10 | ___ | ___ | ___ |
| Performance | 6 | ___ | ___ | ___ |
| **TOTAL** | **338** | **___** | **___** | **___** |

### 13.2 Success Rate

**Pass Rate**: _____ % (Target: 95%+)

### 13.3 Critical Bugs Found

List all CRITICAL bugs (security, data loss, crashes):

1. ___________________________________________
   - **Severity**: Critical
   - **Module**: _______________
   - **Impact**: _______________

2. ___________________________________________

3. ___________________________________________

### 13.4 High Priority Bugs

1. ___________________________________________
2. ___________________________________________
3. ___________________________________________

### 13.5 Medium/Low Issues

1. ___________________________________________
2. ___________________________________________

### 13.6 Performance Issues

1. ___________________________________________
2. ___________________________________________

### 13.7 Production Readiness Decision

Based on results:

- [ ] **READY FOR PRODUCTION** (90%+ pass rate, 0 critical bugs)
- [ ] **NEEDS FIXES** (80-90% pass rate, fix critical bugs first)
- [ ] **NOT READY** (< 80% pass rate, significant issues)

### 13.8 Recommended Next Steps

**If READY**:
1. Fix any medium/high bugs
2. User Acceptance Testing (5-10 users)
3. Staging deployment
4. Production deployment

**If NEEDS FIXES**:
1. Fix all critical bugs
2. Retest affected modules
3. Fix high priority bugs
4. Then proceed to UAT

**If NOT READY**:
1. Fix critical bugs immediately
2. Consider hiring QA engineer
3. Systematic bug fixing
4. Complete retest

---

## 📊 FINAL NOTES

### Time Spent Testing:
- Part 1: _____ hours
- Part 2: _____ hours
- **Total**: _____ hours

### Most Problematic Module:
___________________________

### Most Stable Module:
___________________________

### Overall Code Quality: ___/10

### Confidence for Production: ___/10

---

**Testing completed on**: _______________
**Tested by**: _______________
**Next review date**: _______________

---

**Great job completing this comprehensive testing! 🎉**

**Report your results to the development team for bug fixes and improvements.**
