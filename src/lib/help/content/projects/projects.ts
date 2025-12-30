import type { HelpModule } from '../../help-types';

export const projectsContent: HelpModule = {
  id: 'projects',
  categoryId: 'projects',
  name: 'Project Management',
  description: 'Track projects, tasks, and resource allocation',
  icon: 'Briefcase',
  adminOnly: false,
  keywords: ['project', 'task', 'kanban', 'milestone', 'progress'],

  overview: {
    summary:
      'The Project Management module helps you organize and track company projects. Create projects, assign tasks, monitor progress, and link related resources like purchase requests and subscriptions.',
    keyFeatures: [
      'Create and manage projects',
      'Track project status and progress',
      'Link subscriptions and purchases to projects',
      'Monitor project-related costs',
    ],
    benefits: [
      'Organized project tracking',
      'Clear visibility into project costs',
      'Centralized project information',
    ],
  },

  adminContent: {
    capabilities: [
      'Create and manage projects',
      'Set project status and dates',
      'Link resources to projects',
      'View project reports',
    ],
    workflows: [
      {
        id: 'create-project',
        title: 'How to Create a Project',
        description: 'Set up a new project in the system.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Projects',
            description: 'Go to Projects > Projects from the sidebar.',
          },
          {
            step: 2,
            title: 'Click Add Project',
            description: 'Click the "Add Project" button.',
          },
          {
            step: 3,
            title: 'Enter Project Details',
            description: 'Fill in the project name, description, and dates.',
          },
          {
            step: 4,
            title: 'Set Status',
            description: 'Choose the initial status (Planning, Active, etc.).',
          },
          {
            step: 5,
            title: 'Save',
            description: 'Click "Create Project" to save.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Keep project names clear and consistent.',
      'Update project status regularly.',
      'Link all related purchases to projects for cost tracking.',
    ],
  },

  employeeContent: {
    capabilities: [
      'View project list',
      'See project details',
    ],
    workflows: [],
    tips: [
      'Check project context when submitting purchase requests.',
    ],
  },

  validationRules: [
    {
      field: 'Project Name',
      rule: 'Required. A descriptive name for the project.',
      required: true,
      example: 'Website Redesign 2024',
    },
    {
      field: 'Status',
      rule: 'Select from Planning, Active, On Hold, Completed, Cancelled.',
      example: 'Active',
    },
  ],

  faqs: [
    {
      id: 'project-costs',
      question: 'How do I track project costs?',
      answer:
        'Link purchase requests and subscriptions to projects. The system aggregates all linked costs to show total project spending.',
      roles: ['ADMIN'],
      tags: ['costs'],
    },
    {
      id: 'project-status',
      question: 'What do the project statuses mean?',
      answer:
        'PLANNING: Initial planning phase. ACTIVE: Work in progress. ON_HOLD: Temporarily paused. COMPLETED: Project finished. CANCELLED: Project discontinued.',
      roles: ['ADMIN', 'USER'],
      tags: ['status'],
    },
  ],

  videos: [
    {
      id: 'project-overview',
      title: 'Project Management Overview',
      description: 'Learn how to manage projects effectively.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['purchase-requests'],
};
