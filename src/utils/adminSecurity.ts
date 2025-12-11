
import { supabase } from '@/integrations/supabase/client';
import { SecurityService } from '@/services/SecurityService';
import { EnhancedSecurityMonitoringService } from '@/services/EnhancedSecurityMonitoringService';

/**
 * Enhanced admin validation with server-side verification
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function validateAdminAccess(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('🚫 Admin validation failed: No authenticated user');
      await SecurityService.logSecurityEvent('ADMIN_ACCESS_DENIED_NO_USER', 'admin_validation', false);
      return false;
    }

    // Use enhanced server-side verification
    const isAdmin = await SecurityService.verifyAdminAccess('admin_route_access');
    
    console.log(`${isAdmin ? '✅' : '🚫'} Enhanced admin validation result for user ${user.id}:`, isAdmin);
    
    return isAdmin;
  } catch (error) {
    console.error('❌ Critical error in enhanced admin validation:', error);
    await SecurityService.logSecurityEvent('ADMIN_VALIDATION_ERROR', 'admin_validation', false, 'Critical validation error');
    return false;
  }
}

/**
 * Logs security events for admin access attempts with enhanced details
 * @param action - The action being attempted
 * @param success - Whether the action was successful
 * @param userId - The user ID (optional)
 * @param route - The route being accessed (optional)
 * @param additionalInfo - Additional security context
 */
export function logAdminSecurityEvent(
  action: string,
  success: boolean,
  userId?: string,
  route?: string,
  additionalInfo?: Record<string, any>
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    action,
    success,
    userId,
    route,
    userAgent: navigator.userAgent,
    ...additionalInfo
  };

  console.log(`${success ? '✅' : '🚨'} ENHANCED SECURITY LOG:`, logEntry);
  
  // Use enhanced security service for logging
  SecurityService.logSecurityEvent(
    action,
    route,
    success,
    success ? undefined : `Admin access denied: ${action}`
  );
}

/**
 * List of all protected admin routes with enhanced pattern matching
 */
export const PROTECTED_ADMIN_ROUTES = [
  '/admin',
  '/admin/user',
  '/admin/user/:id',
  '/admin/*' // Catch-all for any admin subroutes
] as const;

/**
 * Enhanced admin route detection with pattern matching
 * @param route - The route to check
 * @returns boolean - true if route is admin route
 */
export function isAdminRoute(route: string): boolean {
  // Direct match
  if (route.startsWith('/admin')) {
    return true;
  }
  
  // Pattern matching for dynamic routes
  const adminPatterns = [
    /^\/admin$/,
    /^\/admin\/user$/,
    /^\/admin\/user\/[^\/]+$/,
    /^\/admin\/.*/
  ];
  
  return adminPatterns.some(pattern => pattern.test(route));
}

/**
 * Enhanced security check for critical admin operations
 * @param operation - The operation being performed
 * @param resourceId - Optional resource identifier
 * @returns Promise<boolean> - true if operation is allowed
 */
export async function validateCriticalAdminOperation(
  operation: string,
  resourceId?: string
): Promise<boolean> {
  try {
    // Rate limiting for critical operations
    const rateLimitPassed = await SecurityService.checkRateLimit(
      `admin_${operation}`,
      5, // Max 5 attempts
      10 // Per 10 minutes
    );
    
    if (!rateLimitPassed) {
      logAdminSecurityEvent(
        `RATE_LIMITED_${operation.toUpperCase()}`,
        false,
        undefined,
        undefined,
        { resourceId, reason: 'Rate limit exceeded' }
      );
      return false;
    }
    
    // Enhanced admin verification
    const isAdmin = await SecurityService.verifyAdminAccess(operation);
    
    if (!isAdmin) {
      logAdminSecurityEvent(
        `UNAUTHORIZED_${operation.toUpperCase()}`,
        false,
        undefined,
        undefined,
        { resourceId, reason: 'Insufficient privileges' }
      );
      return false;
    }
    
    // Log successful validation
    logAdminSecurityEvent(
      `AUTHORIZED_${operation.toUpperCase()}`,
      true,
      undefined,
      undefined,
      { resourceId }
    );
    
    return true;
  } catch (error) {
    console.error(`❌ Error validating admin operation ${operation}:`, error);
    logAdminSecurityEvent(
      `ERROR_${operation.toUpperCase()}`,
      false,
      undefined,
      undefined,
      { resourceId, error: error instanceof Error ? error.message : 'Unknown error' }
    );
    return false;
  }
}

/**
 * Initialize security monitoring for admin routes
 */
export function initializeAdminSecurity(): void {
  // Clean up old rate limit data on initialization
  SecurityService.cleanupRateLimitStorage();
  
  // Initialize enhanced security monitoring
  EnhancedSecurityMonitoringService.initialize();
  
  // Log security system initialization
  console.log('🔒 Enhanced admin security system initialized');
  SecurityService.logSecurityEvent('ADMIN_SECURITY_INITIALIZED', 'security_system', true);
}
