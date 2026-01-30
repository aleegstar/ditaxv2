import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowRight, Users } from 'lucide-react';
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
        onboarding_tour_completed: true,
        onboarding_tour_completed_at: new Date().toISOString()
      }).eq('id', user.id);
      if (profileError) throw profileError;

      // Create tax return for selected year
      const {
        error: taxReturnError
      } = await supabase.from('tax_returns').insert({
        user_id: user.id,
        tax_year: taxYear,
        status: 'pending',
        payment_status: 'pending'
      });
      if (taxReturnError && taxReturnError.code !== '23505') {
        throw taxReturnError;
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
            <div className="bg-white rounded-2xl p-6 w-full space-y-5 border border-slate-200 shadow-sm">
              <label className="flex items-start gap-4 cursor-pointer group">
                <Checkbox checked={termsAccepted} onCheckedChange={checked => setTermsAccepted(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]" />
                <div className="flex-1 text-slate-700 text-sm leading-relaxed text-left">
                  {t.onboarding.termsAccept}{' '}
                  <Link to="/privacy" target="_blank" className="underline hover:text-[#1D64FF] transition-colors font-medium text-[#1D64FF]">
                    {t.onboarding.privacyPolicy}
                  </Link>
                  {' '}{t.auth.termsText.includes('und') ? 'und' : 'and'}{' '}
                  <Link to="/terms" target="_blank" className="underline hover:text-[#1D64FF] transition-colors font-medium text-[#1D64FF]">
                    {t.onboarding.termsOfService}
                  </Link>
                </div>
              </label>

              <div className="pt-4 border-t border-slate-200">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <Checkbox checked={marketingConsent} onCheckedChange={checked => setMarketingConsent(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]" />
                  <div className="flex-1 text-slate-700 leading-relaxed text-left">
                    <div className="font-medium mb-1 text-sm text-slate-800">
                      {t.onboarding.newsletterTitle}
                    </div>
                    <div className="text-slate-500 text-xs leading-relaxed">
                      {t.onboarding.newsletterDescription}
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <Button onClick={handleNext} disabled={isLoading || !canProceed()} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group">
              <span>{t.onboarding.next}</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>;
      case 1:
        return <div className="w-full space-y-5">
            <Input type="text" placeholder={t.onboarding.firstName} value={firstName} onChange={e => setFirstName(e.target.value)} className="text-xl h-auto py-5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl px-5 focus-visible:border-[#1D64FF] focus-visible:ring-2 focus-visible:ring-blue-600/20 shadow-sm" onKeyDown={e => e.key === 'Enter' && handleNext()} autoFocus />
            <Button onClick={handleNext} disabled={isLoading || !canProceed()} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group">
              <span>{t.onboarding.next}</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>;
      case 2:
        return <div className="w-full space-y-5">
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="text-xl h-auto py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-sm px-5 focus:ring-2 focus:ring-blue-600/20 focus:border-[#1D64FF] hover:border-slate-300 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 rounded-xl">
                {TAX_YEARS.map(year => <SelectItem key={year} value={year} className="text-slate-900 text-xl hover:bg-slate-50 focus:bg-slate-50 py-3">
                    {year}
                  </SelectItem>)}
              </SelectContent>
            </Select>
            <Button onClick={handleNext} disabled={isLoading} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group">
              <span>{t.onboarding.next}</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>;
      case 3:
        // Family hint step - integrated as step 4
        return <div className="w-full space-y-5">
            <div className="bg-white rounded-2xl p-6 w-full space-y-4 border border-slate-200 shadow-sm">
              {/* Icon & Description */}
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Users className="w-6 h-6 text-[#1D64FF]" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-slate-500 text-sm leading-relaxed">
                    {t.onboarding.familyHintDescription}
                  </p>
                </div>
              </div>
            </div>

            {/* Buttons - Primary is "Continue", secondary is "Add people" */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={handleFamilyLater}
                disabled={isLoading}
                className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-lg font-medium group"
              >
                <span>{t.onboarding.familyHintLater}</span>
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                onClick={handleFamilyNow}
                disabled={isLoading}
                variant="ghost"
                className="w-full rounded-2xl py-4 h-auto text-base font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              >
                {t.onboarding.familyHintNow}
              </Button>
            </div>
          </div>;
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

  return <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6 antialiased relative">
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
      <motion.main className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5" initial={{
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
          {steps.map((_, index) => <div key={index} className={`h-1.5 flex-1 bg-[#1D64FF] rounded-full transition-opacity duration-300 ${index <= currentStep ? 'opacity-100' : 'opacity-30'}`} />)}
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
          }} className="font-semibold tracking-tight text-slate-900 mb-10 leading-tight sm:text-2xl text-xl">
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
            className="fixed inset-0 z-[51] bg-white flex items-center justify-center"
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
