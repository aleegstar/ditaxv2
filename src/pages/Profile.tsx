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
      <div className="min-h-screen bg-[#020408] p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#1D64FF] mx-auto"></div>
          <p className="mt-4 text-zinc-400">Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-200 flex flex-col overflow-hidden">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none -z-10" style={{
        background: 'radial-gradient(circle at 50% 60%, rgba(29, 100, 255, 0.08) 0%, rgba(29, 100, 255, 0.02) 40%, transparent 60%)',
        filter: 'blur(80px)'
      }} />

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
          <section className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Camera className="w-5 h-5 text-zinc-400" />
                Profilbild
              </h2>
              <p className="text-sm text-zinc-400">Laden Sie Ihr Profilbild hoch oder ändern Sie es.</p>
            </div>
            
            <div className="flex items-center">
              <div className="relative group cursor-pointer">
                <div className="w-28 h-28 rounded-full bg-zinc-800 border-2 border-white/5 overflow-hidden relative shadow-2xl">
                  <Avatar className="w-full h-full">
                    <AvatarImage 
                      src={profile?.avatar_url || undefined} 
                      alt="Profilbild"
                      className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300"
                    />
                    <AvatarFallback className="w-full h-full bg-zinc-800 text-zinc-400 text-3xl">
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
                      className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#1D64FF] text-white flex items-center justify-center border-[3px] border-[#020408] hover:bg-blue-500 hover:scale-105 transition-all shadow-lg z-10"
                    >
                      <Upload className="w-4 h-4" />
                    </button>
                  )}
                />
              </div>
            </div>
          </section>

          <div className="h-px bg-white/[0.04] w-full" />

          {/* Section: Profil-Informationen */}
          <section className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <User className="w-5 h-5 text-zinc-400" />
                Profil-Informationen
              </h2>
              <p className="text-sm text-zinc-400">Ihre persönlichen Daten und Kontoinformationen.</p>
            </div>

            <div className="bg-white/[0.02] backdrop-blur-[12px] border border-white/[0.05] hover:bg-white/[0.04] hover:border-white/[0.08] p-5 rounded-2xl flex items-center gap-5 transition-colors group">
              <div className="w-14 h-14 rounded-full bg-zinc-800 border border-white/10 overflow-hidden shrink-0">
                <Avatar className="w-full h-full">
                  <AvatarImage 
                    src={profile?.avatar_url || undefined} 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <AvatarFallback className="w-full h-full bg-zinc-800 text-zinc-400">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-[15px] font-medium text-zinc-100 flex items-center gap-2">
                  {profile?.first_name || profile?.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Name nicht verfügbar'
                  }
                </span>
                <span className="text-sm text-zinc-500 flex items-center gap-1.5 font-normal">
                  <Mail className="w-3.5 h-3.5" />
                  {profile?.email || 'E-Mail nicht verfügbar'}
                </span>
              </div>
              <button className="ml-auto text-xs font-medium text-zinc-500 hover:text-zinc-300 border border-white/5 hover:border-white/10 bg-white/[0.02] hover:bg-white/[0.05] px-3 py-1.5 rounded-lg transition-all">
                Bearbeiten
              </button>
            </div>
          </section>

          <div className="h-px bg-white/[0.04] w-full" />

          {/* MFA Section */}
          <MfaSettings />

          <div className="h-px bg-white/[0.04] w-full" />

          {/* Passkey Section */}
          <PasskeyManager />

          <div className="h-px bg-white/[0.04] w-full" />

          {/* Login History Section */}
          <LoginHistory />

          {/* Logout Button */}
          <div className="pt-4">
            <button 
              onClick={handleSignOut}
              className="w-full h-12 rounded-xl bg-red-500/[0.08] border border-red-500/20 text-red-400 hover:bg-red-500/15 hover:text-red-300 hover:border-red-500/30 transition-all duration-200 font-medium text-[15px] flex items-center justify-center gap-2 group shadow-sm"
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
