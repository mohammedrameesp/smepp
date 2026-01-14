# IC WhatsApp Credentials

## WhatsApp Business API Credentials

| Field | Value |
|-------|-------|
| **Phone Number ID** | 618043191392611 |
| **Business Account ID** | 587139590954092 |
| **Access Token** | |

## Account Details

- **Phone Number:** +974 3007 9676
- **Display Name:** Innovation Cafe
- **Country:** Qatar
- **Status:** Connected
- **Quality Rating:** High

## Setup Checklist

- [x] Phone number verified and approved
- [x] Phone Number ID obtained
- [x] Business Account ID obtained
- [ ] Permanent Access Token generated
- [ ] Message templates created and approved
- [ ] Webhook configured

## How to Generate Access Token (TODO)

1. Go to: https://business.facebook.com/settings/system-users

2. **Create System User** (if none exists):
   - Click "Add"
   - Name: `Durj API` (or any name)
   - Role: Admin
   - Click "Create"

3. **Assign WhatsApp Asset**:
   - Click on the system user
   - Click "Add Assets"
   - Select "Apps" → Choose your WhatsApp app → Full Control
   - Also add "WhatsApp Accounts" → Select Innovation Cafe account → Full Control

4. **Generate Token**:
   - Click "Generate New Token"
   - Select your App
   - Check these permissions:
     - `whatsapp_business_management`
     - `whatsapp_business_messaging`
   - Click "Generate Token"
   - **Copy immediately** (won't be shown again!)
   - Token starts with `EAA...`

5. Paste the token in Durj at: `/admin/settings/whatsapp`

## Links

- Meta Business Suite: https://business.facebook.com
- WhatsApp Manager: https://business.facebook.com/wa/manage
- System Users: https://business.facebook.com/settings/system-users
- Developers Console: https://developers.facebook.com/apps
