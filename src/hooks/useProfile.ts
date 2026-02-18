
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const updateFirstName = async (firstName: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('User not authenticated');
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        throw profileError;
      }

      setProfile({
        id: user.id,
        first_name: profileData?.first_name || null,
        last_name: profileData?.last_name || null,
        email: user.email || null,
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
    } finally {
      setLoading(false);
    }
  };

  const updateAvatar = async (avatarUrl: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

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

  useEffect(() => {
    fetchProfile();
    const timer = setTimeout(() => {
      setLoading(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  return {
    profile,
    loading,
    updateAvatar,
    updateFirstName,
    refetch: fetchProfile,
  };
};
