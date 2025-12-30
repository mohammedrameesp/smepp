import type { HelpModule } from '../../help-types';

export const leaveContent: HelpModule = {
  id: 'leave',
  categoryId: 'hr',
  name: 'Leave Management',
  description: 'Leave requests, balances, approvals, and team calendar',
  icon: 'Calendar',
  adminOnly: false,
  keywords: ['leave', 'vacation', 'annual', 'sick', 'absence', 'holiday', 'pto', 'time off'],

  overview: {
    summary:
      'The Leave Management module handles all aspects of employee time off. Employees can request leave, track balances, and view team calendars. Admins can configure leave types, manage balances, and approve requests.',
    keyFeatures: [
      'Multiple leave types (annual, sick, compassionate, etc.)',
      'Leave balance tracking and accrual',
      'Multi-level approval workflow',
      'Team calendar view',
      'Qatar Labor Law compliant leave policies',
      'Half-day and full-day leave options',
    ],
    benefits: [
      'Streamlined leave request and approval process',
      'Accurate leave balance tracking',
      'Visibility into team availability',
      'Compliance with labor regulations',
    ],
  },

  adminContent: {
    capabilities: [
      'Configure leave types and policies',
      'Manage employee leave balances',
      'Approve or reject leave requests',
      'View team calendar',
      'Initialize annual leave balances',
      'Override leave balance adjustments',
      'Generate leave reports',
    ],
    workflows: [
      {
        id: 'configure-leave-types',
        title: 'How to Configure Leave Types',
        description: 'Set up the types of leave available in your organization.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Leave Types',
            description: 'Go to HR > Leave Types from the sidebar.',
          },
          {
            step: 2,
            title: 'Click Add Leave Type',
            description: 'Click the "Add Leave Type" button.',
          },
          {
            step: 3,
            title: 'Enter Basic Information',
            description:
              'Enter the name (e.g., "Annual Leave"), description, and choose a color for the calendar.',
            tip: 'Use distinct colors for easy calendar visibility.',
          },
          {
            step: 4,
            title: 'Set Entitlement Rules',
            description:
              'Configure default days, carry forward rules, and whether the leave is paid.',
          },
          {
            step: 5,
            title: 'Set Requirements',
            description:
              'Specify if approval is required, document is needed, or notice period applies.',
          },
          {
            step: 6,
            title: 'Save',
            description: 'Click "Create Leave Type" to save.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'approve-leave',
        title: 'How to Approve Leave Requests',
        description: 'Review and process employee leave requests.',
        steps: [
          {
            step: 1,
            title: 'View Pending Requests',
            description:
              'Go to HR > Leave Requests. Pending requests show a badge count.',
          },
          {
            step: 2,
            title: 'Review Request',
            description:
              'Click on a request to see details including dates, type, and reason.',
          },
          {
            step: 3,
            title: 'Check Balance',
            description:
              'Verify the employee has sufficient leave balance for the request.',
            tip: 'The system shows remaining balance after this request.',
          },
          {
            step: 4,
            title: 'Check Team Calendar',
            description:
              'Review if other team members are on leave during the same period.',
          },
          {
            step: 5,
            title: 'Approve or Reject',
            description:
              'Click "Approve" or "Reject" with an optional note explaining your decision.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'manage-balances',
        title: 'Managing Leave Balances',
        description: 'Adjust and initialize employee leave balances.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Leave Balances',
            description: 'Go to HR > Leave Balances.',
          },
          {
            step: 2,
            title: 'Find Employee',
            description: 'Search for the employee whose balance you want to manage.',
          },
          {
            step: 3,
            title: 'View Current Balance',
            description:
              'See entitlement, used, and remaining days for each leave type.',
          },
          {
            step: 4,
            title: 'Adjust Balance',
            description:
              'Click "Adjust" to add or subtract days with a reason for the adjustment.',
            tip: 'Always document the reason for balance adjustments.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Process leave requests within 24-48 hours.',
      'Set up standard leave types based on Qatar Labor Law.',
      'Review team calendar before approving to avoid understaffing.',
      'Initialize balances at the start of each year.',
      'Configure carry forward limits to manage liability.',
    ],
  },

  employeeContent: {
    capabilities: [
      'Request leave (full day or half day)',
      'View leave balance',
      'Track request status',
      'View team calendar',
      'Cancel pending requests',
      'Upload supporting documents',
    ],
    workflows: [
      {
        id: 'request-leave',
        title: 'How to Request Leave',
        description: 'Submit a new leave request.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Leave',
            description: 'Go to Leave > New Request from the sidebar.',
          },
          {
            step: 2,
            title: 'Select Leave Type',
            description: 'Choose the type of leave (annual, sick, etc.).',
          },
          {
            step: 3,
            title: 'Select Dates',
            description:
              'Pick the start and end dates. For single day leave, select the same date twice.',
            tip: 'Check the team calendar first to see who else is on leave.',
          },
          {
            step: 4,
            title: 'Choose Full or Half Day',
            description:
              'For single-day requests, you can choose AM or PM half-day if needed.',
          },
          {
            step: 5,
            title: 'Add Details',
            description:
              'Provide a reason for the leave. Some types may require document upload.',
          },
          {
            step: 6,
            title: 'Submit',
            description:
              'Click "Submit Request". Your manager will be notified.',
          },
        ],
        roles: ['USER'],
      },
      {
        id: 'check-balance',
        title: 'How to Check Leave Balance',
        description: 'View your available leave days.',
        steps: [
          {
            step: 1,
            title: 'Navigate to My Leave',
            description: 'Go to Leave from the sidebar.',
          },
          {
            step: 2,
            title: 'View Balance Summary',
            description:
              'See your balance for each leave type: entitlement, used, and remaining.',
          },
          {
            step: 3,
            title: 'View History',
            description: 'Click on a leave type to see your request history.',
          },
        ],
        roles: ['USER'],
      },
      {
        id: 'cancel-leave',
        title: 'How to Cancel a Leave Request',
        description: 'Cancel a pending or approved leave request.',
        steps: [
          {
            step: 1,
            title: 'View Your Requests',
            description: 'Go to Leave > My Requests.',
          },
          {
            step: 2,
            title: 'Find the Request',
            description: 'Locate the request you want to cancel.',
          },
          {
            step: 3,
            title: 'Cancel Request',
            description:
              'Click "Cancel" and provide a reason. The balance will be restored.',
            tip: 'You can only cancel requests that have not started yet.',
          },
        ],
        roles: ['USER'],
      },
    ],
    tips: [
      'Request leave as early as possible for better approval chances.',
      'Check your balance before requesting.',
      'Provide clear reasons for leave requests.',
      'For sick leave, upload medical certificate if required.',
      'Cancel requests promptly if plans change.',
    ],
  },

  validationRules: [
    {
      field: 'Leave Type',
      rule: 'Required. Select from available leave types.',
      required: true,
      example: 'Annual Leave',
    },
    {
      field: 'Start Date',
      rule: 'Required. Must be a valid date.',
      required: true,
      example: '2024-03-01',
    },
    {
      field: 'End Date',
      rule: 'Required. Must be on or after start date.',
      required: true,
      example: '2024-03-05',
    },
    {
      field: 'Request Type',
      rule: 'Full day, AM half-day, or PM half-day.',
      example: 'FULL_DAY',
    },
    {
      field: 'Half-Day Request',
      rule: 'For half-day leave, start and end date must be the same.',
      example: 'AM half-day on 2024-03-01',
    },
    {
      field: 'Reason',
      rule: 'Optional but recommended. Maximum 1000 characters.',
      example: 'Family vacation',
    },
    {
      field: 'Document',
      rule: 'Required for some leave types (e.g., sick leave).',
      example: 'Medical certificate upload',
    },
  ],

  faqs: [
    {
      id: 'leave-types',
      question: 'What types of leave are available?',
      answer:
        'Common types include Annual Leave, Sick Leave, Compassionate Leave, Marriage Leave, Maternity Leave, and Unpaid Leave. The specific types depend on your organization\'s configuration.',
      roles: ['ADMIN', 'USER'],
      tags: ['types'],
    },
    {
      id: 'annual-entitlement',
      question: 'How is annual leave entitlement calculated?',
      answer:
        'Per Qatar Labor Law, employees are entitled to 3 weeks (21 days) for the first 5 years and 4 weeks (28 days) after 5 years of service. This may vary based on your contract.',
      roles: ['ADMIN', 'USER'],
      tags: ['entitlement', 'annual'],
    },
    {
      id: 'carry-forward',
      question: 'Can I carry forward unused leave?',
      answer:
        'This depends on your organization\'s policy. Some leave types allow carrying forward up to a certain limit. Check with your HR administrator for specific rules.',
      roles: ['USER'],
      tags: ['carry forward'],
    },
    {
      id: 'half-day',
      question: 'How do I request half-day leave?',
      answer:
        'When creating a leave request, select the same date for start and end, then choose "AM Half-Day" or "PM Half-Day" as the request type.',
      roles: ['USER'],
      tags: ['half-day'],
    },
    {
      id: 'sick-document',
      question: 'Do I need a medical certificate for sick leave?',
      answer:
        'Typically, a medical certificate is required for sick leave of more than 2 consecutive days. Check your organization\'s policy for specific requirements.',
      roles: ['USER'],
      tags: ['sick', 'document'],
    },
    {
      id: 'public-holidays',
      question: 'Are public holidays counted as leave days?',
      answer:
        'No, public holidays are not deducted from your leave balance. If a public holiday falls during your leave period, that day is not counted.',
      roles: ['USER'],
      tags: ['holiday'],
    },
    {
      id: 'approval-time',
      question: 'How long does leave approval take?',
      answer:
        'Processing time depends on your organization. Typically, requests are processed within 24-48 hours. For urgent leave, contact your manager directly.',
      roles: ['USER'],
      tags: ['approval', 'time'],
    },
    {
      id: 'negative-balance',
      question: 'Can I request leave if my balance is zero?',
      answer:
        'This depends on organization policy. Some allow advance leave or unpaid leave. The system will show a warning if you exceed your balance.',
      roles: ['USER'],
      tags: ['balance'],
    },
  ],

  videos: [
    {
      id: 'leave-overview',
      title: 'Leave Management Overview',
      description: 'Learn how to request and manage leave.',
      duration: '5:00',
      isPlaceholder: true,
      roles: ['ADMIN', 'USER'],
    },
    {
      id: 'request-leave-video',
      title: 'Requesting Leave',
      description: 'Step-by-step guide to submitting leave requests.',
      duration: '3:00',
      isPlaceholder: true,
      roles: ['USER'],
    },
    {
      id: 'admin-leave-video',
      title: 'Leave Administration',
      description: 'How to configure and manage leave for your organization.',
      duration: '6:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['employees', 'payroll'],
};
