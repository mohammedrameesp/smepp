import type { HelpModule } from '../../help-types';

export const purchaseRequestsContent: HelpModule = {
  id: 'purchase-requests',
  categoryId: 'procurement',
  name: 'Spend Requests',
  description: 'Internal spending workflow and approval process',
  icon: 'ShoppingCart',
  adminOnly: false,
  keywords: ['purchase', 'procurement', 'request', 'approval', 'buy', 'order'],

  overview: {
    summary:
      'The Spend Requests module streamlines internal spending approvals. Employees can submit spend requests for approval, and admins can review, approve, or reject them. Track all spending from request to completion.',
    keyFeatures: [
      'Submit spend requests with line items',
      'Multi-level approval workflow',
      'Track request status from submission to completion',
      'Attach supporting documents',
      'Support for recurring and one-time spending',
    ],
    benefits: [
      'Streamlined spending approval process',
      'Clear approval workflow',
      'Spending visibility and control',
      'Audit trail for all spending',
    ],
  },

  adminContent: {
    capabilities: [
      'Review pending spend requests',
      'Approve or reject requests',
      'Track all requests across the organization',
      'Mark requests as completed',
      'Generate spend reports',
    ],
    workflows: [
      {
        id: 'review-request',
        title: 'How to Review Spend Requests',
        description: 'Evaluate and process pending spend requests.',
        steps: [
          {
            step: 1,
            title: 'View Pending Requests',
            description:
              'Go to Operations > Spend Requests. Check the pending badge count.',
          },
          {
            step: 2,
            title: 'Open Request',
            description: 'Click on a request to see full details and line items.',
          },
          {
            step: 3,
            title: 'Review Items',
            description:
              'Check each item, quantities, prices, and justification.',
            tip: 'Verify budget availability before approving large requests.',
          },
          {
            step: 4,
            title: 'Approve or Reject',
            description:
              'Click "Approve" with notes, or "Reject" with a reason.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'complete-request',
        title: 'Marking Request as Completed',
        description: 'Record when a spend request has been fulfilled.',
        steps: [
          {
            step: 1,
            title: 'Find Approved Request',
            description: 'Filter for approved requests that have been purchased.',
          },
          {
            step: 2,
            title: 'Mark Complete',
            description:
              'Click "Mark Complete" and add completion notes (e.g., invoice number).',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Process requests within 48 hours to avoid delays.',
      'Check vendor options before approving large spend requests.',
      'Require quotes for requests over certain amounts.',
    ],
  },

  employeeContent: {
    capabilities: [
      'Submit new spend requests',
      'Add multiple line items',
      'Track request status',
      'Cancel pending requests',
      'View request history',
    ],
    workflows: [
      {
        id: 'submit-request',
        title: 'How to Submit a Spend Request',
        description: 'Create a new spend request for approval.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Spend Requests',
            description: 'Go to Requests > New Request from the sidebar.',
          },
          {
            step: 2,
            title: 'Enter Request Details',
            description:
              'Add a title and optional description for the spend request.',
          },
          {
            step: 3,
            title: 'Add Line Items',
            description:
              'Add each item with description, quantity, and estimated unit price.',
            tip: 'Include product URLs or links for easier procurement.',
          },
          {
            step: 4,
            title: 'Set Priority',
            description: 'Choose priority level: Low, Medium, High, or Urgent.',
          },
          {
            step: 5,
            title: 'Add Justification',
            description: 'Explain why this purchase is needed.',
          },
          {
            step: 6,
            title: 'Submit',
            description:
              'Click "Submit Request". It will be sent for approval.',
          },
        ],
        roles: ['USER'],
      },
      {
        id: 'track-request',
        title: 'How to Track Your Requests',
        description: 'Check the status of your submitted requests.',
        steps: [
          {
            step: 1,
            title: 'View My Requests',
            description: 'Go to Requests > Spend Requests.',
          },
          {
            step: 2,
            title: 'Check Status',
            description:
              'See status: Pending, Under Review, Approved, Rejected, or Completed.',
          },
          {
            step: 3,
            title: 'View Details',
            description: 'Click on a request to see approval notes or rejection reason.',
          },
        ],
        roles: ['USER'],
      },
    ],
    tips: [
      'Provide clear descriptions for faster approval.',
      'Include product links to help procurement.',
      'Set realistic needed-by dates.',
      'Follow up on pending requests if urgent.',
    ],
  },

  validationRules: [
    {
      field: 'Title',
      rule: 'Required. Maximum 200 characters.',
      required: true,
      example: 'Office Supplies - Q1 2024',
    },
    {
      field: 'Items',
      rule: 'At least one item is required.',
      required: true,
      example: 'Paper, Pens, Notebooks',
    },
    {
      field: 'Item Description',
      rule: 'Required per item. Maximum 500 characters.',
      required: true,
      example: 'A4 Paper 500 sheets',
    },
    {
      field: 'Quantity',
      rule: 'Required. Must be at least 1.',
      required: true,
      example: '10',
    },
    {
      field: 'Unit Price',
      rule: 'Required. Must be zero or positive.',
      required: true,
      example: '25.00',
    },
    {
      field: 'Priority',
      rule: 'Select from Low, Medium, High, Urgent.',
      example: 'Medium',
    },
    {
      field: 'Product URL',
      rule: 'Optional. Must be a valid URL if provided.',
      example: 'https://vendor.com/product',
    },
  ],

  faqs: [
    {
      id: 'request-status',
      question: 'What do the request statuses mean?',
      answer:
        'PENDING: Awaiting initial review. UNDER_REVIEW: Being evaluated. APPROVED: Spending authorized. REJECTED: Request denied. COMPLETED: Spending fulfilled.',
      roles: ['ADMIN', 'USER'],
      tags: ['status'],
    },
    {
      id: 'approval-time',
      question: 'How long does approval take?',
      answer:
        'Standard requests are typically processed within 24-48 hours. Urgent requests may be expedited. Large spend requests may require additional approvals.',
      roles: ['USER'],
      tags: ['approval', 'time'],
    },
    {
      id: 'edit-request',
      question: 'Can I edit a submitted request?',
      answer:
        'You cannot edit a request after submission. If changes are needed, cancel the pending request and submit a new one.',
      roles: ['USER'],
      tags: ['edit'],
    },
    {
      id: 'recurring-spending',
      question: 'How do I handle recurring spending?',
      answer:
        'For recurring items (e.g., subscriptions), select "Monthly" or "Yearly" billing cycle. The system can track recurring costs separately.',
      roles: ['ADMIN', 'USER'],
      tags: ['recurring'],
    },
    {
      id: 'budget-limit',
      question: 'Is there a spending limit?',
      answer:
        'Limits depend on your organization\'s approval policies. Large spend requests may require additional approval levels.',
      roles: ['USER'],
      tags: ['budget', 'limit'],
    },
    {
      id: 'vendor-selection',
      question: 'Can I specify a preferred vendor?',
      answer:
        'Yes, you can add vendor name and contact in the request. Include product URLs to help procurement source the exact items.',
      roles: ['USER'],
      tags: ['vendor'],
    },
  ],

  videos: [
    {
      id: 'spend-overview',
      title: 'Spend Requests Overview',
      description: 'Learn how the spend request process works.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN', 'USER'],
    },
    {
      id: 'submit-request-video',
      title: 'Submitting a Spend Request',
      description: 'Step-by-step guide to creating spend requests.',
      duration: '3:00',
      isPlaceholder: true,
      roles: ['USER'],
    },
    {
      id: 'approve-request-video',
      title: 'Processing Spend Requests',
      description: 'How to review and approve spend requests.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['suppliers'],
};
