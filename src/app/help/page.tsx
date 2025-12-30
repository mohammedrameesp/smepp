import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import { isAdminRole, type UserRole } from '@/lib/help/help-types';
import {
  helpCategories,
  filterCategoriesByRole,
  quickLinks,
  getGettingStartedSteps,
  getPopularTopics,
} from '@/lib/help/help-categories';
import {
  HelpCategoryCard,
  HelpHeroSearch,
  HelpQuickLinks,
  HelpGettingStarted,
  HelpPopularTopics,
  HelpContactSupport,
} from '@/components/help';
import { HelpCircle, Sparkles, BookOpen, Lightbulb } from 'lucide-react';

// Get enabled modules from database
async function getEnabledModules(tenantId: string): Promise<string[]> {
  const org = await prisma.organization.findUnique({
    where: { id: tenantId },
    select: { enabledModules: true },
  });
  return org?.enabledModules?.length ? org.enabledModules : ['assets', 'subscriptions', 'suppliers'];
}

export default async function HelpPage() {
  const session = await getServerSession(authOptions);

  // Determine user role for content filtering
  const userRole: UserRole = isAdminRole(session?.user?.orgRole) ? 'ADMIN' : 'USER';

  // Get tenant-scoped enabled modules
  const tenantId = session?.user?.organizationId;
  const enabledModules = tenantId
    ? await getEnabledModules(tenantId)
    : ['assets', 'subscriptions', 'suppliers'];

  // Filter categories based on role and enabled modules
  const filteredCategories = filterCategoriesByRole(helpCategories, userRole, enabledModules);

  // Get role-specific content
  const gettingStartedSteps = getGettingStartedSteps(userRole);
  const popularTopics = getPopularTopics(userRole);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center py-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
          <HelpCircle className="h-8 w-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          How can we help you?
        </h1>
        <p className="text-gray-600 max-w-xl mx-auto mb-8">
          Search our help center or browse topics below to find answers to your questions.
        </p>
        <HelpHeroSearch />
      </section>

      {/* Quick Links */}
      <section id="quick-links">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Quick Links</h2>
        </div>
        <HelpQuickLinks links={quickLinks} userRole={userRole} />
      </section>

      {/* Getting Started */}
      <section id="getting-started">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Getting Started</h2>
        </div>
        <p className="text-gray-600 mb-4">
          {userRole === 'ADMIN'
            ? 'Follow these steps to set up your organization and get started with Durj.'
            : 'Here are some key things to help you get started.'}
        </p>
        <HelpGettingStarted steps={gettingStartedSteps} userRole={userRole} />
      </section>

      {/* Browse by Category */}
      <section id="categories">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Browse by Category</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {filteredCategories.map((category) => (
            <HelpCategoryCard key={category.id} category={category} />
          ))}
        </div>
      </section>

      {/* Popular Topics */}
      <section id="popular-topics" className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            <h2 className="text-xl font-semibold text-gray-900">Popular Questions</h2>
          </div>
          <div className="rounded-lg border bg-white">
            <HelpPopularTopics topics={popularTopics} userRole={userRole} />
          </div>
        </div>

        {/* Contact Support */}
        <div className="lg:pt-10">
          <HelpContactSupport />
        </div>
      </section>
    </div>
  );
}
