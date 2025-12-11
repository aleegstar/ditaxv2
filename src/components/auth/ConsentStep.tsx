import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { CustomCheckbox } from '@/components/ui/custom-checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ConsentStepProps {
  onConsentComplete: () => void;
  userEmail: string;
}

export const ConsentStep: React.FC<ConsentStepProps> = ({ 
  onConsentComplete, 
  userEmail 
}) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true); // Default opt-in
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true,
    functional: true,
    analytics: true,
    marketing: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleCookiePreferenceChange = (key: string, value: boolean) => {
    setCookiePreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSubmitConsent = async () => {
    if (!termsAccepted) {
      toast({
        title: "Zustimmung erforderlich",
        description: "Du musst den Nutzungsbedingungen zustimmen, um fortzufahren.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      const currentTime = new Date().toISOString();
      const userAgent = navigator.userAgent;

      // Save cookie preferences to localStorage
      localStorage.setItem('cookie-consent', JSON.stringify(cookiePreferences));
      localStorage.setItem('cookie-consent-timestamp', currentTime);

      // Update profile with consent timestamps
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          terms_accepted_at: currentTime,
          terms_version: '1.0',
          marketing_consent_at: marketingConsent ? currentTime : null,
          privacy_preferences: {
            ...user.user_metadata?.privacy_preferences,
            marketing_emails: marketingConsent,
            data_sharing: false,
            analytics_tracking: cookiePreferences.analytics
          }
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Record consent history
      const consentRecords = [
        {
          user_id: user.id,
          consent_type: 'terms',
          consented: true,
          consent_version: '1.0',
          user_agent: userAgent
        },
        {
          user_id: user.id,
          consent_type: 'cookies',
          consented: true,
          consent_version: '1.0',
          user_agent: userAgent
        }
      ];

      if (marketingConsent) {
        consentRecords.push({
          user_id: user.id,
          consent_type: 'marketing_emails',
          consented: true,
          consent_version: '1.0',
          user_agent: userAgent
        });
      }

      const { error: consentError } = await supabase
        .from('user_consents')
        .insert(consentRecords);

      if (consentError) throw consentError;

      // If marketing consent given, trigger automation
      if (marketingConsent) {
        try {
          await supabase.functions.invoke('marketing-automation', {
            body: { 
              email: userEmail,
              action: 'subscribe',
              source: 'registration_consent'
            }
          });
        } catch (automationError) {
          console.warn('Marketing automation failed:', automationError);
          // Don't block user flow if automation fails
        }
      }

      toast({
        title: "Einstellungen gespeichert",
        description: "Ihre Zustimmung wurde erfolgreich gespeichert."
      });

      onConsentComplete();

    } catch (error) {
      console.error('Consent submission error:', error);
      toast({
        title: "Fehler",
        description: "Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="w-full max-w-md mx-auto"
    >
      <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-gray-900">
            Willkommen bei DiTax!
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Bitte bestätigen Sie Ihre Einstellungen, um fortzufahren.
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-4">
            <CustomCheckbox
              checked={termsAccepted}
              onCheckedChange={setTermsAccepted}
              label={
                <span>
                  Ich stimme den{' '}
                  <a 
                    href="/terms" 
                    target="_blank" 
                    className="text-primary hover:underline font-medium"
                  >
                    Nutzungsbedingungen
                  </a>{' '}
                  und der{' '}
                  <a 
                    href="/privacy" 
                    target="_blank" 
                    className="text-primary hover:underline font-medium"
                  >
                    Datenschutzerklärung
                  </a>{' '}
                  zu. <span className="text-red-500">*</span>
                </span>
              }
              className={`transition-all duration-200 ${
                termsAccepted ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
            />

            <CustomCheckbox
              checked={marketingConsent}
              onCheckedChange={setMarketingConsent}
              label={
                <span>
                  Ich möchte E-Mails über Neuigkeiten, Updates und Angebote erhalten.
                  <br />
                  <span className="text-sm text-gray-500">
                    Sie können diese Einstellung jederzeit in Ihrem Profil ändern.
                  </span>
                </span>
              }
              className={`transition-all duration-200 ${
                marketingConsent ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
            />
          </div>

          <Separator className="bg-gray-200" />

          {/* Cookie-Einstellungen */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Cookie-Einstellungen</h3>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-800">Essenzielle Cookies</h4>
                    <p className="text-sm text-gray-600">Für das Funktionieren der Website erforderlich</p>
                  </div>
                  <Switch checked={true} disabled />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-800">Funktionale Cookies</h4>
                    <p className="text-sm text-gray-600">Erweiterte Funktionalitäten</p>
                  </div>
                  <Switch 
                    checked={cookiePreferences.functional}
                    onCheckedChange={(checked) => handleCookiePreferenceChange('functional', checked)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-800">Analyse-Cookies</h4>
                    <p className="text-sm text-gray-600">Website-Nutzung verstehen</p>
                  </div>
                  <Switch 
                    checked={cookiePreferences.analytics}
                    onCheckedChange={(checked) => handleCookiePreferenceChange('analytics', checked)}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-800">Marketing-Cookies</h4>
                    <p className="text-sm text-gray-600">Relevante Werbung anzeigen</p>
                  </div>
                  <Switch 
                    checked={cookiePreferences.marketing}
                    onCheckedChange={(checked) => handleCookiePreferenceChange('marketing', checked)}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Button
              onClick={handleSubmitConsent}
              disabled={!termsAccepted || isSubmitting}
              className="w-full h-12 text-base font-medium"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Wird gespeichert...
                </>
              ) : (
                'Fortfahren'
              )}
            </Button>
          </div>

          <p className="text-xs text-gray-500 text-center">
            <span className="text-red-500">*</span> Pflichtfeld
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};