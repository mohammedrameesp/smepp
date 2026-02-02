/**
 * @file page.tsx
 * @description Employee self-service onboarding wizard page
 * @module employee-onboarding
 */

import { Metadata } from 'next';
import { EmployeeOnboardingClient } from './EmployeeOnboardingClient';

export const metadata: Metadata = {
  title: 'Employee Onboarding | Durj',
  description: 'Complete your employee profile onboarding',
};

export default function EmployeeOnboardingPage() {
  return <EmployeeOnboardingClient />;
}

/* CODE REVIEW SUMMARY
 * Date: 2026-02-01
 * Reviewer: Claude
 * Status: Reviewed
 * Changes: None needed - file is clean, properly documented
 * Issues: None
 */
