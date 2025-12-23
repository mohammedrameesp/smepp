# Production Testing Checklist

## ⚡ Quick Start (Do This First)

### Immediate Actions (Today)
- [ ] Fix 7 ESLint errors: `npm run lint`
- [ ] Review and fix 19 warnings
- [ ] Search codebase for `console.log` and remove/comment out
- [ ] Search for `TODO` comments and document what needs doing
- [ ] Check for hardcoded credentials (`.env` only!)

### This Week
- [ ] Enable TypeScript strict mode in `tsconfig.json`
- [ ] Run build and fix type errors: `npm run build`
- [ ] Test all features manually as admin user
- [ ] Test all features manually as employee user
- [ ] Test all features manually as validator user

---

## 🔴 Critical Tests (Must Pass Before Production)

### Authentication & Security
- [ ] Login with Azure AD works
- [ ] Logout works and clears session
- [ ] Admin can access `/admin/*` routes
- [ ] Employee CANNOT access `/admin/*` routes
- [ ] Validator can only access `/validator` route
- [ ] Expired sessions redirect to login
- [ ] Middleware protects all sensitive routes

### Data Integrity
- [ ] Creating a record saves to database
- [ ] Updating a record actually updates
- [ ] Deleting a record works (or soft delete)
- [ ] Related records are handled properly (cascade/restrict)
- [ ] History tracking works for all changes

### File Operations
- [ ] Photo upload to Supabase works
- [ ] Photos are accessible after upload
- [ ] QR codes generate correctly
- [ ] QR codes can be scanned and verified
- [ ] Excel export works
- [ ] Excel import works

---

## 🟡 Important Tests (Should Pass)

### Assets Module
- [ ] Create asset with all required fields
- [ ] Edit asset and verify changes saved
- [ ] Assign asset to user
- [ ] View asset history shows assignment
- [ ] Filter assets by status
- [ ] Search assets by name/tag
- [ ] Export assets to Excel
- [ ] Import assets from Excel
- [ ] Warranty expiry calculation correct

### Subscriptions Module
- [ ] Create subscription
- [ ] Edit subscription
- [ ] Calculate next renewal date correctly
- [ ] Monthly billing cycle works
- [ ] Yearly billing cycle works
- [ ] One-time payment works
- [ ] Cancel subscription
- [ ] Reactivate subscription
- [ ] Currency conversion QAR/USD
- [ ] Filter by renewal date

### Accreditation Module
- [ ] Create project with phases
- [ ] Add accreditation record
- [ ] Upload photo (< 5MB)
- [ ] Submit for approval
- [ ] Approve record
- [ ] Reject record
- [ ] Generate QR code
- [ ] Verify QR code as validator
- [ ] Check phase validity (Bump In, Live, Bump Out)
- [ ] Revoke accreditation
- [ ] Scan history tracking

### Suppliers Module
- [ ] Public registration works
- [ ] Admin can view pending suppliers
- [ ] Admin can approve supplier
- [ ] Admin can reject supplier
- [ ] Supplier code auto-generates on approval
- [ ] Add engagement note
- [ ] Rate supplier (1-5 stars)
- [ ] Filter suppliers by status

### Users Module
- [ ] View all users
- [ ] View user details
- [ ] Edit user role (ADMIN/EMPLOYEE/VALIDATOR)
- [ ] Mark user as temporary staff
- [ ] Soft delete user
- [ ] View deleted users
- [ ] Export users to Excel

---

## 🟢 Nice to Have Tests

### UI/UX
- [ ] Mobile responsive (test on phone)
- [ ] All buttons have hover states
- [ ] Loading states show while fetching data
- [ ] Error messages are clear and helpful
- [ ] Success messages show after actions
- [ ] Forms validate before submission
- [ ] Required fields marked with *

### Performance
- [ ] Pages load in < 3 seconds
- [ ] Large tables paginate (not loading 1000+ rows)
- [ ] Images are optimized (not 10MB photos)
- [ ] No console errors in browser
- [ ] No memory leaks (use Chrome DevTools)

