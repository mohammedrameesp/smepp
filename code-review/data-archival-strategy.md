# Data Archival & Performance Strategy

**Status**: Future Implementation
**Priority**: Medium (Important for Scale)
**Estimated Effort**: 2-3 weeks
**Created**: 2026-01-07

---

## Problem Statement

As the platform scales to support thousands of organizations, historical data accumulation (especially asset requests, leave requests, and activity logs) will impact:

1. **Query Performance** - Large tables slow down list views and searches
2. **Backup Duration** - Daily backups take longer with larger databases
3. **Storage Costs** - While storage is cheap, inefficiency compounds
4. **Index Maintenance** - More overhead on every insert/update operation

### Example Scenario: Asset Requests

**Per Asset Request Record**: ~2 KB (AssetRequest + AssetRequestHistory)

| Scale | Organizations | Records/Year | 5-Year Total | Storage |
|-------|--------------|--------------|--------------|---------|
| Small | 100 | 50,000 | 250,000 | 500 MB |
| Medium | 500 | 250,000 | 1,250,000 | 2.5 GB |
| Large | 1,000 | 500,000 | 2,500,000 | 5 GB |
| Very Large | 10,000+ | 5,000,000+ | 25,000,000+ | 50+ GB |

**The real issue isn't storage—it's query performance degradation.**

---

## Recommended Solution: Hybrid Archival Strategy

### Phase 1: Database Optimization (Immediate)

#### 1.1 Add Performance Indexes

```prisma
model AssetRequest {
  // ... existing fields ...

  @@index([tenantId, status, createdAt])
  @@index([memberId, status])
  @@index([tenantId, createdAt])
}

model AssetRequestHistory {
  // ... existing fields ...

  @@index([assetRequestId, createdAt])
  @@index([performedById])
}

model LeaveRequest {
  // ... existing fields ...

  @@index([tenantId, status, createdAt])
  @@index([memberId, status])
}

model ActivityLog {
  // ... existing fields ...

  @@index([tenantId, createdAt])
  @@index([performedById, createdAt])
}
```

**Impact**: 10-100x faster queries on large datasets

---

### Phase 2: Data Retention Configuration (Medium Priority)

#### 2.1 Organization-Level Settings

Add to `Organization` model:

```prisma
model Organization {
  // ... existing fields ...

  // Data Retention Settings
  assetRequestRetentionMonths  Int @default(36)  // 3 years
  leaveRequestRetentionMonths  Int @default(60)  // 5 years (compliance)
  activityLogRetentionMonths   Int @default(24)  // 2 years
  enableAutoArchival           Boolean @default(true)
}
```

#### 2.2 Admin UI for Configuration

Location: `/admin/(system)/settings/data-retention`

- Configurable retention periods per data type
- Warning if below compliance minimums
- Preview of records that will be archived
- One-click manual archive trigger

---

### Phase 3: Archival Tables (Core Implementation)

#### 3.1 Create Archive Tables

```prisma
// Archived Asset Requests (cold storage)
model AssetRequestArchive {
  id            String   @id // Same ID as original
  tenantId      String

  // All original fields preserved
  originalData  Json     // Full snapshot of original record

  // Archive metadata
  archivedAt    DateTime @default(now())
  archivedById  String?

  @@index([tenantId, archivedAt])
  @@index([id]) // Fast lookup if needed
}

// Archived History (referenced by archive)
model AssetRequestHistoryArchive {
  id                    String   @id
  assetRequestArchiveId String

  originalData          Json
  archivedAt            DateTime @default(now())

  @@index([assetRequestArchiveId])
}
```

**Why JSON storage for archives?**
- Flexible schema evolution
- Smaller storage footprint (compressed JSON)
- Fast bulk operations
- No complex relations to maintain

---

### Phase 4: Automated Archival Job

#### 4.1 Cron Job Configuration

**File**: `src/app/api/cron/archive-old-records/route.ts`

**Schedule**: Monthly (1st of month, 2 AM UTC)

