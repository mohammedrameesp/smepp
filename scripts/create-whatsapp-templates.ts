/**
 * Create WhatsApp Message Templates via Meta Graph API
 *
 * Usage:
 *   npx ts-node scripts/create-whatsapp-templates.ts
 *
 * Required env vars:
 *   WHATSAPP_BUSINESS_ACCOUNT_ID - Your WhatsApp Business Account ID (WABA)
 *   WHATSAPP_ACCESS_TOKEN - Your permanent access token
 */

const BUSINESS_ACCOUNT_ID = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '2284343471961199';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN;

const API_VERSION = 'v21.0';
const BASE_URL = `https://graph.facebook.com/${API_VERSION}/${BUSINESS_ACCOUNT_ID}/message_templates`;

interface TemplatePayload {
  name: string;
  language: string;
  category: string;
  components: Array<{
    type: string;
    text?: string;
    example?: { body_text: string[][] };
    buttons?: Array<{
      type: string;
      text: string;
    }>;
  }>;
}

const templates: TemplatePayload[] = [
  {
    name: 'leave_approval_request',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'New leave request requires your approval.\n\nEmployee: {{1}}\nLeave Type: {{2}}\nDates: {{3}}\nReason: {{4}}\n\nPlease tap a button below to respond to this request.',
        example: {
          body_text: [['John Smith', 'Annual Leave', '15 Jan - 20 Jan 2026', 'Family vacation']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Approve' },
          { type: 'QUICK_REPLY', text: 'Reject' },
        ],
      },
    ],
  },
  {
    name: 'purchase_approval_request',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'New purchase request requires your approval.\n\nRequested by: {{1}}\nTitle: {{2}}\nAmount: {{3}}\n\nPlease tap a button below to respond to this request.',
        example: {
          body_text: [['Sarah Ahmed', 'Office Supplies', 'QAR 500']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Approve' },
          { type: 'QUICK_REPLY', text: 'Reject' },
        ],
      },
    ],
  },
  {
    name: 'asset_approval_request',
    language: 'en',
    category: 'UTILITY',
    components: [
      {
        type: 'BODY',
        text: 'New asset request requires your approval.\n\nRequested by: {{1}}\nAsset: {{2}}\nJustification: {{3}}\n\nPlease tap a button below to respond to this request.',
        example: {
          body_text: [['Mohamed Ali', 'Laptop - MacBook Pro', 'Need for development work']],
        },
      },
      {
        type: 'BUTTONS',
        buttons: [
          { type: 'QUICK_REPLY', text: 'Approve' },
          { type: 'QUICK_REPLY', text: 'Reject' },
        ],
      },
    ],
  },
];

async function createTemplate(template: TemplatePayload): Promise<void> {
  console.log(`\nCreating template: ${template.name}...`);

  const response = await fetch(BASE_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(template),
  });

  const data = await response.json();

  if (response.ok) {
    console.log(`✓ Created: ${template.name} (ID: ${data.id})`);
    console.log(`  Status: ${data.status}`);
  } else {
    console.error(`✗ Failed: ${template.name}`);
    console.error(`  Error: ${JSON.stringify(data.error || data, null, 2)}`);
  }
}

async function listTemplates(): Promise<void> {
  console.log('\nFetching existing templates...');

  const response = await fetch(`${BASE_URL}?limit=100`, {
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
    },
  });

  const data = await response.json();

  if (response.ok && data.data) {
    console.log(`\nFound ${data.data.length} templates:\n`);
    for (const t of data.data) {
      console.log(`  - ${t.name} (${t.status}) [${t.language}]`);
    }
  } else {
    console.error('Failed to fetch templates:', data.error?.message);
  }
}

async function main() {
  if (!ACCESS_TOKEN) {
    console.error('Error: WHATSAPP_ACCESS_TOKEN environment variable is required');
    console.log('\nUsage:');
    console.log('  WHATSAPP_ACCESS_TOKEN=EAA... npx ts-node scripts/create-whatsapp-templates.ts');
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('WhatsApp Template Creator');
  console.log('='.repeat(60));
  console.log(`Business Account ID: ${BUSINESS_ACCOUNT_ID}`);
  console.log(`API Version: ${API_VERSION}`);

  // List existing templates first
  await listTemplates();

  // Create new templates
  console.log('\n' + '='.repeat(60));
  console.log('Creating templates...');
  console.log('='.repeat(60));

  for (const template of templates) {
    await createTemplate(template);
  }

  console.log('\n' + '='.repeat(60));
  console.log('Done! Templates will be reviewed by Meta (24-48 hours)');
  console.log('='.repeat(60));
}

main().catch(console.error);
