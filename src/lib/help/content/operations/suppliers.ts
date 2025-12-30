import type { HelpModule } from '../../help-types';

export const suppliersContent: HelpModule = {
  id: 'suppliers',
  categoryId: 'operations',
  name: 'Supplier Management',
  description: 'Manage vendors, contracts, and supplier relationships',
  icon: 'Truck',
  adminOnly: false,
  keywords: ['supplier', 'vendor', 'contractor', 'procurement', 'contract'],

  overview: {
    summary:
      'The Supplier Management module helps you maintain a comprehensive database of your vendors and service providers. Track contact information, contracts, engagement history, and manage the supplier approval process.',
    keyFeatures: [
      'Centralized supplier database with contact details',
      'Supplier approval workflow',
      'Track engagement history and ratings',
      'Store contract and payment terms',
      'Categorize suppliers by service type',
      'Export supplier directory',
    ],
    benefits: [
      'Streamlined vendor onboarding process',
      'Easy access to supplier contact information',
      'Better visibility into vendor relationships',
      'Simplified procurement decisions',
    ],
  },

  adminContent: {
    capabilities: [
      'Add and manage supplier records',
      'Approve or reject supplier registrations',
      'Track engagement history',
      'Rate suppliers based on performance',
      'Manage supplier categories',
      'Export supplier directory',
    ],
    workflows: [
      {
        id: 'add-supplier',
        title: 'How to Add a New Supplier',
        description: 'Register a new vendor or service provider.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Suppliers',
            description: 'Go to Operations > Suppliers from the sidebar.',
          },
          {
            step: 2,
            title: 'Click Add Supplier',
            description: 'Click the "Add Supplier" button.',
          },
          {
            step: 3,
            title: 'Enter Company Details',
            description:
              'Fill in the company name, category, address, and website.',
            tip: 'Use consistent category names to make filtering easier.',
          },
          {
            step: 4,
            title: 'Add Contact Information',
            description:
              'Enter primary contact details including name, email, and phone.',
          },
          {
            step: 5,
            title: 'Set Payment Terms (Optional)',
            description: 'Add payment terms and any additional notes.',
          },
          {
            step: 6,
            title: 'Save',
            description:
              'Click "Create Supplier". The supplier will be in pending status until approved.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'approve-supplier',
        title: 'How to Approve Supplier Registrations',
        description: 'Review and approve pending supplier applications.',
        steps: [
          {
            step: 1,
            title: 'View Pending Suppliers',
            description:
              'Go to Suppliers and filter by "Pending" status, or check the badge count.',
          },
          {
            step: 2,
            title: 'Review Details',
            description:
              'Click on a pending supplier to review their information.',
          },
          {
            step: 3,
            title: 'Verify Information',
            description:
              'Verify the company details, check references if needed.',
            tip: 'Consider requesting additional documentation for high-value vendors.',
          },
          {
            step: 4,
            title: 'Approve or Reject',
            description:
              'Click "Approve" to activate the supplier, or "Reject" with a reason.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'track-engagement',
        title: 'Tracking Supplier Engagements',
        description: 'Record interactions and engagements with suppliers.',
        steps: [
          {
            step: 1,
            title: 'Open Supplier Details',
            description: 'Navigate to the supplier profile.',
          },
          {
            step: 2,
            title: 'Add Engagement',
            description: 'Click "Add Engagement" in the engagement history section.',
          },
          {
            step: 3,
            title: 'Record Details',
            description:
              'Enter the date, notes about the engagement, and optionally rate the interaction.',
          },
          {
            step: 4,
            title: 'Save',
            description: 'The engagement will be logged in the supplier history.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Keep supplier contact information up to date.',
      'Regularly review and rate supplier performance.',
      'Use consistent categories for better organization.',
      'Document contract terms and payment conditions.',
      'Request updated insurance and certifications annually.',
    ],
  },

  employeeContent: {
    capabilities: [
      'Browse approved suppliers',
      'View supplier contact information',
      'Search suppliers by category',
    ],
    workflows: [
      {
        id: 'find-supplier',
        title: 'How to Find a Supplier',
        description: 'Search and browse the supplier directory.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Suppliers',
            description: 'Go to Suppliers from the sidebar.',
          },
          {
            step: 2,
            title: 'Search or Filter',
            description:
              'Use the search bar to find by name, or filter by category.',
          },
          {
            step: 3,
            title: 'View Details',
            description:
              'Click on a supplier to view their contact information and details.',
          },
        ],
        roles: ['USER'],
      },
    ],
    tips: [
      'Check if a supplier already exists before requesting a new vendor.',
      'Use supplier contact info for routine communications.',
    ],
  },

  validationRules: [
    {
      field: 'Company Name',
      rule: 'Required. The official company name.',
      required: true,
      example: 'ABC Trading LLC',
    },
    {
      field: 'Category',
      rule: 'Required. The type of service or products provided.',
      required: true,
      example: 'IT Services',
    },
    {
      field: 'Email',
      rule: 'Must be a valid email format if provided.',
      example: 'contact@abctrading.com',
    },
    {
      field: 'Website',
      rule: 'Must be a valid URL or domain name if provided.',
      example: 'www.abctrading.com',
    },
    {
      field: 'Establishment Year',
      rule: 'Must be between 1800 and current year.',
      example: '2015',
    },
    {
      field: 'Phone',
      rule: 'Should be 5-15 digits.',
      example: '+974 44556677',
    },
  ],

  faqs: [
    {
      id: 'supplier-status',
      question: 'What do the supplier statuses mean?',
      answer:
        'PENDING: Awaiting approval.\nAPPROVED: Verified and active in the system.\nREJECTED: Application declined.\nBLACKLISTED: Removed from approved vendor list.',
      roles: ['ADMIN', 'USER'],
      tags: ['status'],
    },
    {
      id: 'multiple-contacts',
      question: 'Can I add multiple contacts for a supplier?',
      answer:
        'Yes, you can add both a primary and secondary contact for each supplier. This ensures backup communication channels.',
      roles: ['ADMIN'],
      tags: ['contacts'],
    },
    {
      id: 'supplier-rating',
      question: 'How does the rating system work?',
      answer:
        'Admins can rate suppliers from 1-5 stars when logging engagements. The average rating is displayed on the supplier profile to help with vendor selection.',
      roles: ['ADMIN'],
      tags: ['rating'],
    },
    {
      id: 'request-new-supplier',
      question: 'How do I request adding a new supplier?',
      answer:
        'Contact your administrator with the supplier details. They will add and approve the supplier before it becomes available in the directory.',
      roles: ['USER'],
      tags: ['request'],
    },
  ],

  videos: [
    {
      id: 'supplier-overview',
      title: 'Supplier Management Overview',
      description: 'Learn how to manage your vendor relationships.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN', 'USER'],
    },
    {
      id: 'approval-workflow',
      title: 'Supplier Approval Process',
      description: 'Step-by-step guide to approving new suppliers.',
      duration: '3:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['assets', 'purchase-requests'],
};
