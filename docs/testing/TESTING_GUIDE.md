# Production Testing Guide

## Overview
This guide outlines the professional testing process required before production deployment.

---

## Phase 1: Code Quality & Setup (Week 1)

### 1.1 Fix ESLint Issues
**Current Status:** 7 errors, 19 warnings found
- ✅ **Priority: HIGH** - Fix 7 ESLint errors
- ⚠️ **Priority: MEDIUM** - Review 19 warnings

**Action Items:**
```bash
npm run lint -- --fix  # Auto-fix what's possible
```

**Manual fixes needed:**
- scripts/backup/database.ts: Replace `require()` with ES6 imports
- scripts/backup/database.ts: Type the `any` parameters
- scripts/cron/*.ts: Add proper type annotations
- Remove unused variables

### 1.2 Enable TypeScript Strict Mode
**File:** `tsconfig.json`
```json
{
  "compilerOptions": {
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true
  }
}
```

### 1.3 Security Audit
✅ **Status:** No vulnerabilities found
- Re-run monthly: `npm audit`
- Check for outdated packages: `npm outdated`

---

## Phase 2: Unit Testing (Week 2-3)

### 2.1 Test Framework Setup
**Install dependencies:**
```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npm install -D @testing-library/user-event jest-environment-jsdom
npm install -D ts-jest @types/jest
```

### 2.2 Critical Functions to Test

#### Authentication & Authorization
- [ ] User login flow
- [ ] Role-based access (ADMIN, EMPLOYEE, VALIDATOR)
- [ ] Session management
- [ ] Middleware route protection

#### Assets Module
- [ ] Create asset with all fields
- [ ] Update asset (status changes, assignments)
- [ ] Asset history tracking
- [ ] Warranty expiry calculations
- [ ] Asset search and filtering
- [ ] Assignment to users

#### Subscriptions Module
- [ ] Create subscription
- [ ] Renewal date calculations
- [ ] Billing cycle logic (MONTHLY, YEARLY, ONE_TIME)
- [ ] Cost currency conversions
- [ ] Subscription cancellation/reactivation
- [ ] Auto-renewal logic

#### Accreditation Module (Most Complex)
- [ ] QR code generation and uniqueness
- [ ] Photo upload to Supabase
- [ ] Phase date validation (Bump In, Live, Bump Out)
- [ ] Access group permissions
- [ ] Status workflow (DRAFT → PENDING → APPROVED)
- [ ] QR code verification
- [ ] Revocation logic

#### Suppliers Module
- [ ] Supplier registration
- [ ] Approval workflow
- [ ] Engagement tracking
- [ ] Rating system

### 2.3 API Route Testing
Test all API endpoints:
```bash
# Test with Thunder Client or Postman
GET    /api/assets
POST   /api/assets
PUT    /api/assets/[id]
DELETE /api/assets/[id]
# ... repeat for all modules
```

**Key scenarios:**
- Valid requests with correct data
- Invalid requests (missing fields)
- Unauthorized access attempts
- Edge cases (empty strings, special characters)

---

## Phase 3: Integration Testing (Week 3-4)

### 3.1 Database Operations
- [ ] Test all Prisma queries
- [ ] Test transactions (create + history)
- [ ] Test cascade deletes
- [ ] Test data integrity constraints
- [ ] Test concurrent operations

### 3.2 File Upload Testing
- [ ] Supabase photo uploads
- [ ] File size limits
- [ ] File type validation
- [ ] Storage quota management
- [ ] Delete operations

### 3.3 External Services
- [ ] Azure AD authentication
- [ ] Email notifications (if implemented)
- [ ] QR code generation library
- [ ] Excel export/import operations

---

## Phase 4: End-to-End (E2E) Testing (Week 4-5)

### 4.1 Setup Playwright/Cypress
```bash
npm install -D @playwright/test
npx playwright install
```

### 4.2 Critical User Journeys

#### Admin Journey
1. Login as admin
2. Create a new asset
3. Assign asset to employee
4. View asset history
5. Generate reports
6. Export data

#### Employee Journey
1. Login as employee
2. View assigned assets
3. View all assets (read-only)
4. View subscriptions

#### Accreditation Journey
1. Create accreditation project
2. Add accreditation records
3. Upload photos
4. Submit for approval
5. Approve/reject records
6. Generate QR codes
7. Scan and verify QR codes

#### Validator Journey
1. Login as validator
2. Scan QR codes
3. Verify accreditation status
4. Check access permissions

### 4.3 Cross-Browser Testing
Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile browsers (iOS Safari, Chrome Android)

---

## Phase 5: Performance Testing (Week 5)

### 5.1 Load Testing
**Tools:** Artillery, k6, or Apache JMeter

**Scenarios:**
- 50 concurrent users browsing
- 20 simultaneous asset creations
- 100 QR code scans per minute
- Large data export (1000+ records)

**Metrics to track:**
- Response time < 2 seconds
- Server CPU/Memory usage
- Database query performance
- API rate limits

### 5.2 Database Optimization
```bash
# Check slow queries
npx prisma studio
# Add missing indexes if needed
```

**Review:**
- All foreign keys have indexes
- Search fields are indexed
- Pagination is implemented
- N+1 query problems

### 5.3 Frontend Performance
**Tools:** Lighthouse, WebPageTest

**Targets:**
- Performance score > 80
- First Contentful Paint < 1.5s
- Time to Interactive < 3.5s
- Cumulative Layout Shift < 0.1

---

## Phase 6: Security Testing (Week 6)

### 6.1 OWASP Top 10 Checks

#### SQL Injection
- [ ] Test all input fields with SQL injection attempts
- ✅ Using Prisma (protected by default)

#### XSS (Cross-Site Scripting)
- [ ] Test input fields with `<script>alert('XSS')</script>`
- [ ] Check if data is sanitized before display
- [ ] Review all `dangerouslySetInnerHTML` usage

#### Authentication Bypass
- [ ] Try accessing /admin routes without auth
- [ ] Test expired tokens
- [ ] Test role escalation attempts

#### Sensitive Data Exposure
- [ ] Check API responses don't expose passwords
- [ ] Verify error messages don't leak info
- [ ] Check file upload path traversal

#### Broken Access Control
- [ ] Employee trying to access admin routes
- [ ] User A accessing User B's data
- [ ] Test all permission checks

#### CSRF Protection
- [ ] Verify Next.js CSRF tokens
- [ ] Test state-changing operations

### 6.2 Penetration Testing
**Recommended:** Hire a security professional or use:
- OWASP ZAP (free)
- Burp Suite Community Edition

---

## Phase 7: User Acceptance Testing (UAT) (Week 6-7)

### 7.1 Stakeholder Testing
**Invite 5-10 actual users:**
- 2-3 admins
- 3-5 employees
- 1-2 validators

**Provide:**
- Test account credentials
- Test scenarios document
- Feedback form

### 7.2 Feedback Collection
**Key questions:**
- Is the UI intuitive?
- Are workflows logical?
- Any confusing features?
- Missing functionality?
- Performance issues?

### 7.3 Bug Tracking
**Setup:** Use GitHub Issues or Trello

**Categories:**
- Critical (breaks functionality)
- High (major feature broken)
- Medium (workaround exists)
- Low (cosmetic issues)

---

## Phase 8: Deployment Testing (Week 7-8)

### 8.1 Staging Environment
**Create separate Vercel project:**
```bash
vercel --scope your-team --name damp-staging
```

**Separate resources:**
- Staging database (Supabase staging project)
- Staging Azure AD app registration
- Staging Supabase storage bucket

### 8.2 Deployment Checklist
- [ ] Environment variables configured
- [ ] Database migrations run successfully
- [ ] Seed data loaded
- [ ] File uploads working
- [ ] Email notifications working
- [ ] SSL certificate valid
- [ ] Custom domain configured
- [ ] Monitoring/logging setup

### 8.3 Smoke Testing After Deployment
**Test immediately after deploy:**
- [ ] Homepage loads
- [ ] Login works
- [ ] Database connection works
- [ ] File uploads work
- [ ] All critical pages load

### 8.4 Rollback Plan
**Document:**
1. How to revert to previous version
2. Database backup/restore procedure
3. Downtime communication plan
4. Emergency contact list

---

## Phase 9: Monitoring Setup (Ongoing)

### 9.1 Error Tracking
**Recommended:** Sentry

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

### 9.2 Uptime Monitoring
**Free options:**
- UptimeRobot
- StatusCake
- Better Uptime

**Setup:** Ping `/api/health` every 5 minutes

### 9.3 Analytics
**Options:**
- Vercel Analytics (built-in)
- Google Analytics
- Plausible (privacy-focused)

### 9.4 Database Monitoring
- Supabase dashboard monitoring
- Query performance tracking
- Storage usage alerts
- Connection pool monitoring

---

## Testing Metrics & Success Criteria

### Code Coverage Target: 70%+
```bash
npm run test:coverage
```

### Performance Targets
- API response time: < 500ms (p95)
- Page load time: < 2s
- Time to interactive: < 3s
- Lighthouse score: > 80

### Quality Gates
- ✅ Zero critical security vulnerabilities
- ✅ Zero ESLint errors
- ✅ All TypeScript type checks pass
- ✅ All E2E tests pass
- ✅ All unit tests pass
- ✅ UAT sign-off received

---

## Testing Timeline Summary

| Week | Phase | Effort | Who |
|------|-------|--------|-----|
| 1 | Code Quality & Setup | 20-30h | Developer |
| 2-3 | Unit Testing | 40-60h | Developer + QA |
| 3-4 | Integration Testing | 30-40h | Developer + QA |
| 4-5 | E2E Testing | 40-50h | QA |
| 5 | Performance Testing | 20-30h | QA/DevOps |
| 6 | Security Testing | 30-40h | Security Expert |
| 6-7 | UAT | 20-30h | Stakeholders |
| 7-8 | Deployment Testing | 15-20h | DevOps |

**Total Estimated Effort:** 215-300 hours (6-8 weeks)

---

## Cost Estimates (Qatar Market)

### Option 1: Hire QA Engineer
- **Freelance QA (Qatar):** QAR 150-200/hour
- **Total:** QAR 32,000-60,000 ($8,800-16,500)
- **Duration:** 6-8 weeks

### Option 2: QA Agency
- **Small Agency:** QAR 40,000-70,000 (fixed)
- **Mid-size:** QAR 70,000-100,000 (fixed)
- **Includes:** Full testing suite + report

### Option 3: Outsource to India
- **QA Engineer:** QAR 50-80/hour
- **Total:** QAR 10,000-24,000 ($2,750-6,600)
- **Duration:** 6-8 weeks

### Option 4: DIY with Tools
- **Testing tools:** QAR 200-500/month
- **Your time:** 100-150 hours
- **Total:** QAR 1,000-2,000 + your time

---

## Recommended Approach for You

### Phase 1 (Do Yourself - Week 1-2)
1. Fix all ESLint errors
2. Enable TypeScript strict mode
3. Write unit tests for critical functions
4. Set up Playwright for E2E tests

### Phase 2 (Consider Hiring - Week 3-5)
1. Hire QA engineer (freelance) for:
   - E2E test coverage
   - Security testing
   - Performance testing
   - **Cost:** QAR 15,000-25,000

### Phase 3 (Stakeholders - Week 6-7)
1. UAT with real users
2. Bug fixing based on feedback

### Phase 4 (DevOps - Week 8)
1. Staging deployment
2. Production deployment
3. Monitoring setup

---

## Critical Bugs to Look For (Based on Your Code)

### 1. Accreditation Module
- QR token uniqueness conflicts
- Photo upload failures
- Date validation edge cases
- Phase overlap issues
- Revocation not working properly

### 2. Currency Conversions
- QAR/USD conversion rate hardcoded (3.64)
- Missing null checks on prices
- Decimal precision issues

### 3. Middleware
- Localhost bypass in production
- Session expiry handling
- Role check bypasses

### 4. Data Integrity
- Orphaned records after deletions
- Missing cascade rules
- Transaction rollback failures

### 5. File Uploads
- Storage quota exceeded
- Large file handling
- Supabase connection errors

---

## Next Steps

1. **Immediate:** Review this document with your team
2. **This Week:** Fix ESLint errors and enable strict TypeScript
3. **Next Week:** Start writing unit tests for critical functions
4. **Week 3:** Decide if hiring QA engineer or doing yourself
5. **Week 4:** Begin E2E testing
6. **Week 6:** Start UAT with real users
7. **Week 8:** Production deployment

---

## Resources & Tools

### Testing Frameworks
- Jest: https://jestjs.io/
- Playwright: https://playwright.dev/
- React Testing Library: https://testing-library.com/

### Security Tools
- OWASP ZAP: https://www.zaproxy.org/
- Snyk: https://snyk.io/ (dependency scanning)

### Performance Tools
- Lighthouse: https://developers.google.com/web/tools/lighthouse
- WebPageTest: https://www.webpagetest.org/

### Monitoring
- Sentry: https://sentry.io/
- UptimeRobot: https://uptimerobot.com/

---

## Questions to Ask Yourself

- [ ] Can the system handle 100 concurrent users?
- [ ] What happens if Supabase goes down?
- [ ] What happens if a user uploads a 50MB photo?
- [ ] Can an employee access admin functions?
- [ ] What if two admins edit the same record simultaneously?
- [ ] Is there a backup if the database crashes?
- [ ] Can you restore data from yesterday?
- [ ] Are all error messages user-friendly?
- [ ] Is there a way to track who made what changes?
- [ ] Can you export all data if needed?

---

**Remember:** Testing is not a one-time activity. It's an ongoing process that continues even after production deployment.

Good luck! 🚀
