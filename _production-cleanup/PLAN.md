# Production Cleanup & Refactoring Plan

## Overview

This plan outlines a systematic approach to clean and refactor the SME++ (Durj) codebase before going to production.

**Optimized Structure**: 7 phases instead of 16, with parallel processing to avoid reading files multiple times.

---

## Quick Reference - Optimized Phases

### Restructured for Efficiency

**Old Approach (Inefficient)**: Review files → Then document → Then test → Read same files 3x

**New Approach (Efficient)**: Review each file ONCE and do everything in parallel

---

### Phase Structure

| Phase | Name | Description | Est. Effort |
|-------|------|-------------|-------------|
| **PREP** | | | |
| 1 | Setup & Cleanup | Delete temp files, move scripts, create tracking files | 1-2 hours |
| 2 | Consolidate Duplicates | Merge duplicate code (ask before each) | 2-4 hours |
| **CORE (Per-File)** | | | |
| 3 | Deep File Review | Review each file ONCE doing ALL tasks in parallel | 4-6 days |
| **INFRASTRUCTURE** | | | |
| 4 | DevOps & CI/CD | Health checks, logging, pre-commit hooks | 2-4 hours |
| 5 | E2E Tests | Full user journey tests (need full system) | 1-2 days |
| **FINALIZE** | | | |
| 6 | Final Validation | Build, test, verify everything works | 2-4 hours |
| 7 | Generate Reports | HTML report, final documentation | 2-4 hours |

**Total Estimated Effort**: 6-10 days (reduced from 8-15 days)

---

### Phase 3: Deep File Review (The Core Phase)

**Key Insight**: When reviewing a file, do EVERYTHING at once:

```
For EACH file in the codebase:
├── 1. READ the file once
├── 2. IN PARALLEL, do all of these:
│   ├── ✏️  Add JSDoc header comment
│   ├── 📜 Document business rules found → BUSINESS_RULES.md
│   ├── 🧪 Check/create unit test → tests/unit/
│   ├── 🔒 Check security issues → REVIEW_FINDINGS.md
│   ├── ⚡ Check performance issues → REVIEW_FINDINGS.md
│   ├── 🐛 Note bugs/issues → REVIEW_FINDINGS.md
│   ├── 🔧 Refactor if needed (ask first)
│   └── 📝 Log changes → REFACTORING_LOG.md
├── 3. If complex work needed → Add to BACKLOG.md
└── 4. Move to next file
```

---

### Per-File Checklist (Comprehensive Review)

When reviewing each file, complete this FULL checklist:

```markdown
## File: [path/to/file.ts]
**Reviewed**: [Date] | **Time Spent**: [X min]

---

### 1. DOCUMENTATION
- [ ] JSDoc header added
- [ ] Business rules documented → BUSINESS_RULES.md
- [ ] Complex logic commented inline
- [ ] Function parameters documented

### 2. UNIT TESTING
- [ ] Unit test exists? Location: ___
- [ ] If no test, created one? Location: ___
- [ ] Main functions covered?
- [ ] Edge cases covered?
- [ ] Error cases covered?

### 3. E2E TEST OPPORTUNITIES (Document for Phase 5)
- [ ] User flow identified? Describe: ___
- [ ] Critical path? Yes/No
- [ ] Added to E2E_TEST_PLAN.md? Yes/No

Example entries:
- "Leave request → approval → balance update flow"
- "Asset assignment with notification"

### 4. CODE QUALITY
- [ ] Console.logs removed
- [ ] Unused imports removed
- [ ] Dead code removed
- [ ] TypeScript types correct
- [ ] Error handling proper
- [ ] Naming clear and consistent

### 5. SECURITY REVIEW
- [ ] Input validation present?
- [ ] No hardcoded secrets?
- [ ] Auth/authz checks in place?
- [ ] SQL injection safe? (Prisma)
- [ ] XSS safe?
- [ ] Tenant isolation enforced?

### 6. PERFORMANCE REVIEW
- [ ] No N+1 queries?
- [ ] Proper field selection (select/include)?
- [ ] No unnecessary loops?
- [ ] No blocking operations?
- [ ] Caching opportunities?

### 7. BUGS FOUND 🐛
| Bug | Severity | Line | Description | Fix Now? |
|-----|----------|------|-------------|----------|
| | Critical/High/Medium/Low | | | Yes/Backlog |

### 8. MISSING LOGIC / GAPS 🕳️
| Gap | Description | Should Be | Priority |
|-----|-------------|-----------|----------|
| | What's missing | Expected behavior | P0-P3 |

### 9. IMPROVEMENT OPPORTUNITIES 💡
| Type | Description | Benefit | Effort |
|------|-------------|---------|--------|
| Refactor | | | |
| Performance | | | |
| UX | | | |
| Security | | | |

### 10. FEATURE SUGGESTIONS 🚀
| Feature | Description | Value | Effort |
|---------|-------------|-------|--------|
| | What could be added | Business value | Est. time |

### 11. TECH DEBT 📋
| Item | Description | Why It Matters | Priority |
|------|-------------|----------------|----------|
| | Current state | Impact | P0-P3 |

### 12. ACTIONS TAKEN ✅
- [ ] JSDoc added
- [ ] Refactored: ___
- [ ] Unit test created: ___
- [ ] Bugs fixed: ___
- [ ] Added to BACKLOG.md: ___
- [ ] Added to E2E_TEST_PLAN.md: ___

### 13. DECISION POINTS (Asked User)
| Question | Options | Decision | Reason |
|----------|---------|----------|--------|
| | A/B/C | | |
```

---

### Output Files Updated Per File

| File | What Gets Added |
|------|-----------------|
| `docs/BUSINESS_RULES.md` | Business rules discovered |
| `docs/REVIEW_FINDINGS.md` | Bugs, security issues, gaps |
| `docs/E2E_TEST_PLAN.md` | E2E test opportunities identified (created in Phase 3, executed in Phase 5) |
| `BACKLOG.md` | Items needing more effort |
| `REFACTORING_LOG.md` | Changes made |
| `DECISIONS.md` | Decisions made with user |
| `tests/unit/[module]/` | Unit tests created |

---

### Categories of Findings

During review, categorize everything you find:

```
FINDINGS
├── 🐛 BUGS (Fix now or backlog)
│   ├── Critical: Fix immediately
│   ├── High: Fix in this phase
│   ├── Medium: Add to backlog P1
│   └── Low: Add to backlog P2
│
├── 🕳️ MISSING LOGIC
│   ├── Validation missing
│   ├── Error handling missing
│   ├── Edge case not handled
│   └── Business rule not enforced
│
├── 💡 IMPROVEMENTS
│   ├── Code quality (refactor, simplify)
│   ├── Performance (optimize, cache)
│   ├── Security (harden, validate)
│   └── UX (better errors, feedback)
│
├── 🚀 FEATURE IDEAS
│   ├── User requested (from feedback)
│   ├── Nice to have
│   └── Future consideration
│
├── 📋 TECH DEBT
│   ├── Outdated patterns
│   ├── Duplicate code
│   ├── Missing tests
│   └── Poor naming
│
└── 🧪 E2E TEST OPPORTUNITIES
    ├── Critical user flows
    ├── Happy path scenarios
    ├── Error scenarios
    └── Edge cases
```

---

### File Processing Order (Optimized)

Process files in dependency order to avoid rework:

```
ROUND 1: Core Libraries (no dependencies)
├── src/lib/validations/*.ts      → Validation schemas
├── src/lib/core/*.ts             → Core utilities
├── src/lib/security/*.ts         → Security utilities
└── src/lib/utils/*.ts            → General utilities

ROUND 2: Domain Logic (depends on core)
├── src/lib/domains/hr/*.ts       → HR business logic
├── src/lib/domains/operations/*.ts → Operations logic
├── src/lib/domains/projects/*.ts → Projects logic
└── src/lib/domains/system/*.ts   → System logic

ROUND 3: API Routes (depends on domain logic)
├── src/app/api/auth/*.ts         → Auth endpoints
├── src/app/api/leave/*.ts        → Leave endpoints
├── src/app/api/payroll/*.ts      → Payroll endpoints
├── src/app/api/assets/*.ts       → Assets endpoints
└── src/app/api/**/*.ts           → All other endpoints

ROUND 4: Components (depends on utilities)
├── src/components/ui/*.tsx       → UI primitives
├── src/components/domains/*.tsx  → Domain components
└── src/components/**/*.tsx       → All other components

ROUND 5: Pages (depends on components)
└── src/app/**/*.tsx              → All pages
```

---

### Parallel Output Files

As you process each file, update these simultaneously:

| File | What to Add |
|------|-------------|
| `docs/BUSINESS_RULES.md` | Every business rule discovered |
| `docs/REVIEW_FINDINGS.md` | Bugs, issues, security concerns |
| `REFACTORING_LOG.md` | Changes made to the file |
| `BACKLOG.md` | Items needing more effort |
| `tests/unit/[module]/` | Unit tests created |

---

### Example: Processing One File

```markdown
## Processing: src/lib/domains/hr/leave/leave-utils.ts

### 1. Read & Understand (2 min)
- File purpose: Leave calculation utilities
- 869 lines, 15 functions

### 2. Add JSDoc Header (1 min)
/**
 * @file leave-utils.ts
 * @description Leave calculation utilities including balance, accrual, overlap detection
 * @module hr/leave
 */

### 3. Document Business Rules Found (5 min)
Added to BUSINESS_RULES.md:
- LEAVE-001: Cannot request more days than balance
- LEAVE-002: Overlapping dates not allowed
- LEAVE-003: Half-day must specify AM/PM
- LEAVE-004: Probation restricts some leave types
- LEAVE-005: Weekend exclusion is configurable

### 4. Check/Create Unit Tests (10 min)
- tests/unit/lib/leave-utils.test.ts exists? YES
- Coverage: 60% → Added 3 more test cases
- New tests: calculateLeaveDays edge cases

### 5. Security Check (1 min)
- ✅ No SQL injection risk (uses Prisma)
- ✅ No hardcoded secrets

### 6. Performance Check (2 min)
- ⚠️ Line 234: findMany without select → Added to REVIEW_FINDINGS.md

### 7. Code Quality (2 min)
- Removed 2 console.logs
- Fixed 1 unused import

### 8. Log Changes (1 min)
Added to REFACTORING_LOG.md:
- Added JSDoc header
- Removed console.logs
- Added 3 unit tests

### Total Time: ~25 min for this file
```

---

## Files Created During Cleanup

| File | Purpose | Created In |
|------|---------|------------|
| `CLEANUP_PROGRESS.md` | Track progress across sessions | Phase 1 |
| `BACKLOG.md` | Deferred work items | Phase 1 |
| `DECISIONS.md` | Decision log | Phase 1 |
| `REFACTORING_LOG.md` | Changes made | Phase 4 |
| `CLEANUP_REPORT.html` | Final HTML report | Phase 16 |
| `docs/BUSINESS_RULES.md` | Business rules | Phase 13 |
| `docs/REVIEW_FINDINGS.md` | Issues found | Phase 13 |
| `docs/TEST_REVIEW.md` | Test gaps | Phase 15 |
| `docs/API_REFERENCE.md` | API documentation | Phase 14 |
| `docs/DATABASE_SCHEMA.md` | DB documentation | Phase 14 |
| `docs/ROLES_PERMISSIONS.md` | Permissions matrix | Phase 14 |
| `docs/ERROR_CODES.md` | Error reference | Phase 14 |
| `docs/ENVIRONMENT.md` | Env vars guide | Phase 14 |
| `docs/NOTIFICATIONS.md` | Notification events | Phase 14 |
| `docs/SCHEDULED_TASKS.md` | Cron jobs | Phase 14 |
| `docs/INTEGRATIONS.md` | Third-party services | Phase 14 |
| `docs/AUDIT_EVENTS.md` | Audit logging | Phase 14 |
| `docs/MODULE_SYSTEM.md` | Module documentation | Phase 14 |
| `docs/DATA_RETENTION.md` | Retention policies | Phase 14 |
| `docs/LIMITATIONS.md` | Known limitations | Phase 14 |
| `docs/GLOSSARY.md` | Terms & definitions | Phase 14 |
| `docs/CHANGELOG.md` | Version history | Phase 14 |
| `docs/DEPLOYMENT.md` | Deployment guide | Phase 11 |
| `docs/TROUBLESHOOTING.md` | Common issues | Phase 11 |

---

## Progress Tracking

### Current Status

**Last Updated**: [DATE]
**Current Phase**: [PHASE NUMBER]
**Current Step**: [STEP DESCRIPTION]
**Session**: [SESSION NUMBER]

