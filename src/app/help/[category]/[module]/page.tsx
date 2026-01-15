import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import type { UserRole } from '@/lib/help/help-types';
import { getModuleByPath } from '@/lib/help/help-categories';
import { getModuleContent } from '@/lib/help/content';
import { ModuleHelpContent } from './module-content';

interface PageProps {
  params: Promise<{
    category: string;
    module: string;
  }>;
}

// Get enabled modules from database
async function getEnabledModules(tenantId: string): Promise<string[]> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true },
  });
  return org?.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'];
}

export default async function ModuleHelpPage({ params }: PageProps) {
  const resolvedParams = await params;
  const { category, module } = resolvedParams;

  // Get session for role-based content
  const session = await getServerSession(authOptions);
  const userRole: UserRole = (session?.user?.isOwner || session?.user?.isAdmin) ? 'ADMIN' : 'USER';

  // Get enabled modules
  const tenantId = session?.user?.organizationId;
  const enabledModules = tenantId
    ? await getEnabledModules(tenantId)
    : ['assets', 'subscriptions', 'suppliers'];

  // Validate category and module exist
  const moduleInfo = getModuleByPath(category, module);
  if (!moduleInfo) {
    notFound();
  }

  // Check if user has access to this module
  if (moduleInfo.module.adminOnly && userRole !== 'ADMIN') {
    notFound();
  }

  // Check if module is enabled for this organization
  if (!enabledModules.includes(module)) {
    notFound();
  }

  // Get module content
  const content = getModuleContent(category, module);
  if (!content) {
    notFound();
  }

  return (
    <ModuleHelpContent
      category={moduleInfo.category}
      module={moduleInfo.module}
      content={content}
      userRole={userRole}
    />
  );
}

// Generate static params for all module pages
export async function generateStaticParams() {
  const params: Array<{ category: string; module: string }> = [];

  // Import help categories
  const { helpCategories } = await import('@/lib/help/help-categories');

  for (const category of helpCategories) {
    for (const moduleItem of category.modules) {
      params.push({
        category: category.id,
        module: moduleItem.id,
      });
    }
  }

  return params;
}
