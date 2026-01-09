import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const TAX_YEARS = Array.from({
  length: 3
}, (_, i) => {
  const year = new Date().getFullYear() - 1 + i;
  return year.toString();
});

export const WelcomeFlow = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [taxYear, setTaxYear] = useState(TAX_YEARS[0]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showTransition, setShowTransition] = useState(false);

  const steps = [{
    id: 'consent',
    title: 'Datenschutz & Einwilligungen'
  }, {
    id: 'name',
    title: 'Wie lautet dein Vorname?'
  }, {
    id: 'year',
    title: '' // Will be set dynamically with firstName
  }];

  const handleNext = async () => {
    if (currentStep === 0 && !termsAccepted) {
      toast.error('Bitte akzeptiere die Datenschutzbestimmungen und Nutzungsbedingungen');
      return;
    }
    if (currentStep === 1 && !firstName.trim()) {
      toast.error('Bitte gib deinen Namen ein');
      return;
    }
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      await handleComplete();
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    setShowTransition(true);

    // Wait for animation to complete (shorter duration)
    await new Promise(resolve => setTimeout(resolve, 1800));
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Authentifizierung fehlgeschlagen');
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
        // Ignore duplicate error
        throw taxReturnError;
      }
      toast.success('Willkommen bei ditax!');

      // Wait for DB transaction to commit before navigating
      await new Promise(resolve => setTimeout(resolve, 300));

      // Navigate without full reload
      navigate('/', {
        replace: true
      });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Ein Fehler ist aufgetreten');
      setShowTransition(false);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return termsAccepted;
    if (currentStep === 1) return firstName.trim().length > 0;
    return true;
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="w-full space-y-5">
            <div className="bg-white rounded-2xl p-6 w-full space-y-5 border border-slate-200 shadow-sm">
              <label className="flex items-start gap-4 cursor-pointer group">
                <Checkbox 
                  checked={termsAccepted} 
                  onCheckedChange={checked => setTermsAccepted(checked as boolean)} 
                  className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]" 
                />
                <div className="flex-1 text-slate-700 text-sm leading-relaxed text-left">
                  Ich akzeptiere die{' '}
                  <Link to="/privacy" target="_blank" className="underline hover:text-[#1D64FF] transition-colors font-medium text-[#1D64FF]">
                    Datenschutzbestimmungen
                  </Link>
                  {' '}und{' '}
                  <Link to="/terms" target="_blank" className="underline hover:text-[#1D64FF] transition-colors font-medium text-[#1D64FF]">
                    Nutzungsbedingungen
                  </Link>
                </div>
              </label>

              <div className="pt-4 border-t border-slate-200">
                <label className="flex items-start gap-4 cursor-pointer group">
                  <Checkbox 
                    checked={marketingConsent} 
                    onCheckedChange={checked => setMarketingConsent(checked as boolean)} 
                    className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]" 
                  />
                  <div className="flex-1 text-slate-700 leading-relaxed text-left">
                    <div className="font-medium mb-1 text-sm text-slate-800">
                      Newsletter & Marketing-E-Mails
                    </div>
                    <div className="text-slate-500 text-xs leading-relaxed">
                      Erhalte Updates zu Steueränderungen und hilfreiche Tipps (optional)
                    </div>
                  </div>
                </label>
              </div>
            </div>

            <Button 
              onClick={handleNext} 
              disabled={isLoading || !canProceed()} 
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group"
            >
              <span>Weiter</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>
        );
      case 1:
        return (
          <div className="w-full space-y-5">
            <Input 
              type="text" 
              placeholder="Vorname" 
              value={firstName} 
              onChange={e => setFirstName(e.target.value)} 
              className="text-xl h-auto py-5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl px-5 focus-visible:border-[#1D64FF] focus-visible:ring-2 focus-visible:ring-blue-600/20 shadow-sm" 
              onKeyDown={e => e.key === 'Enter' && handleNext()} 
              autoFocus 
            />
            <Button 
              onClick={handleNext} 
              disabled={isLoading || !canProceed()} 
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group"
            >
              <span>Weiter</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>
        );
      case 2:
        return (
          <div className="w-full space-y-5">
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="text-xl h-auto py-5 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-sm px-5 focus:ring-2 focus:ring-blue-600/20 focus:border-[#1D64FF] hover:border-slate-300 transition-all">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white border border-slate-200 rounded-xl">
                {TAX_YEARS.map(year => (
                  <SelectItem 
                    key={year} 
                    value={year} 
                    className="text-slate-900 text-xl hover:bg-slate-50 focus:bg-slate-50 py-3"
                  >
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleComplete} 
              disabled={isLoading} 
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group"
            >
              <span>Los geht's!</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const getStepTitle = () => {
    if (currentStep === 2 && firstName) {
      return `Grüezi ${firstName}, welches Steuerjahr möchtest du erstellen?`;
    }
    return steps[currentStep].title;
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      {/* Main Card Container */}
      <motion.main 
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl shadow-slate-200/50 overflow-hidden ring-1 ring-slate-900/5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Progress Bar */}
        <div className="flex gap-2 px-6 pt-6 sm:px-10 sm:pt-10">
          {steps.map((_, index) => (
            <div 
              key={index}
              className={`h-1.5 flex-1 bg-[#1D64FF] rounded-full transition-opacity duration-300 ${
                index <= currentStep ? 'opacity-100' : 'opacity-30'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 py-10 sm:px-10 sm:pb-16 flex flex-col items-center text-center">
          {/* Logo */}
          <motion.div 
            className="mb-10 flex items-center justify-center gap-3"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <img 
              alt="ditax" 
              className="h-10 w-auto object-contain" 
              src="/lovable-uploads/Group_1_24.png" 
            />
          </motion.div>

          {/* Heading */}
          <AnimatePresence mode="wait">
            <motion.h1 
              key={currentStep}
              className="text-3xl sm:text-4xl font-semibold tracking-tight text-slate-900 mb-10 leading-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {getStepTitle()}
            </motion.h1>
          </AnimatePresence>

          {/* Form Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              className="w-full"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.main>

      {/* Footer */}
      <footer className="mt-8 text-center">
        <a href="https://app.aikido.dev/audit-report/external/jUMJfoUtocMicRlqZJr9ymg0/request" target="_blank" rel="noopener noreferrer">
          <img src="https://app.aikido.dev/assets/badges/full-light-theme.svg" alt="Aikido Security Audit Report" className="h-10" />
        </a>
      </footer>

      {/* Smooth Transition Animation */}
      <AnimatePresence>
        {showTransition && (
          <>
            {/* Blue arc sliding up */}
            <motion.div 
              className="fixed z-50"
              style={{
                background: '#1d64ff',
                left: 0,
                right: 0,
                height: '120vh',
                bottom: 0
              }}
              initial={{ y: '100%' }}
              animate={{
                y: '0%',
                transition: {
                  duration: 0.8,
                  ease: [0.32, 0.72, 0, 1]
                }
              }}
            />

            {/* White fade covering blue */}
            <motion.div 
              className="fixed inset-0 z-[51] bg-white flex items-center justify-center"
              initial={{ opacity: 0 }}
              animate={{
                opacity: 1,
                transition: {
                  delay: 0.6,
                  duration: 0.4,
                  ease: "easeInOut"
                }
              }}
            >
              {/* Logo appears */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  transition: {
                    delay: 0.9,
                    duration: 0.6,
                    ease: [0.34, 1.56, 0.64, 1]
                  }
                }}
              >
                <img 
                  src="/lovable-uploads/Group_1_24.png" 
                  alt="ditax" 
                  className="h-12 md:h-16 w-auto object-contain" 
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
