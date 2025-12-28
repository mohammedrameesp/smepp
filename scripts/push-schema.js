const { execSync } = require('child_process');

// Set the production database URL
process.env.DATABASE_URL = 'postgresql://postgres:MrpCkraPkl%40053@db.bwgsqpvbfyehbgzeldvu.supabase.co:5432/postgres';

console.log('Pushing schema to Supabase...');

try {
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('Done!');
} catch (error) {
  console.error('Failed:', error.message);
  process.exit(1);
}
