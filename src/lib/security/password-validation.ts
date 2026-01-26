/**
 * @file password-validation.ts
 * @description Password validation utility with strength scoring and complexity requirements.
 * @module security
 *
 * ════════════════════════════════════════════════════════════════════════════════
 * PASSWORD REQUIREMENTS:
 * ════════════════════════════════════════════════════════════════════════════════
 *
 * Default (regular users):
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - Special characters optional but recommended
 *
 * Admin (elevated privileges):
 * - Minimum 12 characters
 * - All character types required
 * - Special characters mandatory
 *
 * SCORING:
 * - +1 for meeting length requirement
 * - +0.5 for 12+ characters, +0.5 for 16+ characters
 * - +1 for uppercase, lowercase, numbers, special chars
 * - -1 for only letters or only numbers
 * - -0.5 for repeated characters (aaa, 111)
 * - Score 0 for common passwords
 *
 * STRENGTH CLASSIFICATION:
 * - 0-1: weak (red)
 * - 2: fair (orange)
 * - 3: good (yellow)
 * - 4: strong (green)
 */

/**
 * Result of password validation
 */
export interface PasswordValidationResult {
  /** Whether the password meets all requirements */
  valid: boolean;
  /** List of error messages for failed requirements */
  errors: string[];
  /** Strength classification for UI display */
  strength: 'weak' | 'fair' | 'good' | 'strong';
  /** Numeric score 0-4 */
  score: number;
}

export interface PasswordRequirements {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSpecial: boolean;
}

// Default requirements for production use
export const DEFAULT_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: false, // Special chars optional but recommended
};

// Stricter requirements for admin/super-admin accounts
export const ADMIN_PASSWORD_REQUIREMENTS: PasswordRequirements = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
};

/**
 * Common password prefixes that should be rejected
 * @security These are the most commonly used password patterns
 */
const COMMON_PASSWORD_PATTERNS = [
  'password',
  '123456',
  'qwerty',
  'admin',
  'letmein',
  'welcome',
  'monkey',
  'dragon',
  'master',
  'login',
  'abc123',
  'iloveyou',
];

/**
 * Validate password against requirements
 *
 * @param password - The password string to validate
 * @param requirements - Password requirements to validate against
 * @returns Validation result with errors and strength score
 *
 * @example
 * const result = validatePassword('MyP@ssw0rd!');
 * if (!result.valid) {
 *   console.log(result.errors);
 * }
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Input validation - handle null/undefined gracefully
  if (typeof password !== 'string') {
    return {
      valid: false,
      errors: ['Password is required'],
      strength: 'weak',
      score: 0,
    };
  }

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters`);
  } else {
    score++;
    // Bonus for longer passwords (encourages length over complexity)
    if (password.length >= 12) score += 0.5;
    if (password.length >= 16) score += 0.5;
  }

  // Check uppercase
  const hasUppercase = /[A-Z]/.test(password);
  if (requirements.requireUppercase && !hasUppercase) {
    errors.push('Password must contain at least one uppercase letter');
  } else if (hasUppercase) {
    score++;
  }

  // Check lowercase
  const hasLowercase = /[a-z]/.test(password);
  if (requirements.requireLowercase && !hasLowercase) {
    errors.push('Password must contain at least one lowercase letter');
  } else if (hasLowercase) {
    score++;
  }

  // Check numbers
  const hasNumber = /[0-9]/.test(password);
  if (requirements.requireNumber && !hasNumber) {
    errors.push('Password must contain at least one number');
  } else if (hasNumber) {
    score++;
  }

  // Check special characters
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
  if (requirements.requireSpecial && !hasSpecial) {
    errors.push('Password must contain at least one special character (!@#$%^&*...)');
  } else if (hasSpecial) {
    score++;
  }

  // Check for weak patterns (deduct points)
  if (/^[a-z]+$/i.test(password)) {
    score = Math.max(0, score - 1); // Only letters - low entropy
  }
  if (/^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 1); // Only numbers - low entropy
  }
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 0.5); // Repeated characters (aaa, 111)
  }
  if (/^(.)\1+$/.test(password)) {
    score = 0; // Single repeated character (aaaaaaa)
  }

  // Check for common passwords (case-insensitive prefix match)
  const lowerPassword = password.toLowerCase();
  const isCommon = COMMON_PASSWORD_PATTERNS.some(pattern =>
    lowerPassword.startsWith(pattern)
  );
  if (isCommon) {
    score = 0;
    if (errors.length === 0) {
      errors.push('Password is too common');
    }
  }

  // Normalize score to 0-4
  const normalizedScore = Math.min(4, Math.max(0, Math.floor(score)));

  // Determine strength label
  let strength: 'weak' | 'fair' | 'good' | 'strong';
  if (normalizedScore <= 1) {
    strength = 'weak';
  } else if (normalizedScore === 2) {
    strength = 'fair';
  } else if (normalizedScore === 3) {
    strength = 'good';
  } else {
    strength = 'strong';
  }

  return {
    valid: errors.length === 0,
    errors,
    strength,
    score: normalizedScore,
  };
}

/**
 * Check if password meets minimum requirements (for API validation)
 */
export function isPasswordValid(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): boolean {
  return validatePassword(password, requirements).valid;
}

/**
 * Get password strength for UI display
 */
export function getPasswordStrength(password: string): {
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number;
  color: string;
} {
  const result = validatePassword(password);

  const colors = {
    weak: '#ef4444',    // red-500
    fair: '#f97316',    // orange-500
    good: '#eab308',    // yellow-500
    strong: '#22c55e',  // green-500
  };

  return {
    strength: result.strength,
    score: result.score,
    color: colors[result.strength],
  };
}
