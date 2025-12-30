import type { HelpModule } from '../../help-types';

export const payrollContent: HelpModule = {
  id: 'payroll',
  categoryId: 'hr',
  name: 'Payroll Processing',
  description: 'Salary structures, payslips, loans, and gratuity calculations',
  icon: 'DollarSign',
  adminOnly: false,
  keywords: ['payroll', 'salary', 'payslip', 'loan', 'gratuity', 'deduction', 'allowance'],

  overview: {
    summary:
      'The Payroll Processing module handles salary management, payslip generation, loan tracking, and end-of-service gratuity calculations. Ensure accurate and timely salary payments with comprehensive payroll features.',
    keyFeatures: [
      'Salary structure management with allowances',
      'Monthly payroll run processing',
      'Automatic payslip generation',
      'Loan and advance tracking with deductions',
      'Gratuity calculation per Qatar Labor Law',
      'Leave deduction integration',
    ],
    benefits: [
      'Accurate salary calculations',
      'Automated payslip distribution',
      'Transparent deduction tracking',
      'Compliant gratuity calculations',
    ],
  },

  adminContent: {
    capabilities: [
      'Create and manage salary structures',
      'Process monthly payroll runs',
      'Manage loans and advances',
      'Add deductions to payslips',
      'Generate and distribute payslips',
      'Calculate employee gratuity',
      'Export payroll reports',
    ],
    workflows: [
      {
        id: 'create-salary-structure',
        title: 'How to Create a Salary Structure',
        description: 'Set up an employee\'s salary and allowances.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Salary Structures',
            description: 'Go to HR > Payroll > Salary Structures.',
          },
          {
            step: 2,
            title: 'Click Add Salary Structure',
            description: 'Click the "Add Salary Structure" button.',
          },
          {
            step: 3,
            title: 'Select Employee',
            description: 'Choose the employee from the dropdown.',
          },
          {
            step: 4,
            title: 'Enter Basic Salary',
            description: 'Enter the basic salary amount.',
            tip: 'Basic salary is used for gratuity calculation.',
          },
          {
            step: 5,
            title: 'Add Allowances',
            description:
              'Enter housing, transport, food, phone, and other allowances.',
          },
          {
            step: 6,
            title: 'Set Effective Date',
            description:
              'Specify when this salary structure takes effect.',
          },
          {
            step: 7,
            title: 'Save',
            description: 'Click "Create" to save the structure.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'run-payroll',
        title: 'How to Process Payroll',
        description: 'Run monthly payroll for all employees.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Payroll Runs',
            description: 'Go to HR > Payroll > Payroll Runs.',
          },
          {
            step: 2,
            title: 'Create New Run',
            description: 'Click "New Payroll Run" and select the month and year.',
          },
          {
            step: 3,
            title: 'Preview Payroll',
            description:
              'Review the calculated amounts including leave deductions and loan installments.',
            tip: 'Verify leave deductions are correct before processing.',
          },
          {
            step: 4,
            title: 'Add Manual Adjustments',
            description:
              'Add any additional deductions or adjustments if needed.',
          },
          {
            step: 5,
            title: 'Process Payroll',
            description:
              'Click "Process" to generate payslips. This locks the payroll.',
          },
          {
            step: 6,
            title: 'Mark as Paid',
            description:
              'After payment is made, mark the run as paid with payment reference.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'manage-loans',
        title: 'Managing Employee Loans',
        description: 'Create and track employee loans and advances.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Loans',
            description: 'Go to HR > Payroll > Loans & Advances.',
          },
          {
            step: 2,
            title: 'Create New Loan',
            description: 'Click "New Loan" and select the employee.',
          },
          {
            step: 3,
            title: 'Enter Loan Details',
            description:
              'Enter the principal amount, monthly deduction, and start date.',
          },
          {
            step: 4,
            title: 'Set Installments',
            description:
              'The system calculates the number of installments based on the deduction amount.',
            tip: 'Ensure monthly deduction is manageable for the employee.',
          },
          {
            step: 5,
            title: 'Save',
            description:
              'The loan will be automatically deducted in each payroll run.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Verify salary structures before each payroll run.',
      'Check leave deductions align with leave records.',
      'Document all manual adjustments with notes.',
      'Keep loan records up to date.',
      'Generate reports for accounting reconciliation.',
    ],
  },

  employeeContent: {
    capabilities: [
      'View salary payslips',
      'Download payslip PDFs',
      'View loan details and balance',
      'Calculate gratuity estimate',
    ],
    workflows: [
      {
        id: 'view-payslips',
        title: 'How to View Payslips',
        description: 'Access your salary payslips.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Payslips',
            description: 'Go to Payroll > My Payslips from the sidebar.',
          },
          {
            step: 2,
            title: 'Select Month',
            description: 'Choose the month and year to view that payslip.',
          },
          {
            step: 3,
            title: 'View Details',
            description:
              'See breakdown of salary, allowances, deductions, and net pay.',
          },
          {
            step: 4,
            title: 'Download PDF',
            description: 'Click the download button to save a PDF copy.',
          },
        ],
        roles: ['USER'],
      },
      {
        id: 'check-gratuity',
        title: 'How to Check Gratuity Estimate',
        description: 'View your end-of-service gratuity calculation.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Gratuity',
            description: 'Go to Payroll > Gratuity from the sidebar.',
          },
          {
            step: 2,
            title: 'View Calculation',
            description:
              'See your current gratuity estimate based on years of service and basic salary.',
            tip: 'Gratuity is calculated per Qatar Labor Law based on completed years.',
          },
          {
            step: 3,
            title: 'Understand the Breakdown',
            description:
              'First 5 years: 3 weeks per year. After 5 years: 4 weeks per year.',
          },
        ],
        roles: ['USER'],
      },
    ],
    tips: [
      'Review your payslip each month for accuracy.',
      'Report any discrepancies to HR immediately.',
      'Keep copies of your payslips for records.',
      'Gratuity estimates are based on current salary and service.',
    ],
  },

  validationRules: [
    {
      field: 'Basic Salary',
      rule: 'Required. Must be a positive number, maximum 999,999,999.',
      required: true,
      example: '15000',
    },
    {
      field: 'Effective Date',
      rule: 'Required. When the salary structure takes effect.',
      required: true,
      example: '2024-01-01',
    },
    {
      field: 'Allowances',
      rule: 'Optional. Each must be zero or positive.',
      example: 'Housing: 5000, Transport: 1000',
    },
    {
      field: 'Loan Principal',
      rule: 'Required for loans. Must be greater than zero.',
      required: true,
      example: '10000',
    },
    {
      field: 'Monthly Deduction',
      rule: 'Required for loans. Must be greater than zero.',
      required: true,
      example: '1000',
    },
    {
      field: 'Installments',
      rule: 'Required for loans. At least 1 installment.',
      required: true,
      example: '10',
    },
    {
      field: 'Payroll Month/Year',
      rule: 'Required. Year between 2020-2100, month 1-12.',
      required: true,
      example: 'March 2024',
    },
  ],

  faqs: [
    {
      id: 'salary-components',
      question: 'What are the components of salary?',
      answer:
        'Salary typically includes Basic Salary plus allowances (Housing, Transport, Food, Phone, Other). Deductions may include loan installments, leave without pay, and other adjustments.',
      roles: ['ADMIN', 'USER'],
      tags: ['salary', 'components'],
    },
    {
      id: 'gratuity-calculation',
      question: 'How is gratuity calculated?',
      answer:
        'Per Qatar Labor Law: For the first 5 years, you receive 3 weeks of basic salary per year. After 5 years, you receive 4 weeks per year. Gratuity is calculated on the last drawn basic salary.',
      roles: ['ADMIN', 'USER'],
      tags: ['gratuity'],
    },
    {
      id: 'payslip-timing',
      question: 'When will I receive my payslip?',
      answer:
        'Payslips are generated when the payroll run is processed, typically by the end of each month or beginning of the next month.',
      roles: ['USER'],
      tags: ['payslip', 'timing'],
    },
    {
      id: 'loan-deduction',
      question: 'How are loan deductions handled?',
      answer:
        'Loan installments are automatically deducted from your monthly salary. You can view your loan balance and remaining installments in the Loans section.',
      roles: ['USER'],
      tags: ['loan', 'deduction'],
    },
    {
      id: 'salary-revision',
      question: 'How are salary revisions handled?',
      answer:
        'Admins create a new salary structure with an effective date. The system uses the appropriate structure for each payroll period based on effective dates.',
      roles: ['ADMIN'],
      tags: ['revision', 'salary'],
    },
    {
      id: 'leave-deduction-payroll',
      question: 'How are unpaid leave days deducted?',
      answer:
        'Unpaid leave days are automatically calculated and deducted from the salary based on the daily rate (monthly salary / 30 days).',
      roles: ['ADMIN', 'USER'],
      tags: ['leave', 'deduction'],
    },
    {
      id: 'wps',
      question: 'Is payroll WPS compliant?',
      answer:
        'Yes, the system supports WPS (Wage Protection System) requirements for Qatar. Employees can be marked as WPS or non-WPS for proper reporting.',
      roles: ['ADMIN'],
      tags: ['wps', 'compliance'],
    },
  ],

  videos: [
    {
      id: 'payroll-overview',
      title: 'Payroll Management Overview',
      description: 'Learn the basics of payroll processing.',
      duration: '6:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
    {
      id: 'view-payslip-video',
      title: 'Understanding Your Payslip',
      description: 'How to read and understand your payslip.',
      duration: '3:00',
      isPlaceholder: true,
      roles: ['USER'],
    },
    {
      id: 'gratuity-video',
      title: 'Gratuity Calculation',
      description: 'How end-of-service gratuity is calculated.',
      duration: '4:00',
      isPlaceholder: true,
      roles: ['ADMIN', 'USER'],
    },
  ],

  relatedModules: ['employees', 'leave'],
};
