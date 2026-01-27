/**
 * @file index.ts
 * @description Barrel export for all email templates.
 * @module lib/email/templates
 */

// General templates
export {
  supplierApprovalEmail,
  assetAssignmentEmail,
  changeRequestEmail,
  welcomeUserEmail,
  welcomeUserWithPasswordSetupEmail,
  organizationInvitationEmail,
  documentExpiryAlertEmail,
  adminDocumentExpiryAlertEmail,
  newSupplierRegistrationEmail,
  spendRequestSubmittedEmail,
  spendRequestStatusEmail,
  companyDocumentExpiryAlertEmail,
  newOrganizationSignupEmail,
  leaveRequestSubmittedEmail,
  leaveApprovedEmail,
  payrollSubmittedEmail,
  payrollApprovedEmail,
  DEFAULT_BRAND_COLOR,
} from './general';

// Asset request templates
export {
  assetRequestSubmittedEmail,
  assetAssignmentPendingEmail,
  assetAssignmentAcceptedEmail,
  assetAssignmentDeclinedEmail,
  assetReturnRequestEmail,
  assetRequestApprovedEmail,
  assetRequestRejectedEmail,
  assetReturnApprovedEmail,
  assetReturnRejectedEmail,
  assetUnassignedEmail,
} from './asset-requests';

// Error alert templates (super admin notifications)
export { systemErrorAlertEmail } from './error-alerts';
export type { EmailTemplate } from './error-alerts';
