import type { HelpModule } from '../../help-types';

export const usersContent: HelpModule = {
  id: 'users',
  categoryId: 'system',
  name: 'User Management',
  description: 'Create users, manage roles, and access control',
  icon: 'UsersRound',
  adminOnly: true,
  keywords: ['user', 'role', 'access', 'permission', 'admin', 'member'],

  overview: {
    summary:
      'The User Management module allows you to create and manage user accounts, assign roles, and control access to different parts of the system. Manage who can log in and what they can do.',
    keyFeatures: [
      'Create and manage user accounts',
      'Assign roles (Owner, Admin, Manager, Member)',
      'Control login access',
      'Link users to employee records',
      'Manage user permissions',
    ],
    benefits: [
      'Secure access control',
      'Role-based permissions',
      'Centralized user management',
    ],
  },

  adminContent: {
    capabilities: [
      'Create user accounts',
      'Assign and change user roles',
      'Enable/disable user login',
      'Link users to employees',
      'Remove users from organization',
    ],
    workflows: [
      {
        id: 'add-user',
        title: 'How to Add a New User',
        description: 'Create a new user account.',
        steps: [
          {
            step: 1,
            title: 'Navigate to Users',
            description: 'Go to System > Users from the sidebar.',
          },
          {
            step: 2,
            title: 'Click Add User',
            description: 'Click the "Add User" button.',
          },
          {
            step: 3,
            title: 'Enter User Details',
            description: 'Fill in name, email, and select a role.',
            tip: 'Email is required if the user needs to log in.',
          },
          {
            step: 4,
            title: 'Set Login Access',
            description: 'Enable "Can Login" if the user needs system access.',
          },
          {
            step: 5,
            title: 'Link Employee (Optional)',
            description: 'Link to an existing employee record if applicable.',
          },
          {
            step: 6,
            title: 'Save',
            description: 'The user will receive an invitation email.',
          },
        ],
        roles: ['ADMIN'],
      },
      {
        id: 'manage-roles',
        title: 'Managing User Roles',
        description: 'Change user roles and permissions.',
        steps: [
          {
            step: 1,
            title: 'Find the User',
            description: 'Navigate to System > Users and find the user.',
          },
          {
            step: 2,
            title: 'Edit User',
            description: 'Click on the user to open their profile.',
          },
          {
            step: 3,
            title: 'Change Role',
            description: 'Select the new role from the dropdown.',
            tip: 'Be careful when assigning Admin role - they have full access.',
          },
          {
            step: 4,
            title: 'Save Changes',
            description: 'The new role takes effect immediately.',
          },
        ],
        roles: ['ADMIN'],
      },
    ],
    tips: [
      'Use the principle of least privilege - give minimum required access.',
      'Regularly audit user accounts and remove inactive ones.',
      'Only Owners should have the ability to manage other Admins.',
      'Link users to employees for complete profile management.',
    ],
  },

  employeeContent: undefined,

  validationRules: [
    {
      field: 'Name',
      rule: 'Required. Maximum 100 characters.',
      required: true,
      example: 'John Doe',
    },
    {
      field: 'Email',
      rule: 'Required if "Can Login" is enabled. Valid email format.',
      example: 'john@company.com',
    },
    {
      field: 'Password',
      rule: 'Minimum 8 characters if setting password directly.',
      example: '********',
    },
    {
      field: 'Role',
      rule: 'Required. Select from Owner, Admin, Manager, Member.',
      required: true,
      example: 'Member',
    },
  ],

  faqs: [
    {
      id: 'role-differences',
      question: 'What are the differences between roles?',
      answer:
        'OWNER: Full access, can manage billing and other admins. ADMIN: Full operational access except billing. MANAGER: Can approve requests and manage team. MEMBER: Standard employee access.',
      roles: ['ADMIN'],
      tags: ['roles', 'permissions'],
    },
    {
      id: 'user-vs-employee',
      question: 'What is the difference between a User and Employee?',
      answer:
        'A User is a login account. An Employee is an HR record. A person can be both (linked) or just one. For example, contractors may need login access but not full employee records.',
      roles: ['ADMIN'],
      tags: ['user', 'employee'],
    },
    {
      id: 'reset-password',
      question: 'How do I reset a user password?',
      answer:
        'Users can reset their own password using the "Forgot Password" link on the login page. Admins cannot directly view or change user passwords for security.',
      roles: ['ADMIN'],
      tags: ['password', 'reset'],
    },
    {
      id: 'deactivate-user',
      question: 'How do I deactivate a user?',
      answer:
        'Toggle off the "Can Login" option on the user profile. This prevents login while preserving their history. To fully remove, click "Remove from Organization".',
      roles: ['ADMIN'],
      tags: ['deactivate', 'remove'],
    },
  ],

  videos: [
    {
      id: 'user-management-video',
      title: 'User Management Overview',
      description: 'Learn how to manage users and roles.',
      duration: '5:00',
      isPlaceholder: true,
      roles: ['ADMIN'],
    },
  ],

  relatedModules: ['settings', 'employees'],
};
