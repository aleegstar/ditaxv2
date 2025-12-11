/**
 * Hook for Two-Person Approval Workflow
 * 
 * Simplifies integration of approval system in components
 */

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { TwoPersonApprovalService, RequestActionParams } from '@/services/TwoPersonApprovalService';
import { ImmutableAuditService } from '@/services/ImmutableAuditService';

export function useTwoPersonApproval() {
  const [requesting, setRequesting] = useState(false);
  const [approving, setApproving] = useState(false);
  const { toast } = useToast();
  const approvalService = TwoPersonApprovalService.getInstance();
  const auditService = ImmutableAuditService.getInstance();

  /**
   * Request a sensitive action
   * Returns request ID if successful
   */
  const requestAction = useCallback(async (
    params: RequestActionParams
  ): Promise<string | null> => {
    try {
      setRequesting(true);

      // Check if action requires approval
      if (!approvalService.requiresApproval(params.action_type)) {
        // Action doesn't require approval, can proceed directly
        return null;
      }

      // Create approval request
      const requestId = await approvalService.requestAction(params);

      toast({
        title: 'Genehmigung angefordert',
        description: 'Ein zweiter Administrator muss diese Aktion genehmigen',
      });

      return requestId;
    } catch (error) {
      console.error('Failed to request action:', error);
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      return null;
    } finally {
      setRequesting(false);
    }
  }, [toast]);

  /**
   * Approve a pending request
   */
  const approveAction = useCallback(async (requestId: string): Promise<boolean> => {
    try {
      setApproving(true);
      await approvalService.approveAction(requestId);

      toast({
        title: 'Genehmigt',
        description: 'Die Anfrage wurde erfolgreich genehmigt',
      });

      return true;
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    } finally {
      setApproving(false);
    }
  }, [toast]);

  /**
   * Reject a pending request
   */
  const rejectAction = useCallback(async (
    requestId: string,
    reason: string
  ): Promise<boolean> => {
    try {
      await approvalService.rejectAction(requestId, reason);

      toast({
        title: 'Abgelehnt',
        description: 'Die Anfrage wurde abgelehnt',
      });

      return true;
    } catch (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
      return false;
    }
  }, [toast]);

  /**
   * Mark request as executed after successful action
   */
  const markAsExecuted = useCallback(async (
    requestId: string,
    result: any
  ): Promise<void> => {
    try {
      await approvalService.markAsExecuted(requestId, result);

      // Log to immutable audit
      await auditService.logEvent({
        action: 'ADMIN_ACTION_EXECUTED',
        resource: requestId,
        success: true,
        metadata: { result }
      });
    } catch (error) {
      console.error('Failed to mark as executed:', error);
    }
  }, []);

  /**
   * Wrapper for actions requiring approval
   * 
   * Usage:
   * ```
   * const result = await withApproval(
   *   { action_type: 'decrypt_documents', target_resource: userId, justification: '...' },
   *   async (approved) => {
   *     if (approved) {
   *       // Execute sensitive action
   *       return await performAction();
   *     }
   *     return null;
   *   }
   * );
   * ```
   */
  const withApproval = useCallback(async <T,>(
    params: RequestActionParams,
    action: (requestId: string | null) => Promise<T>
  ): Promise<T | null> => {
    // Request approval
    const requestId = await requestAction(params);

    if (!requestId) {
      // Action doesn't require approval, execute directly
      return await action(null);
    }

    // Action requires approval - user must wait
    toast({
      title: 'Warte auf Genehmigung',
      description: 'Die Aktion wird ausgeführt, sobald ein zweiter Admin sie genehmigt hat'
    });

    return null;
  }, [requestAction, toast]);

  return {
    requesting,
    approving,
    requestAction,
    approveAction,
    rejectAction,
    markAsExecuted,
    withApproval
  };
}
