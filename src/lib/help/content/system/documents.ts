import type { HelpModule } from '../../help-types';

export const documentsContent: HelpModule = {
  id: 'documents',
  categoryId: 'system',
  name: 'Company Documents',
  description: 'Track licenses, certifications, and compliance documents',
  icon: 'FileCheck',
  adminOnly: true,
  keywords: ['document', 'license', 'certificate', 'compliance', 'expiry', 'renewal'],

  overview: {
    summary:
      'The Company Documents module helps you track important business documents like commercial registrations, trade licenses, insurance policies, and vehicle registrations. Never miss a renewal with automatic expiry tracking.',
    keyFeatures: [
      'Track company-wide documents and licenses',
      'Automatic expiry alerts',
      'Document type categorization',
      'Track vehicle-specific documents',
      'Upload document copies',
      'Renewal cost tracking',
    ],
    benefits: [
      'Never miss document renewals',
      'Maintain compliance with regulations',
      'Centralized document management',
      'Clear visibility of document status',
    ],
  },

  adminContent: {
    capabilities: [
      'Create and manage document types',
      'Add company documents',
      'Track document expiry dates',
      'Upload document copies',
      'View expiry dashboard',
      'Generate compliance reports',
    ],
    workflows: [
      {
        id: 'add-document-type',
        title: 'Creating Document Types',
        description: 'Define types of documents to track.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Company Documents',
            description: 'Go to System > Company Documents.',
          },
          {
            step: 2,
            title: 'Manage Types',
            description: 'Click "Manage Types" or the settings icon.',
          },
          {
            step: 3,
            title: 'Add New Type',
            description: 'Click "Add Type" and enter the details.',
            tip: 'Use clear, consistent naming like "Trade License" or "Vehicle Insurance".',
          },
          {
            step: 4,
            title: 'Set Category',
            description: 'Choose COMPANY for business docs or VEHICLE for vehicle-related.',
          },
          {
            step: 5,
            title: 'Save',
            description: 'The type is now available for adding documents.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'add-document',
        title: 'Adding a Company Document',
        description: 'Register a new document for tracking.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Company Documents',
            description: 'Go to System > Company Documents.',
          },
          {
            step: 2,
            title: 'Click Add Document',
            description: 'Click the "Add Document" button.',
          },
          {
            step: 3,
            title: 'Select Document Type',
            description: 'Choose the type of document.',
          },
          {
            step: 4,
            title: 'Enter Details',
            description: 'Add reference number, expiry date, and renewal cost.',
          },
          {
            step: 5,
            title: 'Link to Vehicle (Optional)',
            description: 'For vehicle documents, link to the specific asset.',
          },
          {
            step: 6,
            title: 'Upload Copy',
            description: 'Upload a scan or photo of the document.',
          },
          {
            step: 7,
            title: 'Save',
            description: 'The document is now tracked for expiry.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'track-expiry',
        title: 'Tracking Document Expiry',
        description: 'Monitor documents approaching expiry.',
        steps: [
          {
            step: 1,
            title: 'View Dashboard',
            description: 'The Company Documents page shows status at a glance.',
          },
          {
            step: 2,
            title: 'Filter by Status',
            description: 'Filter to see Expired, Expiring Soon, or Valid documents.',
          },
          {
            step: 3,
            title: 'Take Action',
            description: 'Click on expiring documents to initiate renewal.',
          },
          {
            step: 4,
            title: 'Update After Renewal',
            description: 'Update the expiry date and upload new document copy.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Set up all document types before adding documents.',
      'Upload copies of all important documents.',
      'Review the expiry dashboard weekly.',
      'Track renewal costs for budgeting purposes.',
      'Link vehicle documents to their respective assets.',
    ],
  },

  employeeContent: undefined,

  validationRules: [
    {
      field: 'Document Type',
      rule: 'Required. Select from defined document types.',
      required: true,
      example: 'Trade License',
    },
    {
      field: 'Expiry Date',
      rule: 'Required. The date the document expires.',
      required: true,
      example: '2025-03-31',
    },
    {
      field: 'Reference Number',
      rule: 'Optional. Maximum 100 characters.',
      example: 'TL-2024-12345',
    },
    {
      field: 'Renewal Cost',
      rule: 'Optional. Must be positive if provided.',
      example: '5000.00',
    },
    {
      field: 'Document URL',
      rule: 'Optional. Valid file upload or URL.',
      example: 'trade-license-2024.pdf',
    },
  ],

  faqs: [
    {
      id: 'document-categories',
      question: 'What document categories are available?',
      answer:
        'COMPANY: General business documents like trade licenses, commercial registration, insurance. VEHICLE: Vehicle-specific documents linked to assets like registration, insurance, Istimara.',
      roles: ['ADMIN'],
      tags: ['categories'],
    },
    {
      id: 'expiry-alerts',
      question: 'How do expiry alerts work?',
      answer:
        'The system sends email alerts at 90, 60, 30, and 7 days before document expiry. The dashboard shows color-coded status: Red for expired, Yellow for expiring soon.',
      roles: ['ADMIN'],
      tags: ['alerts', 'expiry'],
    },
    {
      id: 'vehicle-documents',
      question: 'How do I track vehicle documents?',
      answer:
        'Create document types with category "VEHICLE". When adding a document, link it to a specific vehicle from your assets. This allows filtering documents by vehicle.',
      roles: ['ADMIN'],
      tags: ['vehicle'],
    },
    {
      id: 'bulk-renewal',
      question: 'Can I update multiple documents at once?',
      answer:
        'Currently, documents must be updated individually. This ensures accurate tracking of each document\'s specific expiry and reference information.',
      roles: ['ADMIN'],
      tags: ['bulk'],
    },
  ],

  videos: [
    {
      id: 'documents-overview',
      title: 'Company Documents Overview',
      description: 'Track and manage company documents and licenses.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['assets', 'settings'],
};
