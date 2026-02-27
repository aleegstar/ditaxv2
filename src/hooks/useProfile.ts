
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  onboarding_tour_completed: boolean | null;
  date_of_birth: string | null;
  terms_accepted_at: string | null;
}

export const useProfile = () => {
  const { isValid, isLoading: authLoading, userId } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef(false);

  const updateFirstName = async (firstName: string) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          first_name: firstName.trim() 
        });

      if (error) {
        throw error;
      }

      setProfile(prev => prev ? { ...prev, first_name: firstName.trim() } : null);
      toast.success('Name erfolgreich aktualisiert');
    } catch (error: any) {
      console.error('Error updating first name:', error);
      toast.error('Fehler beim Aktualisieren des Namens: ' + error.message);
    }
  };

  const fetchProfile = async () => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      setProfile({
        id: userId,
        first_name: profileData?.first_name || null,
        last_name: profileData?.last_name || null,
        email: profileData?.email || null,
        avatar_url: profileData?.avatar_url || null,
        onboarding_tour_completed: profileData?.onboarding_tour_completed || null,
        date_of_birth: profileData?.date_of_birth || null,
        terms_accepted_at: profileData?.terms_accepted_at || null,
      });
    } catch (error: any) {
      console.error('Error in fetchProfile:', error);
      // Don't show toast for auth errors — AuthContext handles redirect
      if (!error.message?.includes('not authenticated') && !error.message?.includes('Auth')) {
        toast.error('Fehler beim Laden des Profils: ' + error.message);
      }
      throw error; // Re-throw so retry logic can catch it
    }
  };

  const updateAvatar = async (avatarUrl: string) => {
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      setProfile(prev => prev ? { ...prev, avatar_url: avatarUrl } : null);
      toast.success('Profilbild erfolgreich aktualisiert');
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast.error('Fehler beim Aktualisieren des Profilbilds: ' + error.message);
    }
  };

  const fetchProfileWithRetry = async () => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 500;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (abortRef.current) return; // Session changed → abort

      try {
        await fetchProfile();
        setLoading(false);
        return; // Success
      } catch (error: any) {
        const isLastAttempt = attempt === MAX_RETRIES;

        if (isLastAttempt) {
          console.warn(`useProfile: All ${MAX_RETRIES} retries exhausted`);
          setLoading(false);
          return;
        }

        console.log(`useProfile: fetchProfile failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  };

  useEffect(() => {
    abortRef.current = false;

    // Only fetch profile once auth is confirmed valid
    if (authLoading) return;
    if (!isValid) {
      setProfile(null);
      setLoading(false);
      return;
    }

    fetchProfileWithRetry();

    // Safety fallback: never stay loading longer than 5s
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);

    return () => {
      abortRef.current = true; // Abort retries if isValid changes
      clearTimeout(timer);
    };
  }, [isValid, authLoading]);

  return {
    profile,
    loading,
    updateAvatar,
    updateFirstName,
    refetch: fetchProfile,
  };
};
