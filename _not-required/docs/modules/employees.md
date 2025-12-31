# Module: Employees

## Overview

The Employees module manages employee HR profiles, documents, and personal information. Provides self-service capabilities for employees to view and update their information, while giving HR administrators comprehensive management tools.

## Features

- **HR Profiles**: Comprehensive employee data management
- **Document Management**: Store contracts, IDs, certificates
- **Document Expiry Alerts**: Automated alerts for expiring documents
- **Self-Service Portal**: Employees can view/update their info
- **Profile Change Requests**: Request and approve profile updates
- **Celebrations**: Birthday and work anniversary tracking
- **Import/Export**: Bulk data import from CSV/Excel

## Key Files

| File | Purpose |
|------|---------|
| `src/app/api/employees/` | Employee API endpoints |
| `src/components/domains/hr/employees/` | Employee UI components |

## Business Rules

### Employee Data Categories

| Category | Fields | Who Can Edit |
|----------|--------|--------------|
| Personal | Name, DOB, Gender, Nationality | Employee (request), HR |
| Contact | Email, Phone, Address | Employee |
| Employment | Job Title, Department, Manager | HR Only |
| Financial | Bank Account, Salary | HR Only |
| Documents | ID, Visa, Work Permit, etc. | HR Only |

### Document Types

| Type | Expiry Tracking | Required |
|------|-----------------|----------|
| Qatar ID (QID) | Yes | Yes |
| Passport | Yes | Yes |
| Visa/RP | Yes | Yes |
| Work Permit | Yes | Yes |
| Health Card | Yes | No |
| Driving License | Yes | No |
| Employment Contract | No | Yes |
| Educational Certificates | No | No |

### Document Expiry Alerts

- 90 days before: First reminder
- 60 days before: Second reminder
- 30 days before: Urgent reminder
- 14 days before: Critical alert
- Expired: Daily reminders

### Profile Change Request Workflow

1. Employee submits change request
2. HR reviews request
3. HR approves/rejects with notes
4. If approved, profile updated
5. Employee notified of decision

## API Endpoints

### Employees

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees` | List employees |
| POST | `/api/employees` | Create employee |
| GET | `/api/employees/[id]` | Get employee details |
| PUT | `/api/employees/[id]` | Update employee |
| DELETE | `/api/employees/[id]` | Deactivate employee |
| GET | `/api/employees/next-code` | Get next employee code |

### Celebrations

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees/celebrations` | Get birthdays/anniversaries |

### Document Alerts

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees/expiry-alerts` | Get expiring documents |

### Export

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/employees/export` | Export to CSV/Excel |

## Database Schema

### HRProfile

```prisma
model HRProfile {
  id                    String    @id @default(cuid())
  userId                String    @unique
  employeeCode          String?   @unique

  // Personal
  dateOfBirth           DateTime?
  gender                String?
  nationality           String?
  maritalStatus         String?
  bloodGroup            String?

  // Contact
  personalEmail         String?
  personalPhone         String?
  emergencyContactName  String?
  emergencyContactPhone String?
  address               String?

  // Employment
  dateOfJoining         DateTime?
  employmentType        String?   // FULL_TIME, PART_TIME, CONTRACT
  jobTitle              String?
  department            String?
  managerId             String?
  workLocation          String?

  // Documents
  qidNumber             String?
  qidExpiry             DateTime?
  passportNumber        String?
  passportExpiry        DateTime?
  visaExpiry            DateTime?
  healthCardExpiry      DateTime?
  drivingLicenseExpiry  DateTime?

  // Financial
  bankName              String?
  bankAccountNumber     String?
  iban                  String?
  salaryStructureId     String?

  tenantId              String
}
```

### ProfileChangeRequest

```prisma
model ProfileChangeRequest {
  id           String   @id @default(cuid())
  userId       String
  fieldName    String
  oldValue     String?
  newValue     String
  reason       String?
  status       String   @default("PENDING") // PENDING, APPROVED, REJECTED
  reviewedBy   String?
  reviewedAt   DateTime?
  reviewNotes  String?
  tenantId     String
  createdAt    DateTime @default(now())
}
```

## Configuration

### Employee Code Format

Auto-generated codes follow pattern: `{PREFIX}-{SEQUENCE}`

Example: `EMP-00001`

Configurable in organization settings:
- Prefix (default: "EMP")
- Starting number (default: 1)
- Padding digits (default: 5)

### Required Fields

Organizations can configure which fields are required:
- Personal: Name (always required)
- Employment: Job title, department
- Documents: QID, passport (varies by country)

## Security Considerations

- **Data Privacy**: Sensitive data (salary, bank) restricted
- **Self-Service**: Employees see only their own data
- **HR Access**: HR sees all employees in department/org
- **Audit Trail**: All changes logged
- **Document Security**: Uploaded files scanned and encrypted

## Import Format

CSV/Excel import supports columns:

| Column | Required | Description |
|--------|----------|-------------|
| name | Yes | Full name |
| email | Yes | Work email |
| employeeCode | No | Auto-generated if empty |
| dateOfJoining | No | YYYY-MM-DD format |
| jobTitle | No | Position title |
| department | No | Department name |
| qidNumber | No | Qatar ID number |
| bankAccount | No | Bank account number |

## Future Enhancements

- [ ] Organizational chart visualization
- [ ] Skills and competency tracking
- [ ] Performance review integration
- [ ] Training and certification tracking
- [ ] Onboarding checklists
- [ ] Exit/offboarding workflow
