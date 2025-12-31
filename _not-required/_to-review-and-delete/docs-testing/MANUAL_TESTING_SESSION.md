# Manual Testing Session - DO THIS NOW (30 minutes)

## Setup (2 minutes)

1. Open your app: http://localhost:3000
2. Have these ready:
   - Admin account (your Azure AD account)
   - Employee test account email
   - This checklist open

---

## Test Session 1: Authentication & Roles (5 minutes)

### Test 1.1: Admin Login
- [ ] Go to http://localhost:3000
- [ ] Click login / sign in
- [ ] Log in with your Azure AD admin account
- [ ] **Expected:** Redirects to admin dashboard
- [ ] **Expected:** See all modules (Assets, Subscriptions, Suppliers, etc.)
- [ ] **If fails:** Note error message: ___________________

### Test 1.2: Admin Can Access Everything
- [ ] Click on "Assets" module
- [ ] **Expected:** See assets list page
- [ ] Click on "Subscriptions" module
- [ ] **Expected:** See subscriptions list page
- [ ] Click on "Accreditation" module
- [ ] **Expected:** See accreditation page
- [ ] **If any fails:** Note which module: ___________________

### Test 1.3: Check Current Data
- [ ] Go to Assets page
- [ ] **Current count:** _____ assets (should see 33)
- [ ] Go to Subscriptions page
- [ ] **Current count:** _____ subscriptions (should see 11)
- [ ] Go to Users page
- [ ] **Current count:** _____ users (should see 11)

**✅ If all pass, continue. ❌ If fails, tell me the error.**

---

## Test Session 2: Create Asset (8 minutes)

### Test 2.1: Create New Asset
- [ ] Go to Assets → "New Asset" button
- [ ] Fill in required fields:
  - **Model:** "TEST Laptop 2025"
  - **Type:** "Laptop"
  - **Asset Tag:** "TEST-001"
  - **Brand:** "Dell"
  - **Serial:** "SN123456"
- [ ] Click "Create Asset" or "Save"
- [ ] **Expected:** Success message appears
- [ ] **Expected:** Redirects to asset detail page
- [ ] **If fails:** Note error message: ___________________

### Test 2.2: Verify Asset Was Created
- [ ] Go back to Assets list page
- [ ] Search for "TEST Laptop 2025"
- [ ] **Expected:** You can find it
- [ ] Click on the asset
- [ ] **Expected:** Shows all details correctly
- [ ] **Actual Model shown:** ___________________
- [ ] **Actual Type shown:** ___________________

### Test 2.3: Edit the Asset
- [ ] Click "Edit" button on asset detail page
- [ ] Change **Model** to "TEST Laptop EDITED"
- [ ] Change **Status** to "SPARE"
- [ ] Click "Save" or "Update"
- [ ] **Expected:** Success message
- [ ] **Expected:** Changes are saved
- [ ] **If fails:** Note error: ___________________

### Test 2.4: Assign Asset to User
- [ ] On asset detail page or edit page
- [ ] Find "Assign to User" section
- [ ] Select a user from dropdown
- [ ] Click "Assign" or "Save"
- [ ] **Expected:** Asset shows as assigned to that user
- [ ] **If fails:** Note error: ___________________

### Test 2.5: Check Asset History
- [ ] On asset detail page
- [ ] Find "History" section or tab
- [ ] **Expected:** See history records:
  - [ ] CREATED action
  - [ ] UPDATED action (for edit)
  - [ ] ASSIGNED action (for assignment)
- [ ] **If no history shows:** ❌ BUG FOUND

**✅ If all pass, you have basic CRUD working!**

---

## Test Session 3: Create Subscription (5 minutes)

### Test 3.1: Create Subscription
- [ ] Go to Subscriptions → "New Subscription" button
- [ ] Fill required fields:
  - **Service Name:** "TEST Subscription"
  - **Billing Cycle:** "MONTHLY"
  - **Cost:** "100"
  - **Currency:** "QAR"
  - **Renewal Date:** (pick a date 30 days from now)
- [ ] Click "Create" or "Save"
- [ ] **Expected:** Success message
- [ ] **If fails:** Note error: ___________________

### Test 3.2: Verify Renewal Calculation
- [ ] Go to Subscriptions list
- [ ] Find your TEST subscription
- [ ] **Expected:** Shows renewal date you entered
- [ ] **Expected:** Shows "days until renewal"
- [ ] **Actual days shown:** _____ days
- [ ] **If wrong calculation:** ❌ BUG FOUND

**✅ Subscription CRUD works!**

---

## Test Session 4: Accreditation System (10 minutes)

### Test 4.1: Create Accreditation Project
- [ ] Go to Accreditation → Projects
- [ ] Click "New Project" or "Create Project"
- [ ] Fill in:
  - **Name:** "TEST Event 2025"
  - **Code:** "TEST2025"
  - **Bump In Start:** (today)
  - **Bump In End:** (today + 2 days)
  - **Live Start:** (today + 3 days)
  - **Live End:** (today + 5 days)
  - **Bump Out Start:** (today + 6 days)
  - **Bump Out End:** (today + 7 days)
  - **Access Groups:** ["VIP", "Staff", "Media"]
