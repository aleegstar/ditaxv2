import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Users, Ticket, CheckCircle, Loader2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Link } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';
import welcomeIllustration from '@/assets/welcome-illustration.webp';
import welcomeHero from '@/assets/welcome-hero.webp';
import { Sparkles } from 'lucide-react';

const TAX_YEARS = Array.from({
  length: 3
}, (_, i) => {
  const year = new Date().getFullYear() - 1 + i;
  return year.toString();
});

export const WelcomeFlow = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [taxYear, setTaxYear] = useState(TAX_YEARS[0]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [dataSaved, setDataSaved] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [referralApplied, setReferralApplied] = useState(false);
  const [referralLoading, setReferralLoading] = useState(false);

  // 3 steps: consent, name, family (year is auto-selected)
  const steps = [{
    id: 'consent',
    title: t.onboarding.consentTitle
  }, {
    id: 'name',
    title: t.onboarding.nameTitle
  }, {
    id: 'family',
    title: t.onboarding.familyHintTitle
  }];
  
  const handleNext = async () => {
    if (currentStep === 0 && !termsAccepted) {
      toast.error(t.onboarding.acceptTermsError);
      return;
    }
    if (currentStep === 1 && !firstName.trim()) {
      toast.error(t.onboarding.enterNameError);
      return;
    }
    
    // After step 1 (name), save data and proceed to family step
    if (currentStep === 1) {
      await handleSaveData();
      return;
    }
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const handleSaveData = async () => {
    setIsLoading(true);
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error(t.onboarding.authError);
        navigate('/auth');
        return;
      }

      // Record legally binding consent (immutable audit trail incl. IP, UA, version, hash).
      // Hard stop on failure — onboarding must not proceed without provable consent.
      const { data: consentData, error: consentError } = await supabase.functions.invoke('record-consent', {
        body: {
          accepted_via: 'onboarding_welcome',
          consents: [
            { type: 'privacy', consented: true },
            { type: 'terms', consented: true },
            { type: 'marketing_emails', consented: marketingConsent },
          ],
        },
      });
      if (consentError || (consentData as any)?.error) {
        console.error('Consent recording failed:', consentError || consentData);
        toast.error('Zustimmung konnte nicht gespeichert werden. Bitte versuche es erneut.');
        setIsLoading(false);
        return;
      }

      // Update profile with onboarding data (terms_accepted_at + marketing_consent_at are mirrored by the edge function)
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        first_name: firstName,
        onboarding_tour_completed: false,
        onboarding_tour_completed_at: null
      }).eq('id', user.id);
      if (profileError) throw profileError;

      // Get or create primary tax filer for the user
      let primaryTaxFilerId: string | null = null;
      
      // First check if a primary tax filer already exists
      const { data: existingFilers } = await supabase
        .from('tax_filers')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_primary', true)
        .single();
      
      if (existingFilers?.id) {
        primaryTaxFilerId = existingFilers.id;
      } else {
        // Create primary tax filer using the user's name
        const { data: newFiler, error: filerError } = await supabase
          .from('tax_filers')
          .insert({
            user_id: user.id,
            first_name: firstName,
            last_name: '', // Will be updated later in profile
            is_primary: true
          })
          .select('id')
          .single();
        
        if (filerError) {
          console.error('Error creating primary tax filer:', filerError);
          // Continue without tax_filer_id as fallback
        } else if (newFiler) {
          primaryTaxFilerId = newFiler.id;
        }
      }

      // Create tax return for selected year
      const {
        error: taxReturnError
      } = await supabase.from('tax_returns').insert({
        user_id: user.id,
        tax_filer_id: primaryTaxFilerId,
        tax_year: taxYear,
        status: 'pending',
        payment_status: 'pending'
      });
      if (taxReturnError && taxReturnError.code !== '23505') {
        throw taxReturnError;
      }

      // Save first name to form_data (Kontaktangaben) for the primary tax filer
      if (primaryTaxFilerId) {
        const { error: formDataError } = await supabase
          .from('form_data')
          .upsert({
            user_id: user.id,
            tax_filer_id: primaryTaxFilerId,
            tax_year: taxYear,
            form_type: 'contact',
            data: { firstName: firstName.trim() }
          }, {
            onConflict: 'user_id,tax_filer_id,tax_year,form_type'
          });
        
        if (formDataError) {
          console.error('Error saving contact form data:', formDataError);
          // Continue anyway - this is not critical
        }
      }

      // Wait for DB transaction to commit
      await new Promise(resolve => setTimeout(resolve, 300));

      // Mark data as saved and proceed to family hint step
      setDataSaved(true);
      setCurrentStep(2);
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error(t.onboarding.genericError);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyReferral = async () => {
    const code = referralCode.trim();
    if (!code) return;
    
    setReferralLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error: invokeError } = await supabase.functions.invoke('apply-referral-code', {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { referralCode: code },
      });

      if (invokeError || data?.error) {
        toast.error(data?.error || 'Code konnte nicht eingelöst werden');
        return;
      }

      setReferralApplied(true);
      toast.success('Einladungscode eingelöst – CHF 20 Rabatt!');
    } catch (err) {
      console.error('Error applying referral code:', err);
      toast.error('Fehler beim Einlösen des Codes');
    } finally {
      setReferralLoading(false);
    }
  };

  const handleFamilyLater = async () => {
    setShowTransition(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    navigate('/', { replace: true });
  };

  const handleFamilyNow = async () => {
    setShowTransition(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    navigate('/tax-filers', { replace: true });
  };
  
  const canProceed = () => {
    if (currentStep === 0) return termsAccepted;
    if (currentStep === 1) return firstName.trim().length > 0;
    return true;
  };
  
  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <div className="w-full space-y-5">
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-6 w-full space-y-5 border border-white/60">
              <label className="flex items-start gap-4 cursor-pointer group">
                <Checkbox checked={termsAccepted} onCheckedChange={checked => setTermsAccepted(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                <div className="flex-1 text-muted-foreground text-sm leading-relaxed text-left">
                  {t.onboarding.termsAccept}{' '}
                  <Link to="/privacy" target="_blank" className="underline hover:text-primary transition-colors font-medium text-primary">
                    {t.onboarding.privacyPolicy}
                  </Link>
                  {' '}{t.auth.termsText.includes('und') ? 'und' : 'and'}{' '}
                  <Link to="/terms" target="_blank" className="underline hover:text-primary transition-colors font-medium text-primary">
                    {t.onboarding.termsOfService}
                  </Link>
                </div>
              </label>

              <div className="pt-4 border-t border-border/40">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <Checkbox checked={marketingConsent} onCheckedChange={checked => setMarketingConsent(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-border data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                  <div className="flex-1 text-muted-foreground leading-relaxed text-left">
                    <div className="font-medium mb-1 text-sm text-foreground">
                      {t.onboarding.newsletterTitle}
                    </div>
                    <div className="text-muted-foreground text-xs leading-relaxed">
                      {t.onboarding.newsletterDescription}
                    </div>
                  </div>
                </label>
              </div>
            </div>

             <Button 
               onClick={handleNext} 
               disabled={isLoading || !canProceed()} 
               className="w-full shadow-none hover:shadow-none"
             >
               {t.onboarding.next}
            </Button>
          </div>;
      case 1:
         return (
           <div className="w-full space-y-5">
             <Input 
               type="text" 
               placeholder={t.onboarding.firstName} 
               value={firstName} 
               onChange={e => setFirstName(e.target.value)} 
               className="text-sm h-auto py-3 bg-white/50 backdrop-blur-sm border border-border/40 text-foreground placeholder:text-muted-foreground rounded-2xl px-6 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm" 
               onKeyDown={e => e.key === 'Enter' && handleNext()} 
               autoFocus 
             />
              <Button 
                onClick={handleNext} 
                disabled={isLoading || !canProceed()} 
                className="w-full shadow-none hover:shadow-none"
              >
                {t.onboarding.next}
              </Button>
           </div>
         );
      case 2:
         return (
           <div className="w-full space-y-3">
            <Button
              onClick={handleFamilyLater}
              disabled={isLoading}
              className="w-full shadow-none hover:shadow-none"
            >
              {t.onboarding.familyHintLater}
            </Button>

            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="options" className="border-none">
                <AccordionTrigger className="hover:no-underline py-2 flex-col gap-1 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:text-muted-foreground [&>svg]:mx-auto">
                  <span className="text-xs text-muted-foreground font-normal text-center w-full">
                    Optional: Code einlösen oder weitere Personen hinzufügen
                  </span>
                </AccordionTrigger>

                <AccordionContent className="text-left pt-2">
                  <div className="space-y-2">
                    <div className="bg-muted/30 rounded-2xl border border-white/60 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-foreground">Weitere Personen hinzufügen</span>
                      </div>
                      <p className="text-muted-foreground text-sm leading-relaxed pb-2">
                        {t.onboarding.familyHintDescription}
                      </p>
                      <Button
                        onClick={handleFamilyNow}
                        disabled={isLoading}
                        variant="outline"
                        className="w-full mt-2"
                      >
                        {t.onboarding.familyHintNow}
                      </Button>
                    </div>

                    <div className="bg-muted/30 rounded-2xl border border-white/60 p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          {referralApplied ? (
                            <CheckCircle className="w-4 h-4 text-primary" />
                          ) : (
                            <Ticket className="w-4 h-4 text-primary" />
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {referralApplied ? 'Einladungscode aktiviert' : 'Einladungscode einlösen'}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-xs leading-relaxed pb-3">
                        Hast du einen Einladungscode? Erhalte CHF 20 Rabatt.
                      </p>
                      {!referralApplied ? (
                        <div className="flex gap-2">
                          <Input
                            type="text"
                            placeholder="Code eingeben"
                            value={referralCode}
                            onChange={e => setReferralCode(e.target.value.toUpperCase())}
                            onKeyDown={e => e.key === 'Enter' && handleApplyReferral()}
                            className="flex-1 h-11 bg-white/50 backdrop-blur-sm border border-border/40 text-foreground placeholder:text-muted-foreground rounded-xl px-4 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 uppercase tracking-wider font-medium"
                            disabled={referralLoading}
                          />
                          <Button
                            onClick={handleApplyReferral}
                            disabled={!referralCode.trim() || referralLoading}
                            className="h-11 px-5 rounded-xl text-sm shadow-none hover:shadow-none"
                          >
                            {referralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Einlösen'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-primary text-sm font-medium">
                          <CheckCircle className="w-4 h-4" />
                          <span>CHF 20 Rabatt aktiviert!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
           </div>
         );
      default:
        return null;
    }
  };
  
  const getStepTitle = () => {
    if (currentStep === 2) {
      return firstName ? `Grüezi ${firstName}, wir sind bereit!` : 'Wir sind bereit!';
    }
    return steps[currentStep].title;
  };


  return <div className="w-full flex flex-col items-center sm:justify-center sm:min-h-screen py-8 px-4 sm:p-6 antialiased relative">
      {/* Logo above card — mobile only */}
      <motion.div className="mb-8 flex items-center justify-center md:hidden" initial={{
      opacity: 0,
      y: -10
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4
    }}>
        <img alt="ditax" src="/lovable-uploads/e9306e57-1198-4333-abcf-b510c9713e63.png" className="h-10 w-auto object-contain" />
      </motion.div>

      {/* Main Card Container — matches dashboard card pattern */}
      <motion.main
        className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] overflow-hidden"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Hero image */}
        <div className="relative h-40 w-full overflow-hidden bg-muted">
          <img
            src={welcomeHero}
            alt="Lachendes Paar – Willkommen bei Ditax"
            loading="eager"
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
            <span className="text-[11px] font-medium text-foreground">Willkommen</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-2 px-6 pt-6 sm:px-10 sm:pt-8">
          {steps.map((_, index) => <div key={index} className={`h-1.5 flex-1 bg-primary rounded-full transition-opacity duration-300 ${index <= currentStep ? 'opacity-100' : 'opacity-20'}`} />)}
        </div>

        {/* Content */}
        <div className="px-6 py-8 sm:px-10 sm:pb-12 sm:pt-8 flex flex-col items-center text-center">
          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.h1 key={currentStep} initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} transition={{
            duration: 0.3
          }} className="font-semibold tracking-tight text-foreground mb-8 leading-tight sm:text-2xl text-xl">
              {getStepTitle()}
            </motion.h1>
          </AnimatePresence>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} className="w-full" initial={{
            opacity: 0,
            y: 10
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -10
          }} transition={{
            duration: 0.3
          }}>
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>

      {/* Smooth Transition Animation */}
      <AnimatePresence>
        {showTransition && (
          <motion.div 
            className="fixed inset-0 z-[51] bg-background flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <motion.img 
              src="/lovable-uploads/e9306e57-1198-4333-abcf-b510c9713e63.png"
              alt="ditax"
              className="h-16 w-auto object-contain"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>;
};
