import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FeedbackPromptState {
  shouldShow: boolean;
  isLoading: boolean;
}

export const useFeedbackPrompt = (userId?: string) => {
  const [state, setState] = useState<FeedbackPromptState>({
    shouldShow: false,
    isLoading: true,
  });

  const checkFeedbackPrompt = useCallback(async () => {
    if (!userId) {
      setState({ shouldShow: false, isLoading: false });
      return;
    }

    try {
      // Check if feedback prompt was already shown
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        setState({ shouldShow: false, isLoading: false });
        return;
      }

      // If already shown, don't show again (use any to bypass type check until types are regenerated)
      if ((profile as any)?.feedback_prompt_shown_at) {
        setState({ shouldShow: false, isLoading: false });
        return;
      }

      // Check login count from user_sessions
      const { data: session, error: sessionError } = await supabase
        .from('user_sessions')
        .select('login_count')
        .eq('user_id', userId)
        .order('login_time', { ascending: false })
        .limit(1)
        .single();

      if (sessionError) {
        console.error('Error fetching session:', sessionError);
        setState({ shouldShow: false, isLoading: false });
        return;
      }

      // Show prompt if login count is 5 or more
      const shouldShow = session?.login_count >= 5;
      setState({ shouldShow, isLoading: false });
    } catch (error) {
      console.error('Error checking feedback prompt:', error);
      setState({ shouldShow: false, isLoading: false });
    }
  }, [userId]);

  const dismissPrompt = useCallback(async () => {
    if (!userId) return;

    try {
      // Use any to bypass type check until types are regenerated
      const { error } = await supabase
        .from('profiles')
        .update({ feedback_prompt_shown_at: new Date().toISOString() } as any)
        .eq('id', userId);

      if (error) {
        console.error('Error dismissing feedback prompt:', error);
        return;
      }

      setState(prev => ({ ...prev, shouldShow: false }));
    } catch (error) {
      console.error('Error dismissing feedback prompt:', error);
    }
  }, [userId]);

  useEffect(() => {
    checkFeedbackPrompt();
  }, [checkFeedbackPrompt]);

  return {
    shouldShow: state.shouldShow,
    isLoading: state.isLoading,
    dismissPrompt,
  };
};
