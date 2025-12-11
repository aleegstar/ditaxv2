import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, User, Shield, Fingerprint, Camera, Mail, UserRound } from 'lucide-react';
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Profil wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white overflow-y-auto">
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

      <div className="max-w-4xl mx-auto px-4 pt-6 pb-24 md:pb-6 space-y-4 md:space-y-6">
        {/* Profile Picture Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Profilbild
            </CardTitle>
            <CardDescription>
              Laden Sie Ihr Profilbild hoch oder ändern Sie es.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileAvatarUpload
              currentAvatarUrl={profile?.avatar_url || undefined}
              onAvatarUpdate={handleAvatarUpdate}
              loading={loading}
            />
          </CardContent>
        </Card>

        {/* Profile Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profil-Informationen
            </CardTitle>
            <CardDescription>
              Ihre persönlichen Daten und Kontoinformationen.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
              <Avatar className="w-20 h-20 sm:w-16 sm:h-16">
                <AvatarImage 
                  src={profile?.avatar_url || undefined} 
                  alt="Profilbild"
                  className="object-cover"
                />
                <AvatarFallback>
                  <UserRound className="h-10 w-10 sm:h-8 sm:w-8" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2 text-center sm:text-left flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <User className="h-4 w-4 text-muted-foreground mx-auto sm:mx-0" />
                  <span className="font-medium text-base sm:text-sm">
                    {profile?.first_name || profile?.last_name 
                      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                      : 'Name nicht verfügbar'
                    }
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground mx-auto sm:mx-0" />
                  <span className="text-sm text-muted-foreground break-all">
                    {profile?.email || 'E-Mail nicht verfügbar'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* MFA Section */}
        <MfaSettings />

        <Separator />

        {/* Passkey Section */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Fingerprint className="h-5 w-5" />
            <h2 className="text-lg md:text-xl font-semibold">Fingerprint & Passkeys</h2>
          </div>
          
          <PasskeyManager />
        </div>

        <Separator />

        {/* Login History Section */}
        <LoginHistory />

        {/* Logout Section - At the very bottom */}
        <Card>
          <CardContent className="pt-6">
            <Button
              variant="destructive"
              onClick={handleSignOut}
              className="w-full"
            >
              Abmelden
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
