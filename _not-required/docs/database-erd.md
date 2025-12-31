# DAMP Database Schema - Visual Representation

## Quick Stats
- **Total Models:** 38
- **Total Enums:** 18
- **Modules:** 9 (Auth, Assets, Subscriptions, Suppliers, Accreditation, HR, Tasks, Purchase, Leave)

---

## Module Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DAMP DATABASE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    AUTH     │  │   ASSETS    │  │SUBSCRIPTIONS│  │  SUPPLIERS  │        │
│  │  4 tables   │  │  3 tables   │  │  2 tables   │  │  2 tables   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ACCREDITATION│  │     HR      │  │    TASKS    │  │  PURCHASE   │        │
│  │  4 tables   │  │  2 tables   │  │  11 tables  │  │  3 tables   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                         │
│  │    LEAVE    │  │  SETTINGS   │  │   LOGGING   │                         │
│  │  4 tables   │  │  2 tables   │  │  1 table    │                         │
│  └─────────────┘  └─────────────┘  └─────────────┘                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Full ERD (Mermaid)

```mermaid
erDiagram
    %% ==================== AUTH MODULE ====================
    User ||--o{ Account : has
    User ||--o{ Session : has
    User ||--o| HRProfile : has

    User {
        string id PK
        string name
        string email UK
        datetime emailVerified
        string image
        Role role
        boolean isSystemAccount
        datetime createdAt
        datetime updatedAt
    }

    Account {
        string id PK
        string userId FK
        string type
        string provider
        string providerAccountId
        string refresh_token
        string access_token
    }

    Session {
        string id PK
        string sessionToken UK
        string userId FK
        datetime expires
    }

    VerificationToken {
        string identifier
        string token UK
        datetime expires
    }

    %% ==================== ASSET MODULE ====================
    User ||--o{ Asset : assigned
    Asset ||--o{ AssetHistory : has
    Asset ||--o{ MaintenanceRecord : has

    Asset {
        string id PK
        string assetTag UK
        string type
        string category
        string brand
        string model
        string serial
        string configuration
        datetime purchaseDate
        datetime warrantyExpiry
        string supplier
        string invoiceNumber
        string assignedUserId FK
        AssetStatus status
        AcquisitionType acquisitionType
        decimal price
        string priceCurrency
        decimal priceQAR
        string location
        string notes
    }

    AssetHistory {
        string id PK
        string assetId FK
        AssetHistoryAction action
        string fromUserId FK
        string toUserId FK
        AssetStatus fromStatus
        AssetStatus toStatus
        string performedBy FK
        datetime createdAt
    }

    MaintenanceRecord {
        string id PK
        string assetId FK
        datetime maintenanceDate
        string notes
        string performedBy
    }

    %% ==================== SUBSCRIPTION MODULE ====================
    User ||--o{ Subscription : assigned
    Subscription ||--o{ SubscriptionHistory : has

    Subscription {
        string id PK
        string serviceName
        string category
        string accountId
        datetime purchaseDate
        datetime renewalDate
        BillingCycle billingCycle
        decimal costPerCycle
        string costCurrency
        decimal costQAR
        string vendor
        SubscriptionStatus status
        string assignedUserId FK
        boolean autoRenew
    }

    SubscriptionHistory {
        string id PK
        string subscriptionId FK
        SubscriptionHistoryAction action
        SubscriptionStatus oldStatus
        SubscriptionStatus newStatus
        string performedBy FK
        datetime createdAt
    }

    %% ==================== SUPPLIER MODULE ====================
    User ||--o{ Supplier : approves
    Supplier ||--o{ SupplierEngagement : has
    User ||--o{ SupplierEngagement : creates

    Supplier {
        string id PK
        string suppCode UK
        string name
        string category
        string address
        string city
        string country
        string website
        string primaryContactName
        string primaryContactEmail
        string secondaryContactName
        string secondaryContactEmail
        SupplierStatus status
        string rejectionReason
        datetime approvedAt
        string approvedById FK
    }

    SupplierEngagement {
        string id PK
        string supplierId FK
        datetime date
        string notes
        int rating
        string createdById FK
    }

    %% ==================== ACCREDITATION MODULE ====================
    AccreditationProject ||--o{ Accreditation : contains
    User ||--o{ Accreditation : creates
    Accreditation ||--o{ AccreditationHistory : has
    Accreditation ||--o{ AccreditationScan : has

    AccreditationProject {
        string id PK
        string name
        string code UK
        datetime bumpInStart
        datetime bumpInEnd
        datetime liveStart
        datetime liveEnd
        datetime bumpOutStart
        datetime bumpOutEnd
        json accessGroups
        boolean isActive
    }

    Accreditation {
        string id PK
        string accreditationNumber UK
        string firstName
        string lastName
        string organization
        string jobTitle
        string accessGroup
        string profilePhotoUrl
        string qidNumber
        string passportNumber
        AccreditationStatus status
        string qrCodeToken UK
        string projectId FK
        string createdById FK
        string approvedById FK
        string revokedById FK
    }

    AccreditationHistory {
        string id PK
        string accreditationId FK
        string action
        AccreditationStatus oldStatus
        AccreditationStatus newStatus
        json changes
        string performedById FK
    }

    AccreditationScan {
        string id PK
        string accreditationId FK
        string scannedById FK
        datetime scannedAt
        string location
        boolean wasValid
        json validPhases
    }

    %% ==================== HR MODULE ====================
    HRProfile ||--o{ ProfileChangeRequest : has

    HRProfile {
        string id PK
        string userId FK UK
        datetime dateOfBirth
        string gender
        string nationality
        string qatarMobile
        string personalEmail
        string qidNumber
        datetime qidExpiry
        string passportNumber
        datetime passportExpiry
        string employeeId
        string designation
        datetime dateOfJoining
        string bankName
        string iban
        int onboardingStep
        boolean onboardingComplete
    }

    ProfileChangeRequest {
        string id PK
        string hrProfileId FK
        string description
        ProfileChangeRequestStatus status
        string resolvedById FK
        datetime resolvedAt
    }

    %% ==================== TASK MODULE ====================
    User ||--o{ Board : owns
    Board ||--o{ BoardMember : has
    Board ||--o{ TaskColumn : has
    Board ||--o{ TaskLabel : has
    TaskColumn ||--o{ Task : contains
    Task ||--o{ TaskAssignee : has
    Task ||--o{ TaskLabelAssignment : has
    Task ||--o{ ChecklistItem : has
    Task ||--o{ TaskComment : has
    Task ||--o{ TaskAttachment : has
    Task ||--o{ TaskHistory : has

    Board {
        string id PK
        string title
        string description
        string ownerId FK
        boolean isArchived
    }

    BoardMember {
        string id PK
        string boardId FK
        string userId FK
        BoardMemberRole role
    }

    TaskColumn {
        string id PK
        string boardId FK
        string title
        int position
    }

    Task {
        string id PK
        string columnId FK
        string title
        string description
        int position
        TaskPriority priority
        datetime dueDate
        boolean isCompleted
        string createdById FK
    }

    TaskAssignee {
        string id PK
        string taskId FK
        string userId FK
        string assignedBy FK
    }

    TaskLabel {
        string id PK
        string boardId FK
        string name
        string color
    }

    ChecklistItem {
        string id PK
        string taskId FK
        string title
        boolean isCompleted
        int position
        string completedBy FK
    }

    TaskComment {
        string id PK
        string taskId FK
        string content
        string authorId FK
    }

    TaskAttachment {
        string id PK
        string taskId FK
        string fileName
        int fileSize
        string mimeType
        string storagePath
        string uploadedById FK
    }

    %% ==================== PURCHASE REQUEST MODULE ====================
    User ||--o{ PurchaseRequest : requests
    PurchaseRequest ||--o{ PurchaseRequestItem : has
    PurchaseRequest ||--o{ PurchaseRequestHistory : has

    PurchaseRequest {
        string id PK
        string referenceNumber UK
        datetime requestDate
        PurchaseRequestStatus status
        PurchaseRequestPriority priority
        string requesterId FK
        string title
        string description
        string justification
        datetime neededByDate
        PurchaseType purchaseType
        CostType costType
        string projectName
        PaymentMode paymentMode
        string vendorName
        decimal totalAmount
        string currency
        string reviewedById FK
    }

    PurchaseRequestItem {
        string id PK
        string purchaseRequestId FK
        int itemNumber
        string description
        int quantity
        decimal unitPrice
        decimal totalPrice
        BillingCycle billingCycle
        int durationMonths
        string category
        string supplier
    }

    PurchaseRequestHistory {
        string id PK
        string purchaseRequestId FK
        string action
        PurchaseRequestStatus previousStatus
        PurchaseRequestStatus newStatus
        string performedById FK
    }

    %% ==================== LEAVE MODULE ====================
    LeaveType ||--o{ LeaveBalance : has
    LeaveType ||--o{ LeaveRequest : has
    User ||--o{ LeaveBalance : has
    User ||--o{ LeaveRequest : requests
    LeaveRequest ||--o{ LeaveRequestHistory : has

    LeaveType {
        string id PK
        string name UK
        string description
        string color
        int defaultDays
        boolean requiresApproval
        boolean requiresDocument
        boolean isPaid
        boolean isActive
        int maxConsecutiveDays
        int minNoticeDays
        boolean allowCarryForward
        LeaveCategory category
        boolean accrualBased
    }

    LeaveBalance {
        string id PK
        string userId FK
        string leaveTypeId FK
        int year
        decimal entitlement
        decimal used
        decimal pending
        decimal carriedForward
        decimal adjustment
    }

    LeaveRequest {
        string id PK
        string requestNumber UK
        string userId FK
        string leaveTypeId FK
        datetime startDate
        datetime endDate
        LeaveRequestType requestType
        decimal totalDays
        string reason
        string documentUrl
        LeaveStatus status
        string approverId FK
        datetime approvedAt
    }

    LeaveRequestHistory {
        string id PK
        string leaveRequestId FK
        string action
        LeaveStatus oldStatus
        LeaveStatus newStatus
        json changes
        string performedById FK
    }

    %% ==================== SETTINGS & LOGGING ====================
    ActivityLog {
        string id PK
        string actorUserId FK
        string action
        string entityType
        string entityId
        json payload
        datetime at
    }

    SystemSettings {
        string id PK
        string key UK
        string value
        string updatedBy FK
    }

    AppSetting {
        string key PK
        string value
    }
```

