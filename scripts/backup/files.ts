import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import logger from '../../src/lib/log';

const BACKUP_DIR = process.env.BACKUP_DIR || './backups';
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  logger.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface FileInfo {
  name: string;
  path: string;
  size: number;
  lastModified: string;
  bucket: string;
}

async function listAllFiles(bucketName: string = 'invoices'): Promise<FileInfo[]> {
  logger.info(`📂 Listing files in bucket: ${bucketName}`);

  try {
    const { error } = await supabase.storage
      .from(bucketName)
      .list('', {
        limit: 1000,
        offset: 0,
      });

    if (error) {
      throw error;
    }

    const files: FileInfo[] = [];

    // Recursively get all files
    async function processFolder(folderPath: string = ''): Promise<void> {
      const { data: items, error } = await supabase.storage
        .from(bucketName)
        .list(folderPath, {
          limit: 1000,
          offset: 0,
        });

      if (error) {
        logger.warn({ folderPath, error }, 'Failed to list folder contents');
        return;
      }

      for (const item of items || []) {
        const itemPath = folderPath ? `${folderPath}/${item.name}` : item.name;

        if (item.id) {
          // It's a file
          files.push({
            name: item.name,
            path: itemPath,
            size: item.metadata?.size || 0,
            lastModified: item.updated_at || item.created_at || '',
            bucket: bucketName,
          });
        } else {
          // It's a folder, recurse
          await processFolder(itemPath);
        }
      }
    }

    await processFolder();

    logger.info(`📊 Found ${files.length} files in bucket ${bucketName}`);
    return files;

  } catch (error) {
    logger.error({ bucketName, error }, 'Failed to list files');
    throw error;
  }
}

async function createFileInventory(): Promise<string> {
  // Ensure backup directory exists
  if (!existsSync(BACKUP_DIR)) {
    mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `damp-files-inventory-${timestamp}.json`;
  const inventoryPath = join(BACKUP_DIR, filename);

  logger.info(`📋 Creating file inventory: ${filename}`);

  try {
    // List files from all relevant buckets
    const buckets = ['invoices']; // Add more buckets as needed
    const inventory = {
      timestamp: new Date().toISOString(),
      buckets: {} as Record<string, FileInfo[]>,
      summary: {
        totalFiles: 0,
        totalSize: 0,
        bucketCounts: {} as Record<string, number>,
      },
    };

    for (const bucketName of buckets) {
      try {
        const files = await listAllFiles(bucketName);
        inventory.buckets[bucketName] = files;
        inventory.summary.bucketCounts[bucketName] = files.length;
        inventory.summary.totalFiles += files.length;
        inventory.summary.totalSize += files.reduce((sum, file) => sum + file.size, 0);
      } catch (error) {
        logger.warn({ bucketName, error }, 'Failed to inventory bucket');
        inventory.buckets[bucketName] = [];
        inventory.summary.bucketCounts[bucketName] = 0;
      }
    }

    // Write inventory to file
    writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2));

    const totalSizeMB = (inventory.summary.totalSize / 1024 / 1024).toFixed(2);
    logger.info(`✅ File inventory completed: ${inventory.summary.totalFiles} files, ${totalSizeMB} MB total`);

    return inventoryPath;

  } catch (error) {
    logger.error({ error }, 'Failed to create file inventory');
    throw error;
  }
}

