import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const bucketName = process.env.SUPABASE_BUCKET || 'smepp-storage';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function setupStorage() {
  console.log('🔧 Setting up Supabase storage...');
  console.log(`📦 Bucket name: ${bucketName}`);

  // Check if bucket exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error('❌ Error listing buckets:', listError);
    process.exit(1);
  }

  const bucketExists = buckets.some(b => b.name === bucketName);

  if (bucketExists) {
    console.log('✓ Bucket already exists');
  } else {
    console.log('Creating bucket...');
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/svg+xml',
        'application/pdf',
      ],
    });

    if (error) {
      console.error('❌ Error creating bucket:', error);
      process.exit(1);
    }

    console.log('✓ Bucket created successfully');
  }

  // Ensure bucket is public
  const { data: bucket, error: getError } = await supabase.storage.getBucket(bucketName);

  if (getError) {
    console.error('❌ Error getting bucket info:', getError);
    process.exit(1);
  }

  if (bucket.public) {
    console.log('✓ Bucket is public');
  } else {
    console.log('⚠ Bucket is not public, updating...');
    const { data, error } = await supabase.storage.updateBucket(bucketName, {
      public: true,
    });

    if (error) {
      console.error('❌ Error updating bucket:', error);
      process.exit(1);
    }

    console.log('✓ Bucket is now public');
  }

  console.log('\n✅ Storage setup complete!');
  console.log(`📸 You can now upload photos to the ${bucketName} bucket`);
  console.log(`🔗 Public URL format: ${supabaseUrl}/storage/v1/object/public/${bucketName}/[filename]`);
}

setupStorage()
  .catch(console.error)
  .finally(() => process.exit(0));