### Edge Cases
- [ ] What if user uploads 50MB photo?
- [ ] What if user enters special characters?
- [ ] What if user enters SQL injection attempt?
- [ ] What if database is slow/down?
- [ ] What if two users edit same record?
- [ ] What if date is set to year 2099?
- [ ] What if cost is negative?
- [ ] What if email is invalid format?

---

## 🧪 Browser Testing

### Desktop Browsers
- [ ] Chrome (latest) - primary browser
- [ ] Firefox (latest)
- [ ] Edge (latest)
- [ ] Safari (latest) - if on Mac

### Mobile Browsers
- [ ] Chrome Mobile (Android)
- [ ] Safari Mobile (iOS)
- [ ] Test portrait and landscape modes

### Test these features on mobile:
- [ ] Login
- [ ] View lists (assets, subscriptions)
- [ ] View details page
- [ ] QR code scanning (validator)
- [ ] Photo upload (accreditation)

---

## 🔒 Security Checklist

### Authentication
- [ ] Sessions expire after inactivity
- [ ] Can't access pages after logout
- [ ] Can't bypass login by guessing URLs
- [ ] Password/tokens not visible in browser
- [ ] No sensitive data in localStorage

### Authorization
- [ ] Role checks on every protected route
- [ ] API routes check authentication
- [ ] Can't edit other users' data
- [ ] Can't delete without permission
- [ ] Middleware catches unauthorized access

### Data Protection
- [ ] No SQL injection possible (using Prisma)
- [ ] Input sanitized before saving
- [ ] Output escaped before displaying
- [ ] File uploads restricted by type/size
- [ ] No path traversal in file uploads

### Environment
- [ ] .env file not committed to git
- [ ] Production uses different secrets than dev
- [ ] Database credentials secure
- [ ] Azure AD secrets not exposed
- [ ] Supabase keys are service role (not anon)

---

## 📊 Database Tests

### Data Operations
- [ ] Create record in each table
- [ ] Update record in each table
- [ ] Delete record in each table
- [ ] Relationships work (user → assets)
- [ ] Cascade deletes work properly
- [ ] Unique constraints enforced

### Database Backup
- [ ] Can create full backup
- [ ] Can restore from backup
- [ ] Backup includes all data
- [ ] Backup downloads successfully

### Migrations
- [ ] `npx prisma migrate deploy` works
- [ ] Database schema matches Prisma schema
- [ ] No pending migrations
- [ ] Rollback plan documented

---

## 🚀 Deployment Checklist

### Pre-Deployment
- [ ] All tests pass
- [ ] No ESLint errors
- [ ] No TypeScript errors
- [ ] Build succeeds: `npm run build`
- [ ] Staging environment tested
- [ ] UAT sign-off received

### Environment Variables (Vercel)
- [ ] DATABASE_URL set
- [ ] DIRECT_URL set
- [ ] NEXTAUTH_URL set
- [ ] NEXTAUTH_SECRET set (generate new!)
- [ ] AZURE_AD_CLIENT_ID set
- [ ] AZURE_AD_CLIENT_SECRET set
- [ ] AZURE_AD_TENANT_ID set
- [ ] NEXT_PUBLIC_SUPABASE_URL set
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY set
- [ ] SUPABASE_SERVICE_ROLE_KEY set
- [ ] ADMIN_EMAILS set

### Post-Deployment
- [ ] Homepage loads
- [ ] Login works
- [ ] Database connected
- [ ] File uploads work
- [ ] All modules accessible
- [ ] No errors in Vercel logs
- [ ] SSL certificate valid
- [ ] Custom domain working (if applicable)

### Monitoring
- [ ] Error tracking setup (Sentry)
- [ ] Uptime monitoring active
- [ ] Analytics configured
- [ ] Log alerts configured
- [ ] Backup schedule automated

---

## 🐛 Known Issues to Test

Based on your codebase, these are areas that might have bugs:

### High Risk Areas
1. **Currency Conversion** (hardcoded 3.64 rate)
   - [ ] Test with different currencies
   - [ ] Test with null prices
   - [ ] Test decimal precision