async function downloadFile(bucketName: string, filePath: string, localPath: string): Promise<void> {
  try {
    const { data, error } = await supabase.storage
      .from(bucketName)
      .download(filePath);

    if (error) {
      throw error;
    }

    if (!data) {
      throw new Error('No data received');
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    writeFileSync(localPath, buffer);

  } catch (error) {
    logger.error({ bucketName, filePath, error }, 'Failed to download file');
    throw error;
  }
}

async function downloadFiles(fileList: string[], bucketName: string = 'invoices'): Promise<void> {
  const downloadDir = join(BACKUP_DIR, 'files', bucketName);
  
  if (!existsSync(downloadDir)) {
    mkdirSync(downloadDir, { recursive: true });
  }

  logger.info(`⬇️ Downloading ${fileList.length} files from ${bucketName}`);

  let successCount = 0;
  let errorCount = 0;

  for (const filePath of fileList) {
    try {
      const localPath = join(downloadDir, filePath.replace(/\//g, '_'));
      await downloadFile(bucketName, filePath, localPath);
      successCount++;
      
      if (successCount % 10 === 0) {
        logger.info(`📦 Downloaded ${successCount}/${fileList.length} files`);
      }
    } catch (error) {
      errorCount++;
      logger.warn({ filePath, error }, 'Failed to download file');
    }
  }

  logger.info(`✅ Download completed: ${successCount} successful, ${errorCount} failed`);
}

async function getFilesByPattern(pattern: string, bucketName: string = 'invoices'): Promise<FileInfo[]> {
  const allFiles = await listAllFiles(bucketName);
  const regex = new RegExp(pattern, 'i');
  return allFiles.filter(file => regex.test(file.path));
}

async function getFilesByDateRange(
  startDate: Date, 
  endDate: Date, 
  bucketName: string = 'invoices'
): Promise<FileInfo[]> {
  const allFiles = await listAllFiles(bucketName);
  return allFiles.filter(file => {
    const fileDate = new Date(file.lastModified);
    return fileDate >= startDate && fileDate <= endDate;
  });
}

async function main() {
  try {
    const command = process.argv[2];
    
    switch (command) {
      case 'inventory':
        await createFileInventory();
        break;

      case 'list':
        const bucketName = process.argv[3] || 'invoices';
        const files = await listAllFiles(bucketName);
        
        console.log(`\n📂 Files in bucket "${bucketName}":\n`);
        files.forEach((file, index) => {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          console.log(`${index + 1}. ${file.path}`);
          console.log(`   Size: ${sizeMB} MB`);
          console.log(`   Modified: ${new Date(file.lastModified).toLocaleString()}`);
          console.log('');
        });
        break;

      case 'download':
        const pattern = process.argv[3];
        const targetBucket = process.argv[4] || 'invoices';
        
        if (!pattern) {
          console.log('Usage: tsx scripts/backup/files.ts download <pattern> [bucket]');
          console.log('Example: tsx scripts/backup/files.ts download ".*\\.pdf$" invoices');
          process.exit(1);
        }

        const matchingFiles = await getFilesByPattern(pattern, targetBucket);
        console.log(`\n🔍 Found ${matchingFiles.length} files matching pattern "${pattern}"`);
        
        if (matchingFiles.length > 0) {
          await downloadFiles(matchingFiles.map(f => f.path), targetBucket);
        }
        break;

      case 'download-recent':
        const days = parseInt(process.argv[3]) || 7;
        const recentBucket = process.argv[4] || 'invoices';
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        const recentFiles = await getFilesByDateRange(startDate, new Date(), recentBucket);
        console.log(`\n📅 Found ${recentFiles.length} files from last ${days} days`);
        
        if (recentFiles.length > 0) {
          await downloadFiles(recentFiles.map(f => f.path), recentBucket);
        }
        break;

      default:
        console.log('Usage:');
        console.log('  tsx scripts/backup/files.ts inventory                     # Create file inventory');
        console.log('  tsx scripts/backup/files.ts list [bucket]                 # List all files');
        console.log('  tsx scripts/backup/files.ts download <pattern> [bucket]   # Download files by pattern');
        console.log('  tsx scripts/backup/files.ts download-recent [days] [bucket] # Download recent files');
        console.log('');
        console.log('Examples:');
        console.log('  tsx scripts/backup/files.ts inventory');
        console.log('  tsx scripts/backup/files.ts list invoices');
        console.log('  tsx scripts/backup/files.ts download ".*\\.pdf$"');
        console.log('  tsx scripts/backup/files.ts download-recent 30');
        break;
    }
  } catch (error) {
    logger.error({ error }, 'File backup operation failed');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { listAllFiles, createFileInventory, downloadFiles, getFilesByPattern, getFilesByDateRange };