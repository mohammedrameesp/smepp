import { getBaseUrl } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// AZURE AD OAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

// Default tenant is "common" which allows any Azure AD or personal Microsoft account
const DEFAULT_TENANT = 'common';

const getAzureAuthUrl = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;

const getAzureTokenUrl = (tenant: string) =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

const AZURE_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';

const AZURE_SCOPES = [
  'openid',
  'email',
  'profile',
  'User.Read',
].join(' ');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface AzureTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

interface AzureUserInfo {
  id: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  userPrincipalName: string;
  mail?: string;
  jobTitle?: string;
  officeLocation?: string;
  preferredLanguage?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the Azure AD OAuth authorization URL
 */
export function buildAzureAuthUrl(
  clientId: string,
  state: string,
  tenantId?: string,
  redirectUri?: string
): string {
  const tenant = tenantId || DEFAULT_TENANT;
  const url = new URL(getAzureAuthUrl(tenant));

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri || `${getBaseUrl()}/api/auth/oauth/azure/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', AZURE_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeAzureCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  tenantId?: string,
  redirectUri?: string
): Promise<AzureTokenResponse> {
  const tenant = tenantId || DEFAULT_TENANT;

  const response = await fetch(getAzureTokenUrl(tenant), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri || `${getBaseUrl()}/api/auth/oauth/azure/callback`,
      grant_type: 'authorization_code',
      scope: AZURE_SCOPES,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Azure token exchange failed:', error);
    throw new Error(`Failed to exchange code for tokens: ${response.status}`);
  }

  return response.json();
}

/**
 * Get user info from Microsoft Graph API
 */
export async function getAzureUserInfo(accessToken: string): Promise<AzureUserInfo> {
  const response = await fetch(AZURE_GRAPH_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get Azure user info:', error);
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json();
}

/**
 * Extract email from Azure user info
 * Azure can return email in different fields
 */
export function getAzureUserEmail(userInfo: AzureUserInfo): string {
  // Try mail field first (preferred)
  if (userInfo.mail) {
    return userInfo.mail.toLowerCase();
  }

  // Fall back to userPrincipalName (UPN)
  // UPN is usually in email format for work/school accounts
  if (userInfo.userPrincipalName && userInfo.userPrincipalName.includes('@')) {
    return userInfo.userPrincipalName.toLowerCase();
  }

  throw new Error('Could not determine user email from Azure response');
}

/**
 * Validate that the user's email domain is allowed for the organization
 */
export function validateEmailDomain(
  email: string,
  allowedDomains: string[],
  enforceDomainRestriction: boolean
): boolean {
  if (!enforceDomainRestriction || allowedDomains.length === 0) {
    return true;
  }

  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.some(d => d.toLowerCase() === emailDomain);
}
