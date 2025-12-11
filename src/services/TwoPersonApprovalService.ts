/**
 * Two-Person Approval Service
 * 
 * PHASE 2 SECURITY ENHANCEMENT
 * Implements 2-person rule for critical admin actions
 * 
 * Workflow:
 * 1. Admin A requests sensitive action with justification
 * 2. Admin B must approve (cannot be same person)
 * 3. Action is executed after approval
 * 4. All steps are logged in immutable audit logs
 */

import { supabase } from '@/integrations/supabase/client';

export interface AdminActionRequest {
  id: string;
  created_at: string;
  requested_by: string;
  action_type: string;
  target_resource: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired';
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
  metadata?: any;
}

export interface RequestActionParams {
  action_type: string;
  target_resource: string;
  justification: string;
  metadata?: Record<string, any>;
}

/**
 * Service for managing two-person approval workflow
 */
export class TwoPersonApprovalService {
  private static instance: TwoPersonApprovalService;

  public static getInstance(): TwoPersonApprovalService {
    if (!TwoPersonApprovalService.instance) {
      TwoPersonApprovalService.instance = new TwoPersonApprovalService();
    }
    return TwoPersonApprovalService.instance;
  }

  /**
   * Request a sensitive admin action
   * Requires justification of at least 10 characters
   */
  async requestAction(params: RequestActionParams): Promise<string> {
    try {
      console.log('🔐 Requesting admin action:', params.action_type);

      // Validate justification
      if (!params.justification || params.justification.length < 10) {
        throw new Error('Begründung muss mindestens 10 Zeichen lang sein');
      }

      // Call DB function
      const { data, error } = await supabase.rpc('request_admin_action', {
        p_action_type: params.action_type,
        p_target_resource: params.target_resource,
        p_justification: params.justification,
        p_metadata: params.metadata || {}
      });

      if (error) {
        console.error('Error requesting action:', error);
        throw error;
      }

      console.log('✅ Action request created:', data);
      return data; // Returns request_id
    } catch (error) {
      console.error('Failed to request action:', error);
      throw new Error(`Fehler beim Erstellen der Anfrage: ${error.message}`);
    }
  }

  /**
   * Approve a pending admin action request
   * Cannot approve own request
   */
  async approveAction(requestId: string): Promise<void> {
    try {
      console.log('✅ Approving request:', requestId);

      const { data, error } = await supabase.rpc('approve_admin_action', {
        p_request_id: requestId
      });

      if (error) {
        console.error('Error approving action:', error);
        throw error;
      }

      console.log('✅ Request approved:', data);
    } catch (error) {
      console.error('Failed to approve action:', error);
      
      // User-friendly error messages
      if (error.message.includes('Cannot approve your own request')) {
        throw new Error('Du kannst deine eigene Anfrage nicht genehmigen');
      } else if (error.message.includes('expired')) {
        throw new Error('Diese Anfrage ist abgelaufen (>24 Stunden alt)');
      } else if (error.message.includes('not pending')) {
        throw new Error('Diese Anfrage ist nicht mehr ausstehend');
      }
      
      throw new Error(`Fehler beim Genehmigen: ${error.message}`);
    }
  }

  /**
   * Reject a pending admin action request
   */
  async rejectAction(requestId: string, reason: string): Promise<void> {
    try {
      console.log('❌ Rejecting request:', requestId);

      if (!reason || reason.length < 5) {
        throw new Error('Ablehnungsgrund muss mindestens 5 Zeichen lang sein');
      }

      const { data, error } = await supabase.rpc('reject_admin_action', {
        p_request_id: requestId,
        p_rejection_reason: reason
      });

      if (error) {
        console.error('Error rejecting action:', error);
        throw error;
      }

      console.log('✅ Request rejected:', data);
    } catch (error) {
      console.error('Failed to reject action:', error);
      throw new Error(`Fehler beim Ablehnen: ${error.message}`);
    }
  }

  /**
   * Get all pending approval requests
   */
  async getPendingRequests(): Promise<AdminActionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('admin_action_requests')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AdminActionRequest[];
    } catch (error) {
      console.error('Failed to get pending requests:', error);
      throw new Error(`Fehler beim Laden der Anfragen: ${error.message}`);
    }
  }

  /**
   * Get approved requests ready for execution
   */
  async getApprovedRequests(): Promise<AdminActionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('admin_action_requests')
        .select('*')
        .eq('status', 'approved')
        .order('approved_at', { ascending: false });

      if (error) throw error;

      return (data || []) as AdminActionRequest[];
    } catch (error) {
      console.error('Failed to get approved requests:', error);
      throw new Error(`Fehler beim Laden genehmigter Anfragen: ${error.message}`);
    }
  }

  /**
   * Get all requests (for admin overview)
   */
  async getAllRequests(limit: number = 50): Promise<AdminActionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('admin_action_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      return (data || []) as AdminActionRequest[];
    } catch (error) {
      console.error('Failed to get all requests:', error);
      throw new Error(`Fehler beim Laden der Anfragen: ${error.message}`);
    }
  }

  /**
   * Mark request as executed
   * Should be called after the action is successfully executed
   */
  async markAsExecuted(requestId: string, result: any): Promise<void> {
    try {
      const { error } = await supabase
        .from('admin_action_requests')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          execution_result: result
        })
        .eq('id', requestId);

      if (error) throw error;

      console.log('✅ Request marked as executed:', requestId);
    } catch (error) {
      console.error('Failed to mark as executed:', error);
      throw new Error(`Fehler beim Aktualisieren: ${error.message}`);
    }
  }

  /**
   * Check if an action requires approval
   * Based on action type
   */
  requiresApproval(actionType: string): boolean {
    const sensitiveActions = [
      'decrypt_documents',
      'delete_user',
      'modify_roles',
      'bulk_data_export',
      'access_kms_keys',
      'disable_security'
    ];

    return sensitiveActions.includes(actionType);
  }

  /**
   * Get human-readable action type
   */
  getActionTypeLabel(actionType: string): string {
    const labels: Record<string, string> = {
      'decrypt_documents': 'Dokumente entschlüsseln',
      'delete_user': 'Benutzer löschen',
      'modify_roles': 'Rollen ändern',
      'bulk_data_export': 'Massendatenexport',
      'access_kms_keys': 'KMS-Schlüssel zugreifen',
      'disable_security': 'Sicherheit deaktivieren'
    };

    return labels[actionType] || actionType;
  }
}

export default TwoPersonApprovalService;
