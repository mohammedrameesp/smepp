'use client';

import * as Icons from 'lucide-react';
import { HelpCircle, Check, FileText } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { HelpModule, UserRole } from '@/lib/help/help-types';
import type { CategoryInfo, ModuleInfo } from '@/lib/help/help-categories';
import {
  HelpBreadcrumb,
  HelpContentSection,
  HelpFAQAccordion,
  HelpVideoGrid,
  HelpValidationTable,
  HelpStepByStep,
  HelpChecklist,
  HelpNote,
} from '@/components/help';

interface ModuleHelpContentProps {
  category: CategoryInfo;
  module: ModuleInfo;
  content: HelpModule;
  userRole: UserRole;
}

// Dynamic icon component
function DynamicIcon({ name, className }: { name: string; className?: string }) {
  const IconComponent = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name];
  if (!IconComponent) return <HelpCircle className={className} />;
  return <IconComponent className={className} />;
}

export function ModuleHelpContent({
  category,
  module,
  content,
  userRole,
}: ModuleHelpContentProps) {
  // Determine which content to show based on role
  const roleContent = userRole === 'ADMIN' ? content.adminContent : content.employeeContent;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <HelpBreadcrumb
        items={[
          { label: category.name, href: `/help#${category.id}` },
          { label: module.name },
        ]}
      />

      {/* Header */}
      <header className="pb-6 border-b">
        <div className="flex items-start gap-4">
          <div className={cn('p-3 rounded-xl', category.bgColor)}>
            <DynamicIcon name={module.icon} className={cn('h-8 w-8', category.color)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{module.name}</h1>
              {module.adminOnly && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded font-medium">
                  Admin Only
                </span>
              )}
            </div>
            <p className="text-gray-600">{content.overview.summary}</p>
          </div>
        </div>
      </header>

      {/* Overview Section */}
      <HelpContentSection id="overview" title="Overview" icon="Info">
        <div className="space-y-4">
          {/* Key Features */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Key Features</h3>
            <HelpChecklist items={content.overview.keyFeatures} />
          </div>

          {/* Benefits */}
          {content.overview.benefits && content.overview.benefits.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Benefits</h3>
              <ul className="space-y-2">
                {content.overview.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                    {benefit}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </HelpContentSection>

      {/* Role-specific capabilities */}
      {roleContent && roleContent.capabilities.length > 0 && (
        <HelpContentSection
          id="capabilities"
          title={userRole === 'ADMIN' ? 'What You Can Do (Admin)' : 'What You Can Do'}
          icon="Sparkles"
          badge={userRole === 'ADMIN' ? 'Admin' : 'Employee'}
          badgeColor={userRole === 'ADMIN' ? 'blue' : 'green'}
        >
          <HelpChecklist items={roleContent.capabilities} />
        </HelpContentSection>
      )}

      {/* Workflows */}
      {roleContent && roleContent.workflows.length > 0 && (
        <HelpContentSection id="workflows" title="Step-by-Step Guides" icon="BookOpen">
          <div className="space-y-6">
            {roleContent.workflows.map((workflow) => (
              <HelpStepByStep
                key={workflow.id}
                title={workflow.title}
                description={workflow.description}
                steps={workflow.steps}
              />
            ))}
          </div>
        </HelpContentSection>
      )}

      {/* Validation Rules */}
      {content.validationRules.length > 0 && (
        <HelpContentSection id="validation" title="Field Requirements" icon="FileCheck">
          <HelpNote type="info" className="mb-4">
            These are the validation rules that apply when creating or updating records.
            Fields marked with a red dot are required.
          </HelpNote>
          <HelpValidationTable rules={content.validationRules} />
        </HelpContentSection>
      )}

      {/* Tips */}
      {roleContent && roleContent.tips.length > 0 && (
        <HelpContentSection id="tips" title="Tips & Best Practices" icon="Lightbulb">
          <div className="space-y-3">
            {roleContent.tips.map((tip, index) => (
              <HelpNote key={index} type="tip">
                {tip}
              </HelpNote>
            ))}
          </div>
        </HelpContentSection>
      )}

      {/* Video Tutorials */}
      {content.videos.length > 0 && (
        <HelpContentSection id="videos" title="Video Tutorials" icon="Video">
          <HelpVideoGrid videos={content.videos} userRole={userRole} />
        </HelpContentSection>
      )}

      {/* FAQ Section */}
      {content.faqs.length > 0 && (
        <HelpContentSection id="faq" title="Frequently Asked Questions" icon="HelpCircle">
          <HelpFAQAccordion items={content.faqs} userRole={userRole} />
        </HelpContentSection>
      )}

      {/* Related Modules */}
      {content.relatedModules.length > 0 && (
        <HelpContentSection id="related" title="Related Topics" icon="Link">
          <div className="grid gap-2 sm:grid-cols-2">
            {content.relatedModules.map((relatedId) => (
              <a
                key={relatedId}
                href={`/help/${content.categoryId}/${relatedId}`}
                className="flex items-center gap-2 p-3 rounded-lg border hover:border-blue-200 hover:bg-blue-50 transition-colors"
              >
                <FileText className="h-4 w-4 text-gray-400" />
                <span className="text-sm text-gray-700 capitalize">
                  {relatedId.replace(/-/g, ' ')}
                </span>
              </a>
            ))}
          </div>
        </HelpContentSection>
      )}
    </div>
  );
}
