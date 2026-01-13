// Help Content - Module Content Aggregator
import type { HelpModule } from '../help-types';

// Operations
import { assetsContent } from './operations/assets';
import { subscriptionsContent } from './operations/subscriptions';
import { suppliersContent } from './operations/suppliers';

// HR
import { employeesContent } from './hr/employees';
import { leaveContent } from './hr/leave';
import { payrollContent } from './hr/payroll';

// Procurement
import { purchaseRequestsContent } from './projects/purchase-requests';

// System
import { settingsContent } from './system/settings';
import { usersContent } from './system/users';
import { documentsContent } from './system/documents';
import { approvalsContent } from './system/approvals';

// Content registry
const contentRegistry: Record<string, Record<string, HelpModule>> = {
  operations: {
    assets: assetsContent,
    subscriptions: subscriptionsContent,
    suppliers: suppliersContent,
  },
  hr: {
    employees: employeesContent,
    leave: leaveContent,
    payroll: payrollContent,
  },
  procurement: {
    'purchase-requests': purchaseRequestsContent,
  },
  system: {
    settings: settingsContent,
    users: usersContent,
    documents: documentsContent,
    approvals: approvalsContent,
  },
};

/**
 * Get module content by category and module ID
 */
export function getModuleContent(category: string, module: string): HelpModule | undefined {
  return contentRegistry[category]?.[module];
}

/**
 * Get all module content
 */
export function getAllModuleContent(): HelpModule[] {
  const allContent: HelpModule[] = [];
  for (const category of Object.values(contentRegistry)) {
    for (const moduleItem of Object.values(category)) {
      allContent.push(moduleItem);
    }
  }
  return allContent;
}
