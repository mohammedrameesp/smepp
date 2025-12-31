# Module: Suppliers

## Overview

The Suppliers module manages vendor/supplier relationships including registration, accreditation workflow, engagement tracking, and performance monitoring. Supports both approved suppliers and a self-registration portal for new vendors.

## Features

- **Supplier Registry**: Centralized vendor database
- **Self-Registration**: Vendors can register via portal
- **Accreditation Workflow**: Approve/reject new suppliers
- **Engagement Tracking**: Track orders, contracts, interactions
- **Category Management**: Classify suppliers by product/service type
- **Document Management**: Store contracts, certificates, agreements
- **Performance Tracking**: Rate suppliers based on delivery and quality

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/suppliers/` | Supplier API endpoints |
| `src/app/api/suppliers/register/route.ts` | Public registration endpoint |
| `src/components/domains/operations/suppliers/` | Supplier UI components |

## Business Rules

### Supplier Statuses

| Status | Description | Transitions To |
|--------|-------------|----------------|
| `PENDING` | Awaiting review | APPROVED, REJECTED |
| `APPROVED` | Active supplier | SUSPENDED, DEACTIVATED |
| `REJECTED` | Registration rejected | (can re-register) |
| `SUSPENDED` | Temporarily suspended | APPROVED |
| `DEACTIVATED` | Permanently removed | (terminal) |

### Registration Workflow

1. **Self-Registration**: Vendor submits registration form
2. **Document Upload**: Supporting documents attached
3. **Review**: Admin reviews application
4. **Decision**: Approve or Reject with notes
5. **Notification**: Vendor notified of decision

### Engagement Types

| Type | Description |
|------|-------------|
| `PURCHASE_ORDER` | Standard purchase order |
| `CONTRACT` | Service/supply contract |
| `QUOTATION` | Quote/RFQ response |
| `MEETING` | Vendor meeting/call |
| `AUDIT` | Supplier audit/assessment |

## API Endpoints

### Suppliers

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/suppliers` | List all suppliers |
| POST | `/api/suppliers` | Create supplier (admin) |
| GET | `/api/suppliers/[id]` | Get supplier details |
| PUT | `/api/suppliers/[id]` | Update supplier |
| DELETE | `/api/suppliers/[id]` | Delete supplier |
| POST | `/api/suppliers/[id]/approve` | Approve supplier |
| POST | `/api/suppliers/[id]/reject` | Reject supplier |
| GET | `/api/suppliers/[id]/engagements` | Get engagements |

### Registration (Public)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/suppliers/register` | Public registration |

### Categories

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/suppliers/categories` | List categories |

### Import/Export

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/suppliers/import` | Bulk import |
| GET | `/api/suppliers/export` | Export to CSV |

## Database Schema

### Supplier

```prisma
model Supplier {
  id                String         @id @default(cuid())
  name              String
  legalName         String?
  taxId             String?
  registrationNo    String?
  category          String?
  email             String
  phone             String?
  website           String?
  address           String?
  city              String?
  country           String         @default("Qatar")
  contactPerson     String?
  contactEmail      String?
  contactPhone      String?
  status            SupplierStatus @default(PENDING)
  approvedAt        DateTime?
  approvedBy        String?
  rejectionReason   String?
  rating            Decimal?
  notes             String?
  bankName          String?
  bankAccount       String?
  iban              String?
  tenantId          String
  engagements       SupplierEngagement[]
}
```

### SupplierEngagement

```prisma
model SupplierEngagement {
  id           String   @id @default(cuid())
  supplierId   String
  type         String   // PURCHASE_ORDER, CONTRACT, etc.
  reference    String?  // PO number, contract ID
  date         DateTime
  amount       Decimal?
  currency     String   @default("QAR")
  description  String?
  tenantId     String
}
```

## Configuration

### Supplier Categories

| Category | Description |
|----------|-------------|
| IT_SERVICES | IT services and consulting |
| SOFTWARE | Software licenses and subscriptions |
| HARDWARE | Computer equipment and devices |
| OFFICE_SUPPLIES | Office materials and supplies |
| FURNITURE | Office furniture |
| FACILITIES | Building and maintenance services |
| PROFESSIONAL | Legal, accounting, consulting |
| MARKETING | Marketing and advertising services |

## Security Considerations

- **Public Registration**: Rate-limited to prevent abuse
- **Data Validation**: All inputs sanitized
- **Sensitive Data**: Bank details visible only to ADMIN
- **Tenant Isolation**: Suppliers scoped to organization

## Future Enhancements

- [ ] Supplier portal for document updates
- [ ] Automated contract renewal alerts
- [ ] Supplier scorecards and analytics
- [ ] Integration with procurement module
- [ ] RFQ/RFP workflow
