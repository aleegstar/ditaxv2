
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { SecurityService } from '@/services/SecurityService';

interface AdminValidationState {
  isAdmin: boolean | null;
  isLoading: boolean;
  error: string | null;
}

export function useAdminValidation() {
  const { userId, isValid } = useAuthValidation();
  const [adminState, setAdminState] = useState<AdminValidationState>({
    isAdmin: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    let mounted = true;

    const checkAdminStatus = async () => {
      if (!isValid || !userId) {
        if (mounted) {
          setAdminState({
            isAdmin: false,
            isLoading: false,
            error: null
          });
        }
        return;
      }

      try {
        console.log('🔐 Enhanced useAdminValidation: Checking admin status for user:', userId);

        // Use enhanced server-side verification
        const isAdmin = await SecurityService.verifyAdminAccess('admin_validation_hook');

        if (!mounted) return;

        console.log('✅ Enhanced useAdminValidation: Admin status result:', isAdmin);
        setAdminState({
          isAdmin,
          isLoading: false,
          error: null
        });

        // Log the validation attempt
        await SecurityService.logSecurityEvent(
          'ADMIN_VALIDATION_HOOK',
          'admin_status_check',
          true,
          `Admin status: ${isAdmin}`
        );

      } catch (error: any) {
        console.error('❌ Enhanced useAdminValidation: Critical error:', error);
        if (mounted) {
          setAdminState({
            isAdmin: false,
            isLoading: false,
            error: error.message || 'Unknown error occurred'
          });
        }
        
        // Log the error
        await SecurityService.logSecurityEvent(
          'ADMIN_VALIDATION_HOOK_ERROR',
          'admin_status_check',
          false,
          error.message || 'Unknown error in admin validation hook'
        );
      }
    };

    // Reset state when dependencies change
    setAdminState(prev => ({ ...prev, isLoading: true, error: null }));
    checkAdminStatus();

    return () => {
      mounted = false;
    };
  }, [userId, isValid]);

  return adminState;
}
