

import { supabase } from '@/integrations/supabase/client';

export class SecurityMonitoringService {
  /**
   * Monitor suspicious login attempts
   */
  static async monitorLoginAttempts(email: string, success: boolean, errorMessage?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Log the login attempt
      await supabase.from('security_audit_logs').insert({
        user_id: user?.id,
        action: success ? 'LOGIN_SUCCESS' : 'LOGIN_FAILED',
        success,
        error_message: errorMessage,
        resource: 'authentication',
        user_agent: navigator.userAgent
      });

      // Check for suspicious patterns if login failed
      if (!success) {
        await this.checkSuspiciousActivity(email);
      }
    } catch (error) {
      console.error('Error monitoring login attempts:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private static async checkSuspiciousActivity(email: string): Promise<void> {
    try {
      // Get recent failed login attempts for this email
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      
      const { data: recentFailures } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('action', 'LOGIN_FAILED')
        .eq('resource', 'authentication')
        .gte('created_at', oneHourAgo);

      if (recentFailures && recentFailures.length >= 5) {
        // Log potential brute force attempt
        await supabase.from('security_audit_logs').insert({
          action: 'POTENTIAL_BRUTE_FORCE',
          success: false,
          error_message: `Multiple failed login attempts detected for email pattern`,
          resource: 'security_alert',
          user_agent: navigator.userAgent
        });

        console.warn('🚨 Potential brute force attack detected');
      }
    } catch (error) {
      console.error('Error checking suspicious activity:', error);
    }
  }

  /**
   * Monitor admin privilege escalation attempts
   */
  static async monitorPrivilegeEscalation(userId: string, attemptedAction: string): Promise<void> {
    try {
      await supabase.from('security_audit_logs').insert({
        user_id: userId,
        action: 'PRIVILEGE_ESCALATION_ATTEMPT',
        success: false,
        error_message: `User attempted unauthorized action: ${attemptedAction}`,
        resource: 'privilege_escalation',
        user_agent: navigator.userAgent
      });

      console.warn(`🚨 Privilege escalation attempt by user ${userId}: ${attemptedAction}`);
    } catch (error) {
      console.error('Error monitoring privilege escalation:', error);
    }
  }

  /**
   * Monitor file upload security
   */
  static async monitorFileUpload(fileName: string, fileType: string, fileSize: number, success: boolean, errorMessage?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('security_audit_logs').insert({
        user_id: user?.id,
        action: success ? 'FILE_UPLOAD_SUCCESS' : 'FILE_UPLOAD_FAILED',
        success,
        error_message: errorMessage,
        resource: 'file_upload',
        user_agent: navigator.userAgent
      });

      // Check for suspicious file uploads
      if (success) {
        await this.validateFileUpload(fileName, fileType, fileSize);
      }
    } catch (error) {
      console.error('Error monitoring file upload:', error);
    }
  }

  /**
   * Validate file upload for security risks
   */
  private static async validateFileUpload(fileName: string, fileType: string, fileSize: number): Promise<void> {
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js', '.jar'];
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    
    let alerts: string[] = [];

    // Check file extension
    const extension = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    if (suspiciousExtensions.includes(extension)) {
      alerts.push(`Suspicious file extension: ${extension}`);
    }

    // Check file size
    if (fileSize > maxFileSize) {
      alerts.push(`File size exceeds limit: ${fileSize} bytes`);
    }

    // Check MIME type mismatch
    const expectedMimeTypes: Record<string, string[]> = {
      '.pdf': ['application/pdf'],
      '.jpg': ['image/jpeg'],
      '.jpeg': ['image/jpeg'],
      '.png': ['image/png'],
      '.doc': ['application/msword'],
      '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    };

    if (expectedMimeTypes[extension] && !expectedMimeTypes[extension].includes(fileType)) {
      alerts.push(`MIME type mismatch: ${fileType} for extension ${extension}`);
    }

    if (alerts.length > 0) {
      const { data: { user } } = await supabase.auth.getUser();
      
      await supabase.from('security_audit_logs').insert({
        user_id: user?.id,
        action: 'SUSPICIOUS_FILE_UPLOAD',
        success: false,
        error_message: alerts.join('; '),
        resource: 'file_security',
        user_agent: navigator.userAgent
      });

      console.warn('🚨 Suspicious file upload detected:', alerts);
    }
  }

  /**
   * Monitor session anomalies
   */
  static async monitorSessionAnomalies(): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check for concurrent sessions (simplified check)
      const currentTime = new Date().toISOString();
      const { data: recentSessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('login_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (recentSessions && recentSessions.length > 3) {
        await supabase.from('security_audit_logs').insert({
          user_id: user.id,
          action: 'MULTIPLE_CONCURRENT_SESSIONS',
          success: false,
          error_message: `User has ${recentSessions.length} concurrent sessions`,
          resource: 'session_security',
          user_agent: navigator.userAgent
        });

        console.warn('🚨 Multiple concurrent sessions detected for user:', user.id);
      }
    } catch (error) {
      console.error('Error monitoring session anomalies:', error);
    }
  }

  /**
   * Get security alerts for admin dashboard
   */
  static async getSecurityAlerts(limit: number = 50): Promise<any[]> {
    try {
      const { data } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(limit);

      return data || [];
    } catch (error) {
      console.error('Error fetching security alerts:', error);
      return [];
    }
  }

  /**
   * Real-time security monitoring setup
   */
  static setupRealTimeMonitoring(): void {
    // Monitor for failed login attempts
    const channel = supabase
      .channel('security-monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_logs',
          filter: 'success=eq.false'
        },
        (payload) => {
          console.warn('🚨 Security alert:', payload.new);
          this.handleSecurityAlert(payload.new);
        }
      )
      .subscribe();

    console.log('🔒 Real-time security monitoring activated');
  }

  /**
   * Handle security alerts
   */
  private static handleSecurityAlert(alert: any): void {
    // You could integrate with external alerting systems here
    // For now, we'll just log to console
    if (alert.action.includes('BRUTE_FORCE') || alert.action.includes('ESCALATION')) {
      console.error('🚨 CRITICAL SECURITY ALERT:', alert);
      // In production, you might want to:
      // - Send notifications to security team
      // - Temporarily block IP addresses
      // - Trigger additional security measures
    }
  }
}

