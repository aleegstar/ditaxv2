import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { WelcomeStep } from './WelcomeStep';
import { WelcomeProgress } from './WelcomeProgress';
import { WelcomeJourneyPath } from './WelcomeJourneyPath';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Shield, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BorderBeam } from '@/components/ui/border-beam';
const TAX_YEARS = Array.from({ length: 3 }, (_, i) => {
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

  const steps = [
    {
      id: 'consent',
      title: 'Datenschutz & Einwilligungen',
    },
    {
      id: 'name',
      title: 'Wie lautet dein Vorname?',
    },
    {
      id: 'year',
      title: '', // Will be set dynamically with firstName
    },
  ];

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
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Authentifizierung fehlgeschlagen');
        navigate('/auth');
        return;
      }

      // Update profile with onboarding data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          first_name: firstName,
          terms_accepted_at: new Date().toISOString(),
          terms_version: '1.0',
          marketing_consent_at: marketingConsent ? new Date().toISOString() : null,
          onboarding_tour_completed: true,
          onboarding_tour_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) throw profileError;

      // Create tax return for selected year
      const { error: taxReturnError } = await supabase
        .from('tax_returns')
        .insert({
          user_id: user.id,
          tax_year: taxYear,
          status: 'pending',
          payment_status: 'pending',
        });

      if (taxReturnError && taxReturnError.code !== '23505') { // Ignore duplicate error
        throw taxReturnError;
      }

      toast.success('Willkommen bei ditax!');
      
      // Wait for DB transaction to commit before navigating
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Navigate without full reload
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Error completing onboarding:', error);
      toast.error('Ein Fehler ist aufgetreten');
      setShowTransition(false);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 w-full max-w-md px-4">
            <div className="flex flex-col items-start gap-6 w-full">
              <div className="relative bg-gradient-to-br from-[#18181b] to-[#050505] rounded-3xl p-7 md:p-6 w-full space-y-5 ring-1 ring-white/5 overflow-hidden"
                style={{
                  boxShadow: '0 25px 50px -12px rgba(0,0,0,1), 0 0 30px -5px rgba(249,115,22,0.3), inset 0 1px 0 0 rgba(249,115,22,0.1)',
                  border: '1px solid transparent',
                  backgroundImage: 'linear-gradient(to bottom right, #18181b, #050505), linear-gradient(135deg, rgba(249,115,22,0.6), rgba(251,191,36,0.3), rgba(249,115,22,0.6))',
                  backgroundOrigin: 'border-box',
                  backgroundClip: 'padding-box, border-box'
                }}
              >
                {/* Orange BorderBeam */}
                <BorderBeam 
                  size={200} 
                  duration={10} 
                  colorFrom="#F97316" 
                  colorTo="#FBBF24" 
                  borderWidth={1.5}
                />
                
                <label className="flex items-start gap-4 cursor-pointer group">
                  <Checkbox
                    checked={termsAccepted}
                    onCheckedChange={(checked) => setTermsAccepted(checked as boolean)}
                    className="mt-1 h-7 w-7 md:h-6 md:w-6 flex-shrink-0 border-white/[0.08] data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]"
                  />
                  <div className="flex-1 text-white text-[15px] md:text-sm leading-relaxed text-left">
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

                <div className="pt-3 border-t border-white/[0.08]">
                  <label className="flex items-start gap-4 cursor-pointer group">
                    <Checkbox
                      checked={marketingConsent}
                      onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
                      className="mt-1 h-7 w-7 md:h-6 md:w-6 flex-shrink-0 border-white/[0.08] data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]"
                    />
                    <div className="flex-1 text-white leading-relaxed text-left">
                      <div className="font-medium mb-2 text-[15px] md:text-sm">
                        Newsletter & Marketing-E-Mails
                      </div>
                      <div className="text-zinc-400 text-[14px] md:text-xs leading-relaxed">
                        Erhalte Updates zu Steueränderungen und hilfreiche Tipps (optional)
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <Button
              onClick={handleNext}
              disabled={isLoading || !canProceed()}
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-xl py-3.5 px-4 h-14 text-base font-medium border border-[#1D64FF]/50 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              Weiter
            </Button>
          </div>
        );
      
      case 1:
        return (
          <div className="space-y-5 w-full max-w-md px-4">
            <Input
              type="text"
              placeholder="Vorname"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="text-lg h-14 bg-[#0A0C10] border border-[#1D64FF]/50 text-white placeholder:text-zinc-500 rounded-xl px-6 focus-visible:border-[#1D64FF] focus-visible:ring-0 shadow-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleNext()}
              autoFocus
            />
            <Button
              onClick={handleNext}
              disabled={isLoading || !canProceed()}
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-xl py-3.5 px-4 h-14 text-base font-medium border border-[#1D64FF]/50 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              Weiter
            </Button>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-5 w-full max-w-md px-4">
            <Select value={taxYear} onValueChange={setTaxYear}>
              <SelectTrigger className="text-xl md:text-xl h-16 md:h-14 bg-[#0A0C10] border border-[#1D64FF]/50 text-white rounded-xl shadow-sm px-6 focus:ring-0 focus:border-[#1D64FF]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#0A0C10] border border-white/[0.08]">
                {TAX_YEARS.map((year) => (
                  <SelectItem key={year} value={year} className="text-white text-xl hover:bg-white/[0.05] focus:bg-white/[0.05]">
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-xl py-3.5 px-4 h-14 text-base font-medium border border-[#1D64FF]/50 transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md"
            >
              Los geht's!
            </Button>
          </div>
        );
      
      default:
        return null;
    }
  };

  const canProceed = () => {
    if (currentStep === 0) return termsAccepted;
    if (currentStep === 1) return firstName.trim().length > 0;
    return true;
  };

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-[#020408]">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(29,100,255,0.08)_0%,_transparent_70%)] pointer-events-none" />

      {/* Top Progress Dots */}
      <WelcomeProgress currentStep={currentStep} totalSteps={steps.length} variant="dark" />

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-between min-h-screen px-4 sm:px-6 py-8 md:py-12">

        {/* Steps */}
        <div className="flex-1 flex items-center justify-center w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <div className="w-full flex flex-col items-center space-y-6">
              {/* Logo centered above content */}
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="mb-4"
              >
                <img 
                  src="/ditax-logo-new.png" 
                  alt="ditax" 
                  className="h-10 w-auto object-contain"
                />
              </motion.div>
              
              <WelcomeStep
                key={currentStep}
                title={currentStep === 2 && firstName 
                  ? `Grüezi ${firstName}, welches Steuerjahr möchtest du erstellen?`
                  : steps[currentStep].title
                }
              >
                {renderStepContent()}
              </WelcomeStep>
            </div>
          </AnimatePresence>
        </div>

        {/* Bottom spacing */}
        <div className="h-8 md:h-12"></div>
      </div>

      {/* Smooth Transition Animation */}
      <AnimatePresence>
        {showTransition && (
          <>
            {/* Blue arc sliding up */}
            <motion.div
              className="fixed inset-0 z-50"
              style={{ background: '#1d64ff' }}
              initial={{ y: '100%' }}
              animate={{ 
                y: '0%',
                transition: {
                  duration: 0.8,
                  ease: [0.32, 0.72, 0, 1]
                }
              }}
            />

            {/* Dark fade covering blue */}
            <motion.div
              className="fixed inset-0 z-[51] bg-[#020408] flex items-center justify-center"
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
                  src="/ditax-logo-new.png" 
                  alt="ditax" 
                  className="w-32 h-32 md:w-40 md:h-40 object-contain"
                />
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
