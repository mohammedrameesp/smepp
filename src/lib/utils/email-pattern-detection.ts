/**
 * Email Pattern Detection Utility
 *
 * Detects service/system email patterns to help distinguish between
 * employee accounts (require HR profile) and service accounts (skip HR profile).
 */

// Common service account email patterns - lowercase for matching
const SERVICE_EMAIL_PATTERNS = [
  'info',
  'admin',
  'support',
  'contact',
  'hello',
  'sales',
  'hr',
  'accounts',
  'billing',
  'finance',
  'team',
  'office',
  'general',
  'enquiries',
  'enquiry',
  'help',
  'service',
  'services',
  'noreply',
  'no-reply',
  'no_reply',
  'mail',
  'mailbox',
  'reception',
  'frontdesk',
  'front-desk',
  'operations',
  'ops',
  'it',
  'tech',
  'technical',
  'marketing',
  'media',
  'press',
  'pr',
  'legal',
  'compliance',
  'careers',
  'jobs',
  'recruitment',
  'procurement',
  'purchasing',
  'orders',
  'bookings',
  'reservations',
] as const;

export interface EmailDetectionResult {
  /** Whether the email is likely a service/system account */
  isLikelyServiceEmail: boolean;
  /** The pattern that matched, if any */
  matchedPattern: string | null;
  /** Confidence level of the detection */
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Detects if an email is likely a service/system account
 *
 * @param email - The email address to check
 * @returns Detection result with confidence level
 *
 * @example
 * detectServiceEmail('info@company.com')
 * // { isLikelyServiceEmail: true, matchedPattern: 'info', confidence: 'high' }
 *
 * detectServiceEmail('john.doe@company.com')
 * // { isLikelyServiceEmail: false, matchedPattern: null, confidence: 'low' }
 */
export function detectServiceEmail(email: string): EmailDetectionResult {
  if (!email || typeof email !== 'string') {
    return { isLikelyServiceEmail: false, matchedPattern: null, confidence: 'low' };
  }

  const localPart = email.split('@')[0]?.toLowerCase() || '';

  // Exact match = high confidence
  if (SERVICE_EMAIL_PATTERNS.includes(localPart as typeof SERVICE_EMAIL_PATTERNS[number])) {
    return {
      isLikelyServiceEmail: true,
      matchedPattern: localPart,
      confidence: 'high'
    };
  }

  // Starts with pattern (e.g., "info2", "admin_office") = medium confidence
  for (const pattern of SERVICE_EMAIL_PATTERNS) {
    if (localPart.startsWith(pattern) && localPart.length <= pattern.length + 3) {
      return {
        isLikelyServiceEmail: true,
        matchedPattern: pattern,
        confidence: 'medium'
      };
    }
  }

  // Check for pattern anywhere in email with separators (e.g., "company.info", "office-admin")
  for (const pattern of SERVICE_EMAIL_PATTERNS) {
    const regex = new RegExp(`^${pattern}[._-]|[._-]${pattern}$|[._-]${pattern}[._-]`);
    if (regex.test(localPart)) {
      return {
        isLikelyServiceEmail: true,
        matchedPattern: pattern,
        confidence: 'medium'
      };
    }
  }

  return { isLikelyServiceEmail: false, matchedPattern: null, confidence: 'low' };
}

/**
 * Gets the suggested employee status based on email pattern
 *
 * @param email - The email address to check
 * @returns true if likely an employee (not a service email), false if likely a service account
 *
 * @example
 * getEmployeeStatusSuggestion('john@company.com') // true (likely employee)
 * getEmployeeStatusSuggestion('info@company.com') // false (likely service account)
 */
export function getEmployeeStatusSuggestion(email: string): boolean {
  const detection = detectServiceEmail(email);
  // If it's a service email, suggest NOT employee (isEmployee = false)
  // If it's NOT a service email, suggest employee (isEmployee = true)
  return !detection.isLikelyServiceEmail;
}

/**
 * Gets a human-readable message explaining the detection result
 *
 * @param email - The email address that was checked
 * @param detection - The detection result
 * @returns A user-friendly message explaining why the account type was suggested
 */
export function getDetectionMessage(email: string, detection: EmailDetectionResult): string {
  if (!detection.isLikelyServiceEmail) {
    return '';
  }

  const localPart = email.split('@')[0] || '';

  if (detection.confidence === 'high') {
    return `"${localPart}" appears to be a shared/service email address.`;
  }

  if (detection.confidence === 'medium') {
    return `"${localPart}" looks like it might be a shared account based on the "${detection.matchedPattern}" pattern.`;
  }

  return '';
}
