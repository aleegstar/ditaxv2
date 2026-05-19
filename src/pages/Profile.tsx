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
import profileHero from '@/assets/profile-hero.webp';


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
    <div className="min-h-screen bg-transparent text-foreground flex flex-col overflow-hidden">
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
        <div className="max-w-3xl mx-auto space-y-6 pb-24">

          {/* Card: Profilbild + Info */}
          <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary">
                  <User className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div>
                  <h2 className="text-[17px] tracking-tight text-foreground font-semibold">
                    {t.profile.profileInfo}
                  </h2>
                  <p className="text-[13px] text-muted-foreground leading-snug">{t.profile.profileInfoDescription}</p>
                </div>
              </div>

              <div className="flex items-center gap-5">
                <div className="relative group cursor-pointer">
                  <div className="w-20 h-20 rounded-full bg-muted overflow-hidden relative">
                    <Avatar className="w-full h-full">
                      <AvatarImage
                        src={profile?.avatar_url || undefined}
                        alt="Profilbild"
                        className="w-full h-full object-cover"
                      />
                      <AvatarFallback className="w-full h-full bg-muted text-foreground text-xl font-medium">
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
                        className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-card hover:brightness-110 active:scale-95 transition-all z-10"
                      >
                        <Upload className="w-3 h-3" />
                      </button>
                    )}
                  />
                </div>
                <div className="flex flex-col gap-1 flex-1 min-w-0">
                  <span className="text-[15px] font-semibold text-foreground truncate">
                    {profile?.first_name || profile?.last_name
                      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                      : t.profile.nameNotAvailable
                    }
                  </span>
                  <span className="text-[13px] text-muted-foreground flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    {profile?.email || t.profile.emailNotAvailable}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Card: Sicherheit (MFA + Passkeys + Login History) */}
          <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
            <div className="p-6 sm:p-8 space-y-6">
              <MfaSettings />
              <div className="h-px bg-border/60" />
              <PasskeyManager />
              <div className="h-px bg-border/60" />
              <LoginHistory />
            </div>
          </section>

          {/* Card: Personen */}
          <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
            <Link
              to="/tax-filers"
              className="block p-6 sm:p-8 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Users className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">
                    {t.profile.managePeopleCard}
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    {t.profile.managePeopleCardDescription}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </section>

          {/* Card: Freunde einladen */}
          <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
            <Link
              to="/invite-friends"
              className="block p-6 sm:p-8 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Gift className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">
                    {t.profile.inviteFriendsReward}
                  </p>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    {t.profile.shareYourCode}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </section>

          {/* Card: Rechnungen */}
          <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
            <Link
              to="/invoices"
              className="block p-6 sm:p-8 hover:bg-muted/30 transition-colors group"
            >
              <div className="flex items-center gap-4">
                <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary shrink-0">
                  <Receipt className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-foreground">Rechnungen</p>
                  <p className="text-[13px] text-muted-foreground leading-snug">
                    Zahlungsbelege anzeigen & herunterladen
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
              </div>
            </Link>
          </section>

          {/* Logout Button */}
          <div className="pt-2">
            <button
              onClick={handleSignOut}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-b from-destructive to-[hsl(var(--destructive)/0.85)] hover:brightness-110 active:scale-[0.97] transition-all"
            >
              <LogOut className="w-4 h-4" />
              {t.profile.signOut}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
