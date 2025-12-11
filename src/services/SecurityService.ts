

import { supabase } from "@/integrations/supabase/client";

export class SecurityService {
  /**
   * Verify if current user has admin role
   */
  static async verifyAdminRole(): Promise<boolean> {
    try {
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user for admin verification:', userError);
        return false;
      }

      // Use has_role function which works reliably
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error verifying admin role:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error in verifyAdminRole:', error);
      return false;
    }
  }

  /**
   * Server-side admin access verification with enhanced security
   */
  static async verifyAdminAccess(operationType: string = 'general'): Promise<boolean> {
    try {
      // Get current user first
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        console.error('Error getting user for admin access verification:', userError);
        await this.logSecurityEvent(`ADMIN_VERIFICATION_ERROR_${operationType}`, undefined, false, 'User not authenticated');
        return false;
      }

      // Use has_role function which works reliably with proper user context
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: user.id,
        _role: 'admin'
      });
      
      if (error) {
        console.error('Error verifying admin access:', error);
        await this.logSecurityEvent(`ADMIN_VERIFICATION_ERROR_${operationType}`, undefined, false, error.message);
        
        // Fallback: try the simple function as backup
        try {
          const { data: fallbackData, error: fallbackError } = await supabase.rpc('verify_admin_role_simple');
          if (!fallbackError && fallbackData === true) {
            console.warn('Fallback admin verification succeeded');
            return true;
          }
        } catch (fallbackErr) {
          console.error('Fallback admin verification also failed:', fallbackErr);
        }
        
        return false;
      }
      
      const isAdmin = data === true;
      
      // Log the verification result
      await this.logSecurityEvent(
        `ADMIN_VERIFICATION_${isAdmin ? 'SUCCESS' : 'DENIED'}_${operationType}`, 
        user.id, 
        isAdmin, 
        isAdmin ? undefined : 'User lacks admin privileges'
      );
      
      return isAdmin;
    } catch (error) {
      console.error('Critical error in admin access verification:', error);
      await this.logSecurityEvent(`ADMIN_VERIFICATION_CRITICAL_ERROR_${operationType}`, undefined, false, 'Critical verification failure');
      return false;
    }
  }

  /**
   * Enhanced security event logging with database integration
   */
  static async logSecurityEvent(
    action: string,
    resource?: string,
    success: boolean = true,
    errorMessage?: string,
    ipAddress?: string
  ) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Console logging
      console.info(`🔒 Security Event: ${action} - Success: ${success}${resource ? ` - Resource: ${resource}` : ''}${errorMessage ? ` - Error: ${errorMessage}` : ''}`, {
        userId: user?.id,
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server',
        ipAddress
      });

      // Try to log to database using the enhanced function
      try {
        await supabase.rpc('log_security_event_enhanced', {
          p_action: action,
          p_resource: resource,
          p_success: success,
          p_error_message: errorMessage,
          p_ip_address: ipAddress,
          p_user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Server'
        });
      } catch (dbError) {
        console.warn('Failed to log security event to database:', dbError);
      }
    } catch (error) {
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Enhanced rate limiting with progressive blocking
   */
  static async checkRateLimit(action: string, maxAttempts: number = 10, windowMinutes: number = 15): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      // Try database-backed progressive rate limiting first
      try {
        const { data, error } = await supabase.rpc('check_progressive_rate_limit', {
          p_action: action,
          p_max_attempts: maxAttempts,
          p_window_minutes: windowMinutes
        });

        if (!error && data) {
          const result = data as {
            allowed: boolean;
            attempt_count: number;
            is_blocked: boolean;
            block_duration_minutes?: number;
          };

          if (!result.allowed) {
            await this.logSecurityEvent(
              `RATE_LIMIT_EXCEEDED_${action}`,
              undefined,
              false,
              `Rate limit exceeded: ${result.attempt_count}/${maxAttempts} attempts${
                result.is_blocked ? `, blocked for ${result.block_duration_minutes} minutes` : ''
              }`
            );
          }

          return result.allowed;
        }
      } catch (dbError) {
        console.warn('Database rate limiting failed, falling back to local:', dbError);
      }

      // Fallback to client-side rate limiting
      return this.checkRateLimitLocal(action, maxAttempts, windowMinutes);
    } catch (error) {
      console.error('Rate limit error:', error);
      return false;
    }
  }

  /**
   * Local rate limiting fallback
   */
  private static async checkRateLimitLocal(action: string, maxAttempts: number, windowMinutes: number): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const storageKey = `rate_limit_${user.id}_${action}`;
      const now = Date.now();
      const windowStart = now - windowMinutes * 60 * 1000;
      
      const storedData = localStorage.getItem(storageKey);
      let attempts: number[] = [];
      
      if (storedData) {
        try {
          const parsed = JSON.parse(storedData);
          attempts = parsed.attempts || [];
        } catch (parseError) {
          console.warn('Failed to parse rate limit data:', parseError);
        }
      }
      
      attempts = attempts.filter(timestamp => timestamp > windowStart);
      
      if (attempts.length >= maxAttempts) {
        await this.logSecurityEvent(`RATE_LIMIT_EXCEEDED_${action}`, undefined, false, `Local rate limit exceeded: ${attempts.length}/${maxAttempts} attempts`);
        return false;
      }
      
      attempts.push(now);
      localStorage.setItem(storageKey, JSON.stringify({
        attempts,
        lastUpdate: now
      }));
      
      return true;
    } catch (error) {
      console.error('Local rate limit error:', error);
      return false;
    }
  }

  /**
   * Create user session - now properly secured with RLS
   * Users can create their own sessions, service_role can create any session
   */
  static async createUserSession(userAgent?: string, ipAddress?: string): Promise<boolean> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      const { error } = await supabase.from('user_sessions').insert({
        user_id: user.id,
        login_time: new Date().toISOString(),
        user_agent: userAgent || navigator.userAgent,
        ip_address: ipAddress || await this.getClientIP()
      });

      if (error) {
        console.error('Failed to create user session:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error creating user session:', error);
      return false;
    }
  }

  /**
   * Validate current user session using new server-side function
   */
  static async validateUserSession(): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('validate_user_session');
      
      if (error) {
        console.error('Session validation error:', error);
        return false;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error validating user session:', error);
      return false;
    }
  }

  /**
   * Clean up old rate limit entries from localStorage
   */
  static cleanupRateLimitStorage(olderThanHours: number = 24): void {
    try {
      const cutoff = Date.now() - olderThanHours * 60 * 60 * 1000;
      
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

  /**
   * Validate input to prevent injection attacks
   */
  static validateInput(input: string, maxLength: number = 1000): boolean {
    if (!input || typeof input !== 'string') return false;
    if (input.length > maxLength) return false;
    
    // Check for basic SQL injection patterns
    const sqlPatterns = [
      /(\bUNION\b|\bSELECT\b|\bINSERT\b|\bUPDATE\b|\bDELETE\b|\bDROP\b)/i,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/i,
      /['"]\s*;\s*--/,
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi
    ];
    
    return !sqlPatterns.some(pattern => pattern.test(input));
  }

  /**
   * Get client IP (best effort)
   */
  private static async getClientIP(): Promise<string | null> {
    try {
      // This is a basic implementation - in production you'd want more robust IP detection
      return null; // Browser can't reliably get real IP
    } catch {
      return null;
    }
  }
}

