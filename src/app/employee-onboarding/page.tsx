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
