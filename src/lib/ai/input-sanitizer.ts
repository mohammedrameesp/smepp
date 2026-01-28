/**
 * AI Input Sanitizer - Prompt Injection Prevention
 *
 * Sanitizes user input to prevent prompt injection attacks
 * that could manipulate AI behavior or extract sensitive data.
 */

import { MAX_INPUT_LENGTH } from './config';

export interface SanitizationResult {
  sanitized: string;
  flagged: boolean;
  flags: string[];
  originalLength: number;
  sanitizedLength: number;
}

// Patterns that indicate potential prompt injection attempts
const INJECTION_PATTERNS: Array<{ pattern: RegExp; name: string; severity: 'high' | 'medium' | 'low' }> = [
  // High severity - Direct instruction manipulation
  { pattern: /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, name: 'ignore_instructions', severity: 'high' },
  { pattern: /disregard\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, name: 'disregard_instructions', severity: 'high' },
  { pattern: /forget\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|rules?)/gi, name: 'forget_instructions', severity: 'high' },
  { pattern: /override\s+(all\s+)?(previous|above|prior|system)\s+(instructions?|prompts?|rules?)/gi, name: 'override_instructions', severity: 'high' },
  { pattern: /new\s+instructions?\s*:/gi, name: 'new_instructions', severity: 'high' },
  { pattern: /system\s*:\s*you\s+are/gi, name: 'system_role_injection', severity: 'high' },
  { pattern: /\[system\]/gi, name: 'system_tag', severity: 'high' },
  { pattern: /<system>/gi, name: 'system_xml_tag', severity: 'high' },
  { pattern: /assistant\s*:\s*i\s+will/gi, name: 'assistant_injection', severity: 'high' },
  { pattern: /\[assistant\]/gi, name: 'assistant_tag', severity: 'high' },
  { pattern: /<assistant>/gi, name: 'assistant_xml_tag', severity: 'high' },

  // Medium severity - Role manipulation
  { pattern: /you\s+are\s+now\s+(a|an|the)/gi, name: 'role_reassignment', severity: 'medium' },
  { pattern: /act\s+as\s+(if\s+you\s+are\s+)?(a|an|the)/gi, name: 'act_as', severity: 'medium' },
  { pattern: /pretend\s+(to\s+be|you\s+are)/gi, name: 'pretend_role', severity: 'medium' },
  { pattern: /roleplay\s+as/gi, name: 'roleplay', severity: 'medium' },
  { pattern: /from\s+now\s+on,?\s+you/gi, name: 'behavior_change', severity: 'medium' },
  { pattern: /\bDAN\b/g, name: 'dan_jailbreak', severity: 'medium' },
  { pattern: /jailbreak/gi, name: 'jailbreak_mention', severity: 'medium' },

  // Medium severity - Data extraction attempts
  { pattern: /reveal\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/gi, name: 'reveal_prompt', severity: 'medium' },
  { pattern: /show\s+(me\s+)?(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/gi, name: 'show_prompt', severity: 'medium' },
  { pattern: /what\s+(are|is)\s+your\s+(system|initial|original)\s+(prompt|instructions?)/gi, name: 'query_prompt', severity: 'medium' },
  { pattern: /print\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/gi, name: 'print_prompt', severity: 'medium' },
  { pattern: /output\s+(your|the)\s+(system|initial|original)\s+(prompt|instructions?)/gi, name: 'output_prompt', severity: 'medium' },

  // Low severity - Suspicious patterns
  { pattern: /```\s*(system|prompt|instructions?)/gi, name: 'code_block_system', severity: 'low' },
  { pattern: /\{\{.*\}\}/g, name: 'template_syntax', severity: 'low' },
  { pattern: /\$\{.*\}/g, name: 'template_literal', severity: 'low' },
];

// Characters that should be limited or escaped
const SUSPICIOUS_CHARS: Array<{ char: string; maxCount: number; name: string }> = [
  { char: '`', maxCount: 20, name: 'backticks' },
  { char: '{', maxCount: 10, name: 'curly_braces' },
  { char: '<', maxCount: 10, name: 'angle_brackets' },
  { char: '\\', maxCount: 10, name: 'backslashes' },
];

/**
 * Check if string contains base64 encoded content
 */
function detectBase64(input: string): boolean {
  // Look for base64-like patterns (at least 20 chars of base64)
  const base64Pattern = /[A-Za-z0-9+/]{20,}={0,2}/g;
  const matches = input.match(base64Pattern);

  if (!matches) return false;

  // Check if any match decodes to something suspicious
  for (const match of matches) {
    if (match.length < 20) continue;

    try {
      const decoded = Buffer.from(match, 'base64').toString('utf-8');
      // Check if decoded content contains injection patterns
      for (const { pattern } of INJECTION_PATTERNS) {
        if (pattern.test(decoded)) {
          return true;
        }
      }
    } catch {
      // Not valid base64, continue
    }
  }

  return false;
}

/**
 * Sanitize user input for AI processing
 */
export function sanitizeInput(input: string): SanitizationResult {
  const flags: string[] = [];
  let sanitized = input;
  const originalLength = input.length;

  // Truncate if too long
  if (sanitized.length > MAX_INPUT_LENGTH) {
    sanitized = sanitized.substring(0, MAX_INPUT_LENGTH);
    flags.push('truncated');
  }

  // Check for injection patterns
  for (const { pattern, name, severity } of INJECTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      flags.push(`${severity}:${name}`);
      // Reset lastIndex for global patterns
      pattern.lastIndex = 0;

      // For high severity, replace the pattern
      if (severity === 'high') {
        sanitized = sanitized.replace(pattern, '[FILTERED]');
      }
    }
    // Reset lastIndex again after test
    pattern.lastIndex = 0;
  }

  // Check for base64 encoded payloads
  if (detectBase64(sanitized)) {
    flags.push('medium:base64_payload');
  }

  // Check for excessive suspicious characters
  for (const { char, maxCount, name } of SUSPICIOUS_CHARS) {
    const count = (sanitized.match(new RegExp(`\\${char}`, 'g')) || []).length;
    if (count > maxCount) {
      flags.push(`low:excessive_${name}`);
    }
  }

  // Remove null bytes and other control characters (except newlines and tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Normalize whitespace (collapse multiple spaces/newlines)
  sanitized = sanitized.replace(/[ \t]+/g, ' ');
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');

  // Trim
  sanitized = sanitized.trim();

  return {
    sanitized,
    flagged: flags.some(f => f.startsWith('high:') || f.startsWith('medium:')),
    flags,
    originalLength,
    sanitizedLength: sanitized.length,
  };
}

