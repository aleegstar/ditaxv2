
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, Translation } from '@/i18n/translations';

type Language = 'de' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translation;
  switchLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    // Get language from localStorage or default to 'de'
    const savedLang = localStorage.getItem('ditax-language') as Language;
    return savedLang && (savedLang === 'de' || savedLang === 'en') ? savedLang : 'de';
  });

  // Force rerender key to trigger component rerendering when language changes
  const [rerenderKey, setRerenderKey] = useState(0);

  const switchLanguage = (lang: Language) => {
    if (lang !== language) {
      setLanguage(lang);
      localStorage.setItem('ditax-language', lang);
      
      // Force a complete rerender of all components using translations
      setRerenderKey(prev => prev + 1);
      
      // Call ConveyThis if available
      if (typeof window !== 'undefined' && (window as any).ConveyThis) {
        (window as any).ConveyThis.switchLanguage(lang);
      }
    }
  };

  useEffect(() => {
    // Set initial language for ConveyThis if available
    if (typeof window !== 'undefined' && (window as any).ConveyThis) {
      (window as any).ConveyThis.switchLanguage(language);
    }
  }, []);

  // Include rerenderKey in the context value to trigger rerendering
  const value: I18nContextType = {
    language,
    setLanguage,
    t: translations[language],
    switchLanguage,
  };

  return (
    <I18nContext.Provider key={rerenderKey} value={value}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
