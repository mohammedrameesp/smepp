/**
 * @file google.ts
 * @description Google OAuth 2.0 implementation for custom per-organization OAuth apps.
 *              Handles authorization URL building, token exchange, and user info retrieval.
 * @module oauth
 *
 * @example
 * ```typescript
 * // Build authorization URL
 * const authUrl = buildGoogleAuthUrl(clientId, state, redirectUri);
 *
 * // Exchange code for tokens
 * const tokens = await exchangeGoogleCodeForTokens(code, clientId, clientSecret, redirectUri);
 *
 * // Get user info
 * const userInfo = await getGoogleUserInfo(tokens.access_token);
 * ```
 *
 * @security This module handles OAuth credentials. Never log client secrets or tokens.
 */

import { getBaseUrl } from './utils';
import logger from '@/lib/core/log';

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

/** Google OAuth 2.0 authorization endpoint */
const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

/** Google OAuth 2.0 token endpoint */
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Google userinfo endpoint for fetching profile data */
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

/** OAuth scopes required for authentication and basic profile */
const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
].join(' ');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Response from Google OAuth token endpoint
 */
interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
  refresh_token?: string;
}

/**
 * User profile from Google userinfo endpoint
 */
interface GoogleUserInfo {
  id: string;
  email: string;
  verified_email: boolean;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// OAUTH FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Build the Google OAuth authorization URL
 *
 * @param clientId - Google OAuth client ID
 * @param state - Encrypted state parameter for CSRF protection
 * @param redirectUri - OAuth callback URL (defaults to standard callback path)
 * @returns Complete authorization URL to redirect the user to
 *
 * @example
 * ```typescript
 * const url = buildGoogleAuthUrl('client-id.apps.googleusercontent.com', encryptedState);
 * // Returns: https://accounts.google.com/o/oauth2/v2/auth?...
 * ```
 */
export function buildGoogleAuthUrl(
  clientId: string,
  state: string,
  redirectUri?: string
): string {
  const url = new URL(GOOGLE_AUTH_URL);

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri || `${getBaseUrl()}/api/auth/oauth/google/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_SCOPES);
  url.searchParams.set('state', state);
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}

/**
 * Exchange authorization code for access tokens
 *
 * @param code - Authorization code from OAuth callback
 * @param clientId - Google OAuth client ID
 * @param clientSecret - Google OAuth client secret
 * @param redirectUri - Must match the redirect_uri used in authorization
 * @returns Token response containing access_token and optional refresh_token
 * @throws Error if token exchange fails
 *
 * @security Client secret is sent securely via POST body, never logged
 */
export async function exchangeGoogleCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri?: string
): Promise<GoogleTokenResponse> {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri || `${getBaseUrl()}/api/auth/oauth/google/callback`,
      grant_type: 'authorization_code',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, 'Google token exchange failed');
    throw new Error(`Failed to exchange code for tokens: ${response.status}`);
  }

  return response.json() as Promise<GoogleTokenResponse>;
}

/**
 * Get user profile from Google userinfo endpoint
 *
 * @param accessToken - Valid Google access token with email and profile scopes
 * @returns User profile information from Google
 * @throws Error if API request fails
 *
 * @example
 * ```typescript
 * const userInfo = await getGoogleUserInfo(tokens.access_token);
 * console.log(userInfo.email, userInfo.name);
 * ```
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ status: response.status, error }, 'Failed to get Google user info');
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json() as Promise<GoogleUserInfo>;
}

// Re-export validateEmailDomain from utils for convenience
export { validateEmailDomain } from './utils';
