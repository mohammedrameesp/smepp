import { createDatabaseBackup } from './database';
import { createFileInventory } from './files';
import { writeFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import logger from '../../src/lib/log';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';

interface FullBackupResult {
  timestamp: string;
  database: {
    path: string;
    success: boolean;
    error?: string;
  };
  files: {
    inventoryPath: string;
    success: boolean;
    error?: string;
  };
  summary: {
    duration: number;
    success: boolean;
  };
}

async function createFullBackup(): Promise<FullBackupResult> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  
  logger.info('🚀 Starting full backup of DAMP application');

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const result: FullBackupResult = {
    timestamp,
    database: {
      path: '',
      success: false,
    },
    files: {
      inventoryPath: '',
      success: false,
    },
    summary: {
      duration: 0,
      success: false,
    },
  };

  // 1. Create database backup
  try {
    logger.info('📄 Creating database backup...');
    result.database.path = await createDatabaseBackup({
      includeData: true,
      compression: true,
      format: 'custom',
    });
    result.database.success = true;
    logger.info('✅ Database backup completed successfully');
  } catch (error) {
    result.database.error = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, '❌ Database backup failed');
  }

  // 2. Create file inventory
  try {
    logger.info('📂 Creating file inventory...');
    result.files.inventoryPath = await createFileInventory();
    result.files.success = true;
    logger.info('✅ File inventory completed successfully');
  } catch (error) {
    result.files.error = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ error }, '❌ File inventory failed');
  }

  // 3. Calculate duration and overall success
  const endTime = Date.now();
  result.summary.duration = endTime - startTime;
  result.summary.success = result.database.success && result.files.success;

  // 4. Create backup manifest
  const manifestFilename = `damp-backup-manifest-${timestamp.replace(/[:.]/g, '-')}.json`;
  const manifestPath = join(BACKUP_DIR, manifestFilename);
  
  const manifest = {
    ...result,
    manifest: {
      version: '1.0',
      application: 'DAMP',
      backupType: 'full',
      createdAt: timestamp,
      createdBy: 'automated-backup-script',
    },
    instructions: {
      database: {
        restore: 'Use pg_restore to restore the database backup',
        command: `pg_restore --verbose --clean --no-acl --no-owner --dbname=<target_db> ${result.database.path}`,
      },
      files: {
        restore: 'Use the file inventory to identify and download specific files from Supabase',
        note: 'Files are not downloaded by default - use the files.ts script to download specific files',
      },
    },
  };

  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // 5. Log summary
  const durationMinutes = (result.summary.duration / 1000 / 60).toFixed(2);
  
  if (result.summary.success) {
    logger.info(`🎉 Full backup completed successfully in ${durationMinutes} minutes`);
    logger.info(`📋 Backup manifest: ${manifestPath}`);
  } else {
    logger.error(`❌ Full backup completed with errors in ${durationMinutes} minutes`);
  }

  return result;
}

async function main() {
  try {
    const command = process.argv[2];
    
    switch (command) {
      case 'create':
        await createFullBackup();
        break;

      case 'status':
        // Show recent backup status
        const manifestFiles = readdirSync(BACKUP_DIR)
          .filter((file: string) => file.startsWith('damp-backup-manifest-') && file.endsWith('.json'))
          .sort()
          .reverse()
          .slice(0, 5);

        console.log('\n📋 Recent backup manifests:\n');

        for (const file of manifestFiles) {
          try {
            const manifestPath = join(BACKUP_DIR, file);
            const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
            const date = new Date(manifest.timestamp).toLocaleString();
            const duration = (manifest.summary.duration / 1000 / 60).toFixed(2);
            const status = manifest.summary.success ? '✅' : '❌';
            
            console.log(`${status} ${date} (${duration} min)`);
            console.log(`   Database: ${manifest.database.success ? '✅' : '❌'} ${manifest.database.path || manifest.database.error}`);
            console.log(`   Files: ${manifest.files.success ? '✅' : '❌'} ${manifest.files.inventoryPath || manifest.files.error}`);
            console.log('');
          } catch {
            console.log(`❌ ${file} (corrupted manifest)`);
          }
        }
        break;

      default:
        console.log('Usage:');
        console.log('  tsx scripts/backup/full-backup.ts create    # Create full backup');
        console.log('  tsx scripts/backup/full-backup.ts status    # Show recent backup status');
        console.log('');
        console.log('Environment variables:');
        console.log('  BACKUP_DIR              # Directory for backups (default: ./backups)');
        console.log('  DATABASE_URL            # PostgreSQL connection string (required)');
        console.log('  SUPABASE_URL            # Supabase URL (required)');
        console.log('  SUPABASE_SERVICE_ROLE_KEY  # Supabase service role key (required)');
        break;
    }
  } catch (error) {
    logger.error({ error }, 'Full backup operation failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { createFullBackup };