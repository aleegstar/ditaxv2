import React from 'react';
import { useI18n } from '@/contexts/I18nContext';
import { Globe } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface LanguageDropdownProps {
  className?: string;
  variant?: 'default' | 'compact';
  showLabel?: boolean;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ 
  className = '',
  variant = 'default',
  showLabel = true
}) => {
  const { language, switchLanguage, t } = useI18n();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-all ${
            variant === 'compact' ? 'px-2.5 py-1.5 gap-1.5' : ''
          } ${className}`}
        >
          <Globe className={variant === 'compact' ? 'w-4 h-4' : 'w-5 h-5'} />
          {showLabel && (
            <span className={`font-medium ${variant === 'compact' ? 'text-xs' : 'text-sm'}`}>
              {t.menu.language}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end" 
        sideOffset={8}
        className="min-w-[120px] bg-white border border-slate-200 shadow-xl rounded-xl z-[10010] p-1"
      >
        <DropdownMenuItem
          onClick={() => switchLanguage('de')}
          className={`flex items-center justify-center px-4 py-2.5 cursor-pointer rounded-lg text-center ${
            language === 'de' ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
          }`}
        >
          <span className="text-sm text-slate-700">Deutsch</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLanguage('en')}
          className={`flex items-center justify-center px-4 py-2.5 cursor-pointer rounded-lg text-center ${
            language === 'en' ? 'bg-slate-100 font-semibold' : 'hover:bg-slate-50'
          }`}
        >
          <span className="text-sm text-slate-700">English</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
