
/**
 * Secure API Client with enhanced security features
 * Phase 3 Security Enhancement
 */

import { supabase } from '@/integrations/supabase/client';
import { CSRFProtection } from '@/utils/securityHeaders';
import { EnhancedInputValidator } from '@/utils/enhancedInputValidation';

export interface SecureRequestOptions {
  validateInput?: boolean;
  sanitizeInput?: boolean;
  requireAuth?: boolean;
  rateLimit?: {
    maxRequests: number;
    windowMs: number;
  };
}

export class SecureApiClient {
  private static rateLimitCache = new Map<string, { count: number; resetTime: number }>();

  /**
   * Secure API request with comprehensive security checks
   */
  static async secureRequest<T = any>(
    url: string, 
    options: RequestInit & SecureRequestOptions = {}
  ): Promise<T> {
    const {
      validateInput = true,
      sanitizeInput = true,
      requireAuth = true,
      rateLimit,
      ...fetchOptions
    } = options;

    // Authentication check
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
    }

    // Rate limiting
    if (rateLimit) {
      const rateLimitKey = `${url}:${await this.getUserId()}`;
      if (!this.checkRateLimit(rateLimitKey, rateLimit)) {
        throw new Error('Rate limit exceeded');
      }
    }

    // Input validation and sanitization
    if (fetchOptions.body && (validateInput || sanitizeInput)) {
      try {
        const bodyData = JSON.parse(fetchOptions.body as string);
        
        if (validateInput) {
          const validation = this.validateRequestBody(bodyData);
          if (!validation.isValid) {
            throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
          }
        }
        
        if (sanitizeInput) {
          const sanitizedData = this.sanitizeRequestBody(bodyData);
          fetchOptions.body = JSON.stringify(sanitizedData);
        }
      } catch (error) {
        if (error instanceof SyntaxError) {
          // Not JSON, validate as string if it's a string
          if (typeof fetchOptions.body === 'string' && validateInput) {
            const result = EnhancedInputValidator.validateText(fetchOptions.body);
            if (!result.isValid) {
              throw new Error(`Input validation failed: ${result.error}`);
            }
          }
        } else {
          throw error;
        }
      }
    }

    // Add security headers
    const secureHeaders = {
      'Content-Type': 'application/json',
      ...CSRFProtection.getHeaders(),
      ...fetchOptions.headers
    };

    // Make secure request
    const response = await fetch(url, {
      ...fetchOptions,
      headers: secureHeaders
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Secure Supabase function invocation
   */
  static async invokeSecureFunction<T = any>(
    functionName: string,
    payload: any = {},
    options: SecureRequestOptions = {}
  ): Promise<T> {
    const {
      validateInput = true,
      sanitizeInput = true,
      requireAuth = true,
      rateLimit
    } = options;

    // Authentication check
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Authentication required');
      }
    }

    // Rate limiting
    if (rateLimit) {
      const rateLimitKey = `function:${functionName}:${await this.getUserId()}`;
      if (!this.checkRateLimit(rateLimitKey, rateLimit)) {
        throw new Error('Rate limit exceeded');
      }
    }

    // Input validation and sanitization
    let processedPayload = payload;
    
    if (validateInput) {
      const validation = this.validateRequestBody(payload);
      if (!validation.isValid) {
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }
    }
    
    if (sanitizeInput) {
      processedPayload = this.sanitizeRequestBody(payload);
    }

    // Add CSRF token to payload
    const csrfToken = CSRFProtection.getToken();
    if (csrfToken) {
      processedPayload = {
        ...processedPayload,
        _csrf: csrfToken
      };
    }

    const { data, error } = await supabase.functions.invoke(functionName, {
      body: processedPayload
    });

    if (error) {
      throw new Error(`Function invocation failed: ${error.message}`);
    }

    return data;
  }

  /**
   * Validate request body
   */
  private static validateRequestBody(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const validateValue = (value: any, path: string = ''): void => {
      if (typeof value === 'string') {
        const result = EnhancedInputValidator.validateText(value, {
          maxLength: 10000,
          strictMode: true
        });
        
        if (!result.isValid) {
          errors.push(`${path}: ${result.error}`);
        }
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((item, index) => {
            validateValue(item, `${path}[${index}]`);
          });
        } else {
          Object.entries(value).forEach(([key, val]) => {
            validateValue(val, path ? `${path}.${key}` : key);
          });
        }
      }
    };

    validateValue(data);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitize request body
   */
  private static sanitizeRequestBody(data: any): any {
    const sanitizeValue = (value: any): any => {
      if (typeof value === 'string') {
        return EnhancedInputValidator.sanitizeInput(value);
      } else if (typeof value === 'object' && value !== null) {
        if (Array.isArray(value)) {
          return value.map(sanitizeValue);
        } else {
          const sanitized: any = {};
          Object.entries(value).forEach(([key, val]) => {
            sanitized[key] = sanitizeValue(val);
          });
          return sanitized;
        }
      }
      return value;
    };

    return sanitizeValue(data);
  }

  /**
   * Rate limiting check
   */
  private static checkRateLimit(
    key: string, 
    options: { maxRequests: number; windowMs: number }
  ): boolean {
    const now = Date.now();
    const cached = this.rateLimitCache.get(key);
    
    if (!cached || now > cached.resetTime) {
      this.rateLimitCache.set(key, {
        count: 1,
        resetTime: now + options.windowMs
      });
      return true;
    }
    
    if (cached.count >= options.maxRequests) {
      return false;
    }
    
    cached.count++;
    return true;
  }

  /**
   * Get current user ID
   */
  private static async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  }

  /**
   * Clean up rate limit cache
   */
  static cleanupRateLimitCache(): void {
    const now = Date.now();
    for (const [key, value] of this.rateLimitCache.entries()) {
      if (now > value.resetTime) {
        this.rateLimitCache.delete(key);
      }
    }
  }
}

// Cleanup rate limit cache every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(() => {
    SecureApiClient.cleanupRateLimitCache();
  }, 5 * 60 * 1000);
}
