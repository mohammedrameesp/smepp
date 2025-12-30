import type { HelpModule } from '../../help-types';

export const subscriptionsContent: HelpModule = {
  id: 'subscriptions',
  categoryId: 'operations',
  name: 'Subscription Tracking',
  description: 'Monitor SaaS services, renewals, and recurring costs',
  icon: 'CreditCard',
  adminOnly: false,
  keywords: ['subscription', 'saas', 'software', 'license', 'renewal', 'billing', 'recurring'],

  overview: {
    summary:
      'The Subscription Tracking module helps you manage all your SaaS and software subscriptions in one place. Track renewal dates, monitor costs, and ensure you never miss a billing cycle or auto-renewal.',
    keyFeatures: [
      'Centralized view of all company subscriptions',
      'Automatic renewal date tracking and alerts',
      'Cost tracking per subscription and total spend',
      'Assign subscriptions to users or projects',
      'Track billing cycles and payment methods',
      'Export subscription data for reporting',
    ],
    benefits: [
      'Never miss a renewal or face unexpected charges',
      'Optimize software spend with visibility into costs',
      'Identify unused subscriptions to reduce waste',
      'Maintain compliance with license tracking',
    ],
  },

  adminContent: {
    capabilities: [
      'Add, edit, and delete subscriptions',
      'Set renewal reminders and alerts',
      'Assign subscriptions to users or projects',
      'Track subscription costs and billing cycles',
      'View upcoming renewals dashboard',
      'Export subscription reports',
    ],
    workflows: [
      {
        id: 'add-subscription',
        title: 'How to Add a New Subscription',
        description: 'Register a new SaaS or software subscription.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Subscriptions',
            description: 'Go to Operations > Subscriptions from the sidebar.',
          },
          {
            step: 2,
            title: 'Click Add Subscription',
            description: 'Click the "Add Subscription" button.',
          },
          {
            step: 3,
            title: 'Enter Subscription Details',
            description:
              'Fill in the service name, vendor, and category. Set the purchase date and renewal date.',
            tip: 'Set the renewal date to receive timely reminders before expiry.',
          },
          {
            step: 4,
            title: 'Set Billing Information',
            description:
              'Enter the cost, billing cycle (monthly, yearly, etc.), and payment method.',
          },
          {
            step: 5,
            title: 'Assign (Optional)',
            description:
              'Assign the subscription to a specific user or project if applicable.',
          },
          {
            step: 6,
            title: 'Save',
            description: 'Click "Create Subscription" to save.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'renewal-management',
        title: 'Managing Subscription Renewals',
        description: 'Track and manage upcoming subscription renewals.',
        steps: [
          {
            step: 1,
            title: 'View Upcoming Renewals',
            description:
              'The dashboard shows subscriptions expiring in the next 30 days.',
          },
          {
            step: 2,
            title: 'Review Subscription',
            description: 'Click on a subscription to review its details and usage.',
          },
          {
            step: 3,
            title: 'Decide Action',
            description:
              'Decide whether to renew, cancel, or modify the subscription.',
            tip: 'Check with assigned users before cancelling to ensure the service is truly unused.',
          },
          {
            step: 4,
            title: 'Update Renewal Date',
            description:
              'After renewing, update the renewal date in the system to the new expiry.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Review subscriptions monthly to identify unused services.',
      'Set renewal alerts at least 30 days before expiry for annual subscriptions.',
      'Keep payment method information updated to avoid service interruptions.',
      'Track per-user costs to optimize license allocation.',
      'Consider consolidating vendors for better pricing.',
    ],
  },

  employeeContent: {
    capabilities: [
      'View subscriptions assigned to you',
      'Browse all company subscriptions',
      'View subscription details and costs',
    ],
    workflows: [
      {
        id: 'view-subscriptions',
        title: 'How to View Company Subscriptions',
        description: 'Browse subscriptions available in your organization.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Subscriptions',
            description: 'Go to Subscriptions from the sidebar.',
          },
          {
            step: 2,
            title: 'Browse Subscriptions',
            description: 'View the list of all company subscriptions.',
          },
          {
            step: 3,
            title: 'View Details',
            description:
              'Click on a subscription to see details like vendor, cost, and renewal date.',
          },
        ],
        roles: ['USER'],
      },
    ],
    tips: [
      'Check if a subscription exists before requesting a new software purchase.',
      'Report unused subscriptions to help reduce costs.',
    ],
  },

  validationRules: [
    {
      field: 'Service Name',
      rule: 'Required. Maximum 255 characters.',
      required: true,
      example: 'Microsoft 365',
    },
    {
      field: 'Purchase Date',
      rule: 'Required. The date the subscription was purchased or started.',
      required: true,
      example: '2024-01-01',
    },
    {
      field: 'Billing Cycle',
      rule: 'Required. Select monthly, quarterly, or yearly.',
      required: true,
      example: 'YEARLY',
    },
    {
      field: 'Renewal Date',
      rule: 'Optional. Must be on or after purchase date.',
      example: '2025-01-01',
    },
    {
      field: 'Cost per Cycle',
      rule: 'Optional. Must be a positive number.',
      example: '299.99',
    },
    {
      field: 'Assigned User',
      rule: 'Optional. Requires assignment date if set.',
      example: 'John Doe',
    },
    {
      field: 'Assignment Date',
      rule: 'Required when assigning to a user.',
      example: '2024-01-15',
    },
  ],

  faqs: [
    {
      id: 'billing-cycles',
      question: 'What billing cycles are supported?',
      answer:
        'The system supports monthly, quarterly, semi-annual, and yearly billing cycles. You can also track one-time purchases that do not renew.',
      roles: ['ADMIN', 'USER'],
      tags: ['billing', 'cycles'],
    },
    {
      id: 'renewal-alerts',
      question: 'How do renewal alerts work?',
      answer:
        'The system automatically shows upcoming renewals on your dashboard. You can configure email notifications for subscriptions expiring within 30, 14, and 7 days.',
      roles: ['ADMIN'],
      tags: ['alerts', 'renewal'],
    },
    {
      id: 'cost-currency',
      question: 'Can I track costs in different currencies?',
      answer:
        'Yes, you can enter costs in their original currency. The system can convert to QAR for reporting purposes using configured exchange rates.',
      roles: ['ADMIN'],
      tags: ['currency', 'cost'],
    },
    {
      id: 'unused-subs',
      question: 'How do I identify unused subscriptions?',
      answer:
        'Check subscriptions that are not assigned to any user or project. Also, review with team members periodically to confirm active usage.',
      roles: ['ADMIN'],
      tags: ['unused', 'optimization'],
    },
    {
      id: 'auto-renew',
      question: 'How do I track auto-renewing subscriptions?',
      answer:
        'Mark the subscription as "Auto-Renew" when adding it. This helps you identify which subscriptions will renew automatically vs those requiring manual action.',
      roles: ['ADMIN'],
      tags: ['auto-renew', 'tracking'],
    },
  ],

  videos: [
    {
      id: 'subscription-overview',
      title: 'Subscription Tracking Overview',
      description: 'Learn how to manage your SaaS subscriptions effectively.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN', 'USER'],
    },
    {
      id: 'renewal-management-video',
      title: 'Managing Renewals',
      description: 'Never miss a subscription renewal again.',
      duration: '3:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['assets', 'suppliers'],
};
