import type { HelpModule } from '../../help-types';

export const approvalsContent: HelpModule = {
  id: 'approvals',
  categoryId: 'system',
  name: 'Approval Workflows',
  description: 'Configure approval policies and delegations',
  icon: 'GitBranch',
  adminOnly: true,
  keywords: ['approval', 'workflow', 'policy', 'delegation', 'hierarchy'],

  overview: {
    summary:
      'The Approval Workflows module lets you configure custom approval policies for leave requests, purchase requests, and asset requests. Set up multi-level approvals and delegate approval authority when needed.',
    keyFeatures: [
      'Create approval policies with multiple levels',
      'Configure approval thresholds (amount, days)',
      'Delegate approval authority',
      'Track pending approvals',
      'Automatic routing based on rules',
    ],
    benefits: [
      'Customized approval workflows',
      'Clear approval hierarchy',
      'Business continuity with delegations',
      'Audit trail for all approvals',
    ],
  },

  adminContent: {
    capabilities: [
      'Create and manage approval policies',
      'Set approval thresholds',
      'Configure multi-level approvals',
      'Delegate approval authority',
      'Monitor pending approvals',
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
            description: 'Give the policy a name and select the module (Leave, Purchase, Asset).',
          },
          {
            step: 4,
            title: 'Set Thresholds',
            description:
              'For leave: set days range. For purchases/assets: set amount range.',
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
        id: 'setup-delegation',
        title: 'Setting Up Delegation',
        description: 'Delegate your approval authority to someone else.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Delegations',
            description: 'Go to System > Delegations.',
          },
          {
            step: 2,
            title: 'Click New Delegation',
            description: 'Click "New Delegation" button.',
          },
          {
            step: 3,
            title: 'Select Delegatee',
            description: 'Choose who will handle your approvals.',
          },
          {
            step: 4,
            title: 'Set Date Range',
            description: 'Specify the start and end dates for the delegation.',
            tip: 'Set delegation before going on leave to avoid approval delays.',
          },
          {
            step: 5,
            title: 'Add Reason',
            description: 'Optionally explain why (e.g., "Annual leave").',
          },
          {
            step: 6,
            title: 'Save',
            description: 'The delegatee will receive your approval requests during this period.',
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
      'Set up delegation before extended absences.',
      'Review pending approvals daily to avoid bottlenecks.',
      'Use role-based approvers rather than specific individuals.',
      'Test policies with sample requests after setup.',
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
      rule: 'Required. Select Leave Request, Purchase Request, or Asset Request.',
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
      rule: 'Required for purchase/asset policies. Amount threshold range.',
      example: '$0 - $1000',
    },
    {
      field: 'Approval Levels',
      rule: 'Required. 1-5 levels with approver roles.',
      required: true,
      example: 'Level 1: Manager, Level 2: Director',
    },
    {
      field: 'Delegation End Date',
      rule: 'Must be after start date.',
      required: true,
      example: 'End date: 2024-04-01',
    },
  ],

  faqs: [
    {
      id: 'policy-matching',
      question: 'How are policies matched to requests?',
      answer:
        'The system matches requests based on module type and threshold. For leave, it checks the number of days. For purchases, it checks the total amount. The most specific matching policy is applied.',
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
      id: 'delegation-conflict',
      question: 'What if I have multiple delegations?',
      answer:
        'Only one delegation can be active at a time. New delegations will override any overlapping existing ones. The most recently created delegation takes precedence.',
      roles: ['ADMIN'],
      tags: ['delegation'],
    },
    {
      id: 'approver-roles',
      question: 'What approver roles are available?',
      answer:
        'Available roles: MANAGER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR. These map to user roles and determine who receives approval requests at each level.',
      roles: ['ADMIN'],
      tags: ['roles'],
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
    {
      id: 'delegation-video',
      title: 'Setting Up Delegations',
      description: 'Delegate your approval authority.',
      duration: '3:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['leave', 'purchase-requests'],
};
