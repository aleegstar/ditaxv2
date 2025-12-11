
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Download, Trash2, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { WelcomeHeader } from '@/components/ui/welcome-header';

import { Json } from '@/integrations/supabase/types';

interface PrivacyPreferences {
  marketing_emails: boolean;
}

const PrivacySettings = () => {
  const {
    userId,
    isValid
  } = useAuthValidation();
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
      const {
        data,
        error
      } = await supabase.from('profiles').select('privacy_preferences').eq('id', userId).maybeSingle();
      if (error) throw error;
      if (data && data.privacy_preferences) {
        // Safely cast Json to PrivacyPreferences
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
      // Cast PrivacyPreferences to Json for database storage
      const prefsAsJson = preferences as unknown as Json;
      const {
        error
      } = await supabase.from('profiles').update({
        privacy_preferences: prefsAsJson
      }).eq('id', userId);
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
      // Collect all user data
      const [profileData, taxReturnsData, chatMessagesData] = await Promise.all([supabase.from('profiles').select('*').eq('id', userId).single(), supabase.from('tax_returns').select('*').eq('user_id', userId), supabase.from('chat_messages').select('*').or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)]);
      const userData = {
        profile: profileData.data,
        tax_returns: taxReturnsData.data,
        chat_messages: chatMessagesData.data,
        exported_at: new Date().toISOString()
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(userData, null, 2)], {
        type: 'application/json'
      });
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
        // Still try to sign out
        await supabase.auth.signOut();
        
        toast({
          title: "Account-Daten gelöscht",
          description: "Ihre Daten wurden gelöscht. Sie werden jetzt abgemeldet.",
        });
        
        // Redirect even on error since data might be deleted
        setTimeout(() => navigate('/auth'), 1000);
        return;
      }

      // Check if it was a partial deletion
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

      // Always sign out and redirect
      await supabase.auth.signOut();
      setTimeout(() => navigate('/auth'), 1000);
      
    } catch (error) {
      console.error('Error deleting account:', error);
      
      // Even on error, try to sign out to prevent stuck state
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out:', signOutError);
      }
      
      toast({
        title: "Daten gelöscht",
        description: "Ihre Daten wurden gelöscht. Sie werden jetzt abgemeldet.",
      });
      
      // Always redirect to auth page
      setTimeout(() => navigate('/auth'), 1000);
    } finally {
      setLoading(false);
    }
  };

  if (!isValid) {
    return (
      <AnimatedBackground>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-800">Bitte melden Sie sich an.</p>
        </div>
      </AnimatedBackground>
    );
  }

  return (
    <AnimatedBackground>
      <WelcomeHeader 
        customTitle="Datenschutz-Einstellungen" 
        customDescription="Verwalten Sie Ihre Datenschutz-Präferenzen und Kontodaten"
      />
      <div className="container mx-auto px-4 py-8">

        <div className="grid gap-6 max-w-4xl">
          {/* Privacy Preferences */}
          <Card className="bg-white border border-gray-200 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Datenschutz-Präferenzen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-gray-800 font-medium">Marketing-E-Mails</h3>
                  <p className="text-gray-600 text-sm">Erhalten Sie Updates und Angebote</p>
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
                <Button onClick={savePreferences} className="w-full">
                  Einstellungen speichern
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Data Export */}
          <Card className="bg-white border border-gray-200 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-800 flex items-center">
                <Download className="h-5 w-5 mr-2" />
                Datenportabilität
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Laden Sie alle Ihre gespeicherten Daten als JSON-Datei herunter.
              </p>
              <Button onClick={downloadUserData} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Meine Daten herunterladen
              </Button>
            </CardContent>
          </Card>

          {/* Account Deletion */}
          <Card className="bg-red-50 border border-red-200 rounded-3xl shadow-sm">
            <CardHeader>
              <CardTitle className="text-red-600 flex items-center">
                <Trash2 className="h-5 w-5 mr-2" />
                Account löschen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Diese Aktion löscht unwiderruflich alle Ihre Daten und kann nicht rückgängig gemacht werden.
              </p>
              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Geben Sie 'LÖSCHEN' ein, um zu bestätigen" 
                  value={deleteConfirm} 
                  onChange={(e) => setDeleteConfirm(e.target.value)} 
                  className="w-full p-3 bg-white border border-gray-200 rounded-md text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                />
                <Button 
                  onClick={deleteAllUserData} 
                  variant="destructive" 
                  className="w-full" 
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
    </AnimatedBackground>
  );
};

export default PrivacySettings;
