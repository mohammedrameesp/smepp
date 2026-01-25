import type { HelpModule } from '../../help-types';

export const approvalsContent: HelpModule = {
  id: 'approvals',
  categoryId: 'system',
  name: 'Approval Workflows',
  description: 'Configure approval policies and workflows',
  icon: 'GitBranch',
  adminOnly: true,
  keywords: ['approval', 'workflow', 'policy', 'hierarchy'],

  overview: {
    summary:
      'The Approval Workflows module lets you configure custom approval policies for leave requests, spend requests, and asset requests. Set up multi-level approvals with role-based routing.',
    keyFeatures: [
      'Create approval policies with multiple levels',
      'Configure approval thresholds (amount, days)',
      'Role-based approval routing',
      'Track pending approvals',
      'Automatic routing based on rules',
    ],
    benefits: [
      'Customized approval workflows',
      'Clear approval hierarchy',
      'Audit trail for all approvals',
      'Streamlined request processing',
    ],
  },

  adminContent: {
    capabilities: [
      'Create and manage approval policies',
      'Set approval thresholds',
      'Configure multi-level approvals',
      'Monitor pending approvals',
      'View approval history',
    ],
    workflows: [
      {
        id: 'create-policy',
        title: 'Creating an Approval Policy',
        description: 'Set up a new approval workflow.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Approval Policies',
            description: 'Go to System > Approval Policies.',
          },
          {
            step: 2,
            title: 'Click Add Policy',
            description: 'Click the "Add Policy" button.',
          },
          {
            step: 3,
            title: 'Enter Policy Details',
            description: 'Give the policy a name and select the module (Leave, Spend, Asset).',
          },
          {
            step: 4,
            title: 'Set Thresholds',
            description:
              'For leave: set days range. For spend/assets: set amount range.',
            tip: 'Create multiple policies for different thresholds (e.g., <$1000, $1000-$5000, >$5000).',
          },
          {
            step: 5,
            title: 'Add Approval Levels',
            description: 'Add up to 5 levels with specific approver roles.',
          },
          {
            step: 6,
            title: 'Save',
            description: 'The policy is now active for matching requests.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'manage-pending',
        title: 'Managing Pending Approvals',
        description: 'View and process items awaiting your approval.',
        steps: [
          {
            step: 1,
            title: 'Go to My Approvals',
            description: 'Navigate to System > My Approvals.',
          },
          {
            step: 2,
            title: 'View Pending Items',
            description: 'See all requests awaiting your approval.',
          },
          {
            step: 3,
            title: 'Review and Decide',
            description: 'Click on each item to review and approve or reject.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Create policies from simple to complex thresholds.',
      'Review pending approvals daily to avoid bottlenecks.',
      'Use role-based approvers rather than specific individuals.',
      'Test policies with sample requests after setup.',
      'Admin users can approve any pending request as a bypass.',
    ],
  },

  employeeContent: undefined,

  validationRules: [
    {
      field: 'Policy Name',
      rule: 'Required. Maximum 100 characters.',
      required: true,
      example: 'Leave Approval - Standard',
    },
    {
      field: 'Module',
      rule: 'Required. Select Leave Request, Spend Request, or Asset Request.',
      required: true,
      example: 'Leave Request',
    },
    {
      field: 'Min/Max Days',
      rule: 'Required for leave policies. Days threshold range.',
      example: '1-5 days',
    },
    {
      field: 'Min/Max Amount',
      rule: 'Required for spend/asset policies. Amount threshold range.',
      example: '$0 - $1000',
    },
    {
      field: 'Approval Levels',
      rule: 'Required. 1-5 levels with approver roles.',
      required: true,
      example: 'Level 1: Manager, Level 2: Director',
    },
  ],

  faqs: [
    {
      id: 'policy-matching',
      question: 'How are policies matched to requests?',
      answer:
        'The system matches requests based on module type and threshold. For leave, it checks the number of days. For spend requests, it checks the total amount. The most specific matching policy is applied.',
      roles: ['ADMIN'],
      tags: ['matching', 'policies'],
    },
    {
      id: 'multi-level',
      question: 'How do multi-level approvals work?',
      answer:
        'Each level must approve in sequence. Level 1 approves first, then Level 2, etc. If any level rejects, the request is rejected. All levels must approve for final approval.',
      roles: ['ADMIN'],
      tags: ['multi-level', 'sequence'],
    },
    {
      id: 'no-policy',
      question: 'What happens if no policy matches?',
      answer:
        'If no approval policy matches a request, it follows the default behavior for that module (typically goes to the organization Admin).',
      roles: ['ADMIN'],
      tags: ['default'],
    },
    {
      id: 'approver-roles',
      question: 'What approver roles are available?',
      answer:
        'Available roles: MANAGER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR. These map to user roles and determine who receives approval requests at each level.',
      roles: ['ADMIN'],
      tags: ['roles'],
    },
    {
      id: 'admin-bypass',
      question: 'Can admins approve any request?',
      answer:
        'Yes, users with the ADMIN role can approve any pending request regardless of the required approver role. This serves as a bypass for urgent situations.',
      roles: ['ADMIN'],
      tags: ['admin', 'bypass'],
    },
  ],

  videos: [
    {
      id: 'approvals-overview',
      title: 'Approval Workflows Overview',
      description: 'Configure and manage approval workflows.',
      duration: '6:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['leave', 'spend-requests'],
};
