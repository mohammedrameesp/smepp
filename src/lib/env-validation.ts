/**
 * @file env-validation.ts
 * @description Environment variable validation - ensures all critical env vars are set
 *              before the application starts, preventing runtime errors from missing config
 * @module lib
 */

interface EnvVar {
  name: string;
  required: boolean | 'production'; // true = always, 'production' = only in prod
  description: string;
}

// Define all environment variables with their requirements
const ENV_VARS: EnvVar[] = [
  // Core Authentication
  { name: 'NEXTAUTH_SECRET', required: true, description: 'JWT signing secret' },
  { name: 'NEXTAUTH_URL', required: 'production', description: 'Canonical app URL' },

  // Database
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL connection string' },

  // Domain Configuration
  { name: 'NEXT_PUBLIC_APP_DOMAIN', required: 'production', description: 'Production domain (e.g., example.com)' },

  // Security
  { name: 'CRON_SECRET', required: 'production', description: 'Secret for authenticating cron jobs' },

  // Development flags (must be explicitly false in production)
  { name: 'DEV_AUTH_ENABLED', required: false, description: 'Enable dev auth bypass (MUST be false in production)' },
];

// Optional but recommended for production
const RECOMMENDED_VARS: EnvVar[] = [
  { name: 'SENTRY_DSN', required: false, description: 'Sentry error tracking' },
  { name: 'UPSTASH_REDIS_REST_URL', required: false, description: 'Distributed rate limiting' },
  { name: 'RESEND_API_KEY', required: false, description: 'Email sending' },
  { name: 'GOOGLE_CLIENT_ID', required: false, description: 'Google OAuth' },
  { name: 'AZURE_AD_CLIENT_ID', required: false, description: 'Microsoft OAuth' },
];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validates all required environment variables
 */
export function validateEnv(): ValidationResult {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required variables
  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    const isRequired = envVar.required === true || (envVar.required === 'production' && isProduction);

    if (isRequired && !value) {
      errors.push(`Missing required env var: ${envVar.name} - ${envVar.description}`);
    }
  }

  // Production-specific checks
  if (isProduction) {
    // DEV_AUTH_ENABLED must be false or unset in production
    if (process.env.DEV_AUTH_ENABLED === 'true') {
      errors.push('CRITICAL: DEV_AUTH_ENABLED=true in production - this allows test user login!');
    }

    // NEXTAUTH_SECRET should be strong
    const secret = process.env.NEXTAUTH_SECRET;
    if (secret && secret.length < 32) {
      errors.push('NEXTAUTH_SECRET is too short (minimum 32 characters for security)');
    }
    if (secret && /^[a-z-]+$/.test(secret)) {
      warnings.push('NEXTAUTH_SECRET appears weak - use a cryptographically random value');
    }

    // Check recommended vars and warn if missing
    for (const envVar of RECOMMENDED_VARS) {
      if (!process.env[envVar.name]) {
        warnings.push(`Recommended env var not set: ${envVar.name} - ${envVar.description}`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates environment and throws if invalid (for use in app initialization)
 */
export function assertValidEnv(): void {
  const result = validateEnv();

  if (!result.valid) {
    console.error('\n========================================');
    console.error('ENVIRONMENT VALIDATION FAILED');
    console.error('========================================\n');
    result.errors.forEach((err) => console.error(`ERROR: ${err}`));
    console.error('\n========================================\n');

    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Environment validation failed: ${result.errors.join('; ')}`);
    }
  }

  if (result.warnings.length > 0) {
    console.warn('\n--- Environment Warnings ---');
    result.warnings.forEach((warn) => console.warn(`WARNING: ${warn}`));
    console.warn('----------------------------\n');
  }
}

/**
 * Get a summary of environment configuration for admin display
 */
export function getEnvSummary(): {
  required: { name: string; set: boolean; description: string }[];
  recommended: { name: string; set: boolean; description: string }[];
  securityIssues: string[];
} {
  const isProduction = process.env.NODE_ENV === 'production';

  const required = ENV_VARS
    .filter((v) => v.required === true || (v.required === 'production' && isProduction))
    .map((v) => ({
      name: v.name,
      set: !!process.env[v.name],
      description: v.description,
    }));

  const recommended = RECOMMENDED_VARS.map((v) => ({
    name: v.name,
    set: !!process.env[v.name],
    description: v.description,
  }));

  const securityIssues: string[] = [];

  if (isProduction && process.env.DEV_AUTH_ENABLED === 'true') {
    securityIssues.push('DEV_AUTH_ENABLED is true in production');
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (secret && secret.length < 32) {
    securityIssues.push('NEXTAUTH_SECRET is too short');
  }

  return { required, recommended, securityIssues };
}
