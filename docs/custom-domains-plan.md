# Custom Domains Implementation Plan

This document outlines the implementation plan for adding fully custom domain support to SME++ (e.g., `portal.acme-corp.com` instead of `acme.smepp.com`).

## Current State: Subdomain-Based Routing

Currently implemented:
- Subdomains: `{org-slug}.smepp.com`
- Single wildcard SSL certificate
- Middleware resolves tenant from subdomain
- Reserved subdomain list prevents conflicts

## Target State: Full Custom Domains

Enable customers to use their own domains:
- `portal.acme-corp.com` → Acme Corp's SME++ instance
- `hr.widgets-inc.com` → Widgets Inc's SME++ instance
- Falls back to subdomain if custom domain not configured

---

## Implementation Phases

### Phase 1: Database Schema Updates

```prisma
model Organization {
  // ... existing fields ...

  // Custom Domain
  customDomain        String?   @unique
  customDomainStatus  DomainStatus @default(PENDING)
  customDomainVerifiedAt DateTime?
  domainVerificationToken String? @unique

  // SSL Certificate (if self-managed)
  sslCertificateId    String?
  sslExpiresAt        DateTime?
}

enum DomainStatus {
  PENDING      // Domain added but not verified
  VERIFYING    // Verification in progress
  VERIFIED     // DNS verified, SSL pending
  ACTIVE       // Fully active with SSL
  FAILED       // Verification failed
  EXPIRED      // SSL expired
}
```

**Tasks:**
- [ ] Add domain fields to Organization model
- [ ] Create migration
- [ ] Add DomainStatus enum

---

### Phase 2: Domain Verification System

#### 2.1 Verification Flow

```
Customer adds domain → Generate verification token →
Customer adds DNS record → System verifies →
Provision SSL → Activate domain
```

#### 2.2 DNS Verification Methods

**Option A: TXT Record (Recommended)**
```
_smepp-verify.portal.acme-corp.com TXT "smepp-verify=abc123token"
```

**Option B: CNAME Record**
```
_smepp-verify.portal.acme-corp.com CNAME abc123token.verify.smepp.com
```

#### 2.3 Verification API

```typescript
// POST /api/domains
// Add a custom domain to organization
{
  "domain": "portal.acme-corp.com"
}

// Response:
{
  "domain": "portal.acme-corp.com",
  "status": "PENDING",
  "verificationToken": "smepp-verify=abc123",
  "dnsRecords": [
    {
      "type": "TXT",
      "name": "_smepp-verify.portal.acme-corp.com",
      "value": "smepp-verify=abc123"
    },
    {
      "type": "CNAME",
      "name": "portal.acme-corp.com",
      "value": "proxy.smepp.com"
    }
  ]
}

// POST /api/domains/verify
// Trigger verification check
{
  "domain": "portal.acme-corp.com"
}

// DELETE /api/domains
// Remove custom domain
```

**Tasks:**
- [ ] Create domain management API routes
- [ ] Implement DNS TXT record verification
- [ ] Add verification token generation
- [ ] Create verification cron job (check pending domains every 5 min)

---

### Phase 3: SSL Certificate Provisioning

#### Option A: Cloudflare for SaaS (Recommended)

Best for: Most hosting scenarios
- Automatic SSL provisioning
- No server-side certificate management
- Simple API integration

