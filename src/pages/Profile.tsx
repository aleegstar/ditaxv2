import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Camera, Mail, User, LogOut, Upload, Gift, ChevronRight, Users, Receipt } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PasskeyManager } from '@/components/auth/PasskeyManager';
import { ProfileAvatarUpload } from '@/components/ui/profile-avatar-upload';
import { useProfile } from '@/hooks/useProfile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MfaSettings } from '@/components/auth/MfaSettings';
import { LoginHistory } from '@/components/ui/login-history';
import { useI18n } from '@/contexts/I18nContext';

const Profile = () => {
  const navigate = useNavigate();
  const { profile, loading, updateAvatar } = useProfile();
  const { t } = useI18n();

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast.success(t.profile.signOutSuccess);
      navigate('/auth');
    } catch (error: any) {
      console.error('Sign out error:', error);
      toast.error(t.profile.signOutError + ': ' + error.message);
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
      <div className="min-h-screen bg-transparent p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t.profile.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-800 flex flex-col overflow-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <SubpageHeader 
          title={t.profile.title}
          onBack={() => navigate('/')}
        />
      </motion.div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 pt-2">
        <div className="max-w-3xl mx-auto space-y-10 pb-24">
          
          {/* Section: Profilbild */}
          <section className="space-y-5">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Camera className="w-5 h-5 text-muted-foreground" />
                {t.profile.profilePicture}
              </h2>
              <p className="text-sm text-muted-foreground">{t.profile.profilePictureDescription}</p>
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
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                {t.profile.profileInfo}
              </h2>
              <p className="text-sm text-muted-foreground">{t.profile.profileInfoDescription}</p>
            </div>

            <div className="bg-muted/50 border border-border hover:bg-muted hover:border-border/80 p-4 rounded-xl flex items-center gap-4 transition-colors group">
              <div className="w-12 h-12 rounded-full bg-muted border border-border overflow-hidden shrink-0">
                <Avatar className="w-full h-full">
                  <AvatarImage 
                    src={profile?.avatar_url || undefined} 
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                  <AvatarFallback className="w-full h-full bg-muted text-muted-foreground font-medium">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                <span className="text-sm font-semibold text-foreground">
                  {profile?.first_name || profile?.last_name 
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : t.profile.nameNotAvailable
                  }
                </span>
                <span className="text-sm text-muted-foreground flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  {profile?.email || t.profile.emailNotAvailable}
                </span>
              </div>
              <button className="text-xs font-medium text-foreground hover:text-foreground/80 border border-border hover:border-border/80 bg-background hover:bg-muted px-3 py-1.5 rounded-lg transition-all shrink-0">
                {t.profile.edit}
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

          <div className="h-px bg-slate-200 w-full" />

          {/* Personen Section */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-muted-foreground" />
                {t.profile.managePeople}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.profile.managePeopleDescription}
              </p>
            </div>

            <Link 
              to="/tax-filers"
              className="bg-muted/50 border border-border hover:bg-muted hover:border-border/80 p-4 rounded-xl flex items-center gap-4 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-foreground block">
                  {t.profile.managePeopleCard}
                </span>
                <span className="text-sm text-muted-foreground block">
                  {t.profile.managePeopleCardDescription}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </section>

          <div className="h-px bg-slate-200 w-full" />

          {/* Freunde einladen Section */}
          <section className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Gift className="w-5 h-5 text-muted-foreground" />
                {t.profile.inviteFriends}
              </h2>
              <p className="text-sm text-muted-foreground">
                {t.profile.inviteFriendsDescription}
              </p>
            </div>

            <Link 
              to="/invite-friends"
              className="bg-muted/50 border border-border hover:bg-muted hover:border-border/80 p-4 rounded-xl flex items-center gap-4 transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold text-foreground block">
                  {t.profile.inviteFriendsReward}
                </span>
                <span className="text-sm text-muted-foreground block">
                  {t.profile.shareYourCode}
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </Link>
          </section>

          {/* Invoices Link */}
          <Link 
            to="/invoices"
            className="bg-muted/50 border border-border hover:bg-muted hover:border-border/80 p-4 rounded-xl flex items-center gap-4 transition-colors group"
          >
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <span className="text-sm font-semibold text-foreground block">Rechnungen</span>
              <span className="text-sm text-muted-foreground block">Zahlungsbelege anzeigen & herunterladen</span>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
          </Link>

          {/* Logout Button */}
          <div className="pt-4">
            <button 
              onClick={handleSignOut}
              className="w-full h-12 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/30 transition-all duration-200 font-medium text-[15px] flex items-center justify-center gap-2 group shadow-sm"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
              {t.profile.signOut}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