---

### Progress Log (`CLEANUP_PROGRESS.md`)

Create and maintain `CLEANUP_PROGRESS.md` at project root:

```markdown
# Cleanup Progress Log

## Current Status
- **Phase**: 1 of 15
- **Step**: Deleting temporary files
- **Last File Processed**: N/A
- **Last Updated**: 2025-01-XX HH:MM
- **Session**: 1

## Session History

### Session 1 - [Date]
**Started**: Phase 1
**Completed**:
- [ ] Phase 1: Delete Temporary Files
- [ ] Phase 2: Move One-Time Files

**Notes**:

---

### Session 2 - [Date]
**Continued From**: Phase X, Step Y
**Completed**:
- [ ] ...

**Notes**:

---

## Phase Completion Status (Optimized 7 Phases)

| Phase | Description | Status | Completed Date |
|-------|-------------|--------|----------------|
| 1 | Setup & Cleanup (delete temp, move scripts) | ⬜ Not Started | - |
| 2 | Consolidate Duplicates | ⬜ Not Started | - |
| 3 | Deep File Review (per-file: docs + tests + refactor) | ⬜ Not Started | - |
| 4 | DevOps & CI/CD | ⬜ Not Started | - |
| 5 | E2E Tests | ⬜ Not Started | - |
| 6 | Final Validation | ⬜ Not Started | - |
| 7 | Generate Reports | ⬜ Not Started | - |

**Legend**: ⬜ Not Started | 🔄 In Progress | ✅ Completed | ⏸️ Paused

### Phase 3 Sub-Progress (Deep File Review)

| Round | Category | Files | Status |
|-------|----------|-------|--------|
| 1 | Core Libraries (validations, core, security) | ~40 | ⬜ |
| 2 | Domain Logic (hr, operations, projects, system) | ~60 | ⬜ |
| 3 | API Routes | ~80 | ⬜ |
| 4 | Components | ~100 | ⬜ |
| 5 | Pages | ~30 | ⬜ |

---

## Detailed Progress by Phase

### Phase 4: File-by-File Review Progress

Track each file reviewed:

| # | File Path | Reviewed | Header Added | Refactored | Issues Found |
|---|-----------|----------|--------------|------------|--------------|
| 1 | src/app/api/leave/requests/route.ts | ⬜ | ⬜ | ⬜ | - |
| 2 | src/app/api/leave/requests/[id]/route.ts | ⬜ | ⬜ | ⬜ | - |
| ... | ... | ... | ... | ... | ... |

### Phase 13: Business Rules Progress

| Module | File | Rules Documented | Status |
|--------|------|------------------|--------|
| Leave | leave-utils.ts | 0 | ⬜ |
| Payroll | gratuity.ts | 0 | ⬜ |
| ... | ... | ... | ... |

### Phase 15: Test Coverage Progress

| Module | Unit Tests | Integration Tests | E2E Tests | Status |
|--------|------------|-------------------|-----------|--------|
| Leave | ⬜ | ⬜ | ⬜ | ⬜ |
| Payroll | ⬜ | ⬜ | ⬜ | ⬜ |
| Assets | ⬜ | ⬜ | ⬜ | ⬜ |
| ... | ... | ... | ... | ... |

---

## Resume Instructions

When starting a new session, read this file first:

1. Check "Current Status" section for where we left off
2. Read the last session notes
3. Continue from the exact file/step mentioned
4. Update this file as you progress
5. At session end, update "Current Status" and add session notes
```

---

### How to Update Progress

**At the START of each session:**
```markdown
## Current Status
- **Phase**: [Read from CLEANUP_PROGRESS.md]
- **Step**: [Read from CLEANUP_PROGRESS.md]
- **Continue From**: [Exact file or task]
```

**DURING the session:**
- Mark items as 🔄 In Progress when starting
- Mark items as ✅ Completed when done
- Add notes for any issues or decisions

**At the END of each session:**
```markdown
### Session X - [Date]
**Continued From**: Phase X, Step Y, File Z
**Completed**:
- ✅ [List what was completed]

**Stopped At**: Phase X, Step Y, File Z
**Next Steps**: [What to do next]
**Notes**: [Any important context for next session]
**Blockers**: [Any issues that need resolution]
```

---

### Quick Resume Prompt

Copy this to start a new session:

```
Read CLEANUP_PROGRESS.md and PRODUCTION_CLEANUP_PLAN.md.

Check current progress status and continue from where the last session stopped.

Before making any changes:
1. Tell me the current phase and step
2. Tell me what was last completed
3. Tell me what you will do next

Then continue the cleanup process, updating CLEANUP_PROGRESS.md as you go.
```

---

### Checkpoint Commits

After completing significant work, create checkpoint commits:

```bash
git add .
git commit -m "chore: cleanup checkpoint - Phase X Step Y complete

Progress:
- [What was done]

Next:
- [What comes next]

🤖 Generated with Claude Code"
```

This allows rollback to any checkpoint if needed.

---

### Interactive Decision Making

**CRITICAL**: Never make assumptions. Always ask for clarification before:

#### When to Ask

| Situation | Example Question |
|-----------|------------------|
| **Deleting a file** | "This file `utils-old.ts` appears unused. Should I delete it or move to review folder?" |
| **Choosing between duplicates** | "Found 2 versions of payroll utils. Which should be canonical: `lib/payroll/` or `lib/domains/hr/payroll/`?" |
| **Refactoring approach** | "This function is complex. Should I: (A) Split into smaller functions, (B) Add comments only, (C) Leave as-is?" |
| **Fixing a bug** | "Found potential bug in leave calculation. Should I fix it now or add to backlog?" |
| **Adding a feature** | "This module lacks validation X. Should I add it or document as backlog?" |
| **Test creation** | "Missing E2E test for payroll. Should I create it now (2h effort) or add to backlog?" |
| **Breaking changes** | "Renaming this function will affect 15 files. Proceed or skip?" |
| **Unclear business logic** | "Leave accrual: should partial months count? Please clarify the business rule." |
| **Multiple valid approaches** | "Error handling can be: (A) Try-catch, (B) Result type, (C) Error boundary. Which pattern?" |
| **Priority conflicts** | "Found security issue and performance issue. Which to address first?" |

#### Question Format

Always present decisions clearly:

```markdown
🔶 **Decision Required**: [Brief description]

**Context**: [Why this decision matters]

**Options**:
A) [Option 1] - [Pros/Cons]
B) [Option 2] - [Pros/Cons]
C) [Option 3] - [Pros/Cons]
D) Skip for now (add to backlog)

**My Recommendation**: [X] because [reason]

**Your choice?**
```

#### Example Interactions

**Example 1: Duplicate Files**
```markdown
🔶 **Decision Required**: Duplicate utility files found

**Context**: Two files contain similar payroll calculation logic

**Files**:
- `src/lib/payroll/utils.ts` (384 lines, modified Dec 28)
- `src/lib/domains/hr/payroll/utils.ts` (275 lines, modified Dec 25)

**Differences**:
- lib/payroll has 3 extra functions: X, Y, Z
- domains/hr/payroll has cleaner structure

**Options**:
A) Keep `lib/payroll/`, make `domains/hr/payroll/` re-export
B) Keep `domains/hr/payroll/`, merge missing functions, delete other
C) Keep both (document why)
D) Skip - add to backlog for later

**My Recommendation**: B - domains folder is the canonical location per project structure

**Your choice?**
```

**Example 2: Missing Validation**
```markdown
🔶 **Decision Required**: Missing input validation

**Context**: `POST /api/assets` doesn't validate file upload MIME type

**Risk**: Users could upload malicious files

**Options**:
A) Add validation now (30 min effort)
B) Add to backlog as P1 security item
C) Skip - not a priority

**My Recommendation**: A - security issue, quick fix

**Your choice?**
```

**Example 3: Complex Refactor**
```markdown
🔶 **Decision Required**: Complex function needs refactoring

**Context**: `calculateGratuity()` is 150 lines with nested conditionals

**Options**:
A) Full refactor - split into 5 smaller functions (2h effort)
B) Light refactor - add comments and early returns (30 min)
C) Document only - add JSDoc explaining the logic (10 min)
D) Skip - add to backlog

**My Recommendation**: B - balance between improvement and time

**Your choice?**
```

#### Decision Log

Track all decisions in `DECISIONS.md`:

```markdown
# Decision Log

| # | Date | Decision | Options | Chosen | Reason |
|---|------|----------|---------|--------|--------|
| 1 | Jan X | Duplicate payroll utils | A/B/C/D | B | Canonical location |
| 2 | Jan X | Missing MIME validation | A/B/C | A | Security priority |
| 3 | Jan X | Gratuity refactor | A/B/C/D | B | Time efficient |
```

#### Auto-Decisions (No Confirmation Needed)

Only proceed without asking for:
- Adding JSDoc header comments (standard format)
- Removing `console.log` statements
- Fixing obvious typos
- Removing unused imports
- Formatting fixes (handled by linter)
- Adding to progress tracking files

#### Never Auto-Decide

Always ask before:
- Deleting any file
- Modifying business logic
- Changing database schema
- Updating API contracts
- Removing any function/class
- Changing validation rules
- Modifying security code
- Altering calculation formulas

---

### Deferred Work Backlog (`BACKLOG.md`)

Create `BACKLOG.md` at project root for items requiring more effort/time:

```markdown
# Cleanup Backlog

Items discovered during cleanup that require more effort or time and cannot be addressed immediately.

---

## How to Use This File

1. **During cleanup**: Add items here when you find something that needs work but would derail current progress
2. **After cleanup**: Review and prioritize these items for future sprints
3. **Format**: Use the tables below to categorize and prioritize

---

## Priority Levels

| Priority | Description | Timeline |
|----------|-------------|----------|
| P0 | Critical - Must fix before production | This week |
| P1 | High - Should fix soon after launch | 1-2 weeks |
| P2 | Medium - Plan for next sprint | 2-4 weeks |
| P3 | Low - Nice to have | Backlog |

---

## Backlog Items

### Bugs & Fixes

| ID | Description | File(s) | Priority | Effort | Added Date | Status |
|----|-------------|---------|----------|--------|------------|--------|
| BUG-001 | [Description] | `file.ts` | P1 | 2h | 2025-XX-XX | Open |

### Refactoring

| ID | Description | File(s) | Priority | Effort | Added Date | Status |
|----|-------------|---------|----------|--------|------------|--------|
| REF-001 | [Description] | `file.ts` | P2 | 4h | 2025-XX-XX | Open |

### New Features

| ID | Description | Module | Priority | Effort | Added Date | Status |
|----|-------------|--------|----------|--------|------------|--------|
| FEAT-001 | [Description] | Leave | P3 | 1d | 2025-XX-XX | Open |

### Performance Improvements

| ID | Description | File(s) | Priority | Effort | Added Date | Status |
|----|-------------|---------|----------|--------|------------|--------|
| PERF-001 | [Description] | `file.ts` | P2 | 3h | 2025-XX-XX | Open |

### Security Enhancements

| ID | Description | File(s) | Priority | Effort | Added Date | Status |
|----|-------------|---------|----------|--------|------------|--------|
| SEC-001 | [Description] | `file.ts` | P1 | 2h | 2025-XX-XX | Open |

### Technical Debt

| ID | Description | File(s) | Priority | Effort | Added Date | Status |
|----|-------------|---------|----------|--------|------------|--------|
| DEBT-001 | [Description] | `file.ts` | P2 | 1d | 2025-XX-XX | Open |

### Documentation

| ID | Description | Scope | Priority | Effort | Added Date | Status |
|----|-------------|-------|----------|--------|------------|--------|
| DOC-001 | [Description] | API | P3 | 2h | 2025-XX-XX | Open |

### Testing

| ID | Description | Module | Priority | Effort | Added Date | Status |
|----|-------------|--------|----------|--------|------------|--------|
| TEST-001 | [Description] | Leave | P2 | 4h | 2025-XX-XX | Open |

### Infrastructure

| ID | Description | Area | Priority | Effort | Added Date | Status |
|----|-------------|------|----------|--------|------------|--------|
| INFRA-001 | [Description] | CI/CD | P2 | 1d | 2025-XX-XX | Open |

---

## Completed Items

Move items here when done:

| ID | Description | Completed Date | Notes |
|----|-------------|----------------|-------|
| - | - | - | - |

---

## Summary Stats

| Category | P0 | P1 | P2 | P3 | Total |
|----------|----|----|----|----|-------|
| Bugs | 0 | 0 | 0 | 0 | 0 |
| Refactoring | 0 | 0 | 0 | 0 | 0 |
| Features | 0 | 0 | 0 | 0 | 0 |
| Performance | 0 | 0 | 0 | 0 | 0 |
| Security | 0 | 0 | 0 | 0 | 0 |
| Tech Debt | 0 | 0 | 0 | 0 | 0 |
| Docs | 0 | 0 | 0 | 0 | 0 |
| Testing | 0 | 0 | 0 | 0 | 0 |
| Infra | 0 | 0 | 0 | 0 | 0 |
| **Total** | 0 | 0 | 0 | 0 | **0** |
```

