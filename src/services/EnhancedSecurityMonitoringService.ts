import { supabase } from '@/integrations/supabase/client';

/**
 * Enhanced Security Monitoring Service
 * Provides real-time security monitoring and threat detection
 */
export class EnhancedSecurityMonitoringService {
  private static monitoringEnabled = true;
  private static alertThresholds = {
    bruteForceAttempts: 5,
    privilegeEscalationAttempts: 3,
    suspiciousFileUploads: 10,
    rateLimitViolations: 5,
    timeWindowMinutes: 15
  };

  /**
   * Initialize enhanced security monitoring
   */
  static initialize(): void {
    if (!this.monitoringEnabled) return;

    // Start monitoring interval
    setInterval(() => {
      this.runSecurityChecks();
    }, 5 * 60 * 1000); // Run every 5 minutes

    console.log('🔒 Enhanced Security Monitoring initialized');
  }

  /**
   * Run comprehensive security checks
   */
  private static async runSecurityChecks(): Promise<void> {
    try {
      await this.detectAnomalies();
      await this.monitorRateLimits();
      await this.checkSuspiciousPatterns();
    } catch (error) {
      console.error('Security monitoring error:', error);
    }
  }

  /**
   * Detect security anomalies using the database function
   */
  private static async detectAnomalies(): Promise<void> {
    try {
      const { error } = await supabase.rpc('detect_security_anomalies');
      if (error) {
        console.error('Error running anomaly detection:', error);
      }
    } catch (error) {
      console.error('Failed to detect anomalies:', error);
    }
  }

  /**
   * Monitor rate limiting violations
   */
  private static async monitorRateLimits(): Promise<void> {
    try {
      const { data: recentViolations, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('action', 'RATE_LIMIT_EXCEEDED')
        .gte('created_at', new Date(Date.now() - this.alertThresholds.timeWindowMinutes * 60 * 1000).toISOString())
        .limit(50);

      if (error) {
        console.error('Error monitoring rate limits:', error);
        return;
      }

      if (recentViolations && recentViolations.length >= this.alertThresholds.rateLimitViolations) {
        await this.logSecurityAlert('EXCESSIVE_RATE_LIMIT_VIOLATIONS', {
          count: recentViolations.length,
          timeWindow: this.alertThresholds.timeWindowMinutes
        });
      }
    } catch (error) {
      console.error('Failed to monitor rate limits:', error);
    }
  }

  /**
   * Check for suspicious patterns in user behavior
   */
  private static async checkSuspiciousPatterns(): Promise<void> {
    try {
      // Check for users with multiple failed admin access attempts
      const { data: failedAdminAttempts, error } = await supabase
        .from('security_audit_logs')
        .select('user_id, COUNT(*)')
        .in('action', ['ADMIN_ACCESS_DENIED', 'PRIVILEGE_ESCALATION_ATTEMPT'])
        .eq('success', false)
        .gte('created_at', new Date(Date.now() - this.alertThresholds.timeWindowMinutes * 60 * 1000).toISOString())
        .not('user_id', 'is', null);

      if (error) {
        console.error('Error checking suspicious patterns:', error);
        return;
      }

      // Process results and alert on suspicious activity
      const suspiciousUsers = failedAdminAttempts?.filter((record: any) => 
        record.count >= this.alertThresholds.privilegeEscalationAttempts
      );

      if (suspiciousUsers && suspiciousUsers.length > 0) {
        await this.logSecurityAlert('SUSPICIOUS_USER_PATTERN', {
          users: suspiciousUsers,
          threshold: this.alertThresholds.privilegeEscalationAttempts
        });
      }
    } catch (error) {
      console.error('Failed to check suspicious patterns:', error);
    }
  }

  /**
   * Log a security alert
   */
  private static async logSecurityAlert(alertType: string, metadata: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_audit_logs')
        .insert({
          action: alertType,
          success: false,
          resource: 'security_monitoring',
          error_message: `Enhanced security alert: ${JSON.stringify(metadata)}`
        });

      if (error) {
        console.error('Failed to log security alert:', error);
      } else {
        console.warn(`🚨 Security Alert: ${alertType}`, metadata);
      }
    } catch (error) {
      console.error('Failed to log security alert:', error);
    }
  }

  /**
   * Get security monitoring statistics
   */
  static async getSecurityStats(): Promise<any> {
    try {
      const { data: recentLogs, error } = await supabase
        .from('security_audit_logs')
        .select('action, success, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(1000);

      if (error) {
        console.error('Error fetching security stats:', error);
        return null;
      }

      const stats = {
        totalEvents: recentLogs?.length || 0,
        failedEvents: recentLogs?.filter(log => !log.success).length || 0,
        successfulEvents: recentLogs?.filter(log => log.success).length || 0,
        topFailedActions: this.getTopActions(recentLogs?.filter(log => !log.success) || []),
        hourlyDistribution: this.getHourlyDistribution(recentLogs || [])
      };

      return stats;
    } catch (error) {
      console.error('Failed to get security stats:', error);
      return null;
    }
  }

  /**
   * Get top failed actions for analysis
   */
  private static getTopActions(logs: any[]): any[] {
    const actionCounts = logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(actionCounts)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 5)
      .map(([action, count]) => ({ action, count }));
  }

  /**
   * Get hourly distribution of security events
   */
  private static getHourlyDistribution(logs: any[]): any[] {
    const hourCounts = logs.reduce((acc, log) => {
      const hour = new Date(log.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    return Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: hourCounts[hour] || 0
    }));
  }

  /**
   * Enable or disable monitoring
   */
  static setMonitoringEnabled(enabled: boolean): void {
    this.monitoringEnabled = enabled;
    console.log(`🔒 Security monitoring ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Update alert thresholds
   */
  static updateThresholds(newThresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('🔒 Security monitoring thresholds updated:', this.alertThresholds);
  }
}