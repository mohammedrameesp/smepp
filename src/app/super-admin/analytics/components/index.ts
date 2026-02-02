/**
 * @module super-admin/analytics/components
 * @description Barrel export file for super admin analytics dashboard components.
 * Centralizes component exports for cleaner imports in the analytics page.
 *
 * @exports
 * - ModuleUsageChart - Displays module usage statistics across organizations
 * - OnboardingFunnel - Visualizes user onboarding conversion funnel
 * - OrganizationBreakdown - Shows organization distribution and metrics
 *
 * @access Super Admin only (used within analytics dashboard)
 */
export { ModuleUsageChart } from './ModuleUsageChart';
export { OnboardingFunnel } from './OnboardingFunnel';
export { OrganizationBreakdown } from './OrganizationBreakdown';

/*
 * CODE REVIEW SUMMARY
 * ===================
 * Status: APPROVED
 *
 * Strengths:
 * - Clean barrel export pattern for component organization
 * - Named exports for tree-shaking optimization
 * - Clear, consistent export naming
 *
 * Minor Observations:
 * - None - this is a standard barrel file with no logic
 *
 * Recommendations:
 * - None
 */
