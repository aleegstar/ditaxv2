import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { SwissFlag, UKFlag } from '@/components/ui/flag-icons';
import { ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageDropdownProps {
  className?: string;
  variant?: 'default' | 'compact';
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ 
  className = '',
  variant = 'default'
}) => {
  const { language, switchLanguage } = useI18n();

  const currentFlag = language === 'de' ? <SwissFlag className="w-4 h-4" /> : <UKFlag className="w-4 h-4" />;
  const currentLabel = language === 'de' ? 'DE' : 'EN';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-1.5 text-slate-500 hover:text-slate-700 transition-colors ${
            variant === 'compact' ? 'text-[13px]' : 'text-sm'
          } ${className}`}
        >
          {currentFlag}
          <span className="font-medium">{currentLabel}</span>
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="center" 
        className="min-w-[140px] bg-white border border-slate-200 shadow-lg rounded-xl z-[100]"
      >
        <DropdownMenuItem
          onClick={() => switchLanguage('de')}
          className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer ${
            language === 'de' ? 'bg-slate-50' : ''
          }`}
        >
          <SwissFlag className="w-5 h-5" />
          <span className="text-sm font-medium text-slate-700">Deutsch</span>
          {language === 'de' && (
            <span className="ml-auto text-[#1D64FF]">✓</span>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLanguage('en')}
          className={`flex items-center gap-2.5 px-3 py-2.5 cursor-pointer ${
            language === 'en' ? 'bg-slate-50' : ''
          }`}
        >
          <UKFlag className="w-5 h-5" />
          <span className="text-sm font-medium text-slate-700">English</span>
          {language === 'en' && (
            <span className="ml-auto text-[#1D64FF]">✓</span>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