---

## Tables by Module

### 🔐 Auth Module (4 tables)
| Table | Records Purpose |
|-------|-----------------|
| `User` | Central user accounts |
| `Account` | OAuth provider links |
| `Session` | Active sessions |
| `VerificationToken` | Email verification |

### 💻 Asset Module (3 tables)
| Table | Records Purpose |
|-------|-----------------|
| `Asset` | Hardware/equipment inventory |
| `AssetHistory` | Assignment & status changes |
| `MaintenanceRecord` | Maintenance logs |

### 📦 Subscription Module (2 tables)
| Table | Records Purpose |
|-------|-----------------|
| `Subscription` | SaaS/service subscriptions |
| `SubscriptionHistory` | Lifecycle events |

### 🏢 Supplier Module (2 tables)
| Table | Records Purpose |
|-------|-----------------|
| `Supplier` | Vendor registrations |
| `SupplierEngagement` | Vendor interactions |

### 🎫 Accreditation Module (4 tables)
| Table | Records Purpose |
|-------|-----------------|
| `AccreditationProject` | Events/projects |
| `Accreditation` | Individual passes |
| `AccreditationHistory` | Status changes |
| `AccreditationScan` | QR scan logs |

### 👤 HR Module (2 tables)
| Table | Records Purpose |
|-------|-----------------|
| `HRProfile` | Employee profiles |
| `ProfileChangeRequest` | Profile edit requests |

