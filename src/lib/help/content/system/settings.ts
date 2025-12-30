import type { HelpModule } from '../../help-types';

export const settingsContent: HelpModule = {
  id: 'settings',
  categoryId: 'system',
  name: 'Organization Settings',
  description: 'Company settings, branding, and team management',
  icon: 'Building2',
  adminOnly: true,
  keywords: ['organization', 'settings', 'company', 'branding', 'team', 'modules'],

  overview: {
    summary:
      'The Organization Settings module lets you configure your company profile, manage enabled modules, and customize your Durj portal. Set up your organization details, logo, and preferences.',
    keyFeatures: [
      'Configure company information',
      'Upload company logo',
      'Enable/disable modules',
      'Manage team members and invitations',
      'Set timezone and currency preferences',
      'Configure authentication settings',
    ],
    benefits: [
      'Customized portal for your organization',
      'Flexible module configuration',
      'Centralized team management',
    ],
  },

  adminContent: {
    capabilities: [
      'Update company profile and logo',
      'Enable/disable modules',
      'Manage team invitations',
      'Configure OAuth settings',
      'Set organization preferences',
    ],
    workflows: [
      {
        id: 'setup-organization',
        title: 'Initial Organization Setup',
        description: 'Configure your organization after first signup.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Organization',
            description: 'Go to System > Organization from the sidebar.',
          },
          {
            step: 2,
            title: 'Update Company Info',
            description: 'Enter your company name, industry, and size.',
          },
          {
            step: 3,
            title: 'Upload Logo',
            description: 'Upload your company logo for branding.',
            tip: 'Use a square image (at least 200x200) for best results.',
          },
          {
            step: 4,
            title: 'Set Preferences',
            description: 'Configure timezone, currency, and date format.',
          },
          {
            step: 5,
            title: 'Save Changes',
            description: 'Click "Save" to apply your settings.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'manage-modules',
        title: 'Enabling/Disabling Modules',
        description: 'Choose which modules are active for your organization.',
        steps: [
          {
            step: 1,
            title: 'Go to Modules',
            description: 'Navigate to System > Modules.',
          },
          {
            step: 2,
            title: 'View Available Modules',
            description: 'See all modules grouped by category.',
          },
          {
            step: 3,
            title: 'Toggle Modules',
            description: 'Click the toggle to enable or disable a module.',
            tip: 'Some modules have dependencies. Check requirements before disabling.',
          },
          {
            step: 4,
            title: 'Confirm Changes',
            description: 'Disabled modules will be hidden from navigation.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'invite-team',
        title: 'Inviting Team Members',
        description: 'Add new team members to your organization.',
        steps: [
          {
            step: 1,
            title: 'Go to Team',
            description: 'Navigate to System > Team.',
          },
          {
            step: 2,
            title: 'Click Invite',
            description: 'Click "Invite Member" button.',
          },
          {
            step: 3,
            title: 'Enter Details',
            description: 'Enter the email address and select a role.',
          },
          {
            step: 4,
            title: 'Send Invitation',
            description: 'The invitee will receive an email with setup instructions.',
            tip: 'Invitations expire after 7 days.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Keep your organization info up to date.',
      'Only enable modules you actually use.',
      'Remove inactive team members promptly.',
      'Set appropriate roles for team members.',
    ],
  },

  employeeContent: undefined,

  validationRules: [
    {
      field: 'Organization Name',
      rule: 'Required. Your company name.',
      required: true,
      example: 'Acme Corporation',
    },
    {
      field: 'Slug (Subdomain)',
      rule: 'Alphanumeric with hyphens, 3-63 characters.',
      required: true,
      example: 'acme-corp',
    },
    {
      field: 'Logo',
      rule: 'Image file, recommended 200x200 or larger.',
      example: 'company-logo.png',
    },
  ],

  faqs: [
    {
      id: 'change-subdomain',
      question: 'Can I change my organization subdomain?',
      answer:
        'The subdomain is set during signup and cannot be changed. Contact support if you need to migrate to a different subdomain.',
      roles: ['ADMIN'],
      tags: ['subdomain'],
    },
    {
      id: 'module-dependencies',
      question: 'What are module dependencies?',
      answer:
        'Some modules depend on others. For example, Leave and Payroll require the Employees module. You cannot disable a module that others depend on.',
      roles: ['ADMIN'],
      tags: ['modules', 'dependencies'],
    },
    {
      id: 'custom-oauth',
      question: 'Can I use my own OAuth credentials?',
      answer:
        'Yes, you can configure custom Google or Microsoft OAuth credentials for your organization. This allows users to sign in with your company\'s identity provider.',
      roles: ['ADMIN'],
      tags: ['oauth', 'authentication'],
    },
  ],

  videos: [
    {
      id: 'settings-overview',
      title: 'Organization Settings Overview',
      description: 'Configure your organization in Durj.',
      duration: '5:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['users', 'approvals'],
};