```typescript
// Using Cloudflare for SaaS API
async function provisionSSL(domain: string, organizationId: string) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/custom_hostnames`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        hostname: domain,
        ssl: {
          method: 'http',
          type: 'dv',
        },
      }),
    }
  );

  return response.json();
}
```

**Cloudflare Setup:**
1. Add domain to Cloudflare
2. Enable Cloudflare for SaaS on Enterprise plan
3. Configure fallback origin
4. Set up API token with Custom Hostnames permissions

#### Option B: Let's Encrypt with Certbot

Best for: Self-hosted deployments

```typescript
// Server-side certificate management
async function provisionSSLWithLE(domain: string) {
  // 1. Add domain to Caddy/nginx
  // 2. Caddy automatically provisions via ACME
  // Or use certbot CLI
}
```

#### Option C: AWS ACM + CloudFront

Best for: AWS-hosted deployments

```typescript
// AWS Certificate Manager
const acm = new AWS.ACM({ region: 'us-east-1' });
const certificate = await acm.requestCertificate({
  DomainName: domain,
  ValidationMethod: 'DNS',
}).promise();
```

**Tasks:**
- [ ] Choose SSL provisioning method
- [ ] Implement SSL API integration
- [ ] Add SSL status monitoring
- [ ] Create SSL renewal automation

---

### Phase 4: Middleware Updates

Update middleware to check custom domains:

```typescript
// src/middleware.ts

async function resolveTenantFromHost(host: string): Promise<TenantInfo | null> {
  // 1. Check if it's a subdomain of our app domain
  const subdomainInfo = extractSubdomain(host);
  if (!subdomainInfo.isMainDomain && subdomainInfo.subdomain) {
    return resolveTenantFromSubdomain(subdomainInfo.subdomain);
  }

  // 2. Check if it's a custom domain
  // Note: This requires edge-compatible database access
  // Options:
  //   - Use Prisma Edge client
  //   - Cache domain mappings in KV store (Vercel Edge Config)
  //   - Use Cloudflare Workers KV
  const customDomainTenant = await resolveCustomDomain(host);
  if (customDomainTenant) {
    return customDomainTenant;
  }

  // 3. Not found - treat as main domain
  return null;
}
```

#### Edge Caching Strategy

For performance, cache domain→tenant mappings:

```typescript
// Using Vercel Edge Config or Cloudflare KV
interface DomainMapping {
  domain: string;
  organizationId: string;
  organizationSlug: string;
  expiresAt: number;
}

// Update cache when domain is verified
async function updateDomainCache(domain: string, orgId: string, slug: string) {
  await edgeConfig.set(`domain:${domain}`, {
    organizationId: orgId,
    organizationSlug: slug,
    expiresAt: Date.now() + 86400000, // 24h
  });
}

// Read from cache in middleware
async function resolveCustomDomain(domain: string): Promise<TenantInfo | null> {
  const cached = await edgeConfig.get(`domain:${domain}`);
  if (cached && cached.expiresAt > Date.now()) {
    return cached;
  }
  return null;
}
```

**Tasks:**
- [ ] Add custom domain resolution to middleware
- [ ] Implement edge caching (Vercel Edge Config or similar)
- [ ] Add cache invalidation on domain updates
- [ ] Handle domain not found gracefully

---

### Phase 5: Admin UI for Domain Management

Create settings page for domain configuration:

```
/admin/settings/domain
├── Current Domain Display
│   └── "Your workspace: acme.smepp.com"
├── Custom Domain Section (Premium feature)
│   ├── Add Custom Domain input
│   ├── DNS Instructions
│   ├── Verification Status
│   └── SSL Status
└── Domain History/Logs
```

#### Component: DomainSettings

```tsx
// src/components/domains/settings/DomainSettings.tsx

export function DomainSettings() {
  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<DomainInfo | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Domain</CardTitle>
        <CardDescription>
          Use your own domain for your SME++ workspace
        </CardDescription>
      </CardHeader>
      <CardContent>
        {status?.status === 'ACTIVE' ? (
          <ActiveDomainDisplay domain={status.domain} />
        ) : status?.status === 'PENDING' || status?.status === 'VERIFYING' ? (
          <DomainVerificationSteps
            domain={status.domain}
            token={status.verificationToken}
            dnsRecords={status.dnsRecords}
          />
        ) : (
          <AddDomainForm onSubmit={handleAddDomain} />
        )}
      </CardContent>
    </Card>
  );
}
```

**Tasks:**
- [ ] Create DomainSettings component
- [ ] Add DNS instructions display
- [ ] Implement verification status polling
- [ ] Add domain removal functionality
- [ ] Show SSL certificate status

---

### Phase 6: Infrastructure Setup

#### Vercel Deployment

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/:path*",
      "destination": "/:path*"
    }
  ],
  "headers": [
    {
      "source": "/:path*",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        }
      ]
    }
  ]
}
```