---

### When to Add to Backlog

Add items to `BACKLOG.md` when you find:

| Situation | Example | Action |
|-----------|---------|--------|
| **Complex refactor** | "This function needs complete rewrite" | Add to Refactoring |
| **Missing feature** | "Should support bulk operations" | Add to Features |
| **Performance issue** | "N+1 query but needs careful fix" | Add to Performance |
| **Security concern** | "Should add input sanitization" | Add to Security |
| **Test gap** | "Needs E2E test but complex setup" | Add to Testing |
| **Documentation needed** | "API needs OpenAPI spec" | Add to Docs |
| **Tech debt** | "Duplicated code across 5 files" | Add to Tech Debt |
| **Infrastructure** | "Need to add monitoring" | Add to Infra |

### Backlog Entry Template

When adding an item:

```markdown
| [ID] | [Clear description of what needs to be done] | `path/to/file.ts` | P[0-3] | [Xh/Xd] | [Today's date] | Open |
```

**Effort Estimates:**
- `30m` - Quick fix
- `1h` - Small task
- `2h` - Medium task
- `4h` - Half day
- `1d` - Full day
- `2d` - Two days
- `1w` - One week
- `?` - Needs investigation

---

## Confirmed Approach

| Decision | Choice |
|----------|--------|
| **Scope** | Full codebase (~300 files) |
| **Duplicates** | Manual review - present each pair for decision |
| **Comments** | Full JSDoc with @module, @dependencies, @example |
| **Commits** | Per phase - commit after delete, move, consolidate, refactor |

---

## Phase 1: Delete Temporary & Cache Files

### Files to Delete (Safe - Not tracked in git or properly ignored)

```bash
# Build artifacts and cache
rm -rf .next/                    # Next.js build output (93MB)
rm -rf test-results/             # Playwright test artifacts
rm -rf coverage/                 # Test coverage reports
rm -rf .turbo/                   # Turbopack cache (if exists)

# Temporary environment files
del .env.tmp
del .env.production.pulled

# Database backups
del prisma\dev.db.backup-*
```

### CRITICAL: Remove Accidentally Committed Folder

```bash
# This folder contains node_modules and was accidentally committed
rm -rf ProjectsSME++/

# Then remove from git history (if committed)
git rm -r --cached ProjectsSME++/
```

**After deletion:**
- Run: `npm run typecheck`
- Commit: `chore: delete temporary and cache files before production`

---

## Phase 2: Move One-Time/Temporary Files to `_to-review-and-delete/`

### Files to Move

| Category | Files | Destination |
|----------|-------|-------------|
| **Company-specific seed scripts** | `scripts/seed-jasira-data.ts`, `scripts/seed-jasira.sql`, `scripts/seed-innovation-cafe.ts`, `scripts/seed-becreative-comprehensive.ts` | `_to-review-and-delete/scripts-seed/` |
| **One-time migration SQL** | `scripts/migrations/*.sql`, `scripts/add-*.sql`, `scripts/create-*.sql`, `scripts/migrate-schema.sql` | `_to-review-and-delete/migrations-applied/` |
| **Fix scripts** | `scripts/fix-*.ts`, `scripts/fix-*.sql` | `_to-review-and-delete/scripts-fix/` |
| **Import/Export utilities** | `scripts/import-becreative-data.ts`, `scripts/call-import-api.ts` | `_to-review-and-delete/scripts-import/` |
| **Test data scripts** | `scripts/seed-test-*.ts` | `_to-review-and-delete/scripts-test/` |
| **Credentials with hardcoded values** | `scripts/set-user-password.ts` | `_to-review-and-delete/scripts-sensitive/` |
| **HTML mockups** | `admin-dashboard-v3.html`, `admin-redesign.html` | `_to-review-and-delete/mockups/` |
| **Dev-only utilities** | `scripts/test-db-connection.ts`, `scripts/check-leave-data.ts`, `scripts/list-orgs.ts`, `scripts/list-users.ts` | `_to-review-and-delete/scripts-dev/` |

### Files to KEEP in scripts/

| File | Reason |
|------|--------|
| `scripts/cron/*.ts` | Production cron jobs |
| `scripts/dev/quick-start.ts` | Useful for new developers |
| `scripts/dev/pre-deployment-check.ts` | Production deployment checklist |
| `scripts/README.md` | Documentation |
| `scripts/safe-production-deploy.md` | Production deployment guide |

**After moving:**
- Run: `npm run typecheck`
- Commit: `chore: move one-time scripts and mockups to review folder`

---

## Phase 3: Consolidate Duplicate Code (Manual Review)

### Critical Duplications Found

| Original Location | Duplicate Location | Status |
|-------------------|-------------------|--------|
| `src/lib/domains/hr/payroll/` | `src/lib/payroll/` | Review needed |
| `src/lib/domains/hr/leave/` | `src/lib/leave-utils.ts` | Already re-exports |
| `src/components/domains/hr/leave/` | `src/components/leave/` | Review needed |
| `src/components/domains/hr/payroll/` | `src/components/payroll/` | Review needed |
| `src/components/domains/system/settings/` | `src/components/settings/` | Review needed |
| `src/lib/validations/hr/` | `src/lib/validations/payroll.ts`, `leave.ts` | Already re-exports |

### Consolidation Process

For each duplicate pair:
1. Show both files side-by-side
2. Ask user which to keep as canonical
3. Convert other to re-export OR delete
4. Update all imports across codebase

**After consolidation:**
- Run: `npm run typecheck`
- Commit: `refactor: consolidate duplicate code to canonical locations`

---

## Phase 4: File-by-File Review & Documentation

### Review Priority Order

| Priority | Category | Path | Est. Files |
|----------|----------|------|------------|
| 1 | API Routes | `src/app/api/` | ~80 |
| 2 | Auth & Security | `src/lib/core/`, `src/lib/oauth/`, `src/lib/security/` | ~15 |
| 3 | Multi-tenant | `src/lib/multi-tenant/` | ~5 |
| 4 | Business Logic | `src/lib/domains/` | ~40 |
| 5 | Validations | `src/lib/validations/` | ~20 |
| 6 | Components | `src/components/` | ~100 |
| 7 | Other Utilities | `src/lib/*.ts` | ~20 |

### Review Checklist for Each File

For each file:
- [ ] Check if file is required (delete if not)
- [ ] Add JSDoc header comment
- [ ] Remove console.logs, unused imports, dead code
- [ ] Fix any TODO/FIXME comments
- [ ] Ensure proper TypeScript types
- [ ] Verify appropriate error handling
- [ ] Log changes to REFACTORING_LOG.md

### File Header Template

```typescript
/**
 * @file [filename]
 * @description [Brief description of what this file does]
 * @module [Module name, e.g., hr/payroll, operations/assets]
 * @dependencies [Key dependencies this file relies on]
 *
 * @example
 * // Usage example if applicable
 */
```

### Files with Known TODO/FIXME Comments (16 files)

1. `src/app/api/users/route.ts`
2. `src/app/api/leave/requests/route.ts`
3. `src/app/api/employees/next-code/route.ts`
4. `src/lib/payroll/utils.ts`
5. `src/app/api/super-admin/admins/route.ts`
6. `src/app/super-admin/settings/whatsapp/page.tsx`
7. `src/app/super-admin/layout.tsx`
8. `src/lib/domains/operations/suppliers/supplier-utils.ts`
9. `src/lib/domains/operations/asset-requests/asset-request-utils.ts`
10. `src/lib/domains/projects/purchase-requests/purchase-request-utils.ts`
11. `src/lib/two-factor/backup-codes.ts`
12. `src/lib/domains/hr/leave/leave-utils.ts`
13. `src/lib/payroll/wps.ts`
14. `src/lib/domains/hr/payroll/wps.ts`
15. `src/lib/domains/hr/payroll/utils.ts`
16. `src/lib/core/log.ts`

**Commit after each category:** `docs: add headers and refactor [category] files`

---

## Phase 5: Final Validation

### Validation Steps

```bash
# Type checking
npm run typecheck

# Linting
npm run lint

# Unit tests
npm test

# E2E tests (optional but recommended)
npm run test:e2e

# Production build
npm run build
```

**Final commit:** `chore: production cleanup complete`

---

## Refactoring Log Template

Create `REFACTORING_LOG.md` to track all changes:

```markdown
# Refactoring Log

## Summary
- Total files reviewed: X
- Files modified: X
- Files deleted: X
- Files consolidated: X

## Changes by Category

### Security Fixes
| File | Issue | Fix Applied |
|------|-------|-------------|

### Code Quality Improvements
| File | Issue | Fix Applied |
|------|-------|-------------|

### Consolidations
| Duplicate | Canonical | Action |
|-----------|-----------|--------|

### Learnings & Patterns

#### Good Patterns Found
- [Pattern description and where found]

#### Anti-patterns to Avoid
- [Issue and recommendation]

#### Technical Debt Items
- [Item and priority]
```

---

## Estimated Scope

| Category | File Count | Effort |
|----------|------------|--------|
| Temp files to delete | ~15 | Low |
| Files to move | ~25 | Low |
| Duplicates to consolidate | ~20 pairs | Medium |
| API routes to review | ~80+ | High |
| Lib files to review | ~60+ | High |
| Components to review | ~100+ | High |
| **Total** | **~300+ files** | **Significant** |

---

---

## Phase 6: Security Hardening

### Quick Wins (Do First)

| Task | File | Priority |
|------|------|----------|
| Fix npm vulnerabilities | Run `npm audit fix` | **CRITICAL** |
| Add file upload validation | `src/app/api/upload/route.ts` | **HIGH** |
| Audit localStorage usage | 13 instances found | Medium |

### File Upload Security

Add MIME type whitelist to `src/app/api/upload/route.ts`:
```typescript
const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
];
```

### localStorage/sessionStorage Audit

Files using client-side storage (verify no sensitive data stored):
- [ ] Review each usage for sensitive data exposure
- [ ] Prefer HTTPOnly cookies for auth tokens

---

## Phase 7: Performance Optimization

### Image Optimization

- **Gap**: Only 22 of 216 components use `next/image`
- **Action**: Replace `<img>` tags with `next/image` component
- **Files**: `src/components/**`, `src/app/**`

### Code Splitting / Lazy Loading

Add dynamic imports for heavy components:
```typescript
const HeavyModal = dynamic(() => import('./HeavyModal'), { ssr: false });
```

Target components:
- Modal dialogs
- Data tables with complex filtering
- Wizard steps
- Chart components

### Database Query Optimization

- **Gap**: 266 `findMany` queries without explicit `select`
- **Action**: Add field selection to reduce over-fetching
- **Pattern**:
```typescript
// Before
const users = await prisma.user.findMany();

// After
const users = await prisma.user.findMany({
  select: { id: true, name: true, email: true }
});
```

### Bundle Analysis

Add to `package.json`:
```json
{
  "scripts": {
    "build:analyze": "ANALYZE=true next build"
  },
  "devDependencies": {
    "@next/bundle-analyzer": "^15.0.0"
  }
}
```

---

## Phase 8: Monitoring & Observability

### Health Check Endpoint

Create `src/app/api/health/route.ts`:
```typescript
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch {
    return Response.json({ status: 'unhealthy' }, { status: 503 });
  }
}
```

### Structured Logging

Migrate from console.log to pino (already in package.json):
- **Current**: 516 console statements found
- **Target**: Structured JSON logging
- **File**: `src/lib/core/log.ts`

### Performance Monitoring

Add Core Web Vitals tracking:
- Create `src/lib/analytics/web-vitals.ts`
- Track CLS, FID, LCP metrics
- Send to analytics endpoint

---

## Phase 9: Testing Improvements

### Enable Coverage Thresholds

Update `jest.config.ts`:
```typescript
coverageThreshold: {
  global: {
    branches: 50,
    functions: 50,
    lines: 60,
    statements: 60
  }
}
```

### Add Missing Tests

| Category | Current | Target | Files |
|----------|---------|--------|-------|
| API Routes | ~10% | 60% | `tests/integration/api/` |
| Components | 0% | 40% | `tests/unit/components/` |
| Security | Good | Maintain | `tests/security/` |

