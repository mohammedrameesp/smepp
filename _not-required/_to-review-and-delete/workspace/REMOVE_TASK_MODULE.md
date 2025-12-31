# Task/Kanban Module Removal Prompt

Use this prompt with Claude Code to completely remove the Task/Kanban board module from DAMP.

---

## Prompt

```
I need to completely remove the Task/Kanban board module from this codebase. This includes boards, columns, tasks, assignees, labels, checklists, comments, attachments, and all related features.

IMPORTANT RULES:
1. Remove ALL task and board related functionality
2. Update Project model to remove taskBoards relation
3. Update User model to remove task-related relations
4. Update sidebar navigation to remove Task links

## What to Remove

### 1. Prisma Schema (prisma/schema.prisma)

DELETE these models entirely:
- Board
- BoardMember
- TaskColumn
- Task
- TaskAssignee
- TaskLabel
- TaskLabelAssignment
- TaskComment
- TaskAttachment
- TaskHistory

DELETE these enums:
- BoardMemberRole
- TaskPriority

MODIFY the User model - remove these relations:
- boardMemberships BoardMember[]
- createdBoards Board[]
- taskAssignments TaskAssignee[] @relation("TaskAssignments")
- assignedTasks TaskAssignee[] @relation("TaskAssigner")
- taskComments TaskComment[]
- taskAttachments TaskAttachment[]
- taskHistory TaskHistory[]

MODIFY the Project model - remove:
- taskBoards Board[] relation

### 2. API Routes to Delete

Delete these entire directories:
- src/app/api/boards/ (entire directory with all subdirectories)
- src/app/api/tasks/ (entire directory with all subdirectories)

### 3. Admin Pages to Delete

Delete these pages/directories:
- src/app/admin/(projects)/tasks/ (entire directory with all subdirectories)

### 4. Components to Delete

Delete these directories/files:
- src/components/tasks/ (entire directory)
- src/components/domains/projects/tasks/ (entire directory)

### 5. Lib Files to Delete

Delete these files/directories:
- src/lib/task-history.ts
- src/lib/domains/projects/tasks/ (entire directory)
- src/lib/validations/tasks.ts
- src/lib/validations/projects/tasks.ts

### 6. Update Sidebar Configuration

Update src/components/layout/sidebar-config.ts:
- Remove 'Task Boards' item from admin sidebar (Projects section)
- Remove 'My Tasks' item from employee sidebar
- Remove Kanban and FolderKanban icon imports if no longer used

### 7. Update Related Files

Check and update any files that import from deleted modules:
- src/lib/validations/projects/index.ts (remove tasks export if exists)
- src/components/domains/projects/index.ts (remove task exports if exists)

### 8. After Code Changes

Run these commands:
1. npx prisma format
2. npx prisma migrate dev --name remove_task_module
3. rm -rf .next (clean build cache)
4. npm run typecheck (fix any TypeScript errors)
5. npm run build (verify build succeeds)

### 9. Verification Checklist

After removal, verify these are GONE:
- [ ] No /admin/tasks route exists
- [ ] No Task Boards link in admin sidebar
- [ ] No My Tasks link in employee sidebar
- [ ] No Board or Task models in Prisma schema
- [ ] No task-related API endpoints
- [ ] Build passes with no errors
- [ ] TypeScript has no errors

After removal, verify these STILL WORK:
- [ ] Projects can still be created and managed
- [ ] Project detail page works (without task boards count)
- [ ] Other modules (Assets, Subscriptions, etc.) work normally
- [ ] Admin and Employee dashboards load correctly

Please proceed with these changes systematically, starting with the Prisma schema, then API routes, then pages and components.
```

---

## Summary of Changes

### Models to DELETE (10 models)
| Model | Purpose | Action |
|-------|---------|--------|
| `Board` | Kanban board container | DELETE |
| `BoardMember` | Board membership/permissions | DELETE |
| `TaskColumn` | Kanban columns (To Do, In Progress, etc.) | DELETE |
| `Task` | Individual task items | DELETE |
| `TaskAssignee` | Task assignments to users | DELETE |
| `TaskLabel` | Custom labels for tasks | DELETE |
| `TaskLabelAssignment` | Label-to-task junction | DELETE |
| `TaskComment` | Task comments | DELETE |
| `TaskAttachment` | Task file attachments | DELETE |
| `TaskHistory` | Task change history | DELETE |

