import React from 'react';
import { ChevronLeft, HelpCircle, List, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';

interface SubpageHeaderProps {
  title?: string;
  titleElement?: React.ReactNode;
  onBack?: () => void;
  className?: string;
  showModeToggle?: boolean;
  currentMode?: 'standard' | 'yesno';
  onModeChange?: (mode: 'standard' | 'yesno') => void;
  showAvatar?: boolean;
  /** 'page' navigates back, 'overlay' dismisses via onBack */
  mode?: 'page' | 'overlay';
  /** Optional right-side action slot */
  rightAction?: React.ReactNode;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
  titleElement,
  onBack,
  className,
  showModeToggle = false,
  currentMode = 'yesno',
  onModeChange,
  showAvatar = false,
  mode = 'page',
  rightAction,
}) => {
  const navigate = useNavigate();
  const { profile } = useProfile();

  const handleToggle = () => {
    if (onModeChange) {
      onModeChange(currentMode === 'standard' ? 'yesno' : 'standard');
    }
  };

  const BackIcon = mode === 'overlay' ? X : ChevronLeft;

  return (
    <header className={cn(
      "relative z-30 bg-transparent",
      className
    )}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 mt-2 flex items-center gap-3">
        {/* Back Button */}
        <button 
          onClick={onBack}
          className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors shrink-0 -ml-2 bg-white border border-white/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          aria-label={mode === 'overlay' ? 'Schließen' : 'Zurück'}
        >
          <BackIcon className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>

        {/* Centered Title */}
        <div className="flex-1 min-w-0 flex justify-center">
          {titleElement ? (
            <div className="max-w-full">
              {titleElement}
            </div>
          ) : title ? (
            <h1 className="text-lg font-semibold tracking-tight text-foreground text-center truncate leading-tight">
              {title}
            </h1>
          ) : null}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 shrink-0">
          {rightAction}
          
          {showModeToggle && onModeChange && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="flex items-center gap-2 text-xs rounded-full h-8 px-3 text-muted-foreground hover:text-foreground"
            >
              {currentMode === 'yesno' ? (
                <>
                  <List className="w-3 h-3" />
                  Experten
                </>
              ) : (
                <>
                  <HelpCircle className="w-3 h-3" />
                  Ja/Nein
                </>
              )}
            </Button>
          )}
          
          {showAvatar ? (
            <button 
              onClick={() => navigate('/profile')} 
              className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-muted ring-2 ring-background overflow-hidden shrink-0 hover:ring-primary/20 transition-all"
            >
              <img 
                src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} 
                alt="Profil" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = '/lovable-uploads/default-avatar.png';
                }}
              />
            </button>
          ) : !showModeToggle && !rightAction && (
            <div className="w-10 h-10" />
          )}
        </div>
      </div>
    </header>
  );
};