### E2E Tests

- **Gap**: Only runs on push or with 'run-e2e' label
- **Action**: Make E2E required for all PRs
- **File**: `.github/workflows/test.yml:112`

---

## Phase 10: CI/CD Enhancements

### Pre-commit Hooks

Install husky and lint-staged:
```bash
npm install -D husky lint-staged
npx husky install
```

Create `.husky/pre-commit`:
```bash
#!/bin/sh
npx lint-staged
```

Create `.lintstagedrc`:
```json
{
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}
```

### Security Scanning

Create `.github/workflows/security.yml`:
- npm audit check
- CodeQL analysis
- Dependency review

### Dependabot

Create `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

## Phase 11: Documentation

### Create Missing Docs

| Document | Purpose | Priority |
|----------|---------|----------|
| `docs/DEPLOYMENT.md` | Production deployment guide | High |
| `docs/TROUBLESHOOTING.md` | Common issues & solutions | Medium |
| `docs/API.md` | API endpoint documentation | Medium |
| `docs/RUNBOOK.md` | Operational procedures | Medium |

### Prisma Schema Documentation

Add comments to `prisma/schema.prisma`:
```prisma
/// User account in the system
/// Can belong to multiple organizations via OrganizationUser
model User {
  /// Unique identifier (CUID)
  id String @id @default(cuid())
  // ...
}
```

### OpenAPI Documentation

Options:
1. Manual: Create `docs/openapi.yaml`
2. Auto-generated: Use `@ts-rest/express` or `next-swagger-doc`

---

## Phase 12: Accessibility (a11y)

### Automated Testing

Add jest-axe for a11y testing:
```bash
npm install -D jest-axe @types/jest-axe
```

Create `tests/unit/a11y/` directory with component tests.

### Manual Audit Checklist

- [ ] All forms have proper labels and error associations
- [ ] Keyboard navigation works for all interactive elements
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader announces dynamic content changes

---

## Production Readiness Scorecard

| Category | Current | Target | Priority |
|----------|---------|--------|----------|
| Security | 7.5/10 | 9/10 | **HIGH** |
| Performance | 6.5/10 | 8/10 | Medium |
| Observability | 7/10 | 8.5/10 | Medium |
| Testing | 7/10 | 8/10 | Medium |
| CI/CD | 7.5/10 | 9/10 | Medium |
| Documentation | 6/10 | 8/10 | Low |
| Accessibility | 5/10 | 7/10 | Low |

---

## Quick Wins Checklist (Do These First)

- [ ] `npm audit fix` - Fix 2 vulnerabilities
- [ ] Add health check endpoint
- [ ] Add file upload MIME validation
- [ ] Create `.husky/pre-commit` hook
- [ ] Enable Jest coverage thresholds
- [ ] Create `docs/DEPLOYMENT.md`
- [ ] Add `.github/dependabot.yml`

---

---

## Phase 13: Document All Business Rules & Micro-Features

### Purpose

Create comprehensive documentation of ALL business rules, validations, and micro-features implemented across each module. This serves as:
- Feature inventory for stakeholders
- QA testing checklist
- Onboarding documentation for new developers
- Compliance verification

### Output File

Create `docs/BUSINESS_RULES.md` with the following structure:

---

### HR Module - Employees

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Employee code format | Auto-generated based on org settings (e.g., EMP-001) | |
| Probation period | Configurable per employee, affects leave eligibility | |
| Document expiry alerts | Passport, visa, ID expiry notifications | |
| Employment status workflow | Active → On Leave → Terminated | |
| Termination handling | Calculates final settlement, gratuity | |

### HR Module - Leave

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Leave balance check | Cannot request more days than available balance | |
| Date overlap prevention | Cannot have overlapping leave requests | |
| Weekend/holiday exclusion | Option to exclude weekends from leave count | |
| Accrual calculation | Monthly/yearly accrual based on leave type | |
| Carry forward rules | Max carry forward days per leave type | |
| Probation restriction | Some leave types unavailable during probation | |
| Approval workflow | Multi-level approval based on org settings | |
| Auto-approval | Option for certain leave types | |
| Half-day leave | Support for AM/PM half-day requests | |
| Attachment requirements | Some leave types require supporting documents | |
| Qatar Labor Law | Annual leave: 3 weeks (< 5 years), 4 weeks (> 5 years) | |

### HR Module - Payroll

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Gratuity calculation | Qatar Labor Law: 21 days per year (3 weeks per year of service) | |
| Leave deduction | Unpaid leave deducted from salary | |
| Loan deductions | Monthly EMI deducted from salary | |
| Loan pause/resume | Ability to pause loan deductions | |
| WPS compliance | Export in Qatar WPS format | |
| Salary structure | Basic + allowances + deductions | |
| Payroll run workflow | Draft → Submitted → Approved → Paid | |
| Payslip generation | Auto-generate after payroll approval | |
| Overtime calculation | Based on hourly rate | |
| End of service | Calculate gratuity + unused leave encashment | |

### Operations Module - Assets

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| **Warranty date validation** | Warranty date cannot be before purchase date | |
| Asset code format | Auto-generated (e.g., AST-001) | |
| Depreciation calculation | Straight-line, declining balance methods | |
| Assignment history | Track who had asset and when | |
| Maintenance scheduling | Recurring maintenance reminders | |
| Status workflow | Available → Assigned → Under Maintenance → Disposed | |
| Shared assets | Assets can be marked as shared across org | |
| Location tracking | Track asset location changes | |
| QR code generation | For physical asset tagging | |
| Bulk import | CSV/Excel import with validation | |
| Clone asset | Duplicate asset for similar items | |

### Operations Module - Subscriptions

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Renewal alerts | Notify before subscription expires | |
| Auto-renewal tracking | Track if subscription auto-renews | |
| Cost tracking | Monthly/yearly cost calculations | |
| Billing cycle | Monthly, quarterly, yearly options | |
| Category management | Organize subscriptions by category | |
| Cancellation workflow | Track cancellation date and reason | |
| Reactivation | Reactivate cancelled subscriptions | |
| Multi-period view | View costs across different periods | |

### Operations Module - Suppliers

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Approval workflow | New suppliers require approval | |
| Category classification | Organize by service/product type | |
| Engagement tracking | Track supplier engagements/contracts | |
| Rating system | Rate supplier performance | |
| Document management | Store contracts, agreements | |
| Self-registration | Suppliers can register themselves | |
| Bulk import | CSV/Excel import | |

### Operations Module - Asset Requests

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Request workflow | Pending → Approved → Accepted/Declined | |
| Approval chain | Multi-level approval | |
| Auto-assignment | Option to auto-assign on approval | |
| Request types | New asset, replacement, temporary | |

### Projects Module - Purchase Requests

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Budget validation | Check against department budget | |
| Approval thresholds | Different approvers based on amount | |
| Vendor selection | Link to approved suppliers | |
| Status workflow | Draft → Submitted → Approved → Ordered → Received | |
| Partial delivery | Track partial order fulfillment | |
| Export functionality | Export to PDF/Excel | |

### System Module - Approvals

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Delegation | Delegate approvals during absence | |
| Escalation | Auto-escalate if not actioned | |
| Bulk approval | Approve multiple items at once | |
| Comments | Require/optional comments on reject | |
| Audit trail | Track who approved/rejected when | |

### System Module - Notifications

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| In-app notifications | Bell icon with unread count | |
| Email notifications | Optional email for important events | |
| WhatsApp notifications | Approval requests via WhatsApp | |
| Notification preferences | User can configure preferences | |
| Auto-purge | Delete old notifications after X days | |

### System Module - Documents

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Expiry tracking | Alert before document expires | |
| Version control | Track document versions | |
| Access control | Role-based document access | |
| Category management | Organize by document type | |

### Multi-Tenant Features

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Tenant isolation | All queries filtered by tenantId | |
| Subdomain routing | Each org gets subdomain | |
| Subscription tiers | FREE, STARTER, PROFESSIONAL, ENTERPRISE | |
| Module access | Modules enabled/disabled per tier | |
| User limits | Max users per subscription tier | |
| Asset limits | Max assets per subscription tier | |
| Branding | Custom logo, colors per org | |
| Custom OAuth | Org can configure own OAuth apps | |

### Authentication & Security

| Feature | Rule/Behavior | File |
|---------|---------------|------|
| Password complexity | Min length, uppercase, number, special char | |
| Account lockout | Lock after X failed attempts | |
| 2FA | TOTP-based two-factor auth | |
| Backup codes | One-time use backup codes for 2FA | |
| Session management | View/revoke active sessions | |
| Impersonation | Super admin can impersonate users | |
| Rate limiting | Token bucket per tenant | |

---

### Execution Process (File-by-File Discovery)

**IMPORTANT**: The tables above are just TEMPLATES. During execution, go through EVERY file in each module to discover and document ALL rules.

#### Step 1: Validation Schemas (src/lib/validations/)

Go through each file and document every validation:

| File to Review | What to Look For |
|----------------|------------------|
| `src/lib/validations/hr/leave.ts` | Date validations, balance checks, enum constraints |
| `src/lib/validations/hr/payroll.ts` | Salary validations, loan constraints, amount limits |
| `src/lib/validations/hr/employee.ts` | Employee field validations, date constraints |
| `src/lib/validations/operations/asset.ts` | Asset validations (warranty > purchase date, etc.) |
| `src/lib/validations/operations/subscription.ts` | Billing cycle rules, date validations |
| `src/lib/validations/operations/supplier.ts` | Supplier field validations |
| `src/lib/validations/projects/purchase-request.ts` | Amount limits, approval thresholds |
| `src/lib/validations/auth.ts` | Password rules, email format |

For each Zod schema, document:
- Field constraints (min/max, regex, enums)
- Custom refinements (cross-field validations)
- Transform functions (data transformations)

#### Step 2: Utility/Business Logic (src/lib/domains/)

| File to Review | What to Look For |
|----------------|------------------|
| `src/lib/domains/hr/leave/leave-utils.ts` | Balance calculations, overlap checks, accrual logic |
| `src/lib/domains/hr/payroll/gratuity.ts` | Gratuity calculation formulas |
| `src/lib/domains/hr/payroll/utils.ts` | Salary calculations, deductions |
| `src/lib/domains/hr/payroll/leave-deduction.ts` | Leave salary deduction rules |
| `src/lib/domains/hr/payroll/wps.ts` | WPS file generation rules |
| `src/lib/domains/operations/assets/depreciation.ts` | Depreciation calculation methods |
| `src/lib/domains/operations/assets/asset-history.ts` | History tracking rules |
| `src/lib/domains/operations/subscriptions/subscription-utils.ts` | Renewal, cost calculations |
| `src/lib/domains/operations/suppliers/supplier-utils.ts` | Supplier status rules |
| `src/lib/domains/operations/asset-requests/asset-request-utils.ts` | Request workflow rules |
| `src/lib/domains/projects/purchase-requests/purchase-request-utils.ts` | PR workflow rules |
| `src/lib/domains/system/notifications/notification-service.ts` | Notification triggers |
| `src/lib/domains/system/approvals/approval-utils.ts` | Approval chain logic |

For each utility function, document:
- Business calculations (formulas, algorithms)
- State transitions (workflow rules)
- Edge case handling (what happens when X)
- Date/time logic (timezone handling, date comparisons)

#### Step 3: API Route Handlers (src/app/api/)

| Directory to Review | What to Look For |
|---------------------|------------------|
| `src/app/api/leave/requests/` | Validation before create, approval logic |
| `src/app/api/leave/balances/` | Balance update rules |
| `src/app/api/payroll/runs/` | Payroll run state machine |
| `src/app/api/payroll/loans/` | Loan approval, pause/resume rules |
| `src/app/api/assets/` | Asset CRUD rules, assignment logic |
| `src/app/api/asset-requests/` | Request approval workflow |
| `src/app/api/subscriptions/` | Subscription lifecycle rules |
| `src/app/api/suppliers/` | Supplier approval workflow |
| `src/app/api/purchase-requests/` | PR approval thresholds |
| `src/app/api/employees/` | Employee lifecycle rules |
| `src/app/api/approval-steps/` | Approval chain execution |
| `src/app/api/delegations/` | Delegation rules |

For each API route, document:
- Pre-conditions checked before action
- Permission/role requirements
- Status/state transitions allowed
- Side effects (notifications, history entries)
- Error conditions and messages

#### Step 4: Component Logic (src/components/domains/)

| Directory to Review | What to Look For |
|---------------------|------------------|
| `src/components/domains/hr/leave/` | Form validations, UI state rules |
| `src/components/domains/hr/payroll/` | Calculation displays, workflow buttons |
| `src/components/domains/operations/assets/` | Asset form rules, depreciation display |
| `src/components/domains/operations/subscriptions/` | Subscription forms |
| `src/components/domains/operations/suppliers/` | Supplier forms |
| `src/components/domains/projects/purchase-requests/` | PR forms, approval UI |

For each component, document:
- Client-side validations
- Conditional rendering rules (show/hide based on state)
- Calculated/derived values displayed
- User interaction rules (what buttons appear when)

#### Step 5: Prisma Schema (prisma/schema.prisma)

Document:
- Required vs optional fields
- Default values
- Enum values and their meanings
- Unique constraints
- Relationship rules (cascade delete, etc.)

#### Step 6: Middleware Rules (src/middleware.ts)

Document:
- Route protection rules
- Module access checks
- Tenant isolation enforcement
- Rate limiting rules

---

### Documentation Format

For each discovered rule:

```markdown
### [Module] - [Feature Name]

