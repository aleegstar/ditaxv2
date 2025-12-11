
/**
 * Enhanced security-focused input validation utilities
 * Phase 3 Security Enhancement
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  sanitizedValue?: string;
}

export interface ValidationOptions {
  maxLength?: number;
  minLength?: number;
  allowedChars?: RegExp;
  strictMode?: boolean;
  contextType?: 'email' | 'url' | 'phone' | 'name' | 'general';
}

export class EnhancedInputValidator {
  // Enhanced security patterns
  private static readonly ADVANCED_SQL_PATTERNS = [
    // Basic SQL injection patterns
    /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b|\bCREATE\b|\bALTER\b)/i,
    /(\bOR\b|\bAND\b)\s+[\d\w]+\s*[=<>!]+\s*[\d\w]+/i,
    /['"]\s*;\s*--/,
    /\/\*[\s\S]*?\*\//,
    // Advanced SQL injection patterns
    /\b(EXEC|EXECUTE|SP_|XP_)\b/i,
    /\b(WAITFOR|DELAY)\b/i,
    /(CHAR|NCHAR|VARCHAR|NVARCHAR)\s*\(/i,
    /\b(OPENROWSET|OPENDATASOURCE)\b/i,
    // Blind SQL injection patterns
    /\bIF\s*\(/i,
    /\bCASE\s+WHEN\b/i,
    // Time-based SQL injection
    /\bSLEEP\s*\(/i,
    /\bBENCHMARK\s*\(/i,
  ];

  private static readonly ADVANCED_XSS_PATTERNS = [
    // Basic XSS patterns
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/i,
    /on\w+\s*=/i,
    // Advanced XSS patterns
    /<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<link\b[^<]*(?:(?!<\/link>)<[^<]*)*<\/link>/gi,
    /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
    // Event handlers
    /on(load|error|focus|blur|change|submit|reset|select|resize|scroll|unload|beforeunload|hashchange|popstate|storage|online|offline|message|pagehide|pageshow|drag|drop|dragenter|dragleave|dragover|dragstart|dragend)\s*=/gi,
    // Data URLs
    /data:\s*text\/html/i,
    /data:\s*application\/javascript/i,
    // Expression and eval patterns
    /expression\s*\(/i,
    /eval\s*\(/i,
    // Encoded scripts
    /&#x?[0-9a-f]+;/gi,
    /%[0-9a-f]{2}/gi,
  ];

  private static readonly MALICIOUS_PATTERNS = [
    // Command injection
    /[;&|`$(){}[\]]/,
    // Path traversal
    /\.\.[\/\\]/,
    // Protocol handlers
    /^(file|ftp|data|mailto|tel):/i,
    // Null bytes
    /\x00/,
    // Control characters
    /[\x00-\x1f\x7f-\x9f]/,
  ];

  /**
   * Enhanced text validation with context-aware security
   */
  static validateText(input: string, options: ValidationOptions = {}): ValidationResult {
    const {
      maxLength = 1000,
      minLength = 0,
      allowedChars,
      strictMode = false,
      contextType = 'general'
    } = options;

    if (!input || typeof input !== 'string') {
      return { isValid: false, error: 'Input must be a non-empty string' };
    }

    if (input.length < minLength) {
      return { isValid: false, error: `Input must be at least ${minLength} characters` };
    }

    if (input.length > maxLength) {
      return { isValid: false, error: `Input exceeds maximum length of ${maxLength} characters` };
    }

    // Context-specific validation
    const contextValidation = this.validateByContext(input, contextType);
    if (!contextValidation.isValid) {
      return contextValidation;
    }

    // Check for SQL injection patterns
    for (const pattern of this.ADVANCED_SQL_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Input contains potentially dangerous SQL patterns' };
      }
    }

    // Check for XSS patterns
    for (const pattern of this.ADVANCED_XSS_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Input contains potentially dangerous script patterns' };
      }
    }

    // Check for malicious patterns
    for (const pattern of this.MALICIOUS_PATTERNS) {
      if (pattern.test(input)) {
        return { isValid: false, error: 'Input contains potentially dangerous content' };
      }
    }

    // Check allowed characters if specified
    if (allowedChars && !allowedChars.test(input)) {
      return { isValid: false, error: 'Input contains disallowed characters' };
    }

    // Strict mode additional checks
    if (strictMode) {
      const strictValidation = this.strictModeValidation(input);
      if (!strictValidation.isValid) {
        return strictValidation;
      }
    }

    // Sanitize and return
    const sanitizedValue = this.sanitizeInput(input, contextType);
    return { isValid: true, sanitizedValue };
  }

  /**
   * Context-aware validation
   */
  private static validateByContext(input: string, contextType: string): ValidationResult {
    switch (contextType) {
      case 'email':
        return this.validateEmail(input);
      case 'url':
        return this.validateURL(input);
      case 'phone':
        return this.validatePhone(input);
      case 'name':
        return this.validateName(input);
      default:
        return { isValid: true };
    }
  }

  /**
   * Enhanced email validation
   */
  static validateEmail(email: string): ValidationResult {
    if (!email || typeof email !== 'string') {
      return { isValid: false, error: 'Email must be a non-empty string' };
    }

    // Length checks
    if (email.length > 254) {
      return { isValid: false, error: 'Email address too long' };
    }

    // Basic format validation
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    if (!emailRegex.test(email)) {
      return { isValid: false, error: 'Invalid email format' };
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /\.\./,  // Consecutive dots
      /^\./, // Starting with dot
      /\.$/, // Ending with dot
      /@\./, // @ followed by dot
      /\.@/, // Dot followed by @
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(email)) {
        return { isValid: false, error: 'Email contains invalid patterns' };
      }
    }

    return { isValid: true, sanitizedValue: email.toLowerCase().trim() };
  }

  /**
   * URL validation
   */
  static validateURL(url: string): ValidationResult {
    if (!url || typeof url !== 'string') {
      return { isValid: false, error: 'URL must be a non-empty string' };
    }

    try {
      const urlObj = new URL(url);
      
      // Only allow HTTP and HTTPS
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
      }

      // Check for suspicious patterns
      if (url.includes('javascript:') || url.includes('data:') || url.includes('file:')) {
        return { isValid: false, error: 'URL contains dangerous protocol' };
      }

      return { isValid: true, sanitizedValue: url };
    } catch (error) {
      return { isValid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Phone number validation
   */
  static validatePhone(phone: string): ValidationResult {
    if (!phone || typeof phone !== 'string') {
      return { isValid: false, error: 'Phone must be a non-empty string' };
    }

    // Remove common formatting characters
    const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
    
    // Check if only digits remain (allowing leading +)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(cleanPhone)) {
      return { isValid: false, error: 'Invalid phone number format' };
    }

    return { isValid: true, sanitizedValue: cleanPhone };
  }

  /**
   * Name validation
   */
  static validateName(name: string): ValidationResult {
    if (!name || typeof name !== 'string') {
      return { isValid: false, error: 'Name must be a non-empty string' };
    }

    // Allow letters, spaces, hyphens, apostrophes
    const nameRegex = /^[a-zA-ZÀ-ÿ\s\-'\.]+$/;
    if (!nameRegex.test(name)) {
      return { isValid: false, error: 'Name contains invalid characters' };
    }

    if (name.length > 50) {
      return { isValid: false, error: 'Name is too long' };
    }

    return { isValid: true, sanitizedValue: name.trim() };
  }

  /**
   * Strict mode validation
   */
  private static strictModeValidation(input: string): ValidationResult {
    // Check for Unicode control characters
    if (/[\u0000-\u001F\u007F-\u009F]/.test(input)) {
      return { isValid: false, error: 'Input contains control characters' };
    }

    // Check for suspicious Unicode patterns
    if (/[\u202A-\u202E\u2066-\u2069]/.test(input)) {
      return { isValid: false, error: 'Input contains bidirectional override characters' };
    }

    // Check for homograph attacks
    if (/[\u0430-\u044F\u0410-\u042F]/.test(input) && /[a-zA-Z]/.test(input)) {
      return { isValid: false, error: 'Input contains mixed Latin and Cyrillic characters' };
    }

    return { isValid: true };
  }

  /**
   * Enhanced sanitization
   */
  static sanitizeInput(input: string, contextType: string = 'general'): string {
    let sanitized = input;

    // Basic HTML encoding
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // Context-specific sanitization
    switch (contextType) {
      case 'email':
        sanitized = sanitized.toLowerCase().trim();
        break;
      case 'name':
        sanitized = sanitized.trim().replace(/\s+/g, ' ');
        break;
      case 'phone':
        sanitized = sanitized.replace(/[\s\-\(\)]/g, '');
        break;
    }

    return sanitized;
  }

  /**
   * Batch validation for form data
   */
  static validateFormData(formData: Record<string, any>, validationRules: Record<string, ValidationOptions>): {
    isValid: boolean;
    errors: Record<string, string>;
    sanitizedData: Record<string, any>;
  } {
    const errors: Record<string, string> = {};
    const sanitizedData: Record<string, any> = {};
    let isValid = true;

    for (const [field, value] of Object.entries(formData)) {
      const rules = validationRules[field];
      
      if (rules && typeof value === 'string') {
        const result = this.validateText(value, rules);
        
        if (!result.isValid) {
          errors[field] = result.error || 'Validation failed';
          isValid = false;
        } else {
          sanitizedData[field] = result.sanitizedValue || value;
        }
      } else {
        sanitizedData[field] = value;
      }
    }

    return { isValid, errors, sanitizedData };
  }

  /**
   * CSRF token validation
   */
  static validateCSRFToken(token: string, expectedToken: string): boolean {
    if (!token || !expectedToken) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    if (token.length !== expectedToken.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < token.length; i++) {
      result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate CSRF token
   */
  static generateCSRFToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}
