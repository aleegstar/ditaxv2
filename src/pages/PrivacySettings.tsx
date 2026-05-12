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
      <div className="min-h-screen bg-transparent flex items-center justify-center">
        <p className="text-muted-foreground">{t.privacySettingsPage.pleaseLogin}</p>
      </div>
    );
  }

  return (
    <div className="antialiased min-h-screen flex flex-col text-foreground bg-transparent">
      {/* Header / Navigation */}
      <SubpageHeader
        title={t.privacySettingsPage.title}
        onBack={() => navigate(-1)}
      />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-3xl mx-auto px-4 py-12 space-y-6">
        {/* Card 1: Privacy Preferences */}
        <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-6">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary">
                <Shield className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-[17px] tracking-tight text-foreground font-semibold">
                {t.privacySettingsPage.privacyPreferences}
              </h2>
            </div>

            <div className="flex items-start justify-between py-1">
              <div className="pr-6">
                <p className="text-[15px] font-medium text-foreground">
                  {t.privacySettingsPage.marketingEmails}
                </p>
                <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
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

            <div className="pt-6">
              <button
                onClick={savePreferences}
                className="w-full inline-flex items-center justify-center rounded-2xl px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] hover:brightness-110 active:scale-[0.97] transition-all"
              >
                {t.privacySettingsPage.saveSettings}
              </button>
            </div>
          </div>
        </section>

        {/* Card 2: Data Portability */}
        <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-border/60 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-primary/10 text-primary">
                <Download className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-[17px] tracking-tight text-foreground font-semibold">
                {t.privacySettingsPage.dataPortability}
              </h2>
            </div>

            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              {t.privacySettingsPage.dataPortabilityDescription}
            </p>

            <button
              onClick={downloadUserData}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-foreground bg-muted/50 border border-border/60 hover:bg-muted active:scale-[0.97] transition-all"
            >
              <Download className="w-4 h-4" strokeWidth={1.75} />
              {t.privacySettingsPage.downloadMyData}
            </button>
          </div>
        </section>

        {/* Card 3: Delete Account (Danger Zone) */}
        <section className="rounded-3xl bg-card/60 backdrop-blur-xl border border-destructive/20 shadow-sm overflow-hidden">
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3.5 mb-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-destructive/10 text-destructive">
                <Trash2 className="w-5 h-5" strokeWidth={1.75} />
              </div>
              <h2 className="text-[17px] tracking-tight text-destructive font-semibold">
                {t.privacySettingsPage.deleteAccount}
              </h2>
            </div>

            <p className="text-[13px] text-muted-foreground mb-6 leading-relaxed">
              {t.privacySettingsPage.deleteAccountDescription}
            </p>

            <button
              onClick={handleStartDeletion}
              className="w-full inline-flex items-center justify-center gap-2 rounded-2xl px-6 py-3.5 text-sm font-semibold text-white bg-gradient-to-b from-destructive to-[hsl(var(--destructive)/0.85)] hover:brightness-110 active:scale-[0.97] transition-all"
            >
              <Trash2 className="w-4 h-4" strokeWidth={1.75} />
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
            <AlertDialogCancel
              onClick={() => setShowFeedbackDialog(false)}
              className="rounded-2xl shadow-none bg-muted/50 from-transparent to-transparent border border-border/60"
            >
              {t.privacySettingsPage.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleFeedbackNext}
              className="rounded-2xl shadow-none hover:shadow-none"
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
              className="rounded-2xl shadow-none bg-muted/50 from-transparent to-transparent border border-border/60"
            >
              {t.privacySettingsPage.cancel}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAllUserData}
              disabled={deleteConfirm !== t.privacySettingsPage.deleteConfirmWord || isDeleting}
              variant="destructive"
              className="rounded-2xl shadow-none hover:shadow-none"
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