**Rule**: [Clear description of the business rule]
**Type**: Validation | Calculation | Workflow | Constraint | Security
**File**: `path/to/file.ts:lineNumber`
**Code**:
```typescript
// Exact code that implements this rule
```
**Triggered When**: [When does this rule apply]
**Error/Behavior**: [What happens if rule violated or what it produces]
**Business Reason**: [Why this rule exists - Qatar Labor Law, business requirement, etc.]
```

---

### Example of Thorough Documentation

```markdown
### Assets - Warranty Date Validation

**Rule**: Warranty expiry date must be after purchase date
**Type**: Validation
**File**: `src/lib/validations/operations/asset.ts:45`
**Code**:
```typescript
.refine((data) => {
  if (data.warrantyExpiry && data.purchaseDate) {
    return new Date(data.warrantyExpiry) > new Date(data.purchaseDate);
  }
  return true;
}, {
  message: "Warranty expiry must be after purchase date",
  path: ["warrantyExpiry"],
})
```
**Triggered When**: Creating or updating an asset with both dates filled
**Error/Behavior**: Form shows error "Warranty expiry must be after purchase date"
**Business Reason**: Logical constraint - warranty cannot start before item was purchased

---

### Leave - Balance Deduction on Approval

**Rule**: When leave is approved, deduct days from employee's leave balance
**Type**: Workflow
**File**: `src/app/api/leave/requests/[id]/approve/route.ts:78`
**Code**:
```typescript
await prisma.leaveBalance.update({
  where: { id: balance.id },
  data: {
    used: { increment: leaveDays },
    balance: { decrement: leaveDays }
  }
});
```
**Triggered When**: Manager approves a leave request
**Error/Behavior**: Balance updated, if insufficient balance approval is blocked earlier
**Business Reason**: Track accurate leave usage per employee
```

---

### Issues & Suggestions Log

During the file-by-file review, also document any issues found:

#### Create `docs/REVIEW_FINDINGS.md` with these sections:

```markdown
# Review Findings

## Bugs & Errors Found

| ID | Module | Issue | File | Severity | Status |
|----|--------|-------|------|----------|--------|
| BUG-001 | Leave | [Description of bug] | `file.ts:line` | Critical/High/Medium/Low | Open |

## Missing Validations