### ✅ Task Module (11 tables)
| Table | Records Purpose |
|-------|-----------------|
| `Board` | Kanban boards |
| `BoardMember` | Board access |
| `TaskColumn` | Board columns |
| `Task` | Tasks/cards |
| `TaskAssignee` | Task assignments |
| `TaskLabel` | Label definitions |
| `TaskLabelAssignment` | Task-label links |
| `ChecklistItem` | Task checklists |
| `TaskComment` | Task comments |
| `TaskAttachment` | Task files |
| `TaskHistory` | Task audit trail |

### 🛒 Purchase Module (3 tables)
| Table | Records Purpose |
|-------|-----------------|
| `PurchaseRequest` | Purchase requests |
| `PurchaseRequestItem` | Line items |
| `PurchaseRequestHistory` | Approval history |

### 🏖️ Leave Module (4 tables)
| Table | Records Purpose |
|-------|-----------------|
| `LeaveType` | Leave type config |
| `LeaveBalance` | Employee balances |
| `LeaveRequest` | Leave applications |
| `LeaveRequestHistory` | Request history |

### ⚙️ Settings & Logging (3 tables)
| Table | Records Purpose |
|-------|-----------------|
| `SystemSettings` | System config |
| `AppSetting` | App config |
| `ActivityLog` | Audit trail |

