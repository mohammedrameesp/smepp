/**
 * Pre-Deployment Checklist Script
 * Run this before deploying to verify everything is ready
 *
 * Usage: npm run check-deployment
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
}

const checks: CheckResult[] = [];

function addCheck(name: string, status: 'pass' | 'fail' | 'warn', message: string) {
  checks.push({ name, status, message });
}

function printResults() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 PRE-DEPLOYMENT CHECKLIST');
  console.log('='.repeat(60) + '\n');

  let passCount = 0;
  let failCount = 0;
  let warnCount = 0;

  checks.forEach(check => {
    const icon = check.status === 'pass' ? '✅' : check.status === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} ${check.name}`);
    console.log(`   ${check.message}\n`);

    if (check.status === 'pass') passCount++;
    if (check.status === 'fail') failCount++;
    if (check.status === 'warn') warnCount++;
  });

  console.log('='.repeat(60));
  console.log(`📊 Results: ${passCount} passed, ${warnCount} warnings, ${failCount} failed`);
  console.log('='.repeat(60) + '\n');

  if (failCount > 0) {
    console.log('❌ Please fix the failed checks before deploying.\n');
    process.exit(1);
  } else if (warnCount > 0) {
    console.log('⚠️  You have warnings. Review them before deploying.\n');
  } else {
    console.log('✅ All checks passed! You\'re ready to deploy.\n');
  }
}

// Check 1: Package.json exists
console.log('Running pre-deployment checks...\n');

try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
  addCheck(
    'package.json',
    'pass',
    'Found package.json with all dependencies'
  );

  // Check for required dependencies
  const requiredDeps = [
    'next',
    '@prisma/client',
    'next-auth',
    '@supabase/supabase-js',
  ];

  const missingDeps = requiredDeps.filter(
    dep => !packageJson.dependencies[dep]
  );

  if (missingDeps.length > 0) {
    addCheck(
      'Dependencies',
      'fail',
      `Missing required dependencies: ${missingDeps.join(', ')}`
    );
  } else {
    addCheck('Dependencies', 'pass', 'All required dependencies present');
  }
} catch {
  addCheck('package.json', 'fail', 'Could not read package.json');
}

// Check 2: Prisma schema
try {
  const schemaPath = join('prisma', 'schema.prisma');
  const schema = readFileSync(schemaPath, 'utf-8');

  if (schema.includes('provider = "sqlite"')) {
    addCheck(
      'Database Provider',
      'fail',
      'Still using SQLite. Update to PostgreSQL for production.'
    );
  } else if (schema.includes('provider = "postgresql"')) {
    addCheck(
      'Database Provider',
      'pass',
      'Using PostgreSQL - ready for production'
    );
  } else {
    addCheck(
      'Database Provider',
      'warn',
      'Unknown database provider'
    );
  }

  // Check for required models
  const requiredModels = ['User', 'Asset', 'Subscription', 'Project'];
  const hasAllModels = requiredModels.every(model =>
    schema.includes(`model ${model}`)
  );

  if (hasAllModels) {
    addCheck('Database Schema', 'pass', 'All required models present');
  } else {
    addCheck('Database Schema', 'warn', 'Some models might be missing');
  }
} catch {
  addCheck('Prisma Schema', 'fail', 'Could not read prisma/schema.prisma');
}

// Check 3: Environment variables template
try {
  if (existsSync('.env.production.example')) {
    addCheck(
      'Production ENV Template',
      'pass',
      'Production environment template exists'
    );
  } else {
    addCheck(
      'Production ENV Template',
      'warn',
      'No .env.production.example found'
    );
  }
} catch {
  addCheck('ENV Template', 'warn', 'Could not check for .env files');
}

// Check 4: .gitignore
try {
  const gitignore = readFileSync('.gitignore', 'utf-8');

  const requiredIgnores = ['.env', '.env.local', 'node_modules', '.next'];
  const hasAllIgnores = requiredIgnores.every(item =>
    gitignore.includes(item)
  );

  if (hasAllIgnores) {
    addCheck('.gitignore', 'pass', 'Sensitive files are ignored');
  } else {
    addCheck('.gitignore', 'fail', 'Missing important .gitignore entries');
  }
} catch {
  addCheck('.gitignore', 'warn', 'Could not read .gitignore');
}

// Check 5: Build scripts
try {
  const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));

  if (packageJson.scripts?.build) {
    addCheck('Build Script', 'pass', 'Build script exists');
  } else {
    addCheck('Build Script', 'fail', 'No build script in package.json');
  }

  if (packageJson.scripts?.start) {
    addCheck('Start Script', 'pass', 'Start script exists');
  } else {
    addCheck('Start Script', 'fail', 'No start script in package.json');
  }
} catch {
  addCheck('Scripts', 'fail', 'Could not check scripts');
}

// Check 6: Next.js config
try {
  if (existsSync('next.config.js') || existsSync('next.config.mjs') || existsSync('next.config.ts')) {
    addCheck('Next.js Config', 'pass', 'Next.js configuration exists');
  } else {
    addCheck('Next.js Config', 'warn', 'No next.config file found (may use defaults)');
  }
} catch {
  addCheck('Next.js Config', 'warn', 'Could not check Next.js config');
}

// Check 7: TypeScript config
try {
  if (existsSync('tsconfig.json')) {
    addCheck('TypeScript Config', 'pass', 'TypeScript configuration exists');
  } else {
    addCheck('TypeScript Config', 'warn', 'No tsconfig.json found');
  }
} catch {
  addCheck('TypeScript Config', 'warn', 'Could not check TypeScript config');
}

// Check 8: README or deployment docs
try {
  if (existsSync('DEPLOYMENT.md') || existsSync('README.md')) {
    addCheck('Documentation', 'pass', 'Deployment documentation exists');
  } else {
    addCheck('Documentation', 'warn', 'Consider adding deployment documentation');
  }
} catch {
  addCheck('Documentation', 'warn', 'Could not check for documentation');
}

// Print all results
printResults();

// Deployment reminders
console.log('📝 DEPLOYMENT REMINDERS:\n');
console.log('1. Create Supabase project and get DATABASE_URL');
console.log('2. Create storage buckets: asset-photos, asset-invoices, subscription-invoices');
console.log('3. Generate new NEXTAUTH_SECRET (don\'t use local one!)');
console.log('4. Set all environment variables in Vercel');
console.log('5. Run database migration after first deployment');
console.log('6. Test authentication and file uploads');
console.log('7. Update Azure AD callback URLs (if using)');
console.log('\n📖 See DEPLOYMENT.md for detailed instructions\n');