| ID | Module | Missing Validation | Should Be | File |
|----|--------|-------------------|-----------|------|
| VAL-001 | Assets | [What's missing] | [What should happen] | `file.ts` |

## Inconsistencies

| ID | Description | Location 1 | Location 2 | Resolution |
|----|-------------|------------|------------|------------|
| INC-001 | [Same thing done differently] | `file1.ts` | `file2.ts` | [Which is correct] |

## Security Concerns

| ID | Module | Concern | File | Risk Level | Recommendation |
|----|--------|---------|------|------------|----------------|
| SEC-001 | Auth | [Description] | `file.ts` | High/Medium/Low | [Fix] |

## Performance Issues

| ID | Module | Issue | File | Impact | Recommendation |
|----|--------|-------|------|--------|----------------|
| PERF-001 | Assets | [Description] | `file.ts` | [Impact] | [Fix] |

## Feature Gaps (Missing Functionality)

| ID | Module | Gap | Business Need | Priority | Suggested Implementation |
|----|--------|-----|---------------|----------|--------------------------|
| GAP-001 | Leave | [What's missing] | [Why needed] | High/Medium/Low | [How to implement] |

## Feature Suggestions (Nice to Have)

| ID | Module | Suggestion | Benefit | Effort | Priority |
|----|--------|------------|---------|--------|----------|
| FEAT-001 | Assets | [New feature idea] | [Value add] | Low/Medium/High | P1/P2/P3 |

## Code Quality Issues

| ID | Type | Issue | File | Recommendation |
|----|------|-------|------|----------------|
| CQ-001 | Dead Code | [Unused function] | `file.ts:line` | Delete |
| CQ-002 | Duplication | [Same logic repeated] | `file1.ts`, `file2.ts` | Extract to shared util |
| CQ-003 | Complexity | [Complex function] | `file.ts:line` | Refactor |
| CQ-004 | Naming | [Unclear naming] | `file.ts:line` | Rename to X |

## Documentation Gaps

| ID | Module | Missing Documentation | Where Needed |
|----|--------|----------------------|--------------|
| DOC-001 | Payroll | [What's undocumented] | `file.ts` |

## Technical Debt

| ID | Description | Files Affected | Effort to Fix | Priority |
|----|-------------|----------------|---------------|----------|
| TD-001 | [Description] | `file1.ts`, `file2.ts` | Low/Medium/High | P1/P2/P3 |
```

---

### Review Checklist Per File

When reviewing each file, check for:

- [ ] **Correctness**: Does the logic do what it's supposed to?
- [ ] **Completeness**: Are all edge cases handled?
- [ ] **Consistency**: Does it match patterns in similar files?
- [ ] **Security**: Any injection, XSS, or auth bypass risks?
- [ ] **Performance**: N+1 queries, missing indexes, unnecessary loops?
- [ ] **Error Handling**: Are errors caught and handled properly?
- [ ] **Validation**: Is input validated before use?
- [ ] **Types**: Are TypeScript types correct and complete?
- [ ] **Dead Code**: Any unused variables, functions, imports?
- [ ] **Hardcoded Values**: Should any magic numbers be constants?
- [ ] **TODO/FIXME**: Any unresolved comments?
- [ ] **Missing Features**: What should exist but doesn't?

---

## Phase 14: Additional Documentation

### 14.1 API Documentation (`docs/API_REFERENCE.md`)

Document ALL API endpoints:

```markdown
## Leave Requests API

### POST /api/leave/requests
Create a new leave request

**Authentication**: Required (Bearer token)
**Permissions**: Any authenticated user

**Request Body**:
```json
{
  "leaveTypeId": "string (required)",
  "startDate": "ISO date (required)",
  "endDate": "ISO date (required)",
  "reason": "string (optional)",
  "isHalfDay": "boolean (optional)",
  "halfDayPeriod": "AM | PM (required if isHalfDay)"
}
```

**Success Response** (201):
```json
{
  "id": "clxx...",
  "status": "PENDING",
  ...
}
```

**Error Responses**:
- 400: Invalid dates, insufficient balance
- 401: Not authenticated
- 403: Module not enabled
- 409: Overlapping leave request exists
```

| API Category | Endpoints to Document |
|--------------|----------------------|
| Auth | `/api/auth/*` - login, signup, reset-password, 2FA |
| Leave | `/api/leave/*` - requests, balances, types, calendar |
| Payroll | `/api/payroll/*` - runs, payslips, loans, salary-structures |
| Assets | `/api/assets/*` - CRUD, assign, depreciation, maintenance |
| Subscriptions | `/api/subscriptions/*` - CRUD, cancel, reactivate |
| Suppliers | `/api/suppliers/*` - CRUD, approve, engagements |
| Employees | `/api/employees/*` - CRUD, celebrations, expiry-alerts |
| Purchase Requests | `/api/purchase-requests/*` - CRUD, status updates |
| Asset Requests | `/api/asset-requests/*` - CRUD, approve, accept |
| Approvals | `/api/approval-steps/*`, `/api/delegations/*` |
| Users | `/api/users/*` - CRUD, permissions |
| Notifications | `/api/notifications/*` |
| Upload | `/api/upload/*` |
| Super Admin | `/api/super-admin/*` |

---

### 14.2 Database Schema Documentation (`docs/DATABASE_SCHEMA.md`)

Document each table/model:

```markdown
## LeaveRequest

**Purpose**: Stores employee leave requests

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| id | String | Yes | cuid() | Primary key |
| tenantId | String | Yes | - | Organization ID (tenant isolation) |
| userId | String | Yes | - | Employee requesting leave |
| leaveTypeId | String | Yes | - | Type of leave (Annual, Sick, etc.) |
| startDate | DateTime | Yes | - | Leave start date |
| endDate | DateTime | Yes | - | Leave end date |
| status | Enum | Yes | PENDING | PENDING, APPROVED, REJECTED, CANCELLED |
| totalDays | Decimal | Yes | - | Calculated leave days |
| reason | String | No | - | Reason for leave |
| rejectionReason | String | No | - | Reason if rejected |
| approvedBy | String | No | - | Manager who approved |
| approvedAt | DateTime | No | - | When approved |

**Relationships**:
- belongs to Organization (tenantId)
- belongs to User (userId)
- belongs to LeaveType (leaveTypeId)
- has many ApprovalStep

**Indexes**:
- tenantId (for tenant isolation)
- userId + status (for user's requests)
- startDate + endDate (for overlap checks)
```

---

### 14.3 User Roles & Permissions (`docs/ROLES_PERMISSIONS.md`)

```markdown
## Organization Roles

| Role | Description | Permissions |
|------|-------------|-------------|
| OWNER | Organization owner | All permissions, can delete org |
| ADMIN | Administrator | All except delete org, billing |
| MANAGER | Department manager | Approve team requests, view reports |
| MEMBER | Regular employee | Self-service only |

## Module Permissions

| Permission | OWNER | ADMIN | MANAGER | MEMBER |
|------------|-------|-------|---------|--------|
| View own leave | ✓ | ✓ | ✓ | ✓ |
| Request leave | ✓ | ✓ | ✓ | ✓ |
| Approve leave | ✓ | ✓ | ✓ | ✗ |
| Manage leave types | ✓ | ✓ | ✗ | ✗ |
| View all employees | ✓ | ✓ | ✓ | ✗ |
| Manage employees | ✓ | ✓ | ✗ | ✗ |
| Run payroll | ✓ | ✓ | ✗ | ✗ |
| View payslips (own) | ✓ | ✓ | ✓ | ✓ |
| View payslips (all) | ✓ | ✓ | ✗ | ✗ |
| Manage assets | ✓ | ✓ | ✓ | ✗ |
| Request assets | ✓ | ✓ | ✓ | ✓ |
| Manage suppliers | ✓ | ✓ | ✓ | ✗ |
| Create purchase requests | ✓ | ✓ | ✓ | ✓ |
| Approve purchase requests | ✓ | ✓ | ✓ | ✗ |
| Manage users | ✓ | ✓ | ✗ | ✗ |
| View reports | ✓ | ✓ | ✓ | ✗ |
| Manage billing | ✓ | ✗ | ✗ | ✗ |
| Organization settings | ✓ | ✓ | ✗ | ✗ |

## Custom Roles (If Implemented)

Document any custom role configurations...
```

---

### 14.4 Error Codes Reference (`docs/ERROR_CODES.md`)

```markdown
## Error Code Format

`[CATEGORY]-[NUMBER]`: Description

## Authentication Errors (AUTH)

| Code | HTTP | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| AUTH-001 | 401 | Invalid credentials | Wrong email/password | Check credentials |
| AUTH-002 | 401 | Account locked | Too many failed attempts | Wait 30 min or reset |
| AUTH-003 | 401 | 2FA required | Need 2FA code | Provide TOTP code |
| AUTH-004 | 401 | Invalid 2FA code | Wrong TOTP code | Check authenticator |
| AUTH-005 | 403 | Account disabled | Admin disabled account | Contact admin |

## Leave Errors (LEAVE)

| Code | HTTP | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| LEAVE-001 | 400 | Insufficient balance | Not enough leave days | Check balance |
| LEAVE-002 | 409 | Overlapping request | Dates conflict | Choose different dates |
| LEAVE-003 | 400 | Invalid date range | End before start | Fix dates |
| LEAVE-004 | 403 | Leave type not allowed | Probation restriction | Wait for probation end |

## Payroll Errors (PAY)

| Code | HTTP | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| PAY-001 | 400 | Run already exists | Duplicate period | Use existing run |
| PAY-002 | 400 | Cannot modify approved | Run is locked | Create adjustment |
| PAY-003 | 400 | Missing salary structure | Employee has no salary | Set up salary first |

## Asset Errors (ASSET)

| Code | HTTP | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| ASSET-001 | 400 | Already assigned | Asset has assignee | Unassign first |
| ASSET-002 | 400 | Invalid warranty date | Before purchase date | Fix dates |

## General Errors

| Code | HTTP | Message | Cause | Resolution |
|------|------|---------|-------|------------|
| GEN-001 | 400 | Validation failed | Invalid input | Check request body |
| GEN-002 | 404 | Not found | Resource doesn't exist | Check ID |
| GEN-003 | 403 | Access denied | No permission | Check role |
| GEN-004 | 429 | Rate limited | Too many requests | Wait and retry |
| GEN-005 | 500 | Internal error | Server error | Contact support |
```

---

### 14.5 Environment Variables (`docs/ENVIRONMENT.md`)

```markdown
## Required Variables

| Variable | Description | Example | Where Used |
|----------|-------------|---------|------------|
| DATABASE_URL | PostgreSQL connection string | postgresql://... | Prisma |
| NEXTAUTH_SECRET | Session encryption key | random-32-char | NextAuth |
| NEXTAUTH_URL | App base URL | https://app.durj.com | NextAuth |

## Authentication

| Variable | Description | Required |
|----------|-------------|----------|
| GOOGLE_CLIENT_ID | Google OAuth client ID | For Google login |
| GOOGLE_CLIENT_SECRET | Google OAuth secret | For Google login |
| AZURE_AD_CLIENT_ID | Azure AD client ID | For Microsoft login |
| AZURE_AD_CLIENT_SECRET | Azure AD secret | For Microsoft login |

## External Services

| Variable | Description | Required |
|----------|-------------|----------|
| STRIPE_SECRET_KEY | Stripe API key | For billing |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing | For billing |
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | For file storage |
| SUPABASE_SERVICE_ROLE_KEY | Supabase admin key | For file storage |
| SENTRY_DSN | Sentry error tracking | Optional |
| UPSTASH_REDIS_URL | Redis for rate limiting | Optional |

## WhatsApp Integration

| Variable | Description | Required |
|----------|-------------|----------|
| WHATSAPP_BUSINESS_ID | Meta Business ID | For WhatsApp |
| WHATSAPP_PHONE_NUMBER_ID | Phone number ID | For WhatsApp |
| WHATSAPP_ACCESS_TOKEN | API access token | For WhatsApp |

## Development Only

| Variable | Description | Default |
|----------|-------------|---------|
| DEV_AUTH_ENABLED | Enable test login | false |
| DEV_TENANT_ID | Default tenant for dev | - |
```

---

### 14.6 Notification Events (`docs/NOTIFICATIONS.md`)

```markdown
## Notification Triggers

| Event | Trigger | Recipients | Channels |
|-------|---------|------------|----------|
| Leave request submitted | Employee submits leave | Manager(s) | In-app, WhatsApp |
| Leave approved | Manager approves | Employee | In-app |
| Leave rejected | Manager rejects | Employee | In-app |
| Asset assigned | Asset assigned to user | Assignee | In-app |
| Asset request approved | Request approved | Requester | In-app |
| Purchase request needs approval | PR submitted | Approver(s) | In-app, WhatsApp |
| Document expiring | 30 days before expiry | HR Admin | In-app |
| Subscription renewing | 7 days before renewal | Admin | In-app |
| Payroll approved | Payroll run approved | All employees | In-app |
| New team member | User joins org | All members | In-app |

## Notification Templates

| Template | Variables | Channel |
|----------|-----------|---------|
| leave_request | {employeeName}, {leaveType}, {dates} | In-app, WhatsApp |
| leave_approved | {leaveType}, {dates}, {approverName} | In-app |
| asset_assigned | {assetName}, {assetCode} | In-app |
| document_expiry | {documentType}, {expiryDate}, {employeeName} | In-app |
```

---

### 14.7 Cron Jobs / Scheduled Tasks (`docs/SCHEDULED_TASKS.md`)

```markdown
## Scheduled Tasks

| Job | Schedule | Description | File |
|-----|----------|-------------|------|
| Subscription Renewal Alerts | Daily 8 AM | Alert before subscription expires | scripts/cron/subscriptionRenewalAlerts.ts |
| Warranty Expiry Alerts | Daily 8 AM | Alert before warranty expires | scripts/cron/warrantyAlerts.ts |
| Employee Document Expiry | Daily 8 AM | Alert before passport/visa expires | scripts/cron/employeeExpiryAlerts.ts |
| Company Document Expiry | Daily 8 AM | Alert before CR/license expires | scripts/cron/companyDocumentExpiryAlerts.ts |
| Purge Old Notifications | Daily 2 AM | Delete notifications > 90 days | scripts/cron/purgeOldNotifications.ts |
| Database Backup | Daily 1 AM | Full database backup | /api/super-admin/backups/cron |

## Vercel Cron Configuration

Located in `vercel.json`:
```json
{
  "crons": [
    { "path": "/api/super-admin/backups/cron", "schedule": "0 1 * * *" }
  ]
}
```
```

---

### 14.8 Third-Party Integrations (`docs/INTEGRATIONS.md`)

```markdown
## Stripe (Billing)

**Purpose**: Subscription billing and payment processing
**Status**: Planned (not fully implemented)
**Files**:
- src/app/api/webhooks/stripe/route.ts
- src/lib/billing/stripe.ts

**Webhook Events**:
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted
- invoice.paid
- invoice.payment_failed

---

## Supabase (File Storage)

**Purpose**: Store uploaded files (documents, images)
**Buckets**:
- `documents` - Employee documents, company docs
- `assets` - Asset images
- `avatars` - User profile pictures

**Access Pattern**: Signed URLs with expiration

---

## WhatsApp Business API

**Purpose**: Send approval notifications via WhatsApp
**Message Types**:
- Approval request with buttons
- Approval confirmation
- Rejection notification

**Files**:
- src/lib/whatsapp/client.ts
- src/lib/whatsapp/templates.ts
- src/app/api/webhooks/whatsapp/route.ts

---

## Sentry (Error Tracking)

**Purpose**: Track and alert on errors
**Configuration**: next.config.ts

---

## Upstash Redis (Rate Limiting)

**Purpose**: Distributed rate limiting
**Fallback**: In-memory rate limiting if Redis unavailable
```

---

### 14.9 Audit Log Events (`docs/AUDIT_EVENTS.md`)

```markdown
## Audited Actions

| Entity | Action | What's Logged |
|--------|--------|---------------|
| User | Login | IP, user agent, success/fail |
| User | Logout | Session end |
| User | Password change | Timestamp |
| User | 2FA enabled/disabled | Timestamp |
| Employee | Created | By whom, initial data |
| Employee | Updated | Changed fields, by whom |
| Employee | Terminated | By whom, reason |
| Leave | Requested | Request details |
| Leave | Approved/Rejected | By whom, comments |
| Asset | Created | Initial data |
| Asset | Assigned | To whom, by whom |
| Asset | Disposed | Reason, by whom |
| Payroll | Run created | Period, by whom |
| Payroll | Approved | By whom |
| Payroll | Paid | Payment date |
| Settings | Changed | What changed, by whom |
| Permissions | Changed | Role changes |

## Audit Log Structure

```typescript
{
  id: string;
  tenantId: string;
  userId: string;        // Who did it
  action: string;        // What they did
  entityType: string;    // On what type
  entityId: string;      // On which record
  oldValue: json;        // Previous state
  newValue: json;        // New state
  ipAddress: string;
  userAgent: string;
  createdAt: DateTime;
}
```
```

---

### 14.10 Module System Documentation (`docs/MODULE_SYSTEM.md`)

```markdown
## Available Modules

| Module ID | Name | Category | Tier Required |
|-----------|------|----------|---------------|
| assets | Asset Management | Operations | FREE |
| subscriptions | Subscription Tracking | Operations | FREE |
| suppliers | Supplier Management | Operations | FREE |
| employees | Employee Directory | HR | STARTER |
| leave | Leave Management | HR | STARTER |
| payroll | Payroll Processing | HR | PROFESSIONAL |
| purchase-requests | Purchase Requests | Projects | PROFESSIONAL |
| tasks | Task Management | Projects | PROFESSIONAL |

## Module Dependencies

| Module | Requires |
|--------|----------|
| leave | employees |
| payroll | employees |
| purchase-requests | suppliers |

## Enabling/Disabling Modules

Modules are enabled per organization via:
- Organization.enabledModules array
- Subscription tier determines available modules

## Route Protection

Middleware checks module access at:
- `/admin/(module-category)/...` routes
- `/api/module-name/...` routes
```

---

### 14.11 Data Retention & Backup (`docs/DATA_RETENTION.md`)

```markdown
## Retention Policies

| Data Type | Retention Period | Action After |
|-----------|------------------|--------------|
| Notifications | 90 days | Auto-delete |
| Audit logs | 2 years | Archive |
| Deleted employees | 7 years | Required by law |
| Payroll records | 7 years | Required by law |
| Session data | 30 days | Auto-expire |
| Failed login attempts | 30 days | Auto-delete |

## Backup Schedule

| Backup Type | Frequency | Retention |
|-------------|-----------|-----------|
| Full database | Daily | 30 days |
| Transaction logs | Hourly | 7 days |
| File storage | Daily | 30 days |

## Recovery Procedures

1. Database restore from backup
2. File storage restore
3. Verification steps
4. Notification to users
```

---

### 14.12 Known Limitations (`docs/LIMITATIONS.md`)

```markdown
## Current Limitations

| Area | Limitation | Workaround | Planned Fix |
|------|------------|------------|-------------|
| Leave | No partial day leave less than half-day | Request full half-day | TBD |
| Payroll | Single currency per organization | - | Multi-currency support |
| Assets | No bulk assignment | Assign one by one | Bulk action UI |
| Reports | No custom report builder | Export to Excel | Report builder |
| Mobile | No native mobile app | Responsive web | Mobile app |
| Offline | No offline support | Requires internet | PWA support |
| Languages | English only | - | Arabic, French |
| Time zones | Organization-level only | - | Per-user timezone |

## Subscription Tier Limits

| Resource | FREE | STARTER | PROFESSIONAL | ENTERPRISE |
|----------|------|---------|--------------|------------|
| Users | 5 | 15 | 50 | Unlimited |
| Assets | 50 | 200 | 1000 | Unlimited |
| Storage | 1 GB | 5 GB | 25 GB | 100 GB |
| API calls/day | 1000 | 10000 | 50000 | Unlimited |
```

---

### 14.13 Glossary (`docs/GLOSSARY.md`)

```markdown
## Business Terms

| Term | Definition |
|------|------------|
| Tenant | An organization using the platform |
| Gratuity | End of service benefit (Qatar Labor Law) |
| WPS | Wage Protection System (Qatar requirement) |
| CR | Commercial Registration |
| Trade License | Business operating license |
| Leave Accrual | Earned leave days over time |
| Carry Forward | Unused leave moved to next year |
| Probation | Initial employment trial period |
| End of Service | Employment termination process |
| Purchase Request | Request to buy goods/services |
| Asset Request | Request for asset assignment |

## Technical Terms

| Term | Definition |
|------|------------|
| tenantId | Organization identifier for data isolation |
| CUID | Collision-resistant unique identifier |
| Prisma | Database ORM used in the project |
| NextAuth | Authentication library |
| Zod | Schema validation library |
```

---

---

## Phase 15: Test Coverage Verification & Creation

### Goal

Ensure every feature, business rule, and critical flow has proper test coverage. Review existing tests for correctness, and create missing tests.

---

### 15.1 Test Inventory

First, audit existing tests:

| Test Type | Location | Current Count | Target |
|-----------|----------|---------------|--------|
| Unit Tests | `tests/unit/` | ? | 80%+ coverage |
| Integration Tests | `tests/integration/` | ? | All API routes |
| Security Tests | `tests/security/` | ? | All auth flows |
| E2E Tests | `tests/e2e/` | ? | All critical user journeys |

---

### 15.2 Unit Tests Required

#### Business Logic (`tests/unit/lib/`)

| Module | File to Test | Tests Required |
|--------|--------------|----------------|
| **Leave** | `leave-utils.ts` | calculateLeaveDays, checkOverlap, calculateAccrual, checkBalance |
| **Payroll** | `gratuity.ts` | calculateGratuity (various years of service), Qatar Labor Law compliance |
| **Payroll** | `utils.ts` | calculateNetSalary, calculateDeductions, calculateOvertimePay |
| **Payroll** | `leave-deduction.ts` | calculateLeaveDeduction, unpaidLeaveDeduction |
| **Payroll** | `wps.ts` | generateWPSFile, validateWPSFormat |
| **Assets** | `depreciation.ts` | straightLineDepreciation, decliningBalanceDepreciation |
| **Assets** | `asset-history.ts` | createHistoryEntry, trackChanges |
| **Subscriptions** | `subscription-utils.ts` | calculateRenewalDate, calculateCost |
| **Approvals** | `approval-utils.ts` | getNextApprover, checkApprovalChain |
| **Auth** | `password-validation.ts` | validatePasswordStrength, checkComplexity |
| **Auth** | `backup-codes.ts` | generateBackupCodes, validateBackupCode |

#### Validation Schemas (`tests/unit/validations/`)

| Schema | Tests Required |
|--------|----------------|
| `leave.ts` | Valid/invalid dates, balance checks, half-day validation |
| `payroll.ts` | Salary ranges, loan amounts, percentage validations |
| `asset.ts` | Warranty > purchase date, required fields |
| `employee.ts` | Email format, date validations, required fields |
| `auth.ts` | Password complexity, email format |

#### Utilities (`tests/unit/utils/`)

| Utility | Tests Required |
|---------|----------------|
| `prisma-tenant.ts` | Tenant isolation, query filtering |
| `rate-limit.ts` | Token bucket algorithm, limit enforcement |
| `encryption.ts` | Encrypt/decrypt roundtrip |

---

### 15.3 Integration Tests Required (`tests/integration/`)

#### API Route Tests

| API Category | Endpoints | Tests Required |
|--------------|-----------|----------------|
| **Auth** | `/api/auth/*` | Login success/fail, signup, password reset, 2FA flow |
| **Leave** | `/api/leave/requests/*` | Create, approve, reject, cancel, overlap rejection |
| **Leave** | `/api/leave/balances/*` | Get balance, update balance |
| **Leave** | `/api/leave/types/*` | CRUD operations |
| **Payroll** | `/api/payroll/runs/*` | Create run, submit, approve, pay workflow |
| **Payroll** | `/api/payroll/loans/*` | Create, pause, resume, write-off |
| **Payroll** | `/api/payroll/payslips/*` | Generate, retrieve |
| **Assets** | `/api/assets/*` | CRUD, assign, unassign, depreciation calc |
| **Asset Requests** | `/api/asset-requests/*` | Create, approve, accept, decline |
| **Subscriptions** | `/api/subscriptions/*` | CRUD, cancel, reactivate |
| **Suppliers** | `/api/suppliers/*` | CRUD, approve, reject |
| **Purchase Requests** | `/api/purchase-requests/*` | CRUD, status transitions |
| **Employees** | `/api/employees/*` | CRUD, document expiry |
| **Users** | `/api/users/*` | CRUD, role changes |
| **Approvals** | `/api/approval-steps/*` | Approve, reject, delegate |

#### Test Scenarios Per Endpoint

```typescript
// Example: Leave Request API Tests
describe('POST /api/leave/requests', () => {
  it('should create leave request with valid data');
  it('should reject if insufficient balance');
  it('should reject if dates overlap existing request');
  it('should reject if end date before start date');
  it('should reject if leave type not allowed during probation');
  it('should require authentication');
  it('should isolate by tenant');
});

describe('POST /api/leave/requests/[id]/approve', () => {
  it('should approve request and deduct balance');
  it('should reject if user is not approver');
  it('should reject if already approved/rejected');
  it('should send notification to requester');
  it('should create audit log entry');
});
```

---

### 15.4 Security Tests Required (`tests/security/`)

| Category | Tests Required |
|----------|----------------|
| **Authentication** | Invalid credentials, account lockout, brute force protection |
| **Authorization** | Role-based access, IDOR prevention, cross-tenant access |
| **Session** | Session expiry, session invalidation, concurrent sessions |
| **2FA** | Valid/invalid codes, backup codes, rate limiting |
| **Input Validation** | SQL injection, XSS, command injection |
| **Rate Limiting** | Endpoint rate limits, tenant isolation |
| **CSRF** | Token validation, origin checking |

---

### 15.5 E2E Tests Required (`tests/e2e/`)

#### Critical User Journeys

| Journey | Steps to Test |
|---------|---------------|
| **User Signup & Onboarding** | Sign up → Create org → Complete onboarding → Access dashboard |
| **Employee Leave Flow** | Login → Request leave → Manager approves → Balance updated |
| **Leave Rejection Flow** | Login → Request leave → Manager rejects → Employee notified |
| **Payroll Run** | Create run → Add employees → Submit → Approve → Mark paid |
| **Asset Assignment** | Create asset → Assign to employee → Verify history |
| **Asset Request Flow** | Employee requests → Manager approves → Admin accepts → Asset assigned |
| **Purchase Request Flow** | Create PR → Submit → Approval chain → Complete |
| **Supplier Onboarding** | Register supplier → Admin approves → Supplier active |
| **Password Reset** | Forgot password → Email sent → Reset link → New password |
| **2FA Setup** | Enable 2FA → Scan QR → Verify code → Login with 2FA |

#### E2E Test Template

```typescript
// tests/e2e/leave-request-flow.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Leave Request Flow', () => {
  test('employee can request leave and manager can approve', async ({ page }) => {
    // Step 1: Employee logs in
    await page.goto('/login');
    await page.fill('[name="email"]', 'employee@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Step 2: Navigate to leave request
    await page.click('text=Leave');
    await page.click('text=Request Leave');

    // Step 3: Fill leave request form
    await page.selectOption('[name="leaveType"]', 'Annual');
    await page.fill('[name="startDate"]', '2025-02-01');
    await page.fill('[name="endDate"]', '2025-02-03');
    await page.click('text=Submit');

    // Step 4: Verify request created
    await expect(page.locator('text=Request submitted')).toBeVisible();

    // Step 5: Manager logs in and approves
    await page.click('text=Logout');
    await page.goto('/login');
    await page.fill('[name="email"]', 'manager@test.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Step 6: Navigate to pending approvals
    await page.click('text=Approvals');
    await page.click('text=Approve');

    // Step 7: Verify approval
    await expect(page.locator('text=Approved')).toBeVisible();
  });
});
```

---

### 15.6 Test Data Setup

#### Fixtures Required

```typescript
// tests/fixtures/test-data.ts
export const testOrganization = {
  id: 'test-org-id',
  name: 'Test Organization',
  slug: 'test-org',
  subscriptionTier: 'PROFESSIONAL',
  enabledModules: ['employees', 'leave', 'payroll', 'assets'],
};

export const testUsers = {
  admin: { email: 'admin@test.com', role: 'ADMIN' },
  manager: { email: 'manager@test.com', role: 'MANAGER' },
  employee: { email: 'employee@test.com', role: 'MEMBER' },
};

export const testLeaveTypes = [
  { name: 'Annual Leave', daysPerYear: 21, requiresApproval: true },
  { name: 'Sick Leave', daysPerYear: 14, requiresApproval: true },
];
```

#### Database Seeding for Tests

```typescript
// tests/setup/seed-test-db.ts
async function seedTestDatabase() {
  // Create test organization
  // Create test users with roles
  // Create leave types
  // Create sample employees
  // Create sample assets
}
```

---

### 15.7 Test Execution Checklist

For each module, verify:

- [ ] **Unit tests exist** for all business logic functions
- [ ] **Unit tests pass** with correct assertions
- [ ] **Edge cases covered** (null, empty, boundary values)
- [ ] **Error cases covered** (invalid input, unauthorized)
- [ ] **Integration tests exist** for all API endpoints
- [ ] **Auth/authz tested** (authenticated, authorized, forbidden)
- [ ] **Tenant isolation tested** (cannot access other tenant data)
- [ ] **E2E tests exist** for critical user flows
- [ ] **E2E tests pass** in CI environment

---

### 15.8 Coverage Targets

| Category | Current | Target | Action if Below |
|----------|---------|--------|-----------------|
| Statements | ? | 70% | Create missing tests |
| Branches | ? | 60% | Add edge case tests |
| Functions | ? | 75% | Test untested functions |
| Lines | ? | 70% | Increase coverage |

---

### 15.9 Missing Tests Template

When creating new tests, use this format:

```typescript
/**
 * @file [test-file-name].test.ts
 * @description Tests for [module/feature]
 * @covers [file being tested]
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('[Module] - [Feature]', () => {
  beforeEach(async () => {
    // Setup test data
  });

  afterEach(async () => {
    // Cleanup
  });

  describe('[Function/Endpoint]', () => {
    it('should [expected behavior] when [condition]', async () => {
      // Arrange
      const input = {};

      // Act
      const result = await functionUnderTest(input);

      // Assert
      expect(result).toEqual(expected);
    });

    it('should throw error when [invalid condition]', async () => {
      // Arrange
      const invalidInput = {};

      // Act & Assert
      await expect(functionUnderTest(invalidInput))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

---

### 15.10 Test Review Findings

Document test issues in `docs/TEST_REVIEW.md`:

---

## Phase 16: Generate Final HTML Report

### Purpose

Create a comprehensive, human-readable HTML report summarizing the entire cleanup process, all findings, changes made, and documentation created.

### Output File

Generate `CLEANUP_REPORT.html` at project root.

### Report Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SME++ Production Cleanup Report</title>
  <style>
    :root {
      --primary: #2563eb;
      --success: #16a34a;
      --warning: #d97706;
      --danger: #dc2626;
      --gray: #6b7280;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      background: #f9fafb;
    }
    h1, h2, h3 { color: #111827; }
    .header {
      background: linear-gradient(135deg, #1e40af, #3b82f6);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin: 2rem 0;
    }
    .stat-card {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      text-align: center;
    }
    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      color: var(--primary);
    }
    .section {
      background: white;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
    }
    th, td {
      padding: 0.75rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }
    th { background: #f3f4f6; font-weight: 600; }
    .badge {
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 500;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    .progress-bar {
      background: #e5e7eb;
      border-radius: 9999px;
      height: 8px;
      overflow: hidden;
    }
    .progress-fill {
      background: var(--success);
      height: 100%;
      transition: width 0.3s;
    }
    .toc {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 8px;
      margin-bottom: 2rem;
    }
    .toc a {
      color: var(--primary);
      text-decoration: none;
    }
    .toc a:hover { text-decoration: underline; }
    code {
      background: #f3f4f6;
      padding: 0.2rem 0.4rem;
      border-radius: 4px;
      font-size: 0.875rem;
    }
    .collapsible {
      cursor: pointer;
      padding: 1rem;
      background: #f3f4f6;
      border: none;
      width: 100%;
      text-align: left;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    .collapsible:after {
      content: '▼';
      float: right;
    }
    .collapsible.active:after {
      content: '▲';
    }
    .content {
      display: none;
      padding: 1rem;
      background: white;
      border-radius: 0 0 8px 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🚀 SME++ Production Cleanup Report</h1>
    <p>Generated: [DATE] | Duration: [X] sessions | [X] hours total</p>
  </div>

  <nav class="toc">
    <h3>📋 Table of Contents</h3>
    <ol>
      <li><a href="#summary">Executive Summary</a></li>
      <li><a href="#phases">Phase Completion Status</a></li>
      <li><a href="#files">Files Processed</a></li>
      <li><a href="#business-rules">Business Rules Documented</a></li>
      <li><a href="#issues">Issues Found</a></li>
      <li><a href="#security">Security Assessment</a></li>
      <li><a href="#performance">Performance Assessment</a></li>
      <li><a href="#tests">Test Coverage</a></li>
      <li><a href="#documentation">Documentation Created</a></li>
      <li><a href="#backlog">Backlog Items</a></li>
      <li><a href="#recommendations">Recommendations</a></li>
    </ol>
  </nav>

  <!-- Section 1: Executive Summary -->
  <section id="summary" class="section">
    <h2>📊 Executive Summary</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Files Reviewed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Files Modified</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Files Deleted</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Issues Found</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Issues Fixed</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Business Rules</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]%</div>
        <div>Test Coverage</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Backlog Items</div>
      </div>
    </div>
  </section>

  <!-- Section 2: Phase Completion -->
  <section id="phases" class="section">
    <h2>✅ Phase Completion Status</h2>
    <table>
      <thead>
        <tr>
          <th>Phase</th>
          <th>Description</th>
          <th>Status</th>
          <th>Completed</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>1</td>
          <td>Delete Temporary Files</td>
          <td><span class="badge badge-success">Completed</span></td>
          <td>[Date]</td>
        </tr>
        <!-- Repeat for all 16 phases -->
      </tbody>
    </table>
  </section>

  <!-- Section 3: Files Processed -->
  <section id="files" class="section">
    <h2>📁 Files Processed</h2>
    <h3>By Category</h3>
    <table>
      <thead>
        <tr>
          <th>Category</th>
          <th>Total Files</th>
          <th>Reviewed</th>
          <th>Modified</th>
          <th>Deleted</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>API Routes</td>
          <td>[X]</td>
          <td>[X]</td>
          <td>[X]</td>
          <td>[X]</td>
        </tr>
        <!-- More categories -->
      </tbody>
    </table>
  </section>

  <!-- Section 4: Business Rules -->
  <section id="business-rules" class="section">
    <h2>📜 Business Rules Documented</h2>
    <button class="collapsible">HR Module - Leave ([X] rules)</button>
    <div class="content">
      <table>
        <thead>
          <tr>
            <th>Rule</th>
            <th>Type</th>
            <th>File</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Cannot request leave exceeding balance</td>
            <td>Validation</td>
            <td><code>leave-utils.ts:45</code></td>
          </tr>
          <!-- More rules -->
        </tbody>
      </table>
    </div>
    <!-- Repeat for each module -->
  </section>

  <!-- Section 5: Issues Found -->
  <section id="issues" class="section">
    <h2>🔍 Issues Found</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number" style="color: var(--danger)">[X]</div>
        <div>Critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--warning)">[X]</div>
        <div>High</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--gray)">[X]</div>
        <div>Medium</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>Low</div>
      </div>
    </div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Issue</th>
          <th>Severity</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>BUG-001</td>
          <td>[Description]</td>
          <td><span class="badge badge-danger">Critical</span></td>
          <td><span class="badge badge-success">Fixed</span></td>
        </tr>
        <!-- More issues -->
      </tbody>
    </table>
  </section>

  <!-- Section 6: Security Assessment -->
  <section id="security" class="section">
    <h2>🔒 Security Assessment</h2>
    <h3>Score: [X]/10</h3>
    <div class="progress-bar">
      <div class="progress-fill" style="width: [X]%"></div>
    </div>
    <h3>Findings</h3>
    <table>
      <thead>
        <tr>
          <th>Area</th>
          <th>Status</th>
          <th>Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Input Validation</td>
          <td><span class="badge badge-success">Good</span></td>
          <td>Zod schemas on all inputs</td>
        </tr>
        <tr>
          <td>SQL Injection</td>
          <td><span class="badge badge-success">Protected</span></td>
          <td>Using Prisma ORM</td>
        </tr>
        <!-- More areas -->
      </tbody>
    </table>
  </section>

  <!-- Section 7: Performance Assessment -->
  <section id="performance" class="section">
    <h2>⚡ Performance Assessment</h2>
    <h3>Score: [X]/10</h3>
    <table>
      <thead>
        <tr>
          <th>Area</th>
          <th>Status</th>
          <th>Recommendation</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Database Queries</td>
          <td><span class="badge badge-warning">Needs Work</span></td>
          <td>Add select() to [X] queries</td>
        </tr>
        <!-- More areas -->
      </tbody>
    </table>
  </section>

  <!-- Section 8: Test Coverage -->
  <section id="tests" class="section">
    <h2>🧪 Test Coverage</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number">[X]%</div>
        <div>Statements</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]%</div>
        <div>Branches</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]%</div>
        <div>Functions</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]%</div>
        <div>Lines</div>
      </div>
    </div>
    <h3>Tests by Module</h3>
    <table>
      <thead>
        <tr>
          <th>Module</th>
          <th>Unit</th>
          <th>Integration</th>
          <th>E2E</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Leave</td>
          <td><span class="badge badge-success">12 tests</span></td>
          <td><span class="badge badge-success">8 tests</span></td>
          <td><span class="badge badge-success">3 tests</span></td>
        </tr>
        <!-- More modules -->
      </tbody>
    </table>
  </section>

  <!-- Section 9: Documentation Created -->
  <section id="documentation" class="section">
    <h2>📚 Documentation Created</h2>
    <table>
      <thead>
        <tr>
          <th>Document</th>
          <th>Purpose</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>docs/API_REFERENCE.md</code></td>
          <td>API endpoint documentation</td>
          <td><span class="badge badge-success">Created</span></td>
        </tr>
        <tr>
          <td><code>docs/BUSINESS_RULES.md</code></td>
          <td>Business rules by module</td>
          <td><span class="badge badge-success">Created</span></td>
        </tr>
        <!-- More docs -->
      </tbody>
    </table>
  </section>

  <!-- Section 10: Backlog -->
  <section id="backlog" class="section">
    <h2>📝 Backlog Items</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-number" style="color: var(--danger)">[X]</div>
        <div>P0 - Critical</div>
      </div>
      <div class="stat-card">
        <div class="stat-number" style="color: var(--warning)">[X]</div>
        <div>P1 - High</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>P2 - Medium</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">[X]</div>
        <div>P3 - Low</div>
      </div>
    </div>
    <h3>Top Priority Items</h3>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Description</th>
          <th>Priority</th>
          <th>Effort</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>FEAT-001</td>
          <td>[Description]</td>
          <td><span class="badge badge-danger">P0</span></td>
          <td>4h</td>
        </tr>
        <!-- More items -->
      </tbody>
    </table>
  </section>

  <!-- Section 11: Recommendations -->
  <section id="recommendations" class="section">
    <h2>💡 Recommendations</h2>
    <h3>Before Production Launch</h3>
    <ul>
      <li>✅ [Completed item]</li>
      <li>⬜ [Pending item from backlog]</li>
    </ul>
    <h3>Post-Launch Priority</h3>
    <ol>
      <li>[Recommendation 1]</li>
      <li>[Recommendation 2]</li>
    </ol>
    <h3>Future Improvements</h3>
    <ul>
      <li>[Future item 1]</li>
      <li>[Future item 2]</li>
    </ul>
  </section>

  <footer style="text-align: center; padding: 2rem; color: var(--gray);">
    <p>Generated by Claude Code | SME++ (Durj) Production Cleanup</p>
    <p>Report Date: [DATE]</p>
  </footer>

  <script>
    // Collapsible sections
    document.querySelectorAll('.collapsible').forEach(btn => {
      btn.addEventListener('click', function() {
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        content.style.display = content.style.display === 'block' ? 'none' : 'block';
      });
    });
  </script>
</body>
</html>
```

---

### Report Sections

| Section | Content |
|---------|---------|
| **Executive Summary** | High-level stats (files, issues, coverage) |
| **Phase Completion** | Status of all 16 phases |
| **Files Processed** | Breakdown by category |
| **Business Rules** | All rules documented per module |
| **Issues Found** | Bugs, gaps, concerns with severity |
| **Security Assessment** | Security score and findings |
| **Performance Assessment** | Performance score and recommendations |
| **Test Coverage** | Coverage stats and tests by module |
| **Documentation Created** | List of all docs generated |
| **Backlog Items** | Deferred work by priority |
| **Recommendations** | Action items for launch and post-launch |

---

### Generating the Report

At the end of cleanup, generate the report by:

1. **Collect data** from all tracking files:
   - `CLEANUP_PROGRESS.md` - Phase completion
   - `REFACTORING_LOG.md` - Changes made
   - `BACKLOG.md` - Deferred items
   - `docs/BUSINESS_RULES.md` - Rules documented
   - `docs/REVIEW_FINDINGS.md` - Issues found
   - `docs/TEST_REVIEW.md` - Test coverage

2. **Populate the HTML template** with actual values

3. **Save as** `CLEANUP_REPORT.html`

4. **Open in browser** to review

---

### Report Generation Prompt

Use this prompt to generate the final report:

```
Generate the final HTML cleanup report.

1. Read all tracking files:
   - CLEANUP_PROGRESS.md
   - REFACTORING_LOG.md
   - BACKLOG.md
   - docs/BUSINESS_RULES.md
   - docs/REVIEW_FINDINGS.md
   - docs/TEST_REVIEW.md

2. Count and summarize:
   - Files reviewed/modified/deleted
   - Issues found by severity
   - Business rules by module
   - Test coverage percentages
   - Backlog items by priority

3. Generate CLEANUP_REPORT.html using the template in the plan

4. Include all actual data from the cleanup process
```

---

### 15.10 Test Review Findings

Document test issues in `docs/TEST_REVIEW.md`:

```markdown
## Test Gaps Found

| Module | Missing Test | Priority | Status |
|--------|--------------|----------|--------|
| Leave | Overlap check edge cases | High | TODO |
| Payroll | Gratuity calculation for < 1 year | Medium | TODO |

## Tests Needing Fixes

| Test File | Issue | Fix Required |
|-----------|-------|--------------|
| leave.test.ts | Outdated assertions | Update expected values |

## Flaky Tests

| Test | Issue | Solution |
|------|-------|----------|
| e2e/login.spec.ts | Timeout on slow CI | Increase timeout |
```

---

### 14.14 Changelog (`docs/CHANGELOG.md`)

```markdown
## Version History

### v1.0.0 (Production Release) - [Date]

**Features**:
- Multi-tenant architecture
- Employee management
- Leave management with Qatar Labor Law compliance
- Payroll with WPS export
- Asset management with depreciation
- Subscription tracking
- Supplier management
- Purchase requests
- WhatsApp notifications
- Two-factor authentication

**Modules**:
- HR: Employees, Leave, Payroll
- Operations: Assets, Subscriptions, Suppliers
- Projects: Purchase Requests, Tasks (basic)

---

### Pre-release History

Document major development milestones...
```

---

## Notes / Additional Details

<!-- Add your notes here -->

---

## Potential Additions (Not Yet Included)

These items could be added to the plan if needed:

### Development & Code Quality

| Item | Description | Priority |
|------|-------------|----------|
| **Storybook Setup** | Component documentation with visual examples | Low |
| **Code Style Guide** | Document coding conventions and patterns | Medium |
| **Dependency Audit Tool** | Add `depcheck` to find unused packages | Low |
| **License Compliance Check** | Verify all deps have compatible licenses | Low |

### Infrastructure & DevOps

| Item | Description | Priority |
|------|-------------|----------|
| **Docker Setup** | Create Dockerfile for containerized deployment | Medium |
| **Kubernetes Manifests** | K8s deployment configs (if using K8s) | Low |
| **Load Testing** | Add k6/Artillery load tests | Medium |
| **Blue-Green Deployment** | Zero-downtime deployment strategy | Low |
| **Feature Flags Service** | Runtime feature toggles (LaunchDarkly, etc.) | Low |

### Monitoring & Alerting

| Item | Description | Priority |
|------|-------------|----------|
| **Alerting Rules** | Define Sentry/PagerDuty alert thresholds | Medium |
| **Runbook for Incidents** | Step-by-step incident response guide | Medium |
| **Dashboard Setup** | Grafana/Datadog dashboard configs | Low |
| **SLA Documentation** | Define uptime and response time targets | Low |

### Security

| Item | Description | Priority |
|------|-------------|----------|
| **Penetration Testing Prep** | Prepare for security audit | Medium |
| **OWASP Checklist** | Verify against OWASP Top 10 | High |
| **SOC2 Compliance Prep** | If targeting enterprise customers | Low |
| **GDPR Compliance Check** | Data privacy verification | Medium |

### User Documentation

| Item | Description | Priority |
|------|-------------|----------|
| **User Guide** | End-user documentation | Medium |
| **Admin Guide** | Organization admin documentation | Medium |
| **FAQ** | Common questions and answers | Low |
| **Video Tutorials** | Screen recordings of key flows | Low |

### Internationalization

| Item | Description | Priority |
|------|-------------|----------|
| **i18n Setup** | Add translation framework | Medium |
| **RTL Support** | Right-to-left language support (Arabic) | Medium |
| **Date/Number Localization** | Locale-aware formatting | Medium |

### Analytics & Insights

| Item | Description | Priority |
|------|-------------|----------|
| **Usage Analytics** | Track feature usage (PostHog, Mixpanel) | Low |
| **Error Analytics** | Aggregate error patterns | Medium |
| **Performance Metrics** | Core Web Vitals tracking | Medium |

---

## Plan Versioning

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2024-12-30 | Initial plan with 16 phases |

---

## How to Start

1. **Create tracking files first**:
   ```bash
   # Run these before starting cleanup
   touch CLEANUP_PROGRESS.md BACKLOG.md DECISIONS.md
   ```

2. **Copy the resume prompt** from the plan and start Phase 1

3. **Update progress** as you go

4. **Ask questions** when decisions are needed

5. **Commit checkpoints** after each phase



