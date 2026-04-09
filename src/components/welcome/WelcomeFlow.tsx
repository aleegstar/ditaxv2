import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowRight, Users, Ticket, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '@/contexts/I18nContext';

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

  // 4 steps: consent, name, year, family
  const steps = [{
    id: 'consent',
    title: t.onboarding.consentTitle
  }, {
    id: 'name',
    title: t.onboarding.nameTitle
  }, {
    id: 'year',
    title: '' // Will be set dynamically with firstName
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
    
    // After step 3 (year selection), save data and show transition
    if (currentStep === 2) {
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

      // Update profile with onboarding data
      const {
        error: profileError
      } = await supabase.from('profiles').update({
        first_name: firstName,
        terms_accepted_at: new Date().toISOString(),
        terms_version: '1.0',
        marketing_consent_at: marketingConsent ? new Date().toISOString() : null,
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

      // Mark data as saved and proceed to step 4 (family hint) - no animation
      setDataSaved(true);
      setCurrentStep(3);
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
                <Checkbox checked={termsAccepted} onCheckedChange={checked => setTermsAccepted(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-[#1D64FF]" />
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
                  <Checkbox checked={marketingConsent} onCheckedChange={checked => setMarketingConsent(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-primary data-[state=checked]:border-[#1D64FF]" />
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
               className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-5 h-auto text-lg font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
             >
               {t.onboarding.next}
               <ArrowRight className="w-5 h-5 ml-2 text-white" />
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
               className="text-lg h-auto py-5 bg-white/50 backdrop-blur-sm border border-border/40 text-foreground placeholder:text-muted-foreground rounded-2xl px-5 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 shadow-sm" 
               onKeyDown={e => e.key === 'Enter' && handleNext()} 
               autoFocus 
             />
              <Button 
                onClick={handleNext} 
                disabled={isLoading || !canProceed()} 
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-5 h-auto text-lg font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {t.onboarding.next}
                <ArrowRight className="w-5 h-5 ml-2 text-white" />
              </Button>
           </div>
         );
      case 2:
         return (
           <div className="w-full space-y-5">
            <Select value={taxYear} onValueChange={setTaxYear}>
               <SelectTrigger className="text-lg h-auto py-5 bg-white/50 backdrop-blur-sm border border-border/40 text-foreground rounded-2xl shadow-sm px-5 focus:ring-2 focus:ring-primary/20 focus:border-primary hover:border-border transition-all">
                <SelectValue />
              </SelectTrigger>
               <SelectContent className="bg-white/50 backdrop-blur-sm border border-border/40 rounded-2xl">
                 {TAX_YEARS.map(year => (
                   <SelectItem key={year} value={year} className="text-foreground text-lg hover:bg-muted/30 focus:bg-muted/30 py-3">
                    {year}
                   </SelectItem>
                 ))}
              </SelectContent>
            </Select>
              <Button 
                onClick={handleNext} 
                disabled={isLoading} 
                className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-5 h-auto text-lg font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
              >
                {t.onboarding.next}
                <ArrowRight className="w-5 h-5 ml-2 text-white" />
             </Button>
           </div>
         );
      case 3:
        // Family hint + referral code step
         return (
           <div className="w-full space-y-5">
             <div className="bg-muted/30 rounded-2xl p-6 w-full border border-white/60">
              {/* Icon & Description */}
              <div className="flex items-start gap-4">
                 <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                   <Users className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {t.onboarding.familyHintDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Referral Code Input */}
            <div className="bg-muted/30 rounded-2xl p-6 w-full border border-white/60">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  {referralApplied ? (
                    <CheckCircle className="w-6 h-6 text-primary" />
                  ) : (
                    <Ticket className="w-6 h-6 text-primary" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-foreground text-sm mb-1">Einladungscode</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    Hast du einen Einladungscode? Erhalte CHF 20 Rabatt.
                  </p>
                </div>
              </div>
              {!referralApplied ? (
                <div className="flex gap-2 mt-4">
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
                    className="h-11 px-5 rounded-xl bg-primary hover:bg-primary/90 text-white text-sm font-semibold disabled:opacity-50"
                  >
                    {referralLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Einlösen'}
                  </Button>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2 text-primary text-sm font-medium">
                  <CheckCircle className="w-4 h-4" />
                  <span>CHF 20 Rabatt aktiviert!</span>
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-3">
               <Button
                 onClick={handleFamilyLater}
                 disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-5 h-auto text-lg font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20"
               >
                  {t.onboarding.familyHintLater}
                  <ArrowRight className="w-5 h-5 ml-2 text-white" />
               </Button>
              <Button
                onClick={handleFamilyNow}
                disabled={isLoading}
                variant="ghost"
                 className="w-full rounded-2xl py-4 h-auto text-base font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50"
              >
                {t.onboarding.familyHintNow}
              </Button>
            </div>
           </div>
         );
      default:
        return null;
    }
  };
  
  const getStepTitle = () => {
    if (currentStep === 2 && firstName) {
      return t.onboarding.yearTitle.replace('{name}', firstName);
    }
    return steps[currentStep].title;
  };

  return <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 antialiased relative">
      {/* Logo above card */}
      <motion.div className="mb-8 flex items-center justify-center" initial={{
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

      {/* Main Card Container */}
      <motion.main className="w-full max-w-lg bg-white/70 backdrop-blur-2xl rounded-3xl shadow-xl shadow-black/5 overflow-hidden border border-white/60" initial={{
      opacity: 0,
      y: 20
    }} animate={{
      opacity: 1,
      y: 0
    }} transition={{
      duration: 0.4
    }}>
        {/* Progress Bar */}
        <div className="flex gap-2 px-6 pt-6 sm:px-10 sm:pt-10">
          {steps.map((_, index) => <div key={index} className={`h-1.5 flex-1 bg-primary rounded-full transition-opacity duration-300 ${index <= currentStep ? 'opacity-100' : 'opacity-30'}`} />)}
        </div>

        {/* Content */}
        <div className="px-6 py-10 sm:px-10 sm:pb-16 flex flex-col items-center text-center">

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
          }} className="font-semibold tracking-tight text-foreground mb-10 leading-tight sm:text-2xl text-xl">
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
