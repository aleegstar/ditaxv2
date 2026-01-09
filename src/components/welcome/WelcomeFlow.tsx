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
import ditaxLogoTransition from '@/assets/ditax-logo-transition.gif';
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
        return <div className="w-full space-y-5">
            <div className="bg-white rounded-2xl p-6 w-full space-y-5 border border-slate-200 shadow-sm">
              <label className="flex items-start gap-4 cursor-pointer group">
                <Checkbox checked={termsAccepted} onCheckedChange={checked => setTermsAccepted(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]" />
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
                  <Checkbox checked={marketingConsent} onCheckedChange={checked => setMarketingConsent(checked as boolean)} className="mt-1 h-6 w-6 flex-shrink-0 border-slate-300 data-[state=checked]:bg-[#1D64FF] data-[state=checked]:border-[#1D64FF]" />
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

            <Button onClick={handleNext} disabled={isLoading || !canProceed()} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group">
              <span>Weiter</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>;
      case 1:
        return <div className="w-full space-y-5">
            <Input type="text" placeholder="Vorname" value={firstName} onChange={e => setFirstName(e.target.value)} className="text-xl h-auto py-5 bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-2xl px-5 focus-visible:border-[#1D64FF] focus-visible:ring-2 focus-visible:ring-blue-600/20 shadow-sm" onKeyDown={e => e.key === 'Enter' && handleNext()} autoFocus />
            <Button onClick={handleNext} disabled={isLoading || !canProceed()} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group">
              <span>Weiter</span>
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
            <Button onClick={handleComplete} disabled={isLoading} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-2xl py-5 h-auto text-xl font-medium transition-all duration-200 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 group">
              <span>Los geht's!</span>
              <ArrowRight className="w-5 h-5 opacity-0 -ml-4 group-hover:opacity-100 group-hover:ml-2 transition-all duration-300" />
            </Button>
          </div>;
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
  return <div className="min-h-screen w-full bg-white flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
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
          {/* Logo */}
          <motion.div className="mb-10 flex items-center justify-center gap-3" initial={{
          opacity: 0,
          y: -10
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.4
        }}>
            <img alt="ditax" className="h-10 w-auto object-contain" src="/lovable-uploads/e9306e57-1198-4333-abcf-b510c9713e63.png" />
          </motion.div>

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
          }} className="text-3xl font-semibold tracking-tight text-slate-900 mb-10 leading-tight sm:text-2xl">
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

      {/* Footer */}
      <footer className="mt-8 flex items-center justify-center gap-3">
        <a href="https://app.aikido.dev/audit-report/external/jUMJfoUtocMicRlqZJr9ymg0/request" target="_blank" rel="noopener noreferrer">
          <img src="https://app.aikido.dev/assets/badges/full-light-theme.svg" alt="Aikido Security Audit Report" className="h-7" />
        </a>
        <svg width="46" height="45" viewBox="0 0 46 45" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-10 w-auto">
          <g>
            <rect x="3" y="0.863281" width="40" height="40" rx="20" fill="url(#paint0_linear_1_4914)"></rect>
            <path d="M30.6146 31.3062L31.2991 33.4127L33.5139 33.4127L31.7221 34.7145L32.4065 36.821L30.6146 35.5191L28.8228 36.821L29.5072 34.7145L27.7153 33.4127L29.9302 33.4127L30.6146 31.3062Z" fill="url(#paint1_linear_1_4914)"></path>
            <path d="M23.6857 35.4549L23.0013 33.3485L22.3168 35.4549H20.102L21.8938 36.7568L21.2094 38.8633L23.0013 37.5614L24.7932 38.8633L24.1087 36.7568L25.9006 35.4549H23.6857Z" fill="url(#paint2_linear_1_4914)"></path>
            <path d="M23.6857 4.96976L23.0013 2.86328L22.3168 4.96975L20.102 4.96975L21.8938 6.27163L21.2094 8.3781L23.0013 7.07623L24.7932 8.3781L24.1087 6.27163L25.9006 4.96975L23.6857 4.96976Z" fill="url(#paint3_linear_1_4914)"></path>
            <path d="M30.6226 4.90555L31.307 7.01202L33.5219 7.01202L31.73 8.3139L32.4144 10.4204L30.6226 9.1185L28.8307 10.4204L29.5151 8.3139L27.7233 7.01202L29.9381 7.01202L30.6226 4.90555Z" fill="url(#paint4_linear_1_4914)"></path>
            <path d="M16.0644 33.4127L15.38 31.3062L14.6955 33.4127H12.4807L14.2725 34.7145L13.5881 36.821L15.38 35.5191L17.1719 36.821L16.4874 34.7145L18.2793 33.4127L16.0644 33.4127Z" fill="url(#paint5_linear_1_4914)"></path>
            <path d="M36.1956 10.4846L36.8801 12.5911L39.095 12.5911L37.3031 13.8929L37.9875 15.9994L36.1956 14.6975L34.4038 15.9994L35.0882 13.8929L33.2963 12.5911L35.5112 12.5911L36.1956 10.4846Z" fill="url(#paint6_linear_1_4914)"></path>
            <path d="M10.4755 27.8336L9.79104 25.7272L9.1066 27.8336H6.89172L8.6836 29.1355L7.99916 31.242L9.79104 29.9401L11.5829 31.242L10.8985 29.1355L12.6903 27.8336L10.4755 27.8336Z" fill="url(#paint7_linear_1_4914)"></path>
            <path d="M38.2439 18.1059L38.9283 20.2123L41.1432 20.2123L39.3513 21.5142L40.0357 23.6207L38.2439 22.3188L36.452 23.6207L37.1364 21.5142L35.3446 20.2123H37.5594L38.2439 18.1059Z" fill="url(#paint8_linear_1_4914)"></path>
            <path d="M8.44313 20.2123L7.75869 18.1059L7.07425 20.2123H4.85938L6.65125 21.5142L5.96682 23.6207L7.75869 22.3188L9.55056 23.6207L8.86613 21.5142L10.658 20.2123H8.44313Z" fill="url(#paint9_linear_1_4914)"></path>
            <path d="M36.1956 25.7272L36.8801 27.8336H39.095L37.3031 29.1355L37.9875 31.242L36.1956 29.9401L34.4038 31.242L35.0882 29.1355L33.2963 27.8336L35.5112 27.8336L36.1956 25.7272Z" fill="url(#paint10_linear_1_4914)"></path>
            <path d="M10.4755 12.591L9.79103 10.4846L9.1066 12.591H6.89172L8.6836 13.8929L7.99916 15.9994L9.79103 14.6975L11.5829 15.9994L10.8985 13.8929L12.6903 12.591H10.4755Z" fill="url(#paint11_linear_1_4914)"></path>
            <path d="M16.0565 7.01202L15.372 4.90555L14.6876 7.01202H12.4727L14.2646 8.3139L13.5802 10.4204L15.372 9.1185L17.1639 10.4204L16.4795 8.3139L18.2714 7.01203L16.0565 7.01202Z" fill="url(#paint12_linear_1_4914)"></path>
            <path fillRule="evenodd" clipRule="evenodd" d="M15.2383 20.8682C15.2383 22.1882 15.9883 23.0882 17.2243 23.0882C17.8363 23.0882 18.3403 22.8302 18.5623 22.4162L18.5983 22.9922H19.2223V20.7542H17.3023V21.4802H18.1843C18.1363 21.9362 17.8243 22.2362 17.3263 22.2362C16.6243 22.2362 16.3123 21.6782 16.3123 20.8682C16.3123 20.0642 16.6483 19.4882 17.3083 19.4882C17.8063 19.4882 18.0523 19.7582 18.1303 20.2082L19.2103 20.1602C19.0123 19.2122 18.4303 18.6362 17.2963 18.6362C16.0003 18.6362 15.2383 19.5842 15.2383 20.8682ZM19.7261 18.7322V22.9922H21.2801C22.6601 22.9922 23.4341 22.2302 23.4341 20.8682C23.4341 19.5002 22.6481 18.7322 21.2441 18.7322H19.7261ZM21.2441 22.1402H20.7701V19.5842H21.2441C22.0121 19.5842 22.3601 19.9922 22.3601 20.8622C22.3601 21.7322 22.0121 22.1402 21.2441 22.1402ZM23.8059 22.6543V22.9922H24.8499V21.5822H25.5699C26.6139 21.5822 27.2499 21.0362 27.2499 20.1542C27.2499 19.2722 26.6139 18.7322 25.5699 18.7322H23.8059V22.1211H23.6798V22.6543H23.8059ZM25.4979 20.7242H24.8499V19.5842H25.4979C25.9239 19.5842 26.1819 19.7822 26.1819 20.1542C26.1819 20.5322 25.9179 20.7242 25.4979 20.7242ZM29.531 18.7322H27.581V22.9922H28.625V21.4862H29.423C29.831 21.4862 29.969 21.6362 29.993 21.9542L30.059 22.9922H31.127L31.025 21.7802C30.989 21.3542 30.767 21.1082 30.329 21.0482C30.797 20.9042 31.091 20.5202 31.091 19.9982C31.091 19.2302 30.479 18.7322 29.531 18.7322ZM29.369 20.6342H28.625V19.5842H29.357C29.789 19.5842 30.023 19.7642 30.023 20.1062C30.023 20.4422 29.789 20.6342 29.369 20.6342Z" fill="#101828"></path>
          </g>
          <defs>
            <linearGradient id="paint0_linear_1_4914" x1="9.88803" y1="6.55415" x2="36.0447" y2="35.5773" gradientUnits="userSpaceOnUse"><stop stopColor="#E5E7EB"></stop><stop offset="1" stopColor="#F9FAFB"></stop></linearGradient>
            <linearGradient id="paint1_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint2_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint3_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint4_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint5_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint6_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint7_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint8_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint9_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint10_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint11_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
            <linearGradient id="paint12_linear_1_4914" x1="15.8864" y1="51.1315" x2="29.5116" y2="5.36433" gradientUnits="userSpaceOnUse"><stop offset="0.188554" stopColor="#364153" stopOpacity="0"></stop><stop offset="0.526459" stopColor="#364153" stopOpacity="0.7"></stop></linearGradient>
          </defs>
        </svg>
      </footer>

      {/* Smooth Transition Animation */}
      <AnimatePresence>
        {showTransition && <motion.div className="fixed inset-0 z-[51] bg-white flex items-center justify-center" initial={{
        opacity: 0
      }} animate={{
        opacity: 1
      }} transition={{
        duration: 0.4,
        ease: "easeInOut"
      }}>
            {/* Logo appears */}
            <motion.div initial={{
          opacity: 0,
          scale: 0.9
        }} animate={{
          opacity: 1,
          scale: 1,
          transition: {
            delay: 0.2,
            duration: 0.6,
            ease: [0.34, 1.56, 0.64, 1]
          }
        }}>
              <img src={ditaxLogoTransition} alt="ditax" className="h-72 md:h-80 w-auto object-contain" />
            </motion.div>
          </motion.div>}
      </AnimatePresence>
    </div>;
};