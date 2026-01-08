import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
const config: Config = {
  coverageProvider: 'v8',
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],

  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Test match patterns
  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).[jt]s?(x)',
  ],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
    '!src/app/**', // Exclude Next.js app directory (test via integration tests)
  ],

  // Coverage thresholds for library code (src/app excluded from coverage)
  // Updated after TEST_COVERAGE_PLAN.md implementation - Phase 1-3 completed
  coverageThreshold: {
    global: {
      branches: 15,
      functions: 35,
      lines: 20,
      statements: 20,
    },
    // Higher thresholds for critical business logic
    'src/lib/domains/hr/payroll/': {
      branches: 50,
      functions: 55,
      lines: 60,
      statements: 60,
    },
    'src/lib/domains/hr/leave/': {
      branches: 45,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    // Multi-tenant security (critical)
    'src/lib/multi-tenant/': {
      branches: 40,
      functions: 50,
      lines: 50,
      statements: 50,
    },
    // Security modules (critical)
    'src/lib/security/': {
      branches: 30,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '/coverage/',
    '/tests/e2e/', // E2E tests run via Playwright, not Jest
  ],

  // Transform configuration
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Verbose output
  verbose: true,
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config);
