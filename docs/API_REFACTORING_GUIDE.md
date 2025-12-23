# API Route Refactoring Guide

## Using `withErrorHandler` Wrapper

All API routes should use the `withErrorHandler` utility for consistent error handling, authentication, and logging.

## Pattern

### ❌ OLD Pattern (Manual Auth & Error Handling)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { Role } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    // Manual auth check
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== Role.ADMIN) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Your logic here
    const data = await fetchSomeData();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### ✅ NEW Pattern (Using withErrorHandler)
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { withErrorHandler } from '@/lib/http/handler';

async function getDataHandler(request: NextRequest) {
  // Your logic here - NO try/catch, NO auth check needed
  const data = await fetchSomeData();

  return NextResponse.json(data);
}

// Wrap with error handler and specify auth requirements
export const GET = withErrorHandler(getDataHandler, { requireAdmin: true });
```

## Handler Options

```typescript
interface HandlerOptions {
  requireAuth?: boolean;      // Requires authenticated user
  requireAdmin?: boolean;     // Requires ADMIN role
  skipLogging?: boolean;      // Skip request logging
}
```

### Examples

**Admin-only endpoint:**
```typescript
export const GET = withErrorHandler(handler, { requireAdmin: true });
```

**Authenticated users (any role):**
```typescript
export const GET = withErrorHandler(handler, { requireAuth: true });
```

**Public endpoint (still gets error handling & logging):**
```typescript
export const GET = withErrorHandler(handler);
```

**Public endpoint without logging:**
```typescript
export const GET = withErrorHandler(handler, { skipLogging: true });
```

## Benefits

1. **Consistent Error Responses** - All errors formatted the same way
2. **Request Tracing** - Every request gets a unique `x-request-id` header
3. **Automatic Logging** - Request/response times, user info, errors logged
4. **Cleaner Code** - 50% less boilerplate per route
5. **Security** - Centralized auth logic, harder to forget checks
6. **Debugging** - Stack traces and context automatically logged

## Accessing Session in Handler

If you need the session for logging or business logic:

```typescript
async function handler(request: NextRequest) {
  // Session is already validated by withErrorHandler
  const session = await getServerSession(authOptions);

  // Use session.user.id for logging, etc.
  await logAction(session!.user.id, 'ACTION', 'Entity', id);

  return NextResponse.json(data);
}
```

## Files Updated

- ✅ `src/app/api/users/route.ts` - Complete example with GET and POST
- 🔄 Remaining 60+ routes to be updated

## TODO

Apply this pattern to all routes in:
- `src/app/api/assets/**`
- `src/app/api/subscriptions/**`
- `src/app/api/suppliers/**`
- `src/app/api/accreditation/**`
- `src/app/api/admin/**`