```typescript
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get all organizations with auto-archival enabled
  const orgs = await prisma.organization.findMany({
    where: { enableAutoArchival: true },
    select: {
      id: true,
      name: true,
      assetRequestRetentionMonths: true,
      leaveRequestRetentionMonths: true,
      activityLogRetentionMonths: true,
    },
  });

  const results = [];

  for (const org of orgs) {
    // Archive old asset requests
    const archivedAssetRequests = await archiveAssetRequests(
      org.id,
      org.assetRequestRetentionMonths
    );

    // Archive old leave requests
    const archivedLeaveRequests = await archiveLeaveRequests(
      org.id,
      org.leaveRequestRetentionMonths
    );

    // Archive old activity logs
    const archivedActivityLogs = await archiveActivityLogs(
      org.id,
      org.activityLogRetentionMonths
    );

    results.push({
      organizationId: org.id,
      organizationName: org.name,
      assetRequests: archivedAssetRequests,
      leaveRequests: archivedLeaveRequests,
      activityLogs: archivedActivityLogs,
    });
  }

  return NextResponse.json({
    success: true,
    archivedAt: new Date().toISOString(),
    results,
  });
}
```

#### 4.2 Archive Function Implementation

```typescript
async function archiveAssetRequests(
  tenantId: string,
  retentionMonths: number
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);

  // Find completed requests older than retention period
  const oldRequests = await prisma.assetRequest.findMany({
    where: {
      tenantId,
      status: {
        in: ['APPROVED', 'REJECTED', 'ACCEPTED', 'DECLINED', 'CANCELLED'],
      },
      processedAt: {
        lt: cutoffDate,
      },
    },
    include: {
      history: true,
    },
  });

  // Transaction: Archive + Delete
  const archived = await prisma.$transaction(async (tx) => {
    // 1. Create archive records
    const archiveRecords = oldRequests.map((req) => ({
      id: req.id,
      tenantId: req.tenantId,
      originalData: req,
      archivedAt: new Date(),
    }));

    await tx.assetRequestArchive.createMany({
      data: archiveRecords,
      skipDuplicates: true,
    });

    // 2. Archive history entries
    const historyArchives = oldRequests.flatMap((req) =>
      req.history.map((h) => ({
        id: h.id,
        assetRequestArchiveId: req.id,
        originalData: h,
        archivedAt: new Date(),
      }))
    );

    if (historyArchives.length > 0) {
      await tx.assetRequestHistoryArchive.createMany({
        data: historyArchives,
        skipDuplicates: true,
      });
    }

    // 3. Delete original records (cascades to history via schema)
    await tx.assetRequest.deleteMany({
      where: {
        id: { in: oldRequests.map((r) => r.id) },
      },
    });

    return oldRequests.length;
  });

  return archived;
}
```

---

### Phase 5: Archive Access UI

#### 5.1 Archive Viewer

**Route**: `/admin/(operations)/asset-requests/archive`

**Features**:
- Search archived requests by date range, member, asset
- View full details (restored from JSON)
- Export to CSV for compliance
- Restore to active if needed (rare)

**Implementation**:
```typescript
// API: GET /api/asset-requests/archive
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tenantId = request.headers.get('x-tenant-id');
  const page = parseInt(searchParams.get('p') || '1');
  const pageSize = 50;

  const archives = await prisma.assetRequestArchive.findMany({
    where: { tenantId },
    orderBy: { archivedAt: 'desc' },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  return NextResponse.json({
    archives: archives.map(a => ({
      ...a.originalData,
      archivedAt: a.archivedAt,
    })),
    page,
    pageSize,
  });
}
```

---

## Implementation Phases & Timeline

### Phase 1: Quick Wins (Week 1)
- ✅ Add database indexes
- ✅ Test query performance improvements
- **Effort**: 1-2 days
- **Impact**: Immediate performance boost

### Phase 2: Configuration (Week 1-2)
- ✅ Add retention settings to Organization model
- ✅ Create admin settings UI
- ✅ Document default retention policies
- **Effort**: 3-4 days
- **Impact**: Enables future archival

### Phase 3: Archive Tables (Week 2)
- ✅ Create archive table schemas
- ✅ Write migration
- ✅ Test on sample data
- **Effort**: 2-3 days
- **Impact**: Foundation for archival

