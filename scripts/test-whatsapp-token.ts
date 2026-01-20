/**
 * Quick test script to verify WhatsApp token
 * Run with: npx tsx scripts/test-whatsapp-token.ts
 */

// Make this file a module to avoid global scope conflicts
export {};

const PHONE_NUMBER_ID = '618043191392611';
const ACCESS_TOKEN = 'EAA2eix2HdZCsBQbAw7fE15IzKtQGCTVoQ83adrZANSpH3XBRSD8kKeXudxQHwYeZBXA6NbXrQBRVfsCvSQKVGwTOA9TZBL4VYZBmfsRjUNY4JlbSZAqMJxd0QFOqjLmZCLz71WDiLwVeDH2BSav1KjPFvvuUVORufnfi1H85ZBGbt3VjGBL4JMqZCVAdSQcUMwQZDZD';

async function testConnection() {
  console.log('Testing WhatsApp connection...\n');

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Connection successful!\n');
      console.log('Phone Number Details:');
      console.log(`  ID: ${data.id}`);
      console.log(`  Display Number: ${data.display_phone_number || 'N/A'}`);
      console.log(`  Verified Name: ${data.verified_name || 'N/A'}`);
      console.log(`  Quality Rating: ${data.quality_rating || 'N/A'}`);
      return true;
    } else {
      console.log('❌ Connection failed!\n');
      console.log('Error:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Connection error!\n');
    console.log('Error:', error);
    return false;
  }
}

async function sendTestMessage(phoneNumber: string) {
  console.log(`\nSending test message to ${phoneNumber}...\n`);

  const url = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

  // Remove + prefix if present
  const toNumber = phoneNumber.replace(/^\+/, '');

  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: toNumber,
    type: 'text',
    text: {
      preview_url: false,
      body: '✅ WhatsApp integration test successful! This is a test message from Durj.',
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Test message sent successfully!\n');
      console.log('Message ID:', data.messages?.[0]?.id);
      return true;
    } else {
      console.log('❌ Failed to send test message!\n');
      console.log('Error:', JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.log('❌ Send error!\n');
    console.log('Error:', error);
    return false;
  }
}

// Main
async function main() {
  const connected = await testConnection();

  if (connected) {
    // Get phone number from command line argument
    const testPhone = process.argv[2];

    if (testPhone) {
      await sendTestMessage(testPhone);
    } else {
      console.log('\n📱 To send a test message, run:');
      console.log('   npx tsx scripts/test-whatsapp-token.ts +97430079676');
    }
  }
}

main();
