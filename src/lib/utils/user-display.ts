/**
 * User display utilities for handling internal/placeholder emails
 *
 * When users are created without system access (canLogin=false), they get
 * auto-generated placeholder emails like: nologin-{uuid}@{org-slug}.internal
 * These should not be displayed in the UI.
 */

/**
 * Check if an email is an auto-generated internal placeholder
 */
export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.endsWith('.internal');
}

/**
 * Get a display-safe email (returns undefined for internal emails)
 */
export function getDisplayEmail(email: string | null | undefined): string | undefined {
  if (!email || isInternalEmail(email)) return undefined;
  return email;
}

/**
 * Get a display name with fallback (never shows internal emails)
 * @param name - The user's name
 * @param email - The user's email (only used as fallback if not internal)
 * @param fallback - Fallback text if both name and email are unavailable (default: 'Unnamed')
 */
export function getDisplayName(
  name: string | null | undefined,
  email?: string | null,
  fallback: string = 'Unnamed'
): string {
  if (name) return name;
  if (email && !isInternalEmail(email)) return email;
  return fallback;
}

/**
 * Get initials for avatar display (never uses internal emails)
 */
export function getDisplayInitials(
  name: string | null | undefined,
  email?: string | null
): string {
  const displayName = getDisplayName(name, email, '?');
  return displayName[0]?.toUpperCase() || '?';
}
