import * as fs from 'fs';

async function callImportAPI() {
  console.log('Reading backup file...');

  // Read the backup file
  const backupPath = 'C:\\Users\\moham\\Downloads\\damp-full-backup-2025-12-27T18-00-47-770Z.json';
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'));

  console.log('Backup metadata:', backupData._metadata);
  console.log('Counts:', backupData._counts);

  // Call the import API
  const apiUrl = 'https://mohammed-ramees.quriosityhub.com/api/super-admin/import-becreative';

  console.log(`\nCalling API: ${apiUrl}`);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backupData),
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);

    // Try to parse as JSON
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      console.log('Raw response (first 500 chars):', responseText.substring(0, 500));
      return;
    }

    if (response.ok) {
      console.log('\n=== Import Successful ===');
      console.log('Organization:', result.organization);
      console.log('\nResults:');
      for (const [key, value] of Object.entries(result.results || {})) {
        console.log(`  ${key}:`, value);
      }
    } else {
      console.error('\n=== Import Failed ===');
      console.error('Status:', response.status);
      console.error('Error:', result.error);
      if (result.availableOrgs) {
        console.log('Available organizations:', result.availableOrgs);
      }
    }
  } catch (error) {
    console.error('Request failed:', error);
  }
}

callImportAPI();
