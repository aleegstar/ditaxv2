import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/hooks/use-toast';
import { Download, Trash2, Shield, AlertTriangle } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useNavigate } from 'react-router-dom';
import { Json } from '@/integrations/supabase/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/contexts/I18nContext';

interface PrivacyPreferences {
  marketing_emails: boolean;
}

const PrivacySettings = () => {
  const { userId, isValid } = useAuthValidation();
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const DELETION_REASONS = [
    { value: 'not_using', label: t.privacySettingsPage.deletionReasons.notUsing },
    { value: 'too_expensive', label: t.privacySettingsPage.deletionReasons.tooExpensive },
    { value: 'privacy_concerns', label: t.privacySettingsPage.deletionReasons.privacyConcerns },
    { value: 'bad_experience', label: t.privacySettingsPage.deletionReasons.badExperience },
    { value: 'found_alternative', label: t.privacySettingsPage.deletionReasons.foundAlternative },
    { value: 'other', label: t.privacySettingsPage.deletionReasons.other },
  ];
  
  const [preferences, setPreferences] = useState<PrivacyPreferences>({
    marketing_emails: false
  });
  const [loading, setLoading] = useState(true);
  
  // Deletion dialog states
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [additionalFeedback, setAdditionalFeedback] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
        title: t.privacySettingsPage.settingsSaved,
        description: t.privacySettingsPage.settingsSavedDescription
      });
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast({
        title: t.privacySettingsPage.saveError,
        description: t.privacySettingsPage.saveErrorDescription,
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
        title: t.privacySettingsPage.dataDownloaded,
        description: t.privacySettingsPage.dataDownloadedDescription
      });
    } catch (error) {
      console.error('Error downloading user data:', error);
      toast({
        title: t.privacySettingsPage.downloadError,
        description: t.privacySettingsPage.downloadErrorDescription,
        variant: "destructive"
      });
    }
  };

  const handleStartDeletion = () => {
    setSelectedReason('');
    setAdditionalFeedback('');
    setDeleteConfirm('');
    setShowFeedbackDialog(true);
  };

  const handleFeedbackNext = () => {
    if (!selectedReason) {
      toast({
        title: t.privacySettingsPage.reasonRequired,
        description: t.privacySettingsPage.reasonRequiredDescription,
        variant: "destructive"
      });
      return;
    }
    setShowFeedbackDialog(false);
    setShowConfirmDialog(true);
  };

  const deleteAllUserData = async () => {
    if (deleteConfirm !== t.privacySettingsPage.deleteConfirmWord) {
      toast({
        title: t.privacySettingsPage.confirmRequired,
        description: t.privacySettingsPage.confirmRequiredDescription,
        variant: "destructive"
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error(t.privacySettingsPage.noActiveSession);
      }

      // Get the reason label for storage
      const reasonLabel = DELETION_REASONS.find(r => r.value === selectedReason)?.label || selectedReason;

      const { data, error } = await supabase.functions.invoke('delete-user-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        },
        body: {
          reason: reasonLabel,
          additional_feedback: additionalFeedback || null
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        await supabase.auth.signOut();
        
        toast({
          title: t.privacySettingsPage.dataDeleted,
          description: t.privacySettingsPage.dataDeletedDescription,
        });
        
        setTimeout(() => navigate('/auth'), 1000);
        return;
      }

      if (data?.partial) {
        toast({
          title: t.privacySettingsPage.dataDeleted,
          description: t.privacySettingsPage.dataDeletedDescription,
        });
      } else {
        toast({
          title: t.privacySettingsPage.accountDeleted,
          description: t.privacySettingsPage.accountDeletedDescription,
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
        title: t.privacySettingsPage.dataDeleted,
        description: t.privacySettingsPage.dataDeletedDescription,
      });
      
      setTimeout(() => navigate('/auth'), 1000);
    } finally {
      setIsDeleting(false);
      setShowConfirmDialog(false);
    }
  };

  if (!isValid) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-muted-foreground">{t.privacySettingsPage.pleaseLogin}</p>
      </div>
    );
  }

  return (
    <div className="antialiased min-h-screen flex flex-col text-foreground bg-white">
      {/* Header / Navigation */}
      <SubpageHeader
        title={t.privacySettingsPage.title}
        onBack={() => navigate(-1)}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12 space-y-8">
        {/* Card 1: Privacy Preferences */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden">
          <div className="p-8 pb-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-600 ring-1 ring-blue-100/50 shadow-sm">
                <Shield className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-xl tracking-tight text-foreground font-semibold">
                  {t.privacySettingsPage.privacyPreferences}
                </h2>
              </div>
            </div>

            <div className="flex items-start justify-between py-2">
              <div className="pr-8">
                <p className="text-base font-medium text-foreground">
                  {t.privacySettingsPage.marketingEmails}
                </p>
                <p className="text-base text-muted-foreground mt-1">
                  {t.privacySettingsPage.marketingEmailsDescription}
                </p>
              </div>

              <Switch 
                checked={preferences.marketing_emails} 
                onCheckedChange={(checked) => setPreferences(prev => ({
                  ...prev,
                  marketing_emails: checked
                }))} 
                className="mt-1"
              />
            </div>
          </div>

          <div className="px-8 pb-8 pt-2">
            <button 
              onClick={savePreferences}
              className="w-full flex justify-center items-center py-3 px-4 rounded-xl shadow-lg shadow-primary/20 text-base font-semibold text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 hover:-translate-y-0.5"
            >
              {t.privacySettingsPage.saveSettings}
            </button>
          </div>
        </section>

        {/* Card 2: Data Portability */}
        <section className="bg-white rounded-2xl border border-border shadow-xl shadow-muted/40 overflow-hidden">
          <div className="p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-50 to-purple-50 text-violet-600 ring-1 ring-violet-100/50 shadow-sm">
                <Download className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl tracking-tight text-foreground font-semibold">
                {t.privacySettingsPage.dataPortability}
              </h2>
            </div>

            <p className="text-base text-muted-foreground mb-8 max-w-xl">
              {t.privacySettingsPage.dataPortabilityDescription}
            </p>

            <button 
              onClick={downloadUserData}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 bg-white border border-border rounded-xl shadow-sm text-base font-medium text-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-muted transition-all duration-200 hover:shadow-md hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4" strokeWidth={1.5} />
              {t.privacySettingsPage.downloadMyData}
            </button>
          </div>
        </section>

        {/* Card 3: Delete Account (Danger Zone) */}
        <section className="bg-white rounded-2xl border border-red-100 shadow-xl shadow-red-100/40 overflow-hidden relative">
          {/* Subtle red accent background */}
          <div className="absolute inset-0 bg-red-50/30 pointer-events-none" />

          <div className="relative p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-red-50 to-orange-50 text-red-600 ring-1 ring-red-100/50 shadow-sm">
                <Trash2 className="w-5 h-5" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl tracking-tight text-red-700 font-semibold">
                {t.privacySettingsPage.deleteAccount}
              </h2>
            </div>

            <p className="text-base text-muted-foreground mb-8 max-w-xl">
              {t.privacySettingsPage.deleteAccountDescription}
            </p>

            <button 
              onClick={handleStartDeletion}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-red-600/20 text-base font-semibold text-white bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-all duration-200 hover:-translate-y-0.5"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              {t.privacySettingsPage.deleteAccountButton}
            </button>
          </div>
        </section>
      </main>

      {/* Feedback Dialog - Step 1 */}
      <AlertDialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {t.privacySettingsPage.whyLeaving}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t.privacySettingsPage.feedbackHelps}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-4">
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {DELETION_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-3">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="cursor-pointer text-slate-700">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="additional-feedback" className="text-foreground">
                {t.privacySettingsPage.additionalFeedback}
              </Label>
              <Textarea
                id="additional-feedback"
                placeholder={t.privacySettingsPage.additionalFeedbackPlaceholder}
                value={additionalFeedback}
                onChange={(e) => setAdditionalFeedback(e.target.value)}
                className="resize-none bg-muted border-border"
                rows={3}
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowFeedbackDialog(false)}>
              {t.privacySettingsPage.cancel}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleFeedbackNext}
              className="bg-red-500 hover:bg-red-600 text-white font-medium"
            >
              {t.privacySettingsPage.next}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation Dialog - Step 2 */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              {t.privacySettingsPage.finalConfirmation}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              <span className="font-semibold text-red-600">{t.privacySettingsPage.warningLabel}</span> Diese Aktion löscht unwiderruflich:
              <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                <li>{t.privacySettingsPage.deleteWarningList.profile}</li>
                <li>{t.privacySettingsPage.deleteWarningList.taxReturns}</li>
                <li>{t.privacySettingsPage.deleteWarningList.documents}</li>
                <li>{t.privacySettingsPage.deleteWarningList.chatMessages}</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="py-4 space-y-2">
            <Label htmlFor="confirm-delete" className="text-foreground">
              {t.privacySettingsPage.typeToConfirm.replace('{word}', '')} <span className="font-bold text-red-600">{t.privacySettingsPage.deleteConfirmWord}</span>
            </Label>
            <input 
              id="confirm-delete"
              type="text" 
              placeholder={t.privacySettingsPage.deleteConfirmWord}
              value={deleteConfirm} 
              onChange={(e) => setDeleteConfirm(e.target.value)} 
              className="w-full p-3 bg-muted border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent" 
            />
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setShowConfirmDialog(false);
                setDeleteConfirm('');
              }}
            >
              {t.privacySettingsPage.cancel}
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteAllUserData}
              disabled={deleteConfirm !== t.privacySettingsPage.deleteConfirmWord || isDeleting}
              className="bg-red-500 hover:bg-red-600 text-white font-medium disabled:opacity-50"
            >
              {isDeleting ? t.privacySettingsPage.deleting : t.privacySettingsPage.deleteAccountButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PrivacySettings;