- [ ] Click "Create"
- [ ] **Expected:** Project created successfully
- [ ] **If fails:** Note error: ___________________

### Test 4.2: Create Accreditation Record
- [ ] Click on your TEST project
- [ ] Go to "Records" tab
- [ ] Click "New Record" or "Add Accreditation"
- [ ] Fill in:
  - **First Name:** "Test"
  - **Last Name:** "User"
  - **Organization:** "Test Org"
  - **Job Title:** "Tester"
  - **Access Group:** "VIP"
  - **QID Number:** "12345678901" (11 digits)
  - **QID Expiry:** (future date)
  - **Photo:** (upload a small image if possible, or skip)
- [ ] Set access permissions:
  - [ ] Check "Bump In Access"
  - [ ] Check "Live Access"
- [ ] Click "Save as Draft"
- [ ] **Expected:** Record created
- [ ] **If fails:** Note error: ___________________

### Test 4.3: Submit for Approval
- [ ] On the record detail page
- [ ] Click "Submit for Approval" button
- [ ] **Expected:** Status changes to "PENDING"
- [ ] **If fails:** Note error: ___________________

### Test 4.4: Approve Record
- [ ] Go to Approvals tab/page
- [ ] Find your pending record
- [ ] Click "Approve" button
- [ ] **Expected:** Status changes to "APPROVED"
- [ ] **Expected:** QR code appears/generates
- [ ] **If fails:** Note error: ___________________

### Test 4.5: Check QR Code
- [ ] On approved record detail page
- [ ] **Expected:** See QR code image
- [ ] **Expected:** See "Verify" or "View QR" button
- [ ] Click on QR code or verify link
- [ ] **Expected:** Opens verification page
- [ ] **If no QR code:** ❌ CRITICAL BUG

**✅ Accreditation workflow works!**

---

## Test Session 5: Permissions Check (5 minutes)

### Test 5.1: Try Accessing Admin Route (If you have employee account)
If you have access to an employee account, test this. Otherwise, skip.

- [ ] Log out from admin account
- [ ] Log in as EMPLOYEE account
- [ ] Try to go to: http://localhost:3000/admin/settings
- [ ] **Expected:** Redirected to /employee or /login
- [ ] **Expected:** Cannot access admin pages
- [ ] **If employee CAN access admin:** ❌ CRITICAL SECURITY BUG

### Test 5.2: Employee Can View Their Assets
- [ ] Logged in as employee
- [ ] Go to http://localhost:3000/employee/my-assets
- [ ] **Expected:** See only assets assigned to this employee
- [ ] **Expected:** Cannot edit or delete
- [ ] **If can edit/delete:** ❌ SECURITY BUG

**✅ Basic permissions work!**

---

## Test Session 6: Edge Cases (3 minutes)

### Test 6.1: Empty Fields
- [ ] Go to Assets → New Asset
- [ ] Leave Model field empty
- [ ] Try to submit
- [ ] **Expected:** Shows error "Model is required"
- [ ] **If submits with empty fields:** ❌ BUG FOUND

### Test 6.2: Invalid Date
- [ ] Try to create asset with warranty expiry in the past
- [ ] Or renewal date in the past
- [ ] **Expected:** Warning or validation error
- [ ] **If allows past dates without warning:** ⚠️ Minor issue

### Test 6.3: Large File Upload
- [ ] Try to upload a very large image (>10MB) to accreditation
- [ ] **Expected:** Error or warning about file size
- [ ] **If uploads huge file:** ⚠️ Performance issue

---

## Results Summary

### ✅ Tests Passed: _____ / 25

### ❌ Tests Failed: _____ / 25

### 🐛 Bugs Found:

1. ___________________________________________
   - **Severity:** Critical / High / Medium / Low
   - **Where:** _______________________________

2. ___________________________________________
   - **Severity:** Critical / High / Medium / Low
   - **Where:** _______________________________

3. ___________________________________________
   - **Severity:** Critical / High / Medium / Low
   - **Where:** _______________________________

---

## Next Steps Based on Results

### If 20+ tests passed (80%+):
✅ **Good to go!** Your app is working well.
- Fix any critical bugs found
- Do user acceptance testing with 2-3 real users
- Deploy to staging environment
- Then production

### If 15-19 tests passed (60-75%):
⚠️ **Needs some work**
- Tell me which tests failed
- I'll help you fix the critical issues
- Retest after fixes
- Then proceed to UAT

### If < 15 tests passed (< 60%):
❌ **Needs significant work**
- Don't deploy to production yet
- Share all failed tests with me
- We'll fix issues systematically
- Consider hiring QA engineer for thorough testing

---

## Report Your Results

Please tell me:
1. **How many tests passed?** _____ / 25
2. **Which tests failed?** (List the Test IDs, e.g., Test 2.1, Test 4.5)
3. **Any error messages?** (Copy-paste or screenshot)
4. **Critical bugs found?** (Security, data loss, crashes)

I'll help you fix any issues we find!

---

**Time check:** This should take about 30 minutes. If you're taking longer, that's fine - be thorough!

Good luck! 🚀