### Phase 4: Automated Job (Week 2-3)
- ✅ Implement archive functions
- ✅ Create cron endpoint
- ✅ Add to vercel.json schedule
- ✅ Test with staging data
- **Effort**: 4-5 days
- **Impact**: Automated cleanup

### Phase 5: Archive UI (Week 3)
- ✅ Build archive viewer
- ✅ Add search/filter
- ✅ Export functionality
- **Effort**: 3-4 days
- **Impact**: Compliance & audit access

---

## Compliance Considerations

### Data Retention Laws by Region

| Region | Minimum Retention | Notes |
|--------|------------------|-------|
| Qatar | 5 years | Labor Law compliance |
| EU/GDPR | As needed | Right to erasure applies |
| US | Varies by state | 3-7 years typical |
| Global | 3+ years | Best practice for audits |

### Recommended Defaults

```typescript
const DEFAULT_RETENTION = {
  assetRequests: 36,      // 3 years (standard)
  leaveRequests: 60,      // 5 years (labor law)
  activityLogs: 24,       // 2 years (operational)
  payrollRecords: 84,     // 7 years (tax/legal)
  employeeRecords: 60,    // 5 years (post-termination)
};
```

---

## Monitoring & Alerts

### Metrics to Track

1. **Table Sizes** (via Supabase dashboard)
   - Alert if > 10 GB without archival

2. **Query Performance**
   - P95 latency for list views
   - Alert if > 2 seconds

3. **Archive Job Success**
   - Monthly run confirmation
   - Email report to admins

4. **Storage Growth Rate**
   - Trend analysis
   - Predict when scaling needed

---

## Rollout Strategy

### Step 1: Staging Environment (Month 1)
- Deploy to staging
- Run manual archival tests
- Monitor for issues
- Get team feedback

### Step 2: Pilot Organizations (Month 2)
- Select 5-10 friendly organizations
- Enable auto-archival
- Weekly check-ins
- Iterate based on feedback

### Step 3: Gradual Rollout (Month 3)
- Enable for all orgs with > 1000 records
- Monitor query performance improvements
- Document lessons learned

### Step 4: General Availability (Month 4)
- Enable by default for all new orgs
- Communicate to existing customers
- Provide opt-out for compliance reasons

---

## Future Enhancements

### Advanced Features (Post-MVP)

1. **Cold Storage Integration**
   - Move archives to AWS S3 Glacier
   - Further reduce database costs
   - On-demand restoration

2. **AI-Powered Retention**
   - Suggest optimal retention periods
   - Based on organization usage patterns

3. **Legal Hold**
   - Prevent archival during litigation
   - Compliance flag per record

4. **Data Residency**
   - Archive to region-specific storage
   - GDPR compliance

---

## Testing Checklist

Before deployment:

- [ ] Load test with 1M+ records
- [ ] Verify archive integrity (no data loss)
- [ ] Test restore functionality
- [ ] Confirm query performance gains (>50% improvement)
- [ ] Validate cron job execution
- [ ] Test archive viewer UI
- [ ] Document rollback procedure
- [ ] Train support team

---

## Success Metrics

**Target Improvements**:
- 🎯 Query performance: 50-70% faster list views
- 🎯 Database size: 30-40% reduction after first archive
- 🎯 Backup time: 20-30% faster
- 🎯 Storage costs: 15-25% savings (over 3 years)

---

## References

- [PostgreSQL Table Partitioning](https://www.postgresql.org/docs/current/ddl-partitioning.html)
- [Supabase Storage Limits](https://supabase.com/docs/guides/platform/limits)
- [Qatar Labor Law - Record Retention](https://www.ilo.org/dyn/natlex/natlex4.detail?p_lang=en&p_isn=94398)
- [GDPR Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)

---

## Contacts

**Implementation Owner**: Backend Team
**Compliance Review**: Legal Team
**Approval Required**: CTO, Data Protection Officer

---

**Last Updated**: 2026-01-07
**Next Review**: Q2 2026 (when platform reaches 500+ organizations)