---

## Enum Reference

| Enum | Values |
|------|--------|
| `Role` | ADMIN, EMPLOYEE, VALIDATOR, TEMP_STAFF, ACCREDITATION_ADDER, ACCREDITATION_APPROVER |
| `AssetStatus` | IN_USE, SPARE, REPAIR, DISPOSED |
| `SubscriptionStatus` | ACTIVE, PAUSED, CANCELLED |
| `SupplierStatus` | PENDING, APPROVED, REJECTED |
| `AccreditationStatus` | DRAFT, PENDING, APPROVED, REJECTED, REVOKED, ISSUED |
| `LeaveStatus` | PENDING, APPROVED, REJECTED, CANCELLED |
| `LeaveRequestType` | FULL_DAY, HALF_DAY_AM, HALF_DAY_PM |
| `LeaveCategory` | STANDARD, MEDICAL, PARENTAL, RELIGIOUS |
| `BillingCycle` | MONTHLY, YEARLY, ONE_TIME |
| `AcquisitionType` | NEW_PURCHASE, TRANSFERRED |
| `BoardMemberRole` | OWNER, ADMIN, MEMBER |
| `TaskPriority` | LOW, MEDIUM, HIGH, URGENT |
| `PurchaseRequestStatus` | PENDING, UNDER_REVIEW, APPROVED, REJECTED, COMPLETED |
| `PurchaseType` | HARDWARE, SOFTWARE_SUBSCRIPTION, SERVICES, OFFICE_SUPPLIES, MARKETING, TRAVEL, TRAINING, OTHER |
| `CostType` | OPERATING_COST, PROJECT_COST |
| `PaymentMode` | BANK_TRANSFER, CREDIT_CARD, CASH, CHEQUE, INTERNAL_TRANSFER |

---

## Relationship Summary

```
                                    ┌──────────────┐
                                    │     USER     │
                                    │   (Central)  │
                                    └──────┬───────┘
           ┌──────────┬──────────┬────────┼────────┬──────────┬──────────┐
           │          │          │        │        │          │          │
           ▼          ▼          ▼        ▼        ▼          ▼          ▼
      ┌─────────┐ ┌───────┐ ┌────────┐ ┌──────┐ ┌──────┐ ┌─────────┐ ┌───────┐
      │ Account │ │Session│ │HRProfile│ │Asset │ │ Sub  │ │  Task   │ │ Leave │
      └─────────┘ └───────┘ └────────┘ └──┬───┘ └──┬───┘ │ Module  │ │Balance│
                                          │        │     └────┬────┘ └───┬───┘
                                          ▼        ▼          │          │
                                    ┌──────────┐ ┌────────┐   │          ▼
                                    │  Asset   │ │  Sub   │   │    ┌─────────┐
                                    │ History  │ │History │   │    │ Leave   │
                                    └──────────┘ └────────┘   │    │ Request │
                                                              │    └─────────┘
                           ┌──────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
      ┌─────────┐    ┌──────────┐    ┌──────────┐
      │  Board  │───▶│TaskColumn│───▶│   Task   │
      └─────────┘    └──────────┘    └────┬─────┘
           │                              │
           ▼                    ┌─────────┼─────────┐
      ┌─────────┐               │         │         │
      │  Board  │               ▼         ▼         ▼
      │ Member  │          ┌────────┐ ┌───────┐ ┌────────┐
      └─────────┘          │Assignee│ │Comment│ │Checklist│
                           └────────┘ └───────┘ └────────┘
```

---

## How to View the Mermaid Diagram

1. **VS Code**: Install "Mermaid Preview" extension, then open this file
2. **GitHub**: Push this file - GitHub renders Mermaid automatically
3. **Online**: Copy the mermaid code block to [mermaid.live](https://mermaid.live)
4. **Notion**: Paste as code block with "mermaid" language
