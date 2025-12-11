/**
 * Enhanced Security Monitoring Hook
 * Provides real-time security monitoring and alerting
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SecurityService } from '@/services/SecurityService';

interface SecurityAlert {
  id: string;
  action: string;
  success: boolean;
  error_message?: string;
  created_at: string;
  user_id?: string;
  ip_address?: string | null;
  resource?: string;
  user_agent?: string;
}

interface SecurityStats {
  totalEvents: number;
  failedEvents: number;
  successfulEvents: number;
  criticalAlerts: number;
  topFailedActions: Array<{ action: string; count: number }>;
  hourlyDistribution: Array<{ hour: number; count: number }>;
}

export function useSecurityMonitoring() {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetches recent security alerts
   */
  const fetchAlerts = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts((data || []).map(item => ({
        ...item,
        ip_address: item.ip_address as string | null
      })));
    } catch (err) {
      console.error('Failed to fetch security alerts:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    }
  }, []);

  /**
   * Fetches security statistics
   */
  const fetchStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs')
        .select('action, success, created_at')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

      if (error) throw error;

      const logs = data || [];
      
      // Calculate statistics
      const totalEvents = logs.length;
      const failedEvents = logs.filter(log => !log.success).length;
      const successfulEvents = totalEvents - failedEvents;
      
      // Count critical alerts (failed admin access, privilege escalation, etc.)
      const criticalActions = [
        'ADMIN_ACCESS_DENIED',
        'PRIVILEGE_ESCALATION_ATTEMPT',
        'SUSPICIOUS_IP_PATTERN_DETECTED',
        'RAPID_PRIVILEGE_ESCALATION_DETECTED'
      ];
      const criticalAlerts = logs.filter(log => 
        !log.success && criticalActions.some(action => log.action.includes(action))
      ).length;

      // Top failed actions
      const failedActionCounts = new Map<string, number>();
      logs.filter(log => !log.success).forEach(log => {
        failedActionCounts.set(log.action, (failedActionCounts.get(log.action) || 0) + 1);
      });
      const topFailedActions = Array.from(failedActionCounts.entries())
        .map(([action, count]) => ({ action, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Hourly distribution
      const hourlyCounts = new Map<number, number>();
      logs.forEach(log => {
        const hour = new Date(log.created_at).getHours();
        hourlyCounts.set(hour, (hourlyCounts.get(hour) || 0) + 1);
      });
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourlyCounts.get(hour) || 0
      }));

      setStats({
        totalEvents,
        failedEvents,
        successfulEvents,
        criticalAlerts,
        topFailedActions,
        hourlyDistribution
      });
    } catch (err) {
      console.error('Failed to fetch security stats:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  }, []);

  /**
   * Loads all security data
   */
  const loadSecurityData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await Promise.all([fetchAlerts(), fetchStats()]);
    } catch (err) {
      console.error('Failed to load security data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchAlerts, fetchStats]);

  /**
   * Logs a security event
   */
  const logSecurityEvent = useCallback(async (
    action: string,
    resource?: string,
    success: boolean = true,
    errorMessage?: string
  ) => {
    try {
      await SecurityService.logSecurityEvent(action, resource, success, errorMessage);
      // Refresh alerts if this was a failed event
      if (!success) {
        await fetchAlerts();
      }
    } catch (err) {
      console.error('Failed to log security event:', err);
    }
  }, [fetchAlerts]);

  /**
   * Applies data retention policies
   */
  const applyDataRetention = useCallback(async () => {
    try {
      const { data, error } = await supabase.rpc('apply_data_retention_policies');
      
      if (error) throw error;
      
      console.log('Data retention applied:', data);
      await loadSecurityData(); // Refresh data after cleanup
      
      return data;
    } catch (err) {
      console.error('Failed to apply data retention:', err);
      throw err;
    }
  }, [loadSecurityData]);

  /**
   * Sets up real-time monitoring
   */
  useEffect(() => {
    loadSecurityData();

    // Subscribe to real-time security alerts
    const subscription = supabase
      .channel('security_monitoring')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'security_audit_logs',
          filter: 'success=eq.false'
        },
        (payload) => {
          console.log('🚨 New security alert:', payload.new);
          setAlerts(prev => [payload.new as SecurityAlert, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSecurityData]);

  return {
    alerts,
    stats,
    isLoading,
    error,
    logSecurityEvent,
    applyDataRetention,
    refreshData: loadSecurityData
  };
}