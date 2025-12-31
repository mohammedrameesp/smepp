/**
 * @file password-validation.ts
 * @description Password validation utility with strength scoring and complexity requirements.
 *              Supports configurable requirements for regular users and stricter admin requirements.
 * @module security
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: 'weak' | 'fair' | 'good' | 'strong';
  score: number; // 0-4
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
 * Validate password against requirements
 */
export function validatePassword(
  password: string,
  requirements: PasswordRequirements = DEFAULT_PASSWORD_REQUIREMENTS
): PasswordValidationResult {
  const errors: string[] = [];
  let score = 0;

  // Check minimum length
  if (password.length < requirements.minLength) {
    errors.push(`Password must be at least ${requirements.minLength} characters`);
  } else {
    score++;
    // Bonus for longer passwords
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

  // Check for common patterns (deduct points)
  if (/^[a-z]+$/i.test(password)) {
    score = Math.max(0, score - 1); // Only letters
  }
  if (/^[0-9]+$/.test(password)) {
    score = Math.max(0, score - 1); // Only numbers
  }
  if (/(.)\1{2,}/.test(password)) {
    score = Math.max(0, score - 0.5); // Repeated characters (aaa, 111)
  }
  if (/^(password|123456|qwerty|admin)/i.test(password)) {
    score = 0; // Common passwords
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
