# 🔬 COMPREHENSIVE TESTING MANUAL
## Asset Management System - Complete Test Coverage

**Version**: 1.0
**Last Updated**: 2025-01-06
**Estimated Time**: 8-12 hours (can be split across multiple sessions)

---

## 📋 TABLE OF CONTENTS

1. [Pre-Testing Setup](#1-pre-testing-setup)
2. [Authentication & Authorization](#2-authentication--authorization)
3. [Assets Module](#3-assets-module)
4. [Subscriptions Module](#4-subscriptions-module)
5. [Suppliers Module](#5-suppliers-module)
6. [Users Module](#6-users-module)
7. [Accreditation Module](#7-accreditation-module)
8. [Special Features](#8-special-features)
9. [Edge Cases & Error Handling](#9-edge-cases--error-handling)
10. [Integration Tests](#10-integration-tests)
11. [Security Tests](#11-security-tests)
12. [Performance Tests](#12-performance-tests)
13. [Results Summary](#13-results-summary)

---

## 1. PRE-TESTING SETUP

### 1.1 Environment Check
- [ ] Development server running: `npm run dev`
- [ ] Database connected (check console for errors)
- [ ] Access to http://localhost:3000
- [ ] Admin account ready (your Azure AD)
- [ ] Employee test account (if available)
- [ ] Browser console open (F12)
- [ ] Network tab open for monitoring API calls
- [ ] This checklist ready for notes

### 1.2 Create Test Data Backup
```bash
# Before testing, backup your current data
npx tsx scripts/backup/full-backup.ts create
```

### 1.3 Testing Tips
- ✅ Check BOTH box when test passes
- ❌ Check box + note error when test fails
- ⚠️ Check box + note warning for minor issues
- 📝 Write error messages exactly as shown
- 📸 Screenshot critical bugs
- ⏱️ Note performance issues (slow loading)

---

## 2. AUTHENTICATION & AUTHORIZATION

### 2.1 Login & Session Management
**Time**: 10 minutes

#### Test 2.1.1: Admin Login
- [ ] Go to http://localhost:3000
- [ ] Should redirect to login page
- [ ] Click "Sign In" or "Login"
- [ ] Log in with Azure AD admin account
- **Expected**: Redirects to admin dashboard
- **Expected**: URL is http://localhost:3000 (or /admin)
- **Expected**: See navigation with all modules
- **If fails**: Error message: ___________________

#### Test 2.1.2: Logout
- [ ] Click logout button/link
- **Expected**: Redirects to login page
- **Expected**: Cannot access /admin directly
- **If fails**: Note issue: ___________________

#### Test 2.1.3: Session Persistence
- [ ] Log in as admin
- [ ] Refresh page (F5)
- **Expected**: Still logged in
- **Expected**: Session maintained
- [ ] Close browser
- [ ] Reopen and go to http://localhost:3000
- **Expected**: Redirected to login (session expired)
- **If fails**: Note issue: ___________________

### 2.2 Role-Based Access Control
**Time**: 15 minutes

#### Test 2.2.1: Admin Access (Full)
- [ ] Log in as ADMIN
- [ ] Go to /admin/assets
- **Expected**: Can access ✅
- [ ] Go to /admin/subscriptions
- **Expected**: Can access ✅
- [ ] Go to /admin/suppliers
- **Expected**: Can access ✅
- [ ] Go to /admin/users
- **Expected**: Can access ✅
- [ ] Go to /admin/accreditation
- **Expected**: Can access ✅
- [ ] Go to /admin/settings
- **Expected**: Can access ✅
- [ ] Go to /admin/activity
- **Expected**: Can access ✅
- [ ] Go to /admin/reports
- **Expected**: Can access ✅

#### Test 2.2.2: Employee Access (If you have employee account)
- [ ] Log out from admin
- [ ] Log in as EMPLOYEE
- [ ] Try to go to http://localhost:3000/admin/settings
- **Expected**: ❌ Redirected to /login or /employee
- **Expected**: ❌ Cannot access admin pages
- [ ] Go to /employee
- **Expected**: Can access employee dashboard ✅
- [ ] Go to /employee/my-assets
- **Expected**: Can access ✅
- [ ] Go to /employee/assets
- **Expected**: Can access (read-only) ✅
- **If employee CAN access /admin**: ❌❌ CRITICAL SECURITY BUG

#### Test 2.2.3: Validator Access (If you have validator account)
- [ ] Log in as VALIDATOR
- [ ] Try to go to /admin
- **Expected**: ❌ Redirected
- [ ] Try to go to /employee
- **Expected**: ❌ Redirected to /validator
- [ ] Go to /validator
- **Expected**: Can access ✅
- [ ] Try to scan QR code
- **Expected**: Can verify accreditations ✅
- **If validator CAN access other pages**: ❌ SECURITY BUG

#### Test 2.2.4: Middleware Security Headers
- [ ] Open browser DevTools → Network tab
- [ ] Reload any page
- [ ] Click on the main document request
- [ ] Go to "Headers" → "Response Headers"
- **Expected**: See X-Frame-Options: DENY
- **Expected**: See X-Content-Type-Options: nosniff
- **Expected**: See Referrer-Policy: origin-when-cross-origin
- **If missing**: ⚠️ Security headers missing

#### Test 2.2.5: API Authentication
- [ ] Open browser console
- [ ] Paste and run:
```javascript
fetch('/api/users').then(r => r.json()).then(console.log)
```
- [ ] While logged in as admin
- **Expected**: Returns data
- [ ] Log out
- [ ] Run same command
- **Expected**: 401 Unauthorized error
- **If returns data after logout**: ❌ CRITICAL SECURITY BUG

### 🎯 Section 2 Results:
- **Tests Passed**: ___/12
- **Critical Bugs**: ___________

---

## 3. ASSETS MODULE

### 3.1 Create Asset
**Time**: 15 minutes

#### Test 3.1.1: Create with Required Fields Only
- [ ] Go to Assets → "New Asset" button
- [ ] Fill ONLY:
  - **Type**: "Laptop"
  - **Model**: "TEST Dell XPS 15"
- [ ] Click "Create" or "Save"
- **Expected**: Success message
- **Expected**: Asset created
- **Expected**: Auto-generates Asset Tag
- **Expected**: Status defaults to "IN_USE"
- **Expected**: Currency defaults to "QAR"
- **Actual Asset Tag**: _______________
- **If fails**: Error: ___________________

#### Test 3.1.2: Create with All Fields
- [ ] Click "New Asset" again
- [ ] Fill ALL fields:
  - **Asset Tag**: "LAPTOP-TEST-001"
  - **Type**: "Laptop"
  - **Category**: "IT"
  - **Brand**: "Dell"
  - **Model**: "XPS 15 9530"
  - **Serial**: "SN123456789"
  - **Configuration**: "i7, 32GB RAM, 1TB SSD"
  - **Purchase Date**: (pick past date)
  - **Warranty Expiry**: (pick future date)
  - **Supplier**: "Dell Direct"
  - **Invoice Number**: "INV-2024-001"
  - **Price**: "15000"
  - **Currency**: "QAR"
  - **Status**: "IN_USE"
  - **Acquisition Type**: "NEW_PURCHASE"
  - **Location**: "Head Office - IT Room"
  - **Notes**: "For testing purposes"
- [ ] Click "Create"
- **Expected**: Success message
- **Expected**: All fields saved correctly
- **If fails**: Error: ___________________

#### Test 3.1.3: Create with USD Price
- [ ] Create new asset
- [ ] Set **Price**: "5000"
- [ ] Set **Currency**: "USD"
- [ ] Save
- **Expected**: Converts to QAR (5000 × 3.64 = 18200)
- **Actual QAR Value**: _______________
- **If wrong conversion**: ❌ BUG - Currency conversion broken

#### Test 3.1.4: Duplicate Asset Tag
- [ ] Try to create asset with Asset Tag: "LAPTOP-TEST-001" (same as Test 3.1.2)
- **Expected**: ❌ Error: "Asset tag already exists" or similar
- **If allows duplicate**: ❌ CRITICAL BUG - Uniqueness constraint broken

#### Test 3.1.5: Create with Assignment
- [ ] Create new asset
- [ ] In "Assign to User" dropdown, select a user
- [ ] Set **Assignment Date**: (pick date)
- [ ] Save
- **Expected**: Asset created AND assigned
- **Expected**: History shows ASSIGNED action
- **If fails**: Error: ___________________

#### Test 3.1.6: Invalid Status Enum
- [ ] Open browser console
- [ ] Paste:
```javascript
fetch('/api/assets', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'Test', model: 'Test', status: 'INVALID_STATUS' })
}).then(r => r.json()).then(console.log)
```
- **Expected**: ❌ Validation error
- **If accepts invalid status**: ❌ BUG

### 3.2 Read/View Assets
**Time**: 10 minutes

#### Test 3.2.1: View Assets List
- [ ] Go to Assets page
- **Expected**: See list of assets
- **Expected**: Shows asset tag, model, brand, status
- **Expected**: Pagination controls visible (if > 20 assets)
- **Actual asset count**: _____ assets

#### Test 3.2.2: View Single Asset
- [ ] Click on any asset
- **Expected**: Opens asset detail page
- **Expected**: Shows all fields
- **Expected**: Shows assigned user (if any)
- **Expected**: Shows history tab/section

#### Test 3.2.3: Search Assets
- [ ] In assets list, use search box
- [ ] Search for "TEST"
- **Expected**: Filters assets with "TEST" in any field
- **Actual results**: _____ assets found
- [ ] Search for non-existent asset
- **Expected**: Shows "No assets found" or empty state

#### Test 3.2.4: Filter by Status
- [ ] Use status filter dropdown
- [ ] Select "IN_USE"
- **Expected**: Shows only IN_USE assets
- [ ] Select "SPARE"
- **Expected**: Shows only SPARE assets
- [ ] Select "All"
- **Expected**: Shows all statuses

#### Test 3.2.5: Pagination
- [ ] If you have > 20 assets:
  - [ ] Go to page 2
  - **Expected**: Shows different assets
  - [ ] Go to page 1
  - **Expected**: Shows first assets again
- [ ] Change page size (if available)
  - [ ] Set to 10 per page
  - **Expected**: Shows 10 assets
  - [ ] Set to 100 per page
  - **Expected**: Shows up to 100

#### Test 3.2.6: Sort Assets
- [ ] Click "Model" column header
- **Expected**: Sorts by model (A-Z)
- [ ] Click again
- **Expected**: Reverse sort (Z-A)
- [ ] Try sorting by Brand, Type, Date

### 3.3 Update Asset
**Time**: 15 minutes

#### Test 3.3.1: Update Basic Fields
- [ ] Click Edit on an asset
- [ ] Change **Model** to "EDITED Model Name"
- [ ] Change **Brand** to "EDITED Brand"
- [ ] Click "Save" or "Update"
- **Expected**: Success message
- **Expected**: Changes saved
- [ ] Verify on detail page
- **If fails**: Error: ___________________

#### Test 3.3.2: Change Status with Auto-Unassign
- [ ] Edit an asset that IS assigned to a user
- [ ] Change **Status** from "IN_USE" to "REPAIR"
- [ ] Save
- **Expected**: Status changed to REPAIR
- **Expected**: User automatically unassigned
- **Expected**: History shows STATUS_CHANGED
- **Expected**: History shows UNASSIGNED
- **If user still assigned**: ❌ BUG - Auto-unassign not working

#### Test 3.3.3: Change Location
- [ ] Edit asset
- [ ] Change **Location** to "New Location - Room 123"
- [ ] Save
- **Expected**: Location updated
- [ ] Check History
- **Expected**: History shows LOCATION_CHANGED with old/new values
- **If no history**: ⚠️ History tracking broken

#### Test 3.3.4: Change Currency
- [ ] Edit asset with QAR price
- [ ] Change **Currency** from "QAR" to "USD"
- [ ] Save
- **Expected**: Price recalculated (QAR / 3.64 = USD)
- **Example**: 18200 QAR → 5000 USD
- **If wrong**: ❌ BUG - Currency conversion broken

#### Test 3.3.5: Duplicate Asset Tag on Update
- [ ] Edit asset
- [ ] Change **Asset Tag** to one that already exists
- [ ] Save
- **Expected**: ❌ Error about duplicate
- **If allows duplicate**: ❌ CRITICAL BUG

#### Test 3.3.6: Update Non-Existent Asset
- [ ] Open browser console
- [ ] Paste:
```javascript
fetch('/api/assets/nonexistent-id-12345', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'Test', model: 'Test' })
}).then(r => r.json()).then(console.log)
```
- **Expected**: 404 Not Found error
- **If returns 200**: ❌ BUG

### 3.4 Delete Asset
**Time**: 5 minutes

#### Test 3.4.1: Delete Asset
- [ ] Create a test asset (for deletion)
- [ ] Click "Delete" button
- [ ] Confirm deletion
- **Expected**: Success message
- **Expected**: Asset removed from list
- [ ] Try to access asset by direct URL
- **Expected**: 404 or "Not found"

#### Test 3.4.2: Cascade Delete (History)
- [ ] Create asset with assignment (so it has history)
- [ ] Delete the asset
- [ ] Try to view history in database or via API
- **Expected**: History also deleted (cascade)

### 3.5 Asset Assignment
**Time**: 10 minutes

#### Test 3.5.1: Assign Asset to User
- [ ] Go to asset detail page
- [ ] Click "Assign" or edit assignment
- [ ] Select a user from dropdown
- [ ] Set assignment date (today)
- [ ] Save
- **Expected**: Asset assigned to user
- **Expected**: History shows ASSIGNED action
- **Expected**: User can see it in "My Assets"

#### Test 3.5.2: Reassign Asset
- [ ] Assign asset to User A
- [ ] Then reassign to User B
- **Expected**: Now assigned to User B
- **Expected**: History shows UNASSIGNED (from A)
- **Expected**: History shows ASSIGNED (to B)
- **Expected**: User A no longer sees it
- **Expected**: User B sees it

#### Test 3.5.3: Unassign Asset
- [ ] Assign asset to a user
- [ ] Then unassign (set to "Unassigned" or null)
- **Expected**: Asset unassigned
- **Expected**: History shows UNASSIGNED
- **Expected**: User no longer sees in "My Assets"

#### Test 3.5.4: Assign to Non-Existent User
- [ ] Via browser console:
```javascript
fetch('/api/assets/[asset-id]/assign', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ userId: 'nonexistent-user-id' })
}).then(r => r.json()).then(console.log)
```
- **Expected**: ❌ 404 or validation error
- **If succeeds**: ❌ BUG

### 3.6 Asset Clone
**Time**: 3 minutes

#### Test 3.6.1: Clone Asset
- [ ] Go to asset detail page
- [ ] Click "Clone" or "Duplicate" button
- **Expected**: New asset created with same details
- **Expected**: Asset Tag is NEW (not duplicated)
- **Expected**: Original asset unchanged
- **Actual cloned tag**: _______________

### 3.7 Asset Import
**Time**: 20 minutes

#### Test 3.7.1: Download Import Template
- [ ] Go to Assets → Import
- [ ] Download template
- **Expected**: Excel file downloads
- **Expected**: Has headers: Type, Model, Asset Tag, Brand, etc.

#### Test 3.7.2: Import Valid CSV
- [ ] Create CSV file with:
```
Type,Model,Asset Tag,Brand,Status,Price,Currency
Laptop,Import Test 1,IMP-001,Dell,IN_USE,1000,QAR
Mouse,Import Test 2,IMP-002,Logitech,SPARE,50,QAR
```
- [ ] Upload file
- **Expected**: Success message "2 assets imported"
- **Expected**: Assets appear in list
- [ ] Verify IMP-001 and IMP-002 exist
- **If fails**: Error: ___________________

#### Test 3.7.3: Import Valid Excel
- [ ] Create Excel file (.xlsx) with same data as above
- [ ] Upload
- **Expected**: Imports successfully
- **Expected**: Works same as CSV

#### Test 3.7.4: Import with Duplicate Asset Tag
- [ ] Create CSV with asset tag that already exists
- [ ] Upload
- **Expected**: Error message or skips duplicate row
- **Expected**: Shows which rows failed
- **If imports duplicate**: ❌ BUG

#### Test 3.7.5: Import with Invalid Status
- [ ] Create CSV:
```
Type,Model,Status
Laptop,Test,INVALID_STATUS_HERE
```
- [ ] Upload
- **Expected**: ❌ Error for invalid status
- **Expected**: Row skipped or rejected
- **If imports invalid data**: ❌ BUG

#### Test 3.7.6: Import with Missing Required Field
- [ ] Create CSV without "Type" column
- [ ] Upload
- **Expected**: ❌ Error: "Type is required"
- **If imports**: ❌ BUG

#### Test 3.7.7: Import Large File (>10MB)
- [ ] Create CSV with 50,000+ rows (make it >10MB)
- [ ] Upload
- **Expected**: ❌ Error: "File too large" (before processing)
- **If processes**: ⚠️ No size limit enforced

#### Test 3.7.8: Import with USD Currency
- [ ] Create CSV:
```
Type,Model,Price,Currency
Laptop,USD Test,5000,USD
```
- [ ] Upload
- **Expected**: Converts to QAR (5000 × 3.64 = 18200)
- **If not converted**: ❌ BUG

#### Test 3.7.9: Import Wrong File Type
- [ ] Try to upload .txt or .pdf file
- **Expected**: ❌ Error: "Invalid file type"
- **If accepts**: ⚠️ File validation missing

### 3.8 Asset Export
**Time**: 10 minutes

#### Test 3.8.1: Export All Assets
- [ ] Go to Assets page
- [ ] Click "Export" button
- **Expected**: Excel file downloads
- **Filename**: assets_export_YYYY-MM-DD.xlsx
- [ ] Open in Excel
- **Expected**: All assets present
- **Expected**: All columns present
- **Expected**: Dates formatted as dd/mm/yyyy
- **Expected**: Assigned user names included

#### Test 3.8.2: Verify Export Data
- [ ] Pick 3 random assets from export
- [ ] Compare to app (detail pages)
- **Expected**: All data matches exactly
- **If mismatch**: ❌ BUG in export

#### Test 3.8.3: Export Empty Dataset
- [ ] Delete all test assets (or filter to empty)
- [ ] Export
- **Expected**: Excel with headers only (no data rows)
- **If fails**: ⚠️ Export broken for empty data

### 3.9 Asset History
**Time**: 5 minutes

#### Test 3.9.1: View Asset History
- [ ] Go to asset that has been edited/assigned
- [ ] Find "History" tab or section
- **Expected**: Shows all actions:
  - [ ] CREATED
  - [ ] ASSIGNED
  - [ ] STATUS_CHANGED
  - [ ] LOCATION_CHANGED
  - [ ] UPDATED
- **Expected**: Shows old and new values
- **Expected**: Shows who performed action
- **Expected**: Shows timestamps
- **If no history**: ❌ History tracking broken

#### Test 3.9.2: History Chronological Order
- [ ] Check history list
- **Expected**: Most recent first (descending)
- **If wrong order**: ⚠️ Sorting issue

### 3.10 Asset Types & Locations
**Time**: 3 minutes

#### Test 3.10.1: Get Asset Types
- [ ] Create assets with types: "Laptop", "Mouse", "Monitor"
- [ ] Check if there's a "Type" filter dropdown
- **Expected**: Shows distinct types from database
- **Expected**: No duplicates

#### Test 3.10.2: Get Locations
- [ ] Similar test for locations
- **Expected**: Shows distinct locations

### 🎯 Section 3 Results:
- **Tests Passed**: ___/50
- **Critical Bugs**: ___________

---

## 4. SUBSCRIPTIONS MODULE

### 4.1 Create Subscription
**Time**: 15 minutes

#### Test 4.1.1: Create with Required Fields
- [ ] Go to Subscriptions → "New Subscription"
- [ ] Fill:
  - **Service Name**: "TEST Adobe Creative Cloud"
  - **Billing Cycle**: "MONTHLY"
  - **Usage Type**: "OFFICE"
- [ ] Save
- **Expected**: Success
- **Expected**: Status defaults to ACTIVE
- **Expected**: Auto Renew defaults to true
- **Expected**: Currency defaults to QAR

#### Test 4.1.2: Create with All Fields
- [ ] Create new subscription
- [ ] Fill ALL fields:
  - **Service Name**: "TEST Microsoft 365 Business"
  - **Category**: "Productivity Software"
  - **Account ID**: "admin@company.com"
  - **Billing Cycle**: "YEARLY"
  - **Usage Type**: "OFFICE"
  - **Purchase Date**: (past date)
  - **Renewal Date**: (30 days from now)
  - **Cost**: "1200"
  - **Currency**: "QAR"
  - **Vendor**: "Microsoft"
  - **Payment Method**: "Credit Card"
  - **Auto Renew**: Yes
  - **Notes**: "Company-wide license"
- [ ] Save
- **Expected**: All fields saved

#### Test 4.1.3: Create with USD Cost
- [ ] Create subscription
- [ ] Set **Cost**: "500"
- [ ] Set **Currency**: "USD"
- [ ] Save
- **Expected**: Converts to QAR (500 × 3.64 = 1820)
- **Actual QAR**: _______________

#### Test 4.1.4: Create with User Assignment
- [ ] Create subscription
- [ ] Assign to a user
- [ ] Set **Assignment Date**: (past date)
- [ ] Save
- **Expected**: Subscription created and assigned
- **Expected**: History shows CREATED + assignment info

#### Test 4.1.5: Validation - Purchase Date > Renewal Date
- [ ] Create subscription
- [ ] Set **Purchase Date**: 2024-12-01
- [ ] Set **Renewal Date**: 2024-11-01 (before purchase)
- [ ] Save
- **Expected**: ❌ Error: "Renewal date must be after purchase date"
- **If allows**: ❌ BUG

#### Test 4.1.6: Validation - Assignment without Date
- [ ] Create subscription
- [ ] Assign to user
- [ ] Leave **Assignment Date** empty
- [ ] Save
- **Expected**: ❌ Error: "Assignment date required when assigning user"
- **If allows**: ❌ BUG

#### Test 4.1.7: Validation - Future Assignment Date
- [ ] Create subscription
- [ ] Assign to user
- [ ] Set **Assignment Date**: (tomorrow)
- [ ] Save
- **Expected**: ❌ Error: "Assignment date cannot be in future"
- **If allows**: ⚠️ Business logic issue

#### Test 4.1.8: Invalid Billing Cycle
- [ ] Browser console:
```javascript
fetch('/api/subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    serviceName: 'Test',
    billingCycle: 'INVALID_CYCLE',
    usageType: 'OFFICE'
  })
}).then(r => r.json()).then(console.log)
```
- **Expected**: ❌ Validation error

### 4.2 Read/View Subscriptions
**Time**: 10 minutes

#### Test 4.2.1: List All Subscriptions
- [ ] Go to Subscriptions page
- **Expected**: See list of subscriptions
- **Expected**: Shows service name, cost, renewal date
- **Actual count**: _____ subscriptions

#### Test 4.2.2: View Single Subscription
- [ ] Click on a subscription
- **Expected**: Shows all details
- **Expected**: Shows assigned user
- **Expected**: Shows history

#### Test 4.2.3: Search Subscriptions
- [ ] Search for "TEST"
- **Expected**: Filters subscriptions
- [ ] Search by account ID
- **Expected**: Filters correctly

#### Test 4.2.4: Filter by Billing Cycle
- [ ] Filter "MONTHLY"
- **Expected**: Shows only monthly subscriptions
- [ ] Filter "YEARLY"
- **Expected**: Shows only yearly

#### Test 4.2.5: Filter by Renewal Window
- [ ] Filter "Expiring in 30 days"
- **Expected**: Shows subscriptions renewing within 30 days
- **Expected**: Calculated from today
- [ ] Filter "Expiring in 7 days"
- **Expected**: Shows more urgent renewals

#### Test 4.2.6: Pagination & Sorting
- [ ] Test pagination (if > 20 subscriptions)
- [ ] Sort by renewal date
- **Expected**: Earliest first (or latest first)
- [ ] Sort by cost
- **Expected**: Ascending/descending

### 4.3 Update Subscription
**Time**: 10 minutes

#### Test 4.3.1: Update Basic Fields
- [ ] Edit subscription
- [ ] Change service name
- [ ] Change cost
- [ ] Save
- **Expected**: Changes saved

#### Test 4.3.2: Change Currency
- [ ] Edit subscription with QAR cost
- [ ] Change currency to USD
- [ ] Save
- **Expected**: Cost recalculated
- **If wrong**: ❌ BUG

#### Test 4.3.3: Reassign User
- [ ] Edit subscription assigned to User A
- [ ] Assign to User B
- [ ] Save
- **Expected**: Now assigned to User B
- **Expected**: History shows REASSIGNED

#### Test 4.3.4: Update Renewal Date
- [ ] Edit subscription
- [ ] Change renewal date to next month
- [ ] Save
- **Expected**: Renewal date updated
- **Expected**: "Days until renewal" recalculated

### 4.4 Delete Subscription
**Time**: 3 minutes

#### Test 4.4.1: Delete Subscription
- [ ] Create test subscription
- [ ] Delete it
- **Expected**: Success
- **Expected**: Removed from list
- **Expected**: History also deleted (cascade)

### 4.5 Subscription Lifecycle
**Time**: 15 minutes

#### Test 4.5.1: Cancel Subscription
- [ ] Create ACTIVE subscription
- [ ] Click "Cancel" button
- [ ] Set **Cancellation Date**: (today)
- [ ] Add **Notes**: "No longer needed"
- [ ] Confirm
- **Expected**: Status → CANCELLED
- **Expected**: Sets cancelledAt
- **Expected**: Stores lastActiveRenewalDate
- **Expected**: History shows CANCELLED with notes

#### Test 4.5.2: Cancel with Custom Date
- [ ] Cancel another subscription
- [ ] Set cancellation date to past date
- [ ] Confirm
- **Expected**: Uses provided date
- **Expected**: Stored in history

#### Test 4.5.3: Cancel Validation - Date Too Old
- [ ] Try to cancel with date before 2000-01-01
- **Expected**: ❌ Error: "Invalid date"

#### Test 4.5.4: Cancel Validation - Date Too Far Future
- [ ] Try to cancel with date > 1 year in future
- **Expected**: ❌ Error: "Date too far in future"

#### Test 4.5.5: Reactivate Subscription
- [ ] Cancel a subscription first
- [ ] Click "Reactivate" button
- [ ] Set **Renewal Date**: (30 days from now)
- [ ] Set **Reactivation Date**: (today)
- [ ] Add **Notes**: "Service needed again"
- [ ] Confirm
- **Expected**: Status → ACTIVE
- **Expected**: Sets reactivatedAt
- **Expected**: Updates renewalDate
- **Expected**: History shows REACTIVATED

#### Test 4.5.6: Reactivate Validation - No Renewal Date
- [ ] Try to reactivate without renewal date
- **Expected**: ❌ Error: "Renewal date required"

#### Test 4.5.7: Reactivate Validation - Invalid Dates
- [ ] Try to reactivate with renewalDate before 2000
- **Expected**: ❌ Error
- [ ] Try reactivationDate > renewalDate
- **Expected**: ❌ Error
- [ ] Try renewalDate > 10 years future
- **Expected**: ❌ Error

#### Test 4.5.8: Reactivate Already Active
- [ ] Try to reactivate an ACTIVE subscription
- **Expected**: Error or ignored
- **If breaks**: ❌ BUG

### 4.6 Subscription Import
**Time**: 25 minutes

#### Test 4.6.1: Download Template
- [ ] Go to Subscriptions → Import
- [ ] Download template
- **Expected**: Excel with 2 sheets:
  1. Subscriptions (main)
  2. Subscription History (optional)

#### Test 4.6.2: Import Simple CSV
- [ ] Create CSV:
```
Service Name,Billing Cycle
TEST Import Sub 1,MONTHLY
TEST Import Sub 2,YEARLY
```
- [ ] Upload
- **Expected**: 2 subscriptions imported
- **Expected**: Defaults applied (status: ACTIVE, etc.)

#### Test 4.6.3: Import Excel with All Fields
- [ ] Create Excel with columns:
  - Service Name, Category, Account ID, Billing Cycle, Usage Type, Purchase Date, Renewal Date, Cost, Currency, Vendor, Status, Auto Renew, Payment Method, Notes
- [ ] Add 5 rows with various data
- [ ] Upload
- **Expected**: All imported successfully
- **Expected**: All fields preserved

#### Test 4.6.4: Import with History Sheet
- [ ] Create Excel:
  - Sheet 1: Subscriptions (3 subscriptions)
  - Sheet 2: Subscription History (5 history entries)
- [ ] Upload
- **Expected**: Subscriptions imported
- **Expected**: History mapped to new subscription IDs
- **Expected**: History timestamps preserved
- [ ] Check subscription detail pages
- **Expected**: History entries visible

#### Test 4.6.5: Import with Invalid Billing Cycle
- [ ] CSV with billingCycle: "INVALID"
- [ ] Upload
- **Expected**: ❌ Error for that row
- **Expected**: Row skipped
- **Expected**: Summary shows 1 failed

#### Test 4.6.6: Import with Non-Existent User
- [ ] CSV with Assigned User: "nonexistent@example.com"
- [ ] Upload
- **Expected**: Subscription imported BUT not assigned
- **Expected**: Warning in summary
- **If fails entirely**: ⚠️ Too strict validation

#### Test 4.6.7: Import with Date Formats
- [ ] Test dates in CSV:
  - 01/12/2024 (dd/mm/yyyy)
  - 2024-12-01 (yyyy-mm-dd)
  - 1/12/2024 (d/m/yyyy)
- [ ] Upload
- **Expected**: All date formats parsed correctly
- **If parsing fails**: ❌ BUG - Date parsing broken

#### Test 4.6.8: Import with Currency Conversion
- [ ] CSV with Cost: 500, Currency: USD
- [ ] Upload
- **Expected**: costQAR calculated (500 × 3.64)
- **If not**: ❌ BUG

#### Test 4.6.9: Import Large File
- [ ] Create CSV with 500 rows
- [ ] Upload
- **Expected**: All imported (may take time)
- **Expected**: Shows progress or completion
- ⏱️ **Time taken**: _____ seconds
- **If times out**: ⚠️ Performance issue

#### Test 4.6.10: Import File Too Large
- [ ] Create file > 10MB
- [ ] Upload
- **Expected**: ❌ Error before upload completes
- **If processes**: ⚠️ Size limit not enforced

### 4.7 Subscription Export
**Time**: 10 minutes

#### Test 4.7.1: Export All Subscriptions
- [ ] Click Export button
- **Expected**: Excel file with 2 sheets:
  1. Subscriptions
  2. Subscription History
- [ ] Open in Excel
- **Expected**: All subscriptions present
- **Expected**: All fields present
- **Expected**: History sheet populated

#### Test 4.7.2: Verify Export Accuracy
- [ ] Pick 3 subscriptions from export
- [ ] Compare to app
- **Expected**: Exact match
- [ ] Check history entries
- **Expected**: Match app history

#### Test 4.7.3: Export Date Format
- [ ] Check dates in Excel
- **Expected**: Format dd/mm/yyyy
- **Expected**: Excel recognizes as dates
- **If text**: ⚠️ Format issue

### 4.8 Subscription Renewal Calculations
**Time**: 5 minutes

#### Test 4.8.1: Monthly Renewal Calculation
- [ ] Create subscription with:
  - Billing Cycle: MONTHLY
  - Renewal Date: Today
- [ ] Check "Days until renewal"
- **Expected**: Shows 0 days (or "Today")
- [ ] Create with renewal date 15 days from now
- **Expected**: Shows 15 days

#### Test 4.8.2: Yearly Renewal Calculation
- [ ] Create with:
  - Billing Cycle: YEARLY
  - Renewal Date: 60 days from now
- **Expected**: Shows 60 days
- **Expected**: In filter "Expiring in 90 days", this appears
- **Expected**: NOT in "Expiring in 30 days"

#### Test 4.8.3: One-Time Payment
- [ ] Create with Billing Cycle: ONE_TIME
- **Expected**: No renewal date required
- **Expected**: Not shown in "Upcoming renewals"

### 🎯 Section 4 Results:
- **Tests Passed**: ___/55
- **Critical Bugs**: ___________

---

## 5. SUPPLIERS MODULE

### 5.1 Public Supplier Registration
**Time**: 15 minutes

#### Test 5.1.1: Register with Required Fields
- [ ] **LOG OUT** from admin (test as public)
- [ ] Go to http://localhost:3000/suppliers/register
- **Expected**: Page loads without authentication
- [ ] Fill ONLY:
  - **Supplier Name**: "TEST Supplier Ltd"
  - **Category**: "IT Equipment"
- [ ] Submit
- **Expected**: Success message
- **Expected**: Status: PENDING
- **Expected**: suppCode: null
- **If requires login**: ❌ BUG - Should be public

#### Test 5.1.2: Register with All Fields
- [ ] Register new supplier
- [ ] Fill ALL fields:
  - Supplier Name, Category, Address, City, Country
  - Website, Establishment Year
  - Primary Contact (Name, Title, Email, Mobile)
  - Secondary Contact (Name, Title, Email, Mobile)
  - Payment Terms
  - Additional Info (portfolio, certifications)
- [ ] Submit
- **Expected**: All fields saved

#### Test 5.1.3: Validation - Invalid Email
- [ ] Try to register with email: "invalid-email"
- **Expected**: ❌ Error: "Invalid email format"

#### Test 5.1.4: Validation - Invalid Website
- [ ] Try with website: "not-a-url"
- **Expected**: ❌ Error: "Invalid URL format"
- [ ] Try with valid format: "https://example.com"
- **Expected**: ✅ Accepts

#### Test 5.1.5: Validation - Establishment Year
- [ ] Try year: 1799 (before 1800)
- **Expected**: ❌ Error
- [ ] Try year: 2100 (future)
- **Expected**: ❌ Error
- [ ] Try year: 2000
- **Expected**: ✅ Accepts

#### Test 5.1.6: Rate Limiting
- [ ] Submit registration form 101 times rapidly
  - *Tip*: Use browser console script or tool
- **After 100 requests**:
  **Expected**: 101st request gets 429 Too Many Requests
- **If no limit**: ⚠️ Rate limiting not working

### 5.2 Supplier Management (Admin)
**Time**: 15 minutes

#### Test 5.2.1: View All Suppliers (Admin)
- [ ] Log back in as ADMIN
- [ ] Go to Suppliers page
- **Expected**: See ALL suppliers (PENDING, APPROVED, REJECTED)
- [ ] Filter by status: PENDING
- **Expected**: Shows only pending
- [ ] Filter by status: APPROVED
- **Expected**: Shows only approved

#### Test 5.2.2: View Suppliers (Employee)
- [ ] Log in as EMPLOYEE
- [ ] Go to Suppliers page
- **Expected**: See only APPROVED suppliers
- **Expected**: Cannot see PENDING or REJECTED
- **If sees pending**: ❌ BUG - Employee should only see approved

#### Test 5.2.3: Search Suppliers
- [ ] Search by name: "TEST"
- **Expected**: Filters results
- [ ] Search by category
- **Expected**: Filters by category

#### Test 5.2.4: View Supplier Detail
- [ ] Click on a supplier
- **Expected**: Shows all details
- **Expected**: Shows approval info (if approved)
- **Expected**: Shows engagement count

### 5.3 Supplier Approval Workflow
**Time**: 15 minutes

#### Test 5.3.1: Approve Pending Supplier
- [ ] Find a PENDING supplier
- [ ] Click "Approve" button
- [ ] Confirm
- **Expected**: Status → APPROVED
- **Expected**: suppCode generated (format: SUPP-XXXX)
- **Example suppCode**: _______________
- **Expected**: approvedAt timestamp set
- **Expected**: approvedBy set to your user
- **Expected**: Activity logged

#### Test 5.3.2: Verify suppCode Uniqueness
- [ ] Approve 3 different suppliers
- **Expected**: Each gets unique suppCode
- **Example codes**: SUPP-0001, SUPP-0002, SUPP-0003
- **If duplicates**: ❌ CRITICAL BUG

#### Test 5.3.3: Approve Already Approved
- [ ] Try to approve an already APPROVED supplier
- **Expected**: ❌ Error: "Already approved" or disabled button
- **If allows**: ⚠️ Idempotency issue

#### Test 5.3.4: Reject Pending Supplier
- [ ] Find PENDING supplier
- [ ] Click "Reject" button
- [ ] Enter **Rejection Reason**: "Incomplete information"
- [ ] Confirm
- **Expected**: Status → REJECTED
- **Expected**: rejectionReason stored
- **Expected**: Activity logged

#### Test 5.3.5: Reject without Reason
- [ ] Try to reject without entering reason
- **Expected**: ❌ Error: "Rejection reason required"

#### Test 5.3.6: Reject Already Rejected
- [ ] Try to reject a REJECTED supplier
- **Expected**: ❌ Error or disabled button

#### Test 5.3.7: Approve Rejected Supplier
- [ ] Try to approve a REJECTED supplier (without re-submitting)
- **Expected**: ❌ Error: "Must be PENDING to approve"
- **If allows**: ❌ BUG - Workflow broken

### 5.4 Supplier Engagements
**Time**: 10 minutes

#### Test 5.4.1: Add Engagement
- [ ] Go to supplier detail page
- [ ] Click "Add Engagement" or similar
- [ ] Fill:
  - **Date**: (past date)
  - **Notes**: "Initial consultation completed"
  - **Rating**: 5 stars
- [ ] Save
- **Expected**: Engagement created
- **Expected**: Shows in engagement list

#### Test 5.4.2: Add Engagement without Rating
- [ ] Add engagement
- [ ] Leave rating empty
- [ ] Fill date and notes
- [ ] Save
- **Expected**: Saved successfully (rating optional)

#### Test 5.4.3: Validation - Invalid Rating
- [ ] Browser console:
```javascript
fetch('/api/suppliers/[supplier-id]/engagements', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date: '2024-01-01',
    notes: 'Test',
    rating: 6  // Invalid (max 5)
  })
}).then(r => r.json()).then(console.log)
```
- **Expected**: ❌ Error: "Rating must be 1-5"

#### Test 5.4.4: Validation - Missing Notes
- [ ] Try to save engagement without notes
- **Expected**: ❌ Error: "Notes required"

#### Test 5.4.5: View All Engagements
- [ ] Add 3 engagements
- [ ] View engagement list on supplier page
- **Expected**: Shows all engagements
- **Expected**: Most recent first
- **Expected**: Shows date, notes, rating, created by

### 5.5 Supplier CRUD
**Time**: 10 minutes

#### Test 5.5.1: Update Supplier
- [ ] Edit supplier details
- [ ] Change name, category, contact info
- [ ] Save
- **Expected**: Changes saved

#### Test 5.5.2: Validation on Update
- [ ] Try to update with invalid email
- **Expected**: ❌ Error (same validation as registration)

#### Test 5.5.3: Delete Supplier
- [ ] Create test supplier
- [ ] Approve it
- [ ] Add engagement
- [ ] Delete supplier
- **Expected**: Supplier deleted
- **Expected**: Engagements also deleted (cascade)

### 5.6 Supplier Export
**Time**: 5 minutes

#### Test 5.6.1: Export Suppliers
- [ ] Click Export button
- **Expected**: Excel file downloads
- [ ] Open file
- **Expected**: All suppliers included
- **Expected**: Columns: Name, Code, Category, Status, Contacts, etc.

#### Test 5.6.2: Verify Export Accuracy
- [ ] Compare 3 suppliers in export vs app
- **Expected**: Exact match

### 🎯 Section 5 Results:
- **Tests Passed**: ___/35
- **Critical Bugs**: ___________

---

*Due to character limits, I'll create Part 2 with the remaining sections...*

### Continue to COMPREHENSIVE_TESTING_MANUAL_PART2.md for:
- Users Module (Section 6)
- Accreditation Module (Section 7)
- Special Features (Section 8)
- Edge Cases (Section 9)
- Integration Tests (Section 10)
- Security Tests (Section 11)
- Performance Tests (Section 12)
- Results Summary (Section 13)

**Total Tests in Part 1**: ~200 tests
**Estimated Time**: 4-6 hours
