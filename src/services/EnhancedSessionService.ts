
import { supabase } from '@/integrations/supabase/client';
import { SecurityService } from './SecurityService';

interface SessionInfo {
  isValid: boolean;
  expiresAt?: Date;
  lastActivity?: Date;
  sessionId?: string;
}

export class EnhancedSessionService {
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly ACTIVITY_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static activityTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize enhanced session management
   */
  static async initializeSession(): Promise<SessionInfo> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { isValid: false };
      }

      // Validate session server-side
      const { data: isValidSession } = await supabase.rpc('validate_user_session');
      
      if (!isValidSession) {
        console.warn('Server-side session validation failed');
        await this.terminateSession();
        return { isValid: false };
      }

      // Create or update user session record
      await supabase.from('user_sessions').upsert({
        user_id: session.user.id,
        login_time: new Date().toISOString(),
        user_agent: navigator.userAgent,
        ip_address: null // Client-side can't determine real IP
      });

      // Start activity monitoring
      this.startActivityMonitoring();

      const expiresAt = new Date(session.expires_at! * 1000);
      
      await SecurityService.logSecurityEvent(
        'SESSION_INITIALIZED',
        'session_management',
        true
      );

      return {
        isValid: true,
        expiresAt,
        lastActivity: new Date(),
        sessionId: session.access_token.substring(0, 8) + '...'
      };
    } catch (error) {
      console.error('Error initializing session:', error);
      return { isValid: false };
    }
  }

  /**
   * Validate current session with enhanced checks
   */
  static async validateSession(skipServerCheck = false): Promise<SessionInfo> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { isValid: false };
      }

      // Check token expiration
      const now = Date.now() / 1000;
      if (session.expires_at! <= now) {
        console.warn('Session token expired');
        await this.terminateSession();
        return { isValid: false };
      }

      // Server-side validation (optional)
      if (!skipServerCheck) {
        const { data: isValidSession } = await supabase.rpc('validate_user_session');
        
        if (!isValidSession) {
          console.warn('Server-side session validation failed');
          await this.terminateSession();
          return { isValid: false };
        }
      }

      // Check for session timeout based on last activity
      const lastActivity = this.getLastActivity();
      if (lastActivity && (Date.now() - lastActivity.getTime()) > this.SESSION_TIMEOUT) {
        console.warn('Session timed out due to inactivity');
        await this.terminateSession();
        return { isValid: false };
      }

      return {
        isValid: true,
        expiresAt: new Date(session.expires_at! * 1000),
        lastActivity: lastActivity || new Date(),
        sessionId: session.access_token.substring(0, 8) + '...'
      };
    } catch (error) {
      console.error('Error validating session:', error);
      return { isValid: false };
    }
  }

  /**
   * Refresh session with enhanced security
   */
  static async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Refreshing session with enhanced security...');
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Session refresh failed:', error);
        
        await SecurityService.logSecurityEvent(
          'SESSION_REFRESH_FAILED',
          'session_management',
          false,
          error.message
        );
        
        return { success: false, error: error.message };
      }

      if (data.session) {
        // Update session record
        await supabase.from('user_sessions').upsert({
          user_id: data.session.user.id,
          login_time: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ip_address: null
        });

        // Update last activity
        this.updateLastActivity();

        await SecurityService.logSecurityEvent(
          'SESSION_REFRESHED',
          'session_management',
          true
        );
      }

      return { success: true };
    } catch (error: any) {
      console.error('Error refreshing session:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Terminate session securely
   */
  static async terminateSession(): Promise<void> {
    try {
      // Stop activity monitoring
      if (this.activityTimer) {
        clearInterval(this.activityTimer);
        this.activityTimer = null;
      }

      // Clear local storage
      this.clearLastActivity();

      // Sign out from Supabase
      await supabase.auth.signOut();

      await SecurityService.logSecurityEvent(
        'SESSION_TERMINATED',
        'session_management',
        true
      );

      console.log('Session terminated successfully');
    } catch (error) {
      console.error('Error terminating session:', error);
    }
  }

  /**
   * Start monitoring user activity
   */
  private static startActivityMonitoring(): void {
    // Clear existing timer
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }

    // Update activity on user interactions
    const updateActivity = () => this.updateLastActivity();
    
    ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
      document.addEventListener(event, updateActivity, { passive: true });
    });

    // Periodic session validation
    this.activityTimer = setInterval(async () => {
      const sessionInfo = await this.validateSession(true);
      if (!sessionInfo.isValid) {
        console.warn('Session validation failed during activity monitoring');
        // Session will be terminated by validateSession
      }
    }, this.ACTIVITY_CHECK_INTERVAL);

    console.log('🔒 Activity monitoring started');
  }

  /**
   * Update last activity timestamp
   */
  private static updateLastActivity(): void {
    localStorage.setItem('last_activity', new Date().toISOString());
  }

  /**
   * Get last activity timestamp
   */
  private static getLastActivity(): Date | null {
    const lastActivity = localStorage.getItem('last_activity');
    return lastActivity ? new Date(lastActivity) : null;
  }

  /**
   * Clear last activity timestamp
   */
  private static clearLastActivity(): void {
    localStorage.removeItem('last_activity');
  }

  /**
   * Check for concurrent sessions
   */
  static async checkConcurrentSessions(): Promise<{ count: number; sessions: any[] }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { count: 0, sessions: [] };

      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('login_time', new Date(Date.now() - this.SESSION_TIMEOUT).toISOString())
        .order('login_time', { ascending: false });

      if (sessions && sessions.length > 2) {
        await SecurityService.logSecurityEvent(
          'MULTIPLE_CONCURRENT_SESSIONS',
          'session_security',
          false,
          `User has ${sessions.length} concurrent sessions`
        );
      }

      return { count: sessions?.length || 0, sessions: sessions || [] };
    } catch (error) {
      console.error('Error checking concurrent sessions:', error);
      return { count: 0, sessions: [] };
    }
  }

  /**
   * Get session information for debugging
   */
  static async getSessionInfo(): Promise<any> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const lastActivity = this.getLastActivity();
      const sessionInfo = await this.validateSession(true);

      return {
        hasSession: !!session,
        isValid: sessionInfo.isValid,
        expiresAt: sessionInfo.expiresAt,
        lastActivity,
        sessionId: sessionInfo.sessionId,
        userId: session?.user?.id,
        email: session?.user?.email
      };
    } catch (error) {
      console.error('Error getting session info:', error);
      return null;
    }
  }
}