For Vercel:
1. Enable "Custom Domains" in project settings
2. Add wildcard domain (*.smepp.com)
3. Use Vercel's domain API for programmatic domain addition

#### AWS/Self-Hosted

1. Set up Application Load Balancer or CloudFront
2. Configure ACM for SSL
3. Add Route53 for DNS management
4. Use Lambda@Edge for domain routing

**Tasks:**
- [ ] Document infrastructure requirements
- [ ] Set up DNS configuration
- [ ] Configure SSL provider integration
- [ ] Test domain propagation

---

## API Reference

### Domain Management Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/domains` | Get current domain configuration |
| POST | `/api/domains` | Add a custom domain |
| POST | `/api/domains/verify` | Trigger domain verification |
| DELETE | `/api/domains` | Remove custom domain |
| GET | `/api/domains/status` | Get detailed domain/SSL status |

### Webhook Events

```typescript
// Domain status change webhook
{
  "event": "domain.status_changed",
  "data": {
    "organizationId": "org_123",
    "domain": "portal.acme-corp.com",
    "previousStatus": "VERIFYING",
    "newStatus": "ACTIVE",
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

---

## Security Considerations

1. **Domain Ownership Verification**
   - Always verify ownership before activating
   - Use cryptographic tokens
   - Implement rate limiting on verification attempts

2. **SSL/TLS**
   - Enforce HTTPS for all custom domains
   - Use modern TLS (1.2+)
   - Enable HSTS after verification

3. **Subdomain Takeover Prevention**
   - Never provision SSL before verification
   - Clean up orphaned DNS records
   - Monitor for suspicious domains

4. **Access Control**
   - Only org owners/admins can manage domains
   - Audit log all domain changes
   - Require re-authentication for domain deletion

---

## Rollout Plan

### Stage 1: Beta (Internal)
- Enable for internal test organizations
- Monitor SSL provisioning reliability
- Gather feedback on setup flow

### Stage 2: Limited Beta
- Invite select customers
- Provide white-glove setup support
- Document common issues

### Stage 3: General Availability
- Enable for Professional+ plans
- Self-service domain setup
- Automated support documentation

---

## Pricing Considerations

| Plan | Subdomain | Custom Domain |
|------|-----------|---------------|
| Free | ✓ (acme.smepp.com) | ✗ |
| Starter | ✓ | ✗ |
| Professional | ✓ | ✓ (1 domain) |
| Enterprise | ✓ | ✓ (unlimited) |

---

## Dependencies

### External Services
- **Cloudflare for SaaS** (or similar) - SSL provisioning
- **DNS Provider API** - For verification
- **Edge Config/KV Store** - Domain mapping cache

### Internal Requirements
- Prisma Edge client (for middleware DB access)
- Background job system (for verification polling)
- Webhook system (for status notifications)

---

## Estimated Effort

| Phase | Complexity | Effort |
|-------|------------|--------|
| Phase 1: Schema | Low | 1-2 days |
| Phase 2: Verification | Medium | 3-5 days |
| Phase 3: SSL | High | 5-7 days |
| Phase 4: Middleware | Medium | 2-3 days |
| Phase 5: Admin UI | Medium | 3-4 days |
| Phase 6: Infrastructure | High | 3-5 days |
| **Total** | | **17-26 days** |

---

## References

- [Cloudflare for SaaS Documentation](https://developers.cloudflare.com/cloudflare-for-platforms/cloudflare-for-saas/)
- [Vercel Custom Domains API](https://vercel.com/docs/rest-api/endpoints#domains)
- [Let's Encrypt ACME Protocol](https://letsencrypt.org/docs/challenge-types/)
- [DNS TXT Record Verification Best Practices](https://www.rfc-editor.org/rfc/rfc8555)