2. **Date Calculations** (renewal dates, phases)
   - [ ] Test monthly renewal
   - [ ] Test yearly renewal
   - [ ] Test phase overlaps
   - [ ] Test timezone issues

3. **QR Code Generation**
   - [ ] Test uniqueness (no duplicates)
   - [ ] Test token length
   - [ ] Test special characters
   - [ ] Test QR image generation

4. **Middleware** (localhost bypass)
   - [ ] Ensure localhost bypass disabled in production
   - [ ] Test all role checks
   - [ ] Test session validation

5. **File Uploads**
   - [ ] Test large files (>10MB)
   - [ ] Test invalid file types
   - [ ] Test Supabase quota limits
   - [ ] Test upload failures

---

## 📝 Test Scenarios (User Stories)

### Admin: Create and Assign an Asset
1. Login as admin
2. Go to Assets → New Asset
3. Fill all required fields
4. Upload invoice (if applicable)
5. Assign to employee
6. Verify employee can see it in "My Assets"
7. Verify history shows assignment
8. Verify activity log shows action

### Employee: View Assigned Items
1. Login as employee
2. Go to "My Assets"
3. Verify only assigned assets visible
4. Click on an asset
5. Verify can view details
6. Verify CANNOT edit or delete
7. Go to "My Subscriptions"
8. Verify only assigned subscriptions visible

### Accreditation: Full Workflow
1. Admin creates project with phases
2. Admin adds accreditation record
3. Upload photo
4. Fill identification (QID or Passport)
5. Set access permissions (Bump In, Live, Bump Out)
6. Submit for approval
7. Admin approves
8. QR code generates
9. Validator scans QR code
10. Verify shows correct access permissions
11. Verify scan history recorded

### Supplier: Registration to Approval
1. Supplier visits public registration page
2. Fill company details
3. Submit registration
4. Admin receives notification (check manually)
5. Admin goes to Suppliers → Pending
6. Admin reviews supplier
7. Admin approves
8. Verify supplier code auto-generated (SUPP-XXXX)
9. Admin adds engagement note
10. Admin rates supplier

---

## 🎯 Success Criteria

### Before Production Launch
- [ ] 100% of critical tests pass
- [ ] 90%+ of important tests pass
- [ ] 70%+ of nice-to-have tests pass
- [ ] Zero critical security issues
- [ ] Zero data loss bugs
- [ ] Performance acceptable (< 3s load)
- [ ] At least 5 users tested in UAT
- [ ] Rollback plan documented
- [ ] Monitoring and alerts active

### Production Metrics to Monitor
- Uptime target: 99.5%+
- Error rate: < 1%
- Response time: < 2s (p95)
- Zero critical bugs in first week
- User satisfaction > 80%

---

## 📞 Get Help

### When You Need a Professional QA
Signs you should hire help:
- You don't have time (100+ hours needed)
- Security testing beyond your expertise
- Need automated test suite
- Performance/load testing required
- Compliance requirements (ISO, SOC2, etc.)

### Where to Find QA Engineers in Qatar
- LinkedIn (search "QA Engineer Qatar")
- Upwork/Freelancer (remote QA from India)
- Local agencies (Doha-based)
- Tech communities (Qatar Tech Hub)

### Budget
- **DIY:** Free (your time + tools)
- **Freelancer (India):** QAR 10,000-20,000
- **Freelancer (Qatar):** QAR 30,000-50,000
- **Agency:** QAR 50,000-100,000

---

## ✅ Daily Testing Routine

Before committing code:
1. Run `npm run lint`
2. Run `npm run build`
3. Test the feature you just built
4. Test related features (might have broken)
5. Check browser console for errors
6. Test on mobile view

Before deploying:
1. Full smoke test (20 minutes)
2. Check Vercel build logs
3. Test staging environment
4. Monitor error logs for 30 minutes

---

## 🚨 Emergency Contacts

Document these before production:
- [ ] Database admin contact
- [ ] Vercel/hosting support
- [ ] Azure AD admin
- [ ] Supabase support
- [ ] Your backup person
- [ ] Escalation contact

---

**Start with the "Immediate Actions" section above and work your way down. Don't skip the critical tests!**

Good luck! 🎉
