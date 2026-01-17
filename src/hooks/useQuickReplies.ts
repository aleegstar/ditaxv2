import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface QuickReply {
  id: string;
  trigger: string;
  title: string;
  content: string;
  category: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export function useQuickReplies() {
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchQuickReplies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('chat_quick_replies')
        .select('*')
        .order('trigger', { ascending: true });

      if (fetchError) {
        console.error('Error fetching quick replies:', fetchError);
        setError(fetchError.message);
        return;
      }

      setQuickReplies(data || []);
    } catch (err) {
      console.error('Error in fetchQuickReplies:', err);
      setError('Failed to fetch quick replies');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  const searchQuickReplies = useCallback((query: string): QuickReply[] => {
    if (!query) return quickReplies;
    
    const lowerQuery = query.toLowerCase();
    return quickReplies.filter(
      qr => 
        qr.trigger.toLowerCase().includes(lowerQuery) ||
        qr.title.toLowerCase().includes(lowerQuery)
    );
  }, [quickReplies]);

  const getQuickReplyByTrigger = useCallback((trigger: string): QuickReply | undefined => {
    return quickReplies.find(
      qr => qr.trigger.toLowerCase() === trigger.toLowerCase()
    );
  }, [quickReplies]);

  const createQuickReply = useCallback(async (
    data: Pick<QuickReply, 'trigger' | 'title' | 'content' | 'category'>
  ): Promise<QuickReply | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data: newReply, error } = await supabase
        .from('chat_quick_replies')
        .insert({
          trigger: data.trigger,
          title: data.title,
          content: data.content,
          category: data.category || 'Allgemein',
          created_by: user?.id
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating quick reply:', error);
        throw error;
      }

      await fetchQuickReplies();
      return newReply;
    } catch (err) {
      console.error('Error in createQuickReply:', err);
      throw err;
    }
  }, [fetchQuickReplies]);

  const updateQuickReply = useCallback(async (
    id: string,
    data: Partial<Pick<QuickReply, 'trigger' | 'title' | 'content' | 'category'>>
  ): Promise<QuickReply | null> => {
    try {
      const { data: updatedReply, error } = await supabase
        .from('chat_quick_replies')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating quick reply:', error);
        throw error;
      }

      await fetchQuickReplies();
      return updatedReply;
    } catch (err) {
      console.error('Error in updateQuickReply:', err);
      throw err;
    }
  }, [fetchQuickReplies]);

  const deleteQuickReply = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('chat_quick_replies')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting quick reply:', error);
        throw error;
      }

      await fetchQuickReplies();
      return true;
    } catch (err) {
      console.error('Error in deleteQuickReply:', err);
      throw err;
    }
  }, [fetchQuickReplies]);

  return {
    quickReplies,
    loading,
    error,
    fetchQuickReplies,
    searchQuickReplies,
    getQuickReplyByTrigger,
    createQuickReply,
    updateQuickReply,
    deleteQuickReply
  };
}
