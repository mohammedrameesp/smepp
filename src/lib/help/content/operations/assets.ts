import type { HelpModule } from '../../help-types';

export const assetsContent: HelpModule = {
  id: 'assets',
  categoryId: 'operations',
  name: 'Asset Management',
  description: 'Track company assets, assignments, maintenance, and depreciation',
  icon: 'Box',
  adminOnly: false,
  keywords: ['asset', 'equipment', 'hardware', 'laptop', 'inventory', 'assignment', 'depreciation'],

  overview: {
    summary:
      'The Asset Management module helps you track all company assets including hardware, equipment, furniture, and vehicles. Monitor asset assignments, maintenance schedules, warranties, and calculate depreciation automatically.',
    keyFeatures: [
      'Track all company assets with detailed information',
      'Assign assets to employees and track assignment history',
      'Monitor warranty expiry and maintenance schedules',
      'Calculate and track asset depreciation',
      'Process asset requests from employees',
      'Generate asset reports and exports',
    ],
    benefits: [
      'Complete visibility into company assets and their status',
      'Reduce asset loss with proper tracking and accountability',
      'Automate depreciation calculations for accounting',
      'Streamline asset request and approval workflow',
    ],
  },

  adminContent: {
    capabilities: [
      'Add, edit, and delete asset records',
      'Assign assets to employees',
      'Process asset requests (approve/reject)',
      'Configure depreciation categories and rates',
      'View all assets across the organization',
      'Export asset data to CSV or PDF',
      'Track asset maintenance and warranty',
    ],
    workflows: [
      {
        id: 'add-asset',
        title: 'How to Add a New Asset',
        description: 'Follow these steps to register a new asset in the system.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Assets',
            description: 'Go to Operations > Assets from the sidebar menu.',
          },
          {
            step: 2,
            title: 'Click Add Asset',
            description: 'Click the "Add Asset" button in the top right corner.',
          },
          {
            step: 3,
            title: 'Enter Asset Details',
            description:
              'Fill in the required fields: Asset Type and Model. Add optional details like brand, serial number, and purchase information.',
            tip: 'Use a consistent naming convention for asset tags to make searching easier.',
          },
          {
            step: 4,
            title: 'Set Status and Assignment',
            description:
              'Choose the asset status. If assigning to an employee, select the assignee and assignment date.',
          },
          {
            step: 5,
            title: 'Configure Depreciation (Optional)',
            description:
              'Select a depreciation category if you want to track asset value over time.',
          },
          {
            step: 6,
            title: 'Save the Asset',
            description: 'Click "Create Asset" to save. The asset will now appear in your asset list.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'assign-asset',
        title: 'How to Assign an Asset to an Employee',
        description: 'Assign an existing asset to an employee.',
        steps: [
          {
            step: 1,
            title: 'Find the Asset',
            description: 'Navigate to Operations > Assets and locate the asset you want to assign.',
          },
          {
            step: 2,
            title: 'Open Asset Details',
            description: 'Click on the asset to view its details.',
          },
          {
            step: 3,
            title: 'Click Assign',
            description: 'Click the "Assign" button or edit the asset.',
          },
          {
            step: 4,
            title: 'Select Employee',
            description: 'Choose the employee from the dropdown and set the assignment date.',
            tip: 'The employee will receive a notification about the pending assignment.',
          },
          {
            step: 5,
            title: 'Confirm Assignment',
            description:
              'Save the changes. The employee will need to accept the assignment.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'process-request',
        title: 'How to Process Asset Requests',
        description: 'Review and process asset requests from employees.',
        steps: [
          {
            step: 1,
            title: 'View Pending Requests',
            description: 'Go to Operations > Asset Requests. Pending requests show a badge count.',
          },
          {
            step: 2,
            title: 'Review Request',
            description: 'Click on a request to see details including the employee and requested asset.',
          },
          {
            step: 3,
            title: 'Approve or Reject',
            description: 'Click "Approve" to assign the asset, or "Reject" with a reason.',
            tip: 'Always provide a reason when rejecting so the employee understands.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Regularly audit your asset inventory to ensure accuracy.',
      'Set up warranty expiry alerts to never miss renewal dates.',
      'Use asset categories consistently for better reporting.',
      'Document asset condition when assigning and returning.',
      'Configure depreciation early to maintain accurate financial records.',
    ],
  },

  employeeContent: {
    capabilities: [
      'View assets assigned to you',
      'Request new asset assignments',
      'Request asset returns',
      'Accept or decline asset assignments',
      'View asset details and history',
    ],
    workflows: [
      {
        id: 'my-assets',
        title: 'How to View My Assets',
        description: 'See all assets currently assigned to you.',
        steps: [
          {
            step: 1,
            title: 'Navigate to My Holdings',
            description: 'Go to Assets > My Holdings from the sidebar.',
          },
          {
            step: 2,
            title: 'View Asset List',
            description: 'You will see all assets assigned to you with their details.',
          },
          {
            step: 3,
            title: 'View Details',
            description: 'Click on any asset to see full details including assignment date and condition.',
          },
        ],
        roles: ['USER'],
      },
      {
        id: 'request-asset',
        title: 'How to Request an Asset',
        description: 'Request a new asset to be assigned to you.',
        steps: [
          {
            step: 1,
            title: 'Browse Available Assets',
            description: 'Go to Assets > All Assets to see available equipment.',
          },
          {
            step: 2,
            title: 'Select an Asset',
            description: 'Click on the asset you want to request.',
          },
          {
            step: 3,
            title: 'Submit Request',
            description: 'Click "Request Asset" and provide a reason for the request.',
            tip: 'Provide a clear business justification to speed up approval.',
          },
          {
            step: 4,
            title: 'Wait for Approval',
            description: 'Your request will be reviewed by an admin. You will receive a notification.',
          },
        ],
        roles: ['USER'],
      },
      {
        id: 'return-asset',
        title: 'How to Return an Asset',
        description: 'Request to return an asset that is no longer needed.',
        steps: [
          {
            step: 1,
            title: 'Go to My Holdings',
            description: 'Navigate to Assets > My Holdings.',
          },
          {
            step: 2,
            title: 'Find the Asset',
            description: 'Locate the asset you want to return.',
          },
          {
            step: 3,
            title: 'Request Return',
            description: 'Click "Request Return" and provide a reason.',
          },
          {
            step: 4,
            title: 'Wait for Approval',
            description: 'An admin will process your return request.',
          },
        ],
        roles: ['USER'],
      },
    ],
    tips: [
      'Keep your assigned assets in good condition.',
      'Report any damage or issues immediately.',
      'Return assets promptly when no longer needed.',
      'Check your notifications for assignment requests.',
    ],
  },

  validationRules: [
    { field: 'Type', rule: 'Required. Select the asset type.', required: true, example: 'Laptop' },
    { field: 'Model', rule: 'Required. Enter the asset model.', required: true, example: 'MacBook Pro 14"' },
    { field: 'Asset Tag', rule: 'Optional. Auto-generated if not provided.', example: 'AST-001' },
    { field: 'Serial Number', rule: 'Optional. The manufacturer serial number.', example: 'SN12345678' },
    { field: 'Purchase Date', rule: 'Optional. Must be a valid date.', example: '2024-01-15' },
    { field: 'Warranty Expiry', rule: 'Optional. Must be after purchase date.', example: '2026-01-15' },
    { field: 'Price', rule: 'Optional. Must be a positive number.', example: '5000.00' },
    {
      field: 'Assigned User',
      rule: 'Required when status is "In Use". Select the employee.',
      example: 'John Doe',
    },
    {
      field: 'Assignment Date',
      rule: 'Required when assigning. Cannot be before purchase date.',
      required: true,
      example: '2024-02-01',
    },
  ],

  faqs: [
    {
      id: 'what-is-asset',
      question: 'What counts as an asset?',
      answer:
        'Assets include any company-owned equipment, hardware, furniture, vehicles, or other items of value that need to be tracked. This typically includes laptops, monitors, phones, office furniture, and company vehicles.',
      roles: ['ADMIN', 'USER'],
      tags: ['definition', 'basics'],
    },
    {
      id: 'asset-statuses',
      question: 'What do the different asset statuses mean?',
      answer:
        'AVAILABLE: Ready to be assigned.\nIN_USE: Currently assigned to an employee.\nUNDER_MAINTENANCE: Being repaired or serviced.\nDEPRECATED: No longer in active use but kept for records.\nDISPOSED: Removed from inventory.',
      roles: ['ADMIN', 'USER'],
      tags: ['status', 'lifecycle'],
    },
    {
      id: 'accept-assignment',
      question: 'How do I accept an asset assignment?',
      answer:
        'When an admin assigns an asset to you, you will receive a notification. Go to Assets > Asset Requests to see pending assignments. Click on the assignment and choose "Accept" to confirm you have received the asset.',
      roles: ['USER'],
      tags: ['assignment', 'accept'],
    },
    {
      id: 'depreciation',
      question: 'How does depreciation work?',
      answer:
        'Depreciation tracks the declining value of assets over time. Set up depreciation categories with annual rates, then assign them to assets. The system automatically calculates current book value based on the purchase price, rate, and time elapsed.',
      roles: ['ADMIN'],
      tags: ['depreciation', 'accounting'],
    },
    {
      id: 'bulk-import',
      question: 'Can I import multiple assets at once?',
      answer:
        'Currently, assets need to be added individually through the interface. For large imports, please contact support for assistance with bulk data migration.',
      roles: ['ADMIN'],
      tags: ['import', 'bulk'],
    },
    {
      id: 'warranty-tracking',
      question: 'How do I get notified about expiring warranties?',
      answer:
        'Set the warranty expiry date when adding or editing an asset. The system will show assets with expiring warranties on your dashboard and can send email notifications before expiry.',
      roles: ['ADMIN'],
      tags: ['warranty', 'alerts'],
    },
    {
      id: 'lost-asset',
      question: 'What should I do if an asset is lost or stolen?',
      answer:
        'Report it to your administrator immediately. They can update the asset status and handle any necessary documentation. Do not attempt to mark it as returned or disposed.',
      roles: ['USER'],
      tags: ['lost', 'stolen', 'report'],
    },
    {
      id: 'transfer-asset',
      question: 'Can I transfer an asset to another employee?',
      answer:
        'Employees cannot transfer assets directly. Request a return first, then the admin can assign the asset to another employee. This ensures proper tracking and accountability.',
      roles: ['USER'],
      tags: ['transfer', 'assignment'],
    },
  ],

  videos: [
    {
      id: 'asset-overview',
      title: 'Asset Management Overview',
      description: 'Learn the basics of tracking and managing company assets.',
      duration: '5:00',
      isPlaceholder: true,
      roles: ['ADMIN', 'USER'],
    },
    {
      id: 'add-asset-video',
      title: 'Adding Your First Asset',
      description: 'Step-by-step guide to adding assets to your inventory.',
      duration: '3:30',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
    {
      id: 'depreciation-setup',
      title: 'Setting Up Depreciation',
      description: 'Configure depreciation categories and track asset value.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['subscriptions', 'suppliers'],
};