/**
 * Quick check if input should be blocked entirely
 * Returns true if input is too dangerous to process
 */
export function shouldBlockInput(input: string): { blocked: boolean; reason?: string } {
  // Check for multiple high-severity patterns
  let highSeverityCount = 0;

  for (const { pattern, severity } of INJECTION_PATTERNS) {
    if (severity === 'high' && pattern.test(input)) {
      highSeverityCount++;
      pattern.lastIndex = 0;
    }
    pattern.lastIndex = 0;
  }

  if (highSeverityCount >= 2) {
    return {
      blocked: true,
      reason: 'Multiple prompt injection patterns detected',
    };
  }

  // Block if input is mostly non-printable characters
  const printableChars = input.replace(/[\x00-\x1F\x7F-\x9F]/g, '').length;
  if (input.length > 100 && printableChars / input.length < 0.5) {
    return {
      blocked: true,
      reason: 'Input contains too many non-printable characters',
    };
  }

  return { blocked: false };
}

/**
 * Get risk score for input (0-100)
 */
export function getRiskScore(result: SanitizationResult): number {
  let score = 0;

  for (const flag of result.flags) {
    if (flag.startsWith('high:')) score += 30;
    else if (flag.startsWith('medium:')) score += 15;
    else if (flag.startsWith('low:')) score += 5;
    else if (flag === 'truncated') score += 10;
  }

  return Math.min(100, score);
}

/**
 * Log sanitization result for audit purposes
 */
export function formatSanitizationLog(result: SanitizationResult): string {
  return JSON.stringify({
    flagged: result.flagged,
    flags: result.flags,
    originalLength: result.originalLength,
    sanitizedLength: result.sanitizedLength,
    riskScore: getRiskScore(result),
  });
}