### Enums to DELETE (2 enums)
| Enum | Action |
|------|--------|
| `BoardMemberRole` | DELETE (OWNER, ADMIN, MEMBER, VIEWER) |
| `TaskPriority` | DELETE (LOW, MEDIUM, HIGH, URGENT) |

### User Model Relations to REMOVE
| Relation | Purpose |
|----------|---------|
| `boardMemberships` | Boards user is member of |
| `createdBoards` | Boards created by user |
| `taskAssignments` | Tasks assigned to user |
| `assignedTasks` | Tasks user assigned to others |
| `taskComments` | Comments user made |
| `taskAttachments` | Attachments user uploaded |
| `taskHistory` | Task changes by user |

### Project Model Relations to REMOVE
| Relation | Purpose |
|----------|---------|
| `taskBoards` | Boards linked to project |

---

## Files to DELETE

### API Routes (delete entire directories)
```
src/app/api/boards/
├── route.ts
├── [id]/
│   ├── route.ts
│   ├── members/
│   │   ├── route.ts
│   │   └── [userId]/route.ts
│   ├── columns/
│   │   ├── route.ts
│   │   └── [columnId]/route.ts
│   └── labels/
│       ├── route.ts
│       └── [labelId]/route.ts

src/app/api/tasks/
├── route.ts
├── my-tasks/route.ts
├── [id]/
│   ├── route.ts
│   ├── move/route.ts
│   ├── assignees/route.ts
│   ├── labels/route.ts
│   ├── checklist/
│   │   ├── route.ts
│   │   └── [itemId]/route.ts
│   ├── comments/
│   │   ├── route.ts
│   │   └── [commentId]/route.ts
│   └── attachments/
│       ├── route.ts
│       └── [attachmentId]/route.ts
```

### Admin Pages (delete entire directory)
```
src/app/admin/(projects)/tasks/
├── page.tsx
├── boards/
│   ├── page.tsx
│   ├── new/page.tsx
│   └── [id]/
│       ├── page.tsx
│       ├── list/page.tsx
│       ├── calendar/page.tsx
│       └── settings/page.tsx
```

### Components (delete entire directories)
```
src/components/tasks/
├── board-header.tsx
├── task-card.tsx
├── task-detail-dialog.tsx
├── task-priority-badge.tsx
├── task-quick-add.tsx
└── index.ts (if exists)

src/components/domains/projects/tasks/
├── board-header.tsx
├── task-card.tsx
├── task-detail-dialog.tsx
├── task-priority-badge.tsx
├── task-quick-add.tsx
└── index.ts (if exists)
```

### Lib Files (delete)
```
src/lib/task-history.ts
src/lib/domains/projects/tasks/
src/lib/validations/tasks.ts
src/lib/validations/projects/tasks.ts
```

---

## Files to MODIFY

### Sidebar Configuration
**File:** `src/components/layout/sidebar-config.ts`

Remove from admin sidebar (Projects section):
```typescript
{ label: 'Task Boards', href: '/admin/tasks', icon: Kanban },
```

Remove from employee sidebar:
```typescript
{ label: 'My Tasks', href: '/admin/tasks', icon: Kanban },
```

Remove unused imports:
```typescript
import { Kanban } from 'lucide-react';
// Only if Kanban is not used elsewhere
```

### Project Detail Page
**File:** `src/app/admin/(projects)/projects/[id]/page.tsx`

Remove taskBoards count from _count select and Related Items display.

### Project API Routes
**Files:** `src/app/api/projects/route.ts` and `src/app/api/projects/[id]/route.ts`

Remove taskBoards from _count select queries.

---

## Dependencies to Check

Before removing, verify these packages are only used by Task module:
- `@dnd-kit/core` - Drag and drop for kanban
- `@dnd-kit/sortable` - Sortable lists
- `@dnd-kit/utilities` - DnD utilities

If only used by tasks, consider removing from package.json:
```bash
npm uninstall @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## Expected Result

After running this prompt:
- No kanban/task board functionality exists
- Projects are simplified (no task board linking)
- Users have no task-related relations
- Sidebar navigation is cleaner
- The codebase is smaller and more focused on core operations (Assets, Subscriptions, Suppliers)

This aligns with the SME Product Strategy recommendation to simplify task management and focus on core business operations.
