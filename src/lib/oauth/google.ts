/**
 * @file google.ts
 * @description Google OAuth 2.0 implementation for custom per-organization OAuth apps.
 *              Handles authorization URL building, token exchange, and user info retrieval.
 * @module oauth
 */

import { getBaseUrl } from './utils';

// ═══════════════════════════════════════════════════════════════════════════════
// GOOGLE OAUTH CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════════

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

const GOOGLE_SCOPES = [
  'openid',
  'email',
  'profile',
].join(' ');

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface GoogleTokenResponse {
  access_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
  refresh_token?: string;
}

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
 * Exchange authorization code for tokens
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
    console.error('Google token exchange failed:', error);
    throw new Error(`Failed to exchange code for tokens: ${response.status}`);
  }

  return response.json();
}

/**
 * Get user info from Google using access token
 */
export async function getGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error('Failed to get Google user info:', error);
    throw new Error(`Failed to get user info: ${response.status}`);
  }

  return response.json();
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
