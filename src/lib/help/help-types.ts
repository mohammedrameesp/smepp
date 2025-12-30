// Help & Support System Type Definitions

export type UserRole = 'ADMIN' | 'USER';

// ============================================================================
// FAQ Types
// ============================================================================

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  roles: UserRole[];
  tags: string[];
}

// ============================================================================
// Video Types
// ============================================================================

export interface VideoPlaceholder {
  id: string;
  title: string;
  description: string;
  duration?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  isPlaceholder: boolean;
  roles: UserRole[];
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationRule {
  field: string;
  rule: string;
  example?: string;
  required?: boolean;
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface WorkflowStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
  screenshot?: string;
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  steps: WorkflowStep[];
  roles: UserRole[];
}

// ============================================================================
// Role-Specific Content
// ============================================================================

export interface RoleContent {
  capabilities: string[];
  workflows: Workflow[];
  tips: string[];
}

// ============================================================================
// Module Content
// ============================================================================

export interface ModuleOverview {
  summary: string;
  keyFeatures: string[];
  benefits: string[];
}

export interface HelpModule {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  icon: string;
  adminOnly: boolean;
  overview: ModuleOverview;
  adminContent?: RoleContent;
  employeeContent?: RoleContent;
  faqs: FAQItem[];
  videos: VideoPlaceholder[];
  validationRules: ValidationRule[];
  relatedModules: string[];
  keywords: string[];
}

// ============================================================================
// Category Types
// ============================================================================

export interface HelpCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  modules: HelpModule[];
}

// ============================================================================
// Search Types
// ============================================================================

export interface SearchableItem {
  id: string;
  type: 'module' | 'faq' | 'section' | 'workflow';
  category: string;
  categoryName: string;
  module: string;
  moduleName: string;
  title: string;
  content: string;
  keywords: string[];
  roles: UserRole[];
  url: string;
}

export interface SearchResult extends SearchableItem {
  relevanceScore: number;
  matchedIn: ('title' | 'content' | 'keywords')[];
  snippet: string;
}

export interface SearchOptions {
  query: string;
  role: UserRole;
  enabledModules: string[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// Quick Link Types
// ============================================================================

export interface QuickLink {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  roles: UserRole[];
  priority: number;
}

export interface PopularTopic {
  id: string;
  title: string;
  category: string;
  url: string;
  roles: UserRole[];
}

// ============================================================================
// Getting Started Types
// ============================================================================

export interface GettingStartedStep {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string;
  roles: UserRole[];
}

// ============================================================================
// Contact Support Types
// ============================================================================

export interface SupportContact {
  type: 'email' | 'phone' | 'chat';
  label: string;
  value: string;
  icon: string;
  available?: string;
}

// ============================================================================
// Navigation Types
// ============================================================================

export interface HelpNavItem {
  id: string;
  label: string;
  href: string;
  icon?: string;
  children?: HelpNavItem[];
  roles: UserRole[];
  moduleId?: string;
}

// ============================================================================
// Page Props Types
// ============================================================================

export interface HelpPageProps {
  userRole: UserRole;
  enabledModules: string[];
}

export interface ModulePageProps extends HelpPageProps {
  category: string;
  module: string;
}

// ============================================================================
// Content Rendering Types
// ============================================================================

export interface ContentSection {
  id: string;
  title: string;
  content: string | React.ReactNode;
  icon?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
  roles: UserRole[];
}

// ============================================================================
// Filter Utilities
// ============================================================================

export function filterByRole<T extends { roles: UserRole[] }>(
  items: T[],
  role: UserRole
): T[] {
  return items.filter(item => item.roles.includes(role));
}

export function filterByModules<T extends { moduleId?: string }>(
  items: T[],
  enabledModules: string[]
): T[] {
  return items.filter(item => {
    if (!item.moduleId) return true;
    return enabledModules.includes(item.moduleId);
  });
}

export function isAdminRole(orgRole: string | undefined): boolean {
  return orgRole === 'OWNER' || orgRole === 'ADMIN';
}
