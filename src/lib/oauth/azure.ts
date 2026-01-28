/**
 * @file azure.ts
 * @description Azure AD OAuth 2.0 implementation for custom per-organization OAuth apps.
 *              Supports multi-tenant Azure AD with configurable tenant IDs.
 * @module oauth
 *
 * @example
 * ```typescript
 * // Build authorization URL
 * const authUrl = buildAzureAuthUrl(clientId, state, tenantId);
 *
 * // Exchange code for tokens
 * const tokens = await exchangeAzureCodeForTokens(code, clientId, clientSecret, tenantId);
 *
 * // Get user info
 * const userInfo = await getAzureUserInfo(tokens.access_token);
 * const email = getAzureUserEmail(userInfo);
 * ```
 *
 * @security This module handles OAuth credentials. Never log client secrets or tokens.
 */

import { getBaseUrl } from './utils';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// AZURE AD OAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Default tenant allows any Azure AD or personal Microsoft account */
const DEFAULT_TENANT = 'common';

/** Azure AD authorization endpoint template */
const getAzureAuthUrl = (tenant: string): string =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`;

/** Azure AD token endpoint template */
const getAzureTokenUrl = (tenant: string): string =>
  `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

/** Microsoft Graph API endpoint for user info */
const AZURE_GRAPH_URL = 'https://graph.microsoft.com/v1.0/me';

/** OAuth scopes required for authentication and basic profile */
const AZURE_SCOPES = [
  'openid',
  'email',
  'profile',
  'User.Read',
].join(' ');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response from Azure AD token endpoint
 */
interface AzureTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  refresh_token?: string;
  id_token?: string;
}

/**
 * User profile from Microsoft Graph API
 */
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
 *
 * @param clientId - Azure AD application (client) ID
 * @param state - Encrypted state parameter for CSRF protection
 * @param tenantId - Azure AD tenant ID (defaults to 'common' for multi-tenant)
 * @param redirectUri - OAuth callback URL (defaults to standard callback path)
 * @returns Complete authorization URL to redirect the user to
 *
 * @example
 * ```typescript
 * const url = buildAzureAuthUrl('client-id', encryptedState, 'tenant-id');
 * // Returns: https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize?...
 * ```
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
 * Exchange authorization code for access tokens
 *
 * @param code - Authorization code from OAuth callback
 * @param clientId - Azure AD application (client) ID
 * @param clientSecret - Azure AD client secret
 * @param tenantId - Azure AD tenant ID (defaults to 'common')
 * @param redirectUri - Must match the redirect_uri used in authorization
 * @returns Token response containing access_token and optional refresh_token
 * @throws Error if token exchange fails
 *
 * @security Client secret is sent securely via POST body, never logged
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
    logger.error({ status: response.status, error }, 'Azure token exchange failed');
    throw new Error(`Failed to exchange code for tokens: ${response.status}`);
  }

  return response.json() as Promise<AzureTokenResponse>;
}

/**
 * Get user profile from Microsoft Graph API
 *
 * @param accessToken - Valid Azure AD access token with User.Read scope
 * @returns User profile information from Microsoft Graph
 * @throws Error if API request fails
 */
export async function getAzureUserInfo(accessToken: string): Promise<AzureUserInfo> {
  const response = await fetch(AZURE_GRAPH_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, 'Failed to get Azure user info');
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json() as Promise<AzureUserInfo>;
}

/**
 * Extract email from Azure user info
 *
 * Azure AD returns email in different fields depending on account type:
 * - Work/school accounts: typically in `mail` field
 * - Personal accounts: may only have `userPrincipalName`
 *
 * @param userInfo - User profile from Microsoft Graph API
 * @returns Normalized (lowercase) email address
 * @throws Error if email cannot be determined from the response
 *
 * @example
 * ```typescript
 * const email = getAzureUserEmail(userInfo);
 * // Returns: "user@example.com" (always lowercase)
 * ```
 */
export function getAzureUserEmail(userInfo: AzureUserInfo): string {
  // Try mail field first (preferred for work/school accounts)
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

// Re-export validateEmailDomain from utils for convenience
export { validateEmailDomain } from './utils';
