import type { HelpModule } from '../../help-types';

export const employeesContent: HelpModule = {
  id: 'employees',
  categoryId: 'hr',
  name: 'Employee Directory',
  description: 'Employee profiles, documents, and HR information',
  icon: 'UserCircle',
  adminOnly: true,
  keywords: ['employee', 'staff', 'profile', 'hr', 'document', 'qid', 'passport'],

  overview: {
    summary:
      'The Employee Directory module provides a centralized database of all employee information. Manage profiles, track document expiry (QID, passport, health cards), and process employee change requests.',
    keyFeatures: [
      'Comprehensive employee profiles with contact details',
      'Document tracking with expiry alerts (QID, passport, visa, health card)',
      'Employee change request workflow',
      'Store emergency contact information',
      'Track employment history and contracts',
      'Export employee data and reports',
    ],
    benefits: [
      'Centralized employee information management',
      'Never miss document renewal deadlines',
      'Streamlined profile update process',
      'Compliance with labor regulations',
    ],
  },

  adminContent: {
    capabilities: [
      'Add and manage employee records',
      'Track and update employee documents',
      'Process profile change requests',
      'View document expiry dashboard',
      'Export employee data',
      'Manage emergency contacts',
    ],
    workflows: [
      {
        id: 'add-employee',
        title: 'How to Add a New Employee',
        description: 'Create a new employee record in the system.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Employees',
            description: 'Go to HR > Employees from the sidebar.',
          },
          {
            step: 2,
            title: 'Click Add Employee',
            description: 'Click the "Add Employee" button.',
          },
          {
            step: 3,
            title: 'Enter Basic Information',
            description:
              'Fill in name, email, employee ID, and designation.',
          },
          {
            step: 4,
            title: 'Add Personal Details',
            description:
              'Enter date of birth, nationality, and contact information.',
            tip: 'Qatar mobile numbers should be exactly 8 digits.',
          },
          {
            step: 5,
            title: 'Add Document Information',
            description:
              'Enter QID number (11 digits), passport details, and expiry dates.',
          },
          {
            step: 6,
            title: 'Set Employment Details',
            description: 'Add joining date, contract details, and bank information.',
          },
          {
            step: 7,
            title: 'Save',
            description: 'Click "Create Employee" to save the record.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'document-tracking',
        title: 'Tracking Document Expiry',
        description: 'Monitor and manage expiring employee documents.',
        steps: [
          {
            step: 1,
            title: 'View Expiry Dashboard',
            description: 'Go to HR > Document Expiry to see all expiring documents.',
          },
          {
            step: 2,
            title: 'Filter by Status',
            description:
              'Filter by expired, expiring soon (30 days), or valid documents.',
          },
          {
            step: 3,
            title: 'Update Documents',
            description: 'Click on an employee to update their document details.',
            tip: 'Upload copies of renewed documents for record keeping.',
          },
          {
            step: 4,
            title: 'Set Reminders',
            description:
              'The system automatically sends alerts before documents expire.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'change-requests',
        title: 'Processing Change Requests',
        description: 'Review and approve employee profile change requests.',
        steps: [
          {
            step: 1,
            title: 'View Pending Requests',
            description:
              'Go to HR > Change Requests or check the badge count in the sidebar.',
          },
          {
            step: 2,
            title: 'Review Changes',
            description:
              'Click on a request to see the proposed changes compared to current values.',
          },
          {
            step: 3,
            title: 'Approve or Reject',
            description:
              'Approve valid changes or reject with a reason for invalid requests.',
            tip: 'Verify document changes against official copies.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Regularly check the document expiry dashboard.',
      'Keep digital copies of all employee documents.',
      'Verify QID numbers are exactly 11 digits.',
      'Update emergency contacts annually.',
      'Process change requests promptly to keep data accurate.',
    ],
  },

  employeeContent: undefined, // Admin only module

  validationRules: [
    {
      field: 'QID Number',
      rule: 'Must be exactly 11 digits.',
      required: true,
      example: '287XXXXXXXX',
    },
    {
      field: 'Qatar Mobile',
      rule: 'Must be exactly 8 digits.',
      example: '5XXXXXXX',
    },
    {
      field: 'Other Mobile',
      rule: 'Must be 5-15 digits with optional country code.',
      example: '+91 XXXXXXXXXX',
    },
    {
      field: 'Passport Number',
      rule: 'Must be 5-20 alphanumeric characters.',
      example: 'AB1234567',
    },
    {
      field: 'IBAN',
      rule: 'Qatar IBAN format (spaces allowed).',
      example: 'QA00 XXXX 0000 0000 00XX XXXX XXXXX',
    },
    {
      field: 'Email',
      rule: 'Must be a valid email format.',
      example: 'employee@company.com',
    },
    {
      field: 'Date of Birth',
      rule: 'Valid date in the past.',
      example: '1990-05-15',
    },
    {
      field: 'Date of Joining',
      rule: 'Valid date, typically not in the future.',
      example: '2023-01-15',
    },
  ],

  faqs: [
    {
      id: 'qid-format',
      question: 'What is the correct format for QID numbers?',
      answer:
        'Qatar ID (QID) numbers must be exactly 11 digits. They typically start with 2 or 3 depending on the document type. Example: 287XXXXXXXX',
      roles: ['ADMIN'],
      tags: ['qid', 'format'],
    },
    {
      id: 'document-types',
      question: 'What employee documents can I track?',
      answer:
        'The system tracks QID, passport, visa, health card, and driving license expiry dates. Each document type can have an expiry date and optional document upload.',
      roles: ['ADMIN'],
      tags: ['documents'],
    },
    {
      id: 'expiry-alerts',
      question: 'How do document expiry alerts work?',
      answer:
        'The system sends email alerts at 90, 60, 30, and 7 days before document expiry. Expired documents are highlighted in red on the dashboard.',
      roles: ['ADMIN'],
      tags: ['alerts', 'expiry'],
    },
    {
      id: 'employee-vs-user',
      question: 'What is the difference between an employee and a user?',
      answer:
        'A user is someone who can log into the system. An employee is someone in your HR database. An employee may or may not be a user. For example, you might track workers who do not need system access.',
      roles: ['ADMIN'],
      tags: ['user', 'employee'],
    },
    {
      id: 'bulk-update',
      question: 'Can I update multiple employees at once?',
      answer:
        'Currently, employee records must be updated individually. For bulk updates, please contact support for data migration assistance.',
      roles: ['ADMIN'],
      tags: ['bulk', 'import'],
    },
  ],

  videos: [
    {
      id: 'employee-overview',
      title: 'Employee Management Overview',
      description: 'Learn the basics of managing employee records.',
      duration: '5:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
    {
      id: 'document-tracking-video',
      title: 'Document Expiry Tracking',
      description: 'How to track and manage employee document renewals.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['leave', 'payroll'],
};
