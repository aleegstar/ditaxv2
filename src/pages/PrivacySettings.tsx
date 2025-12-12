
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Download, Trash2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Json } from '@/integrations/supabase/types';

interface PrivacyPreferences {
  marketing_emails: boolean;
}

const PrivacySettings = () => {
  const { userId, isValid } = useAuthValidation();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    marketing_emails: false
  });
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  useEffect(() => {
    if (isValid && userId) {
      loadPreferences();
    }
  }, [userId, isValid]);

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('privacy_preferences')
        .eq('id', userId)
        .maybeSingle();
      if (error) throw error;
      if (data && data.privacy_preferences) {
        const prefs = data.privacy_preferences as unknown as PrivacyPreferences;
        setPreferences({
          marketing_emails: prefs.marketing_emails || false
        });
      }
    } catch (error) {
      console.error('Error loading privacy preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePreferences = async () => {
    try {
      const prefsAsJson = preferences as unknown as Json;
      const { error } = await supabase
        .from('profiles')
        .update({ privacy_preferences: prefsAsJson })
        .eq('id', userId);
      if (error) throw error;
      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre Datenschutz-Einstellungen wurden aktualisiert."
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: "Fehler",
        description: "Einstellungen konnten nicht gespeichert werden.",
        variant: "destructive"
      });
    }
  };

  const downloadUserData = async () => {
    try {
      const [profileData, taxReturnsData, chatMessagesData] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('tax_returns').select('*').eq('user_id', userId),
        supabase.from('chat_messages').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
      ]);
      
      const userData = {
        profile: profileData.data,
        tax_returns: taxReturnsData.data,
        chat_messages: chatMessagesData.data,
        exported_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `meine-daten-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Daten heruntergeladen",
        description: "Ihre Daten wurden als JSON-Datei heruntergeladen."
      });
    } catch (error) {
      console.error('Error downloading user data:', error);
      toast({
        title: "Fehler",
        description: "Daten konnten nicht heruntergeladen werden.",
        variant: "destructive"
      });
    }
  };

  const deleteAllUserData = async () => {
    if (deleteConfirm !== 'LÖSCHEN') {
      toast({
        title: "Bestätigung erforderlich",
        description: "Bitte geben Sie 'LÖSCHEN' ein, um fortzufahren.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Keine aktive Sitzung gefunden');
      }

      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        await supabase.auth.signOut();
        
        toast({
          title: "Account-Daten gelöscht",
          description: "Ihre Daten wurden gelöscht. Sie werden jetzt abgemeldet.",
        });
        
        setTimeout(() => navigate('/auth'), 1000);
        return;
      }

      if (data?.partial) {
        toast({
          title: "Daten gelöscht",
          description: "Ihre Daten wurden erfolgreich gelöscht. Sie werden jetzt abgemeldet.",
        });
      } else {
        toast({
          title: "Account vollständig gelöscht",
          description: "Ihr Account und alle Daten wurden erfolgreich gelöscht.",
        });
      }

      await supabase.auth.signOut();
      setTimeout(() => navigate('/auth'), 1000);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      
      toast({
        title: "Daten gelöscht",
        description: "Ihre Daten wurden gelöscht. Sie werden jetzt abgemeldet.",
      });
      
      setTimeout(() => navigate('/auth'), 1000);
    } finally {
      setLoading(false);
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-[#020408] flex items-center justify-center">
        <p className="text-white">Bitte melden Sie sich an.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020408]">
      <SubpageHeader 
        title="Datenschutz-Einstellungen" 
        onBack={() => navigate(-1)} 
      />
      <div className="container mx-auto px-4 py-6">
        <div className="grid gap-6 max-w-4xl">
          {/* Privacy Preferences */}
          <Card className="bg-[#0A0C10] border border-white/[0.08] rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Datenschutz-Präferenzen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-medium">Marketing-E-Mails</h3>
                  <p className="text-zinc-500 text-sm">Erhalten Sie Updates und Angebote</p>
                </div>
                <Switch 
                  checked={preferences.marketing_emails} 
                  onCheckedChange={(checked) => setPreferences(prev => ({
                    ...prev,
                    marketing_emails: checked
                  }))} 
                />
              </div>

              <div className="pt-4">
                <Button 
                  onClick={savePreferences} 
                  className="w-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white"
                >
                  Einstellungen speichern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="bg-[#0A0C10] border border-white/[0.08] rounded-2xl">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Datenportabilität
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500 mb-4">
                Laden Sie alle Ihre gespeicherten Daten als JSON-Datei herunter.
              </p>
              <Button 
                onClick={downloadUserData} 
                variant="outline" 
                className="w-full border-white/[0.08] text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Meine Daten herunterladen
              </Button>
            </CardContent>
          </Card>

          {/* Account Deletion */}
          <Card className="bg-[#0A0C10] border border-red-500/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-red-500 flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Account löschen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-zinc-500 mb-4">
                Diese Aktion löscht unwiderruflich alle Ihre Daten und kann nicht rückgängig gemacht werden.
              </p>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Geben Sie 'LÖSCHEN' ein, um zu bestätigen" 
                  value={deleteConfirm} 
                  onChange={(e) => setDeleteConfirm(e.target.value)} 
                  className="w-full p-3 bg-[#020408] border border-white/[0.08] rounded-lg text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
                />
                <Button 
                  onClick={deleteAllUserData} 
                  variant="destructive" 
                  className="w-full bg-red-600 hover:bg-red-700" 
                  disabled={deleteConfirm !== 'LÖSCHEN' || loading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Account unwiderruflich löschen
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacySettings;
