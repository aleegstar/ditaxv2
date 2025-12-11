
/**
 * Security-focused input validation utilities
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export class InputValidator {
  /**
   * Validate general text input
   */
  static validateText(input: string, maxLength: number = 1000): ValidationResult {
    if (!input || typeof input !== 'string') {
      return { isValid: false, error: 'Input must be a non-empty string' };
    }

    if (input.length > maxLength) {
      return { isValid: false, error: `Input exceeds maximum length of ${maxLength} characters` };
    }

    // Check for potential SQL injection patterns
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
      /['"]\s*;\s*--/,
      /\/\*[\s\S]*?\*\//
    ];

    for (const pattern of sqlPatterns) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Input contains potentially dangerous content' };
      }
    }

    // Check for XSS patterns
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
      /javascript:/i,
      /on\w+\s*=/i
    ];

    for (const pattern of xssPatterns) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Input contains potentially dangerous scripts' };
      }
    }

    return { isValid: true };
  }

  /**
   * Validate email addresses
   */
  static validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email must be a non-empty string' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    if (email.length > 254) {
      return { isValid: false, error: 'Email address too long' };
    }

    return { isValid: true };
  }

  /**
   * Validate UUID format
   */
  static validateUUID(uuid: string): ValidationResult {
    if (!uuid || typeof uuid !== 'string') {
      return { isValid: false, error: 'UUID must be a non-empty string' };
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(uuid)) {
      return { isValid: false, error: 'Invalid UUID format' };
    }

    return { isValid: true };
  }

  /**
   * Validate numeric input
   */
  static validateNumber(input: any, min?: number, max?: number): ValidationResult {
    const num = Number(input);
    
    if (isNaN(num)) {
      return { isValid: false, error: 'Input must be a valid number' };
    }

    if (min !== undefined && num < min) {
      return { isValid: false, error: `Number must be at least ${min}` };
    }

    if (max !== undefined && num > max) {
      return { isValid: false, error: `Number must not exceed ${max}` };
    }

    return { isValid: true };
  }

  /**
   * Sanitize HTML content
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Validate file upload
   */
  static validateFile(file: File, allowedTypes: string[], maxSize: number): ValidationResult {
    if (!file) {
      return { isValid: false, error: 'No file provided' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: `File type ${file.type} not allowed` };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: `File size exceeds limit of ${maxSize} bytes` };
    }

    // Check for potentially dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.jar'];
    const fileName = file.name.toLowerCase();
    
    for (const ext of dangerousExtensions) {
      if (fileName.endsWith(ext)) {
        return { isValid: false, error: 'File type not allowed for security reasons' };
      }
    }

    return { isValid: true };
  }

  /**
   * Enhanced client-side rate limiting with better storage management
   */
  static checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
    const now = Date.now();
    const windowKey = `rate_limit_${key}`;
    
    try {
      const stored = localStorage.getItem(windowKey);
      let requests: number[] = [];
      
      if (stored) {
        const parsed = JSON.parse(stored);
        requests = Array.isArray(parsed.requests) ? parsed.requests : [];
      }
      
      // Remove expired timestamps
      const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
      
      if (validRequests.length >= maxRequests) {
        return false;
      }
      
      // Add current request
      validRequests.push(now);
      
      // Store with metadata
      localStorage.setItem(windowKey, JSON.stringify({
        requests: validRequests,
        lastUpdate: now
      }));
      
      return true;
    } catch (error) {
      console.error('Rate limit check failed:', error);
      // On error, allow the request but log it
      return true;
    }
  }

  /**
   * Clean up old rate limit entries
   */
  static cleanupRateLimitStorage(olderThanMs: number = 24 * 60 * 60 * 1000): void {
    try {
      const cutoff = Date.now() - olderThanMs;
      
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && key.startsWith('rate_limit_')) {
          try {
            const data = JSON.parse(localStorage.getItem(key) || '{}');
            if (data.lastUpdate && data.lastUpdate < cutoff) {
              localStorage.removeItem(key);
            }
          } catch (parseError) {
            // Remove corrupted entries
            localStorage.removeItem(key);
          }
        }
      }
    } catch (error) {
      console.error('Error cleaning up rate limit storage:', error);
    }
  }
}
