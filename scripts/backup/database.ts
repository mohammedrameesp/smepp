import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync, statSync, readdirSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import logger from '../../src/lib/log';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  logger.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

interface BackupOptions {
  includeData?: boolean;
  compression?: boolean;
  format?: 'sql' | 'custom';
}

async function createDatabaseBackup(options: BackupOptions = {}): Promise<string> {
  const { 
    includeData = true, 
    compression = true, 
    format = 'custom' 
  } = options;

  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `damp-db-${timestamp}.${format === 'custom' ? 'dump' : 'sql'}`;
  const backupPath = join(BACKUP_DIR, filename);

  logger.info(`🗄️ Starting database backup: ${filename}`);

  return new Promise((resolve, reject) => {
    const args = [
      '--verbose',
      '--no-password',
      '--dbname', DATABASE_URL!,
      '--file', backupPath
    ];

    // Add format-specific options
    if (format === 'custom') {
      args.push('--format=custom');
      if (compression) {
        args.push('--compress=6');
      }
    } else {
      args.push('--format=plain');
    }

    // Data options
    if (!includeData) {
      args.push('--schema-only');
    }

    // Exclude sensitive tables if needed
    args.push('--exclude-table=Session');
    args.push('--exclude-table=VerificationToken');

    const pgDump = spawn('pg_dump', args);

    let stderr = '';

    pgDump.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    pgDump.on('close', (code) => {
      if (code === 0) {
        logger.info(`✅ Database backup completed: ${backupPath}`);
        
        // Create backup metadata
        const metadata = {
          filename,
          path: backupPath,
          timestamp: new Date().toISOString(),
          format,
          includeData,
          compression,
          size: statSync(backupPath).size,
        };

        const metadataPath = backupPath + '.meta.json';
        writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

        resolve(backupPath);
      } else {
        logger.error({ code, stderr }, `❌ Database backup failed`);
        reject(new Error(`pg_dump failed with code ${code}: ${stderr}`));
      }
    });

    pgDump.on('error', (error) => {
      logger.error({ error }, '❌ Failed to spawn pg_dump');
      reject(error);
    });
  });
}

interface BackupMetadata {
  filename: string;
  path: string;
  timestamp: string;
  format: string;
  includeData: boolean;
  compression: boolean;
  size: number;
}

async function listBackups(): Promise<Array<{ filename: string; metadata: BackupMetadata }>> {
  if (!existsSync(BACKUP_DIR)) {
    return [];
  }

  const files = readdirSync(BACKUP_DIR);
  const backups: Array<{ filename: string; metadata: BackupMetadata }> = [];

  for (const file of files) {
    if (file.endsWith('.meta.json')) {
      try {
        const metadataPath = join(BACKUP_DIR, file);
        const metadata = JSON.parse(readFileSync(metadataPath, 'utf8')) as BackupMetadata;
        backups.push({
          filename: metadata.filename,
          metadata,
        });
      } catch (error) {
        logger.warn({ file, error }, 'Failed to read backup metadata');
      }
    }
  }

  return backups.sort((a, b) =>
    new Date(b.metadata.timestamp).getTime() - new Date(a.metadata.timestamp).getTime()
  );
}

async function cleanupOldBackups(retentionDays: number = 30): Promise<void> {
  const backups = await listBackups();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  let deletedCount = 0;

  for (const backup of backups) {
    const backupDate = new Date(backup.metadata.timestamp);
    if (backupDate < cutoffDate) {
      try {
        const backupPath = backup.metadata.path;
        const metadataPath = backupPath + '.meta.json';

        if (existsSync(backupPath)) {
          unlinkSync(backupPath);
        }
        if (existsSync(metadataPath)) {
          unlinkSync(metadataPath);
        }

        deletedCount++;
        logger.info(`🗑️ Deleted old backup: ${backup.filename}`);
      } catch (error) {
        logger.error({ backup: backup.filename, error }, 'Failed to delete old backup');
      }
    }
  }

  logger.info(`✅ Cleanup completed. Deleted ${deletedCount} old backups.`);
}

async function main() {
  try {
    const command = process.argv[2];
    
    switch (command) {
      case 'create':
        const includeData = !process.argv.includes('--schema-only');
        const compression = !process.argv.includes('--no-compression');
        const format = process.argv.includes('--format=sql') ? 'sql' : 'custom';
        
        await createDatabaseBackup({ includeData, compression, format: format as 'sql' | 'custom' });
        break;

      case 'list':
        const backups = await listBackups();
        console.log('\n📋 Available backups:');
        backups.forEach((backup, index) => {
          const size = (backup.metadata.size / 1024 / 1024).toFixed(2);
          console.log(`${index + 1}. ${backup.filename}`);
          console.log(`   Created: ${new Date(backup.metadata.timestamp).toLocaleString()}`);
          console.log(`   Size: ${size} MB`);
          console.log(`   Format: ${backup.metadata.format} (${backup.metadata.includeData ? 'with data' : 'schema only'})`);
          console.log('');
        });
        break;

      case 'cleanup':
        const retentionDays = parseInt(process.argv[3]) || 30;
        await cleanupOldBackups(retentionDays);
        break;

      default:
        console.log('Usage:');
        console.log('  tsx scripts/backup/database.ts create [--schema-only] [--no-compression] [--format=sql]');
        console.log('  tsx scripts/backup/database.ts list');
        console.log('  tsx scripts/backup/database.ts cleanup [days]');
        console.log('');
        console.log('Examples:');
        console.log('  tsx scripts/backup/database.ts create                    # Full backup with compression');
        console.log('  tsx scripts/backup/database.ts create --schema-only      # Schema only backup');
        console.log('  tsx scripts/backup/database.ts create --format=sql       # SQL format backup');
        console.log('  tsx scripts/backup/database.ts cleanup 7                 # Delete backups older than 7 days');
        break;
    }
  } catch (error) {
    logger.error({ error }, 'Backup operation failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { createDatabaseBackup, listBackups, cleanupOldBackups };