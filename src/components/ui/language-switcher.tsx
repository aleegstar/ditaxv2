import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { SwissFlag, UKFlag } from '@/components/ui/flag-icons';

interface LanguageSwitcherProps {
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ className = '' }) => {
  const { language, switchLanguage } = useI18n();

  return (
    <div className={`flex items-center gap-1 bg-slate-100 rounded-full p-1 ${className}`}>
      <button
        onClick={() => switchLanguage('de')}
        className={`p-1.5 rounded-full transition-all ${
          language === 'de' 
            ? 'bg-white shadow-sm ring-1 ring-slate-200' 
            : 'hover:bg-slate-200'
        }`}
        title="Deutsch (Schweiz)"
      >
        <SwissFlag className="w-5 h-5" />
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`p-1.5 rounded-full transition-all ${
          language === 'en' 
            ? 'bg-white shadow-sm ring-1 ring-slate-200' 
            : 'hover:bg-slate-200'
        }`}
        title="English"
      >
        <UKFlag className="w-5 h-5" />
      </button>
    </div>
  );
};
