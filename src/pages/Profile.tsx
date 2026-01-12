import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Mail, User, LogOut, Upload } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PasskeyManager } from '@/components/auth/PasskeyManager';
import { ProfileAvatarUpload } from '@/components/ui/profile-avatar-upload';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MfaSettings } from '@/components/auth/MfaSettings';
import { LoginHistory } from '@/components/ui/login-history';

const Profile = () => {
  const navigate = useNavigate();
  const { profile, loading, updateAvatar } = useProfile();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success('Erfolgreich abgemeldet');
      navigate('/auth');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error('Fehler beim Abmelden: ' + error.message);
    }
  };

  const handleAvatarUpdate = (avatarUrl: string) => {
    updateAvatar(avatarUrl);
  };

  const getInitials = () => {
    if (profile?.first_name) {
      return profile.first_name.charAt(0).toUpperCase();
    }
    if (profile?.email) {
      return profile.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1D64FF] mx-auto"></div>
          <p className="mt-4 text-slate-500">Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <SubpageHeader 
          title="Profil"
          onBack={() => navigate('/')}
        />
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">
        <div className="max-w-[640px] mx-auto space-y-10 pb-24">
          
          {/* Section: Profilbild */}
          <section className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-gray-600" />
                Profilbild
              </h2>
              <p className="text-sm text-gray-600">Laden Sie Ihr Profilbild hoch oder ändern Sie es.</p>
            </div>
            
            <div className="flex items-center">
              <div className="relative group cursor-pointer">
                <div className="w-24 h-24 rounded-full bg-gray-100 border-2 border-gray-200 overflow-hidden relative shadow-md">
                  <Avatar className="w-full h-full">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      alt="Profilbild"
                      className="w-full h-full object-cover"
                    />
                    <AvatarFallback className="w-full h-full bg-gray-100 text-gray-600 text-2xl font-medium">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <ProfileAvatarUpload
                  currentAvatarUrl={profile?.avatar_url || undefined}
                  onAvatarUpdate={handleAvatarUpdate}
                  loading={loading}
                  renderTrigger={(onClick) => (
                    <button 
                      onClick={onClick}
                      className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-[#1D64FF] text-white flex items-center justify-center border-2 border-white hover:bg-blue-600 hover:scale-105 transition-all shadow-md z-10"
                    >
                      <Upload className="w-3.5 h-3.5" />
                    </button>
                  )}
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-slate-200 w-full" />

          {/* Section: Profil-Informationen */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Profil-Informationen
              </h2>
              <p className="text-sm text-gray-600">Ihre persönlichen Daten und Kontoinformationen.</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 hover:bg-gray-100 hover:border-gray-300 p-4 rounded-xl flex items-center gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-gray-200 border border-gray-300 overflow-hidden shrink-0">
                <Avatar className="w-full h-full">
                  <AvatarImage 
                    src={profile?.avatar_url || undefined} 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <AvatarFallback className="w-full h-full bg-gray-200 text-gray-600 font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-gray-900">
                  {profile?.first_name || profile?.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Name nicht verfügbar'
                  }
                </span>
                <span className="text-sm text-gray-600 flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {profile?.email || 'E-Mail nicht verfügbar'}
                </span>
              </div>
              <button className="text-xs font-medium text-gray-700 hover:text-gray-900 border border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-all shrink-0">
                Bearbeiten
              </button>
            </div>
          </section>

          <div className="h-px bg-slate-200 w-full" />

          {/* MFA Section */}
          <MfaSettings />

          <div className="h-px bg-slate-200 w-full" />

          {/* Passkey Section */}
          <PasskeyManager />

          <div className="h-px bg-slate-200 w-full" />

          {/* Login History Section */}
          <LoginHistory />

          {/* Logout Button */}
          <div className="pt-4">
            <button 
              onClick={handleSignOut}
              className="w-full h-12 rounded-xl bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-all duration-200 font-medium text-[15px] flex items-center justify-center gap-2 group shadow-sm"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              Abmelden
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
