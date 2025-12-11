/**
 * Immutable Audit Log Service
 * 
 * PHASE 2 SECURITY ENHANCEMENT
 * Provides tamper-proof audit logging with blockchain-style integrity
 * 
 * Features:
 * - Hash chain linking all log entries
 * - Append-only (no updates/deletes except by service role)
 * - Integrity verification
 * - Automatic hash calculation on insert
 */

import { supabase } from '@/integrations/supabase/client';

export interface ImmutableAuditLog {
  id: string;
  created_at: string;
  user_id?: string;
  action: string;
  resource?: string;
  success: boolean;
  error_message?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  previous_hash?: string;
  current_hash?: string;
}

export interface IntegrityCheckResult {
  total_logs: number;
  mismatches: number;
  integrity_valid: boolean;
  checked_at: string;
}

/**
 * Service for managing immutable audit logs
 */
export class ImmutableAuditService {
  private static instance: ImmutableAuditService;

  public static getInstance(): ImmutableAuditService {
    if (!ImmutableAuditService.instance) {
      ImmutableAuditService.instance = new ImmutableAuditService();
    }
    return ImmutableAuditService.instance;
  }

  /**
   * Log a security event to immutable audit log
   * Cannot be modified once created
   */
  async logEvent(params: {
    action: string;
    resource?: string;
    success?: boolean;
    error_message?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const { error } = await supabase
        .from('security_audit_logs_immutable')
        .insert({
          action: params.action,
          resource: params.resource,
          success: params.success ?? true,
          error_message: params.error_message,
          metadata: params.metadata || {},
          // Hash is calculated automatically by trigger
        });

      if (error) {
        console.error('Failed to log event:', error);
        // Don't throw - logging should not break application flow
      }
    } catch (error) {
      console.error('Failed to log immutable event:', error);
      // Don't throw
    }
  }

  /**
   * Get audit logs for a specific user
   * Admins only
   */
  async getUserAuditLogs(userId: string, limit: number = 100): Promise<ImmutableAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs_immutable')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ImmutableAuditLog[];
    } catch (error) {
      console.error('Failed to get user audit logs:', error);
      throw new Error(`Fehler beim Laden der Audit-Logs: ${error.message}`);
    }
  }

  /**
   * Get all audit logs
   * Admins only
   */
  async getAllAuditLogs(limit: number = 100): Promise<ImmutableAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs_immutable')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ImmutableAuditLog[];
    } catch (error) {
      console.error('Failed to get all audit logs:', error);
      throw new Error(`Fehler beim Laden der Audit-Logs: ${error.message}`);
    }
  }

  /**
   * Search audit logs by action
   */
  async searchByAction(action: string, limit: number = 100): Promise<ImmutableAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs_immutable')
        .select('*')
        .ilike('action', `%${action}%`)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as ImmutableAuditLog[];
    } catch (error) {
      console.error('Failed to search audit logs:', error);
      throw new Error(`Fehler beim Suchen der Audit-Logs: ${error.message}`);
    }
  }

  /**
   * Get failed security events
   */
  async getFailedEvents(limit: number = 100): Promise<ImmutableAuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('security_audit_logs_immutable')
        .select('*')
        .eq('success', false)
        .order('created_at', { ascending: false})
        .limit(limit);

      if (error) throw error;

      return (data || []) as ImmutableAuditLog[];
    } catch (error) {
      console.error('Failed to get failed events:', error);
      throw new Error(`Fehler beim Laden fehlgeschlagener Events: ${error.message}`);
    }
  }

  /**
   * Verify audit log integrity
   * Checks that the hash chain is valid
   * Admins only
   */
  async verifyIntegrity(): Promise<IntegrityCheckResult> {
    try {
      console.log('🔍 Verifying audit log integrity...');

      const { data, error } = await supabase.rpc('verify_audit_log_integrity');

      if (error) throw error;

      console.log('✅ Integrity check complete:', data);

      return data as unknown as IntegrityCheckResult;
    } catch (error) {
      console.error('Failed to verify integrity:', error);
      throw new Error(`Fehler bei der Integritätsprüfung: ${error.message}`);
    }
  }

  /**
   * Get audit log statistics
   */
  async getStatistics(daysBack: number = 7): Promise<{
    total: number;
    failed: number;
    success_rate: number;
    by_action: Record<string, number>;
  }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      const { data: logs, error } = await supabase
        .from('security_audit_logs_immutable')
        .select('action, success')
        .gte('created_at', cutoffDate.toISOString());

      if (error) throw error;

      const total = logs?.length || 0;
      const failed = logs?.filter(l => !l.success).length || 0;
      const success_rate = total > 0 ? ((total - failed) / total) * 100 : 100;

      const by_action: Record<string, number> = {};
      logs?.forEach(log => {
        by_action[log.action] = (by_action[log.action] || 0) + 1;
      });

      return {
        total,
        failed,
        success_rate: Math.round(success_rate * 100) / 100,
        by_action
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      throw new Error(`Fehler beim Laden der Statistiken: ${error.message}`);
    }
  }

  /**
   * Log admin action with enhanced metadata
   */
  async logAdminAction(params: {
    action: string;
    target_resource: string;
    justification?: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void> {
    await this.logEvent({
      action: `ADMIN_${params.action}`,
      resource: params.target_resource,
      success: params.success,
      metadata: {
        ...params.metadata,
        justification: params.justification,
        timestamp: new Date().toISOString()
      }
    });
  }
}

export default ImmutableAuditService;
