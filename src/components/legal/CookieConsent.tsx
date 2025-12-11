
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useNavigate, useLocation } from 'react-router-dom';

interface CookiePreferences {
  essential: boolean;
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
}

const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  });
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show cookie consent on price calculator page
  if (location.pathname === '/preisrechner') {
    return null;
  }

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setShowBanner(true);
    } else {
      const savedPreferences = JSON.parse(consent);
      setPreferences(savedPreferences);
    }
  }, []);

  const handleAcceptAll = () => {
    const allAccepted = {
      essential: true,
      functional: true,
      analytics: true,
      marketing: true
    };
    localStorage.setItem('cookie-consent', JSON.stringify(allAccepted));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());
    setPreferences(allAccepted);
    setShowBanner(false);
  };

  const handleRejectAll = () => {
    const essentialOnly = {
      essential: true,
      functional: false,
      analytics: false,
      marketing: false
    };
    localStorage.setItem('cookie-consent', JSON.stringify(essentialOnly));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());
    setPreferences(essentialOnly);
    setShowBanner(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookie-consent', JSON.stringify(preferences));
    localStorage.setItem('cookie-consent-timestamp', new Date().toISOString());
    setShowBanner(false);
    setShowSettings(false);
  };

  const handlePreferenceChange = (key: keyof CookiePreferences, value: boolean) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!showBanner && !showSettings) return null;

  return (
    <>
      {showBanner && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl">
            <div className="relative overflow-hidden rounded-2xl">
              {/* Glassmorphism overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/10 to-white/5 backdrop-blur-xl"></div>
              
              {/* Frosty texture overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20"></div>
              
              {/* Content */}
              <div className="relative p-6">
                <div className="flex flex-col lg:flex-row items-start lg:items-center gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 text-gray-800">Cookie-Einstellungen</h3>
                    <p className="text-sm text-gray-700 mb-4">
                      Wir verwenden Cookies, um Ihre Erfahrung zu verbessern und unsere Dienste zu optimieren. 
                      Sie können Ihre Präferenzen jederzeit anpassen.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        onClick={handleAcceptAll}
                        className="bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-sm border border-white/20 text-white"
                      >
                        Alle akzeptieren
                      </Button>
                      <Button
                        onClick={handleRejectAll}
                        variant="outline"
                        className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30"
                      >
                        Nur essenzielle
                      </Button>
                      <Button
                        onClick={() => setShowSettings(true)}
                        variant="ghost"
                        className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20"
                      >
                        Einstellungen
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm"></div>
          
          {/* Modal */}
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="bg-white/15 backdrop-blur-xl border border-white/25 rounded-3xl shadow-2xl">
              <div className="relative overflow-hidden rounded-3xl">
                {/* Glassmorphism overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/25 via-white/15 to-white/10 backdrop-blur-xl"></div>
                
                {/* Frosty texture overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50/20 via-transparent to-purple-50/15"></div>
                
                {/* Content */}
                <div className="relative p-6">
                  <h2 className="text-2xl font-bold mb-4 text-gray-800">Cookie-Einstellungen</h2>
                  
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">Essenzielle Cookies</h3>
                        <Switch checked={true} disabled />
                      </div>
                      <p className="text-sm text-gray-700">
                        Diese Cookies sind für das Funktionieren der Website unerlässlich.
                      </p>
                    </div>

                    <Separator className="bg-white/30" />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">Funktionale Cookies</h3>
                        <Switch 
                          checked={preferences.functional}
                          onCheckedChange={(checked) => handlePreferenceChange('functional', checked)}
                        />
                      </div>
                      <p className="text-sm text-gray-700">
                        Helfen dabei, erweiterte Funktionalitäten bereitzustellen.
                      </p>
                    </div>

                    <Separator className="bg-white/30" />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">Analyse-Cookies</h3>
                        <Switch 
                          checked={preferences.analytics}
                          onCheckedChange={(checked) => handlePreferenceChange('analytics', checked)}
                        />
                      </div>
                      <p className="text-sm text-gray-700">
                        Helfen uns zu verstehen, wie Besucher die Website nutzen.
                      </p>
                    </div>

                    <Separator className="bg-white/30" />

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-800">Marketing-Cookies</h3>
                        <Switch 
                          checked={preferences.marketing}
                          onCheckedChange={(checked) => handlePreferenceChange('marketing', checked)}
                        />
                      </div>
                      <p className="text-sm text-gray-700">
                        Werden verwendet, um relevante Werbung anzuzeigen.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button 
                      onClick={handleSavePreferences} 
                      className="flex-1 bg-blue-600/90 hover:bg-blue-700/90 backdrop-blur-sm border border-white/20"
                    >
                      Einstellungen speichern
                    </Button>
                    <Button 
                      onClick={() => setShowSettings(false)} 
                      variant="outline"
                      className="bg-white/20 backdrop-blur-sm border border-white/30 hover:bg-white/30"
                    >
                      Abbrechen
                    </Button>
                  </div>

                  <div className="mt-4 text-center">
                    <button
                      onClick={() => navigate('/privacy')}
                      className="text-sm text-blue-700 hover:text-blue-800 hover:underline font-medium"
                    >
                      Datenschutzerklärung lesen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsent;
