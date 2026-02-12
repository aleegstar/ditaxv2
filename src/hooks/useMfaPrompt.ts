import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MfaPromptState {
  shouldShow: boolean;
  isLoading: boolean;
  loginCount: number;
}

export const useMfaPrompt = (userId?: string) => {
  const [state, setState] = useState<MfaPromptState>({
    shouldShow: false,
    isLoading: true,
    loginCount: 0
  });

  const checkMfaPrompt = async () => {
    if (!userId) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Increment login count
      await supabase.rpc('increment_login_count', { p_user_id: userId });
      
      // Check if we should show MFA prompt
      let shouldShow = false;
      try {
        const { data, error } = await supabase.rpc('should_show_mfa_prompt', {
          p_user_id: userId
        });
        if (!error) {
          shouldShow = !!data;
        } else {
          console.warn('MFA prompt check failed (non-critical):', error.message);
        }
      } catch (rpcErr) {
        console.warn('MFA prompt RPC unavailable:', rpcErr);
      }

      // Get current login count
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('login_count')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(1);

      const loginCount = sessions?.[0]?.login_count || 0;

      setState({
        shouldShow,
        isLoading: false,
        loginCount
      });
    } catch (error) {
      console.error('Error checking MFA prompt:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const markMfaOffered = async () => {
    if (!userId) return;

    try {
      await supabase
        .from('profiles')
        .update({ mfa_setup_offered_at: new Date().toISOString() })
        .eq('id', userId);
    } catch (error) {
      console.error('Error marking MFA offered:', error);
    }
  };

  const dismissMfaPrompt = async (permanently = false) => {
    if (!userId) return;

    try {
      const updates: any = {
        mfa_setup_dismissed_at: new Date().toISOString()
      };

      if (permanently) {
        updates.mfa_setup_reminder_count = 3; // Max reminders to prevent future prompts
      } else {
        // Increment reminder count for "later" option
        const { data: profile } = await supabase
          .from('profiles')
          .select('mfa_setup_reminder_count')
          .eq('id', userId)
          .single();

        updates.mfa_setup_reminder_count = (profile?.mfa_setup_reminder_count || 0) + 1;
      }

      await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);

      setState(prev => ({ ...prev, shouldShow: false }));
    } catch (error) {
      console.error('Error dismissing MFA prompt:', error);
      toast.error('Fehler beim Speichern der Einstellung');
    }
  };

  useEffect(() => {
    checkMfaPrompt();
  }, [userId]);

  return {
    ...state,
    markMfaOffered,
    dismissMfaPrompt,
    recheckPrompt: checkMfaPrompt
  };
};