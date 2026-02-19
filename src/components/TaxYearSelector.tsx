import React, { useState, useEffect } from 'react';
import { Calendar, Star, ChevronDown, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CustomCheckbox } from '@/components/ui/custom-checkbox';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { WelcomeProgress } from '@/components/welcome/WelcomeProgress';

interface TaxYearSelectorProps {
  onYearSelect: (year: string) => void;
  isCreating?: boolean;
}

export const TaxYearSelector: React.FC<TaxYearSelectorProps> = ({ 
  onYearSelect, 
  isCreating = false 
}) => {
  const [step, setStep] = useState<'consent' | 'name' | 'year'>('consent');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(true);
  const [firstName, setFirstName] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => 2024 + i); // 2024-2034
  
  // Progress mapping for steps
  const stepOrder = ['consent', 'name', 'year'] as const;
  const currentStepIndex = stepOrder.indexOf(step);


  const getYearDescription = (year: number) => {
    if (year === currentYear - 1) {
      return "Empfohlen - Aktuelles Steuerjahr";
    }
    if (year === currentYear) {
      return "Für das laufende Jahr";
    }
    if (year > currentYear) {
      return "Für die Zukunft";
    }
    return "Vergangenes Jahr";
  };

  const isRecommended = (year: number) => year === currentYear - 1;

  // Add a body class while this selector is mounted to hide navigation elements
  useEffect(() => {
    document.body.classList.add('hide-bottom-navbar');
    document.body.classList.add('hide-sidebar');
    return () => {
      document.body.classList.remove('hide-bottom-navbar');
      document.body.classList.remove('hide-sidebar');
    };
  }, []);

  const handleConsentSubmit = () => {
    if (!termsAccepted) {
      alert('Du musst den Nutzungsbedingungen zustimmen, um fortzufahren.');
      return;
    }
    setIsTransitioning(true);
    setTimeout(() => {
      setStep('name');
      setIsTransitioning(false);
    }, 300);
  };

  const handleFirstNameSubmit = () => {
    if (firstName.trim()) {
      setIsTransitioning(true);
      setTimeout(() => {
        setStep('year');
        setIsTransitioning(false);
      }, 300);
    }
  };

  const saveFirstNameToProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      const { error } = await supabase
        .from('profiles')
        .upsert({ 
          id: user.id, 
          first_name: firstName.trim() 
        });

      if (error) {
        throw error;
      }
    } catch (error: any) {
      console.error('Error saving first name:', error);
      toast.error('Fehler beim Speichern des Namens: ' + error.message);
    }
  };

  const handleYearSelect = async (year: string) => {
    try {
      // Save the first name to profile before proceeding
      await saveFirstNameToProfile();
      // Wait for tax return creation and navigation to complete
      await onYearSelect(year);
      setIsOpen(false);
    } catch (error) {
      console.error('Error in year selection:', error);
      toast.error('Fehler bei der Steuerjahr-Auswahl');
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6 relative" data-tax-year-selector>
      <style>{`
        .hide-bottom-navbar [data-bottom-navbar]{display:none !important;}
        .hide-sidebar [data-sidebar]{display:none !important;}
        .hide-sidebar [data-sidebar-nav]{display:none !important;}
        .slide-out-left { animation: slideOutLeft 0.3s ease-in-out forwards; }
        .slide-in-right { animation: slideInRight 0.3s ease-in-out forwards; }
        @keyframes slideOutLeft {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(-100%); opacity: 0; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      <div className="max-w-md w-full">
        {step === 'consent' ? (
          // Consent Step
          <div className={`text-center ${isTransitioning ? 'slide-out-left' : 'slide-in-right'}`}>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
              Schön das du da bist
            </h1>
            <p className="text-xl text-muted-foreground mb-12">
              Bestätige die Einstellungen um fortzufahren.
            </p>
            
            <div className="space-y-6 text-left">
              <CustomCheckbox
                checked={termsAccepted}
                onCheckedChange={setTermsAccepted}
                label={
                  <span>
                    Ich stimme den{' '}
                    <a 
                      href="/terms" 
                      target="_blank" 
                      className="text-[#1d64ff] hover:underline font-medium"
                    >
                      Nutzungsbedingungen
                    </a>{' '}
                    und der{' '}
                    <a 
                      href="/privacy" 
                      target="_blank" 
                      className="text-[#1d64ff] hover:underline font-medium"
                    >
                      Datenschutzerklärung
                    </a>{' '}
                    zu. <span className="text-red-500">*</span>
                  </span>
                }
                className={`transition-all duration-200 ${
                  termsAccepted ? 'border-[#1d64ff] bg-[#1d64ff]/5' : 'border-gray-300'
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
                  marketingConsent ? 'border-[#1d64ff] bg-[#1d64ff]/5' : 'border-gray-300'
                }`}
              />
              
              <Button
                onClick={handleConsentSubmit}
                disabled={!termsAccepted}
                className="w-full"
              >
                Fortfahren
              </Button>
              
              <p className="text-xs text-gray-500 text-center">
                <span className="text-red-500">*</span> Pflichtfeld
              </p>
            </div>
          </div>
        ) : step === 'name' ? (
          // Name Input Step
          <div className={`text-center ${isTransitioning ? 'slide-out-left' : 'slide-in-right'}`}>
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-8">
              Wie lautet dein Vorname?
            </h1>
            
            <div className="space-y-2">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Vorname eingeben"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleFirstNameSubmit()}
                  className="w-full px-6 py-4 h-16 text-lg rounded-2xl border-2 border-gray-200 focus:border-[#1d64ff] focus:ring-0 bg-white text-center font-medium"
                  autoFocus
                />
              </div>
              
              <Button
                onClick={handleFirstNameSubmit}
                disabled={!firstName.trim()}
                className="w-full"
              >
                Weiter
              </Button>
            </div>
          </div>
        ) : (
          // Tax Year Selection Step
          <div className={`${isTransitioning ? 'slide-out-left' : 'slide-in-right'}`}>
            <div className="text-center mb-12">
              <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-4">
                Grüezi, {firstName}
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Wähle dein Steuerjahr aus:
              </p>
            </div>

            <div className="relative">
              {/* Main Dropdown Button */}
              <Button
                onClick={() => setIsOpen(!isOpen)}
                disabled={isCreating}
                className="w-full"
              >
                <Calendar className="w-5 h-5" />
                {isCreating ? 'Wird erstellt...' : 'Steuerjahr auswählen'}
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
              </Button>

              {/* Dropdown Menu */}
              {isOpen && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setIsOpen(false)}
                  />
                  
                  {/* Dropdown Content */}
                  <div 
                    className="absolute top-full mt-3 left-0 right-0 z-50 rounded-3xl border border-gray-200 shadow-2xl backdrop-blur-2xl animate-fade-in bg-white"
                    style={{
                      background: 'white',
                      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    <div className="p-3">
                      <div className="text-sm font-semibold text-gray-800 px-4 py-3 border-b border-gray-200 text-center">
                        Jahr auswählen
                      </div>
                      <div className="max-h-64 overflow-y-auto py-2">
                        {years.map((year) => (
                          <button
                            key={year}
                            onClick={() => handleYearSelect(year.toString())}
                            disabled={isCreating}
                            className={`w-full text-left px-4 py-3 rounded-2xl transition-all duration-300 flex items-center justify-between mx-2 my-1 ${
                              isRecommended(year)
                                ? 'text-gray-900 bg-gray-50 hover:bg-gray-100'
                                : 'text-gray-800 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4" />
                              <div>
                                <div className="font-medium text-base">{year}</div>
                                <div className="text-xs opacity-75">{getYearDescription(year)}</div>
                              </div>
                            </div>
                            {isRecommended(year) && (
                              <Star className="w-4 h-4 text-yellow-500 fill-current" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="text-center mt-8">
              <p className="text-sm text-muted-foreground">
                Du kannst später weitere Steuerjahre hinzufügen
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};